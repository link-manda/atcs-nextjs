import logging
from typing import List, Dict, Any, Optional
import numpy as np
from ultralytics import YOLO
from .config import settings

logger = logging.getLogger("atcs-yolo.detector")

class YOLODetector:
    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or settings.DEFAULT_MODEL_NAME
        self.device = settings.get_device()
        self.model = None
        self._load_model()

    def _load_model(self):
        try:
            logger.info(f"Loading YOLO model: {self.model_name} on device: {self.device}")
            # Try loading specified model (e.g. yolov12n.pt or fallback)
            try:
                self.model = YOLO(self.model_name)
            except Exception as e:
                logger.warning(f"Could not load {self.model_name}, falling back to yolov8n.pt: {e}")
                self.model = YOLO("yolov8n.pt")
                self.model_name = "yolov8n.pt"

            # Warmup model
            dummy_img = np.zeros((320, 320, 3), dtype=np.uint8)
            self.model.predict(dummy_img, device=self.device, verbose=False)
            logger.info(f"Model {self.model_name} successfully initialized and warmed up on {self.device}")
        except Exception as err:
            logger.error(f"Failed to load YOLO model: {err}")
            raise err

    def track(
        self,
        frame: np.ndarray,
        confidence: float = settings.DEFAULT_CONFIDENCE,
        iou: float = settings.DEFAULT_IOU
    ) -> List[Dict[str, Any]]:
        """
        Runs YOLOv12 inference and ByteTrack multi-object tracking on a single frame.
        Returns a list of structured vehicle detection dictionaries.
        """
        if self.model is None:
            return []

        # Run tracking using Ultralytics with ByteTrack
        results = self.model.track(
            source=frame,
            persist=True,
            tracker="bytetrack.yaml",
            conf=confidence,
            iou=iou,
            classes=settings.TARGET_CLASSES,
            device=self.device,
            verbose=False
        )

        detections = []
        if not results or len(results) == 0:
            return detections

        r = results[0]
        if r.boxes is None or len(r.boxes) == 0:
            return detections

        boxes = r.boxes
        for i in range(len(boxes)):
            box = boxes[i]
            
            # Extract tracking ID if available, else assign -1
            track_id = int(box.id.item()) if box.id is not None else -1
            cls_id = int(box.cls.item())
            conf = float(box.conf.item())
            
            # Coordinates: x1, y1, x2, y2
            xyxy = box.xyxy[0].tolist()
            x1, y1, x2, y2 = xyxy
            w = x2 - x1
            h = y2 - y1
            
            centroid_x = x1 + (w / 2.0)
            centroid_y = y1 + (h / 2.0)

            category = settings.CLASS_NAMES_MAP.get(cls_id, "car")

            detections.append({
                "id": track_id,
                "category": category,
                "confidence": round(conf, 3),
                "bbox": [round(x1, 1), round(y1, 1), round(w, 1), round(h, 1)],
                "centroid": [round(centroid_x, 1), round(centroid_y, 1)],
            })

        return detections
