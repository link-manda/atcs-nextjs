import time
import json
import asyncio
import logging
from typing import Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .detector import YOLODetector
from .tracker import VehicleFlowTracker
from .stream_reader import VideoStreamReader, sanitize_stream_url

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("atcs-yolo.main")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="High-performance YOLOv12 Vehicle Counting & Tracking Microservice for ATCS Bali"
)

# Enable CORS for Next.js and external clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Singleton detector instance with lazy initialization
detector_instance: Optional[YOLODetector] = None

def get_detector() -> YOLODetector:
    global detector_instance
    if detector_instance is None:
        logger.info("Initializing YOLO detector engine on demand...")
        detector_instance = YOLODetector()
        logger.info("YOLO detector engine ready.")
    return detector_instance

@app.on_event("startup")
async def startup_event():
    logger.info("Startup event: pre-warming detector...")
    try:
        get_detector()
    except Exception as e:
        logger.warning(f"Deferred detector warmup: {e}")

@app.get("/")
async def root():
    detector = get_detector()
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "hardware_device": settings.get_device(),
        "active_model": detector.model_name if detector else None,
        "endpoints": {
            "health": "/health",
            "websocket_tracking": "/ws/track?stream_url={CCTV_URL}&tripwire_y=0.55"
        }
    }

@app.get("/health")
async def health_check():
    device = settings.get_device()
    detector = get_detector()
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "device": device,
            "model": detector.model_name if detector else "loading",
            "timestamp": time.time(),
        }
    )

@app.websocket("/ws/track")
async def websocket_tracking_endpoint(
    websocket: WebSocket,
    stream_url: str = Query(..., description="CCTV Stream URL (HLS / RTSP / MP4)"),
    tripwire_y: float = Query(0.55, description="Tripwire line Y ratio (0.1 to 0.9)"),
    confidence: float = Query(0.25, description="Confidence threshold (0.1 to 0.9)")
):
    await websocket.accept()
    clean_url = sanitize_stream_url(stream_url)
    logger.info(f"WebSocket client connected for stream: {clean_url}")

    # Send instant connection ACK so frontend transitions to connected state with 0s delay
    await websocket.send_json({
        "type": "init",
        "status": "connected",
        "message": "Stream reader initialized",
        "fps": 0.0,
        "counts": {"total": 0, "cars": 0, "motorcycles": 0, "buses": 0, "trucks": 0},
        "detections": []
    })

    detector = get_detector()

    # Start video stream capture in dedicated thread
    reader = VideoStreamReader(clean_url)
    reader.start()

    current_tripwire_y = tripwire_y
    current_confidence = confidence
    tracker = VehicleFlowTracker(tripwire_y_ratio=current_tripwire_y)
    
    fps_calc_time = time.time()
    frame_count = 0
    calculated_fps = 0.0

    try:
        while True:
            # Non-blocking receive check for live commands / calibration updates
            try:
                msg_raw = await asyncio.wait_for(websocket.receive_text(), timeout=0.001)
                if msg_raw == "reset":
                    tracker.reset_counts()
                    logger.info("Counts reset by client command")
                else:
                    try:
                        msg_json = json.loads(msg_raw)
                        if msg_json.get("type") == "config":
                            if "tripwire_y" in msg_json:
                                current_tripwire_y = float(msg_json["tripwire_y"])
                            if "confidence" in msg_json:
                                current_confidence = float(msg_json["confidence"])
                            logger.info(f"Dynamic config updated: tripwire_y={current_tripwire_y}, conf={current_confidence}")
                    except Exception:
                        pass
            except asyncio.TimeoutError:
                pass

            success, frame, orig_w, orig_h = reader.get_latest_frame()
            if not success or frame is None:
                await asyncio.sleep(0.04)
                continue

            now = time.time()
            frame_count += 1
            if now - fps_calc_time >= 1.0:
                calculated_fps = round(frame_count / (now - fps_calc_time), 1)
                frame_count = 0
                fps_calc_time = now

            # 1. Run YOLOv12 inference and ByteTrack
            detections = detector.track(
                frame,
                confidence=current_confidence,
                iou=settings.DEFAULT_IOU
            )

            # 2. Update trajectory flow & line crossing counter
            track_result = tracker.update(
                detections=detections,
                frame_height=frame.shape[0],
                tripwire_y_ratio=current_tripwire_y
            )

            # 3. Emit real-time JSON payload to client
            payload = {
                "timestamp": int(now * 1000),
                "fps": calculated_fps,
                "resolution": {
                    "width": frame.shape[1],
                    "height": frame.shape[0]
                },
                "tripwire_y": current_tripwire_y,
                "counts": track_result["counts"],
                "line_crossed": track_result["line_crossed"],
                "detections": track_result["tracked"]
            }

            await websocket.send_json(payload)

            # Yield control to event loop (~30 FPS target)
            await asyncio.sleep(0.02)

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected normally.")
    except Exception as err:
        logger.warning(f"WebSocket session terminated: {err}")
    finally:
        reader.stop()
