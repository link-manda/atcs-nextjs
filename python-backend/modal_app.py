import modal

def predownload_models():
    """
    Download AI models during image build time so that container startup
    has 0-second cold-start delay (no downloading on the fly).
    """
    from ultralytics import YOLO
    print("Pre-downloading YOLO models during build...")
    try:
        YOLO("yolov12n.pt")
    except Exception as e:
        print(f"yolov12n download fallback: {e}")
    YOLO("yolo11n.pt")
    YOLO("yolov8n.pt")
    print("Pre-download completed.")

# 1. Definisikan Container Image lengkap dengan library OpenCV, Torch & Pre-baked YOLO
image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("libgl1", "libglib2.0-0", "libgomp1", "curl")
    .pip_install(
        "fastapi>=0.111.0",
        "uvicorn[standard]>=0.30.0",
        "ultralytics>=8.3.0",
        "opencv-python-headless>=4.10.0.84",
        "numpy>=1.26.0",
        "websockets>=12.0",
        "pydantic>=2.7.0",
        "python-multipart>=0.0.9",
        "requests>=2.32.0",
        "torchvision",
        "torch",
    )
    .run_function(predownload_models)
    .add_local_dir("app", remote_path="/root/app")
)

# 2. Inisialisasi Modal App
app = modal.App("bali-atcs-yolov12", image=image)

# 3. Expose FastAPI Serverless Endpoint dengan Akselerasi GPU (T4)
@app.function(
    gpu="T4",               # Gunakan GPU Nvidia T4 Serverless
    scaledown_window=300,   # Keep container warm for 5 minutes after last request
    timeout=1800,           # Maksimum durasi streaming session (30 menit)
)
@modal.asgi_app()
def serve():
    from app.main import app as fastapi_app
    return fastapi_app
