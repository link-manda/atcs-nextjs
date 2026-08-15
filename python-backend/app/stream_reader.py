import os
import time
import threading
import logging
import urllib.parse
from typing import Optional, Tuple
import cv2
import numpy as np

logger = logging.getLogger("atcs-yolo.stream_reader")

# Configure OpenCV FFmpeg environment for HTTPS HLS streams
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = (
    "timeout;5000000|protocol_whitelist;file,crypto,data,compact,http,https,tls,tcp"
)

def sanitize_stream_url(url: str) -> str:
    """Extract upstream absolute URL if wrapped in Next.js proxy path"""
    if "url=" in url:
        try:
            parsed = urllib.parse.urlparse(url)
            qs = urllib.parse.parse_qs(parsed.query)
            if "url" in qs and qs["url"]:
                extracted = qs["url"][0]
                logger.info(f"Sanitized proxy URL '{url}' -> '{extracted}'")
                return extracted
        except Exception as e:
            logger.warning(f"Error parsing proxy url: {e}")
    return url

class VideoStreamReader:
    """
    Dedicated threaded frame reader for live HLS/RTSP streams.
    Prevents latency buffering by constantly discarding old frames and holding only the latest frame.
    """
    def __init__(self, stream_url: str):
        self.stream_url = sanitize_stream_url(stream_url)
        self.cap: Optional[cv2.VideoCapture] = None
        self.latest_frame: Optional[np.ndarray] = None
        self.is_running = False
        self.thread: Optional[threading.Thread] = None
        self.lock = threading.Lock()
        self.frame_width = 0
        self.frame_height = 0
        self.last_read_time = 0.0

    def start(self):
        if self.is_running:
            return
        self.is_running = True
        self.thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.thread.start()

    def _connect(self) -> bool:
        if self.cap is not None:
            self.cap.release()

        logger.info(f"Connecting to video stream: {self.stream_url}")
        
        # Try opening stream via OpenCV with FFMPEG backend
        self.cap = cv2.VideoCapture(self.stream_url, cv2.CAP_FFMPEG)
        
        # Optimize buffer size for lowest latency
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        if not self.cap.isOpened():
            logger.warning(f"Could not open stream: {self.stream_url}")
            return False

        self.frame_width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 640
        self.frame_height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 480
        logger.info(f"Stream opened successfully ({self.frame_width}x{self.frame_height})")
        return True

    def _capture_loop(self):
        retry_delay = 2.0
        consecutive_failures = 0

        while self.is_running:
            if self.cap is None or not self.cap.isOpened():
                if not self._connect():
                    time.sleep(retry_delay)
                    continue

            success, frame = self.cap.read()
            if not success or frame is None:
                consecutive_failures += 1
                if consecutive_failures > 10:
                    logger.warning("Failed to read frames repeatedly, reconnecting stream...")
                    self._connect()
                    consecutive_failures = 0
                time.sleep(0.1)
                continue

            consecutive_failures = 0
            with self.lock:
                self.latest_frame = frame
                self.last_read_time = time.time()

            # Small sleep to yield CPU (~60 FPS capture rate)
            time.sleep(0.015)

    def get_latest_frame(self) -> Tuple[bool, Optional[np.ndarray], int, int]:
        with self.lock:
            if self.latest_frame is None:
                return False, None, self.frame_width, self.frame_height
            return True, self.latest_frame.copy(), self.frame_width, self.frame_height

    def stop(self):
        self.is_running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=1.0)
        if self.cap:
            self.cap.release()
            self.cap = None
        logger.info("Stream reader stopped.")
