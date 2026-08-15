---
title: Bali ATCS YOLOv12 Backend
emoji: 🚦
colorFrom: cyan
colorTo: blue
sdk: docker
app_port: 7860
---

# 🚦 Bali ATCS — YOLOv12 Traffic AI Backend Microservice

Backend microservice berbasis **FastAPI + Ultralytics YOLOv12 + ByteTrack** untuk pemantauan lalu lintas dan penghitungan kendaraan real-time CCTV ATCS Bali.

---

## 🌟 Fitur Utama
* **YOLOv12 SOTA Inference:** Deteksi presisi tinggi untuk mobil, motor/skuter, bus, dan truk di segala kondisi cuaca/malam hari.
* **ByteTrack Multi-Object Tracking:** Melacak lintasan kendaraan (*trajectory*) secara akurat dengan ID persisten.
* **WebSocket Real-time Stream:** Memancarkan koordinat bounding box, arah laju (*north/south*), dan total hitungan ke frontend Next.js.
* **Hardware Acceleration Auto-Detect:** Otomatis memanfaatkan **NVIDIA CUDA**, **Apple Silicon MPS (Metal)**, atau **CPU**.
* **Zero Client Lag:** Komputasi berat dilakukan di backend, browser client tetap $100\%$ ringan di 60 FPS.

---

## 🚀 Cara Menjalankan Secara Lokal

### 1. Prasyarat
* Python 3.9 - 3.11
* Pip & Virtualenv

### 2. Instalasi & Menjalankan
```bash
# Masuk ke direktori python-backend
cd python-backend

# Buat virtual environment
python3 -m venv venv
source venv/bin/activate  # Untuk Linux/macOS
# venv\Scripts\activate   # Untuk Windows

# Install dependencies
pip install -r requirements.txt

# Jalankan server FastAPI
uvicorn app.main:app --host 0.0.0.0 --port 7860 --reload
```

Server akan aktif di: `http://localhost:7860`  
Dokumentasi Swagger API: `http://localhost:7860/docs`

---

## ☁️ Panduan Deploy ke Cloud Free Tier

### Opsi 1: Modal.com (Serverless GPU — $30/bulan Gratis — Sangat Cepat!)
Modal menyediakan akses GPU serverless (Nvidia T4 / A10G) gratis dengan kuota kredit $30 setiap bulan:

1. **Install Modal CLI & Login:**
   ```bash
   pip install modal
   modal setup
   ```
2. **Uji Coba Live (Dev Mode):**
   ```bash
   cd python-backend
   modal serve modal_app.py
   ```
3. **Deploy Permanen ke Production:**
   ```bash
   modal deploy modal_app.py
   ```
4. Modal akan memberikan URL live, misalnya:  
   `https://<username>--bali-atcs-yolov12-serve.modal.run`  
   Gunakan URL WebSocket ini di Next.js AI Station:  
   `wss://<username>--bali-atcs-yolov12-serve.modal.run/ws/track`

---

### Opsi 2: Hugging Face Spaces (Docker Free Tier)
1. Buka [huggingface.co/spaces](https://huggingface.co/spaces) dan buat Space baru.
2. Beri nama (misal: `atcs-yolo-backend`).
3. Pilih **SDK: Docker** (Blank).
4. Pilih **Free Tier (CPU Basic / T4 GPU if available)**.
5. Push isi folder `python-backend/` ini ke repository Git Space tersebut.
6. Hugging Face akan otomatis mem-build Dockerfile dan memberikan URL live HTTPS/WSS:
   `wss://<username>-atcs-yolo-backend.hf.space/ws/track`

---

### Opsi B: Render.com (Free Web Service)
1. Buka [render.com](https://render.com) dan buat **New Web Service**.
2. Hubungkan repository GitHub Anda.
3. Tentukan Root Directory: `python-backend`.
4. Pilih Environment: **Docker**.
5. Pilih Instance Type: **Free**.
6. Klik **Create Web Service**. URL backend Anda siap digunakan!

---

## 📡 API & WebSocket Reference

### 1. Health Check
`GET /health`
```json
{
  "status": "healthy",
  "device": "mps",
  "model": "yolov12n.pt",
  "timestamp": 1723700123.45
}
```

### 2. WebSocket Live Tracking
`WS /ws/track?stream_url={CCTV_URL}&tripwire_y=0.55&confidence=0.25`

**Payload JSON yang Diterima Frontend:**
```json
{
  "timestamp": 1723700120500,
  "fps": 34.2,
  "resolution": { "width": 1280, "height": 720 },
  "tripwire_y": 0.55,
  "counts": {
    "total": 28,
    "cars": 10,
    "motorcycles": 16,
    "buses": 1,
    "trucks": 1
  },
  "line_crossed": true,
  "detections": [
    {
      "id": 5,
      "category": "motorcycle",
      "confidence": 0.91,
      "bbox": [210.5, 340.2, 55.0, 78.4],
      "centroid": [238.0, 379.2],
      "direction": "down",
      "counted": true
    }
  ]
}
```
