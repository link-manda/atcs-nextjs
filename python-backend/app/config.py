import os
import torch

class Settings:
    PROJECT_NAME: str = "Bali Command Center - YOLOv12 AI Service"
    VERSION: str = "1.0.0"
    
    # Model configuration
    # Supports YOLOv12 weights (e.g. yolov12n.pt, yolov12s.pt, or yolo11n.pt/yolov8n.pt)
    DEFAULT_MODEL_NAME: str = os.getenv("YOLO_MODEL", "yolov12n.pt")
    
    # Confidence & NMS Thresholds
    DEFAULT_CONFIDENCE: float = float(os.getenv("DEFAULT_CONFIDENCE", "0.25"))
    DEFAULT_IOU: float = float(os.getenv("DEFAULT_IOU", "0.45"))
    
    # Target Classes (COCO Dataset vehicle IDs)
    # 1: bicycle, 2: car, 3: motorcycle, 5: bus, 7: truck
    TARGET_CLASSES = [1, 2, 3, 5, 7]
    
    CLASS_NAMES_MAP = {
        1: "motorcycle", # Map bicycle to motorcycle/2-wheeler category in traffic
        2: "car",
        3: "motorcycle",
        5: "bus",
        7: "truck",
    }
    
    # Server & Port
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "7860")) # Default 7860 for Hugging Face Spaces & Render

    @classmethod
    def get_device(cls) -> str:
        """Automatically select best hardware accelerator: CUDA > MPS (Apple Silicon) > CPU"""
        if torch.cuda.is_available():
            return "cuda"
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return "mps"
        return "cpu"

settings = Settings()
