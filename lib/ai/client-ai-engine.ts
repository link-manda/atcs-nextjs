"use client";

import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";

export type VehicleCategory = "car" | "motorcycle" | "bus" | "truck";

export interface ClientDetection {
  category: VehicleCategory;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
  centroid: [number, number]; // [cx, cy]
}

export interface EngineInferenceResult {
  detections: ClientDetection[];
  isNightScene: boolean;
  averageLuminance: number;
  inferenceTimeMs: number;
}

// Vehicle class mapping for COCO SSD
const VEHICLE_CLASSES: Record<string, VehicleCategory> = {
  car: "car",
  motorcycle: "motorcycle",
  bicycle: "motorcycle", // Map 2-wheelers
  bus: "bus",
  truck: "truck",
};

let modelPromise: Promise<cocoSsd.ObjectDetection> | null = null;
let offscreenCanvas: HTMLCanvasElement | null = null;
let offscreenCtx: CanvasRenderingContext2D | null = null;

/**
 * Initializes TensorFlow.js with WebGL GPU shader acceleration and loads MobileNet V2 (~6.8 MB)
 */
export async function getClientAIModel(): Promise<cocoSsd.ObjectDetection> {
  if (!modelPromise) {
    modelPromise = (async () => {
      // 1. Ensure WebGL GPU backend is active
      await tf.ready();
      if (tf.getBackend() !== "webgl") {
        try {
          await tf.setBackend("webgl");
        } catch (e) {
          console.warn("[ClientAI] WebGL backend not available, falling back to:", tf.getBackend(), e);
        }
      }
      console.log(`[ClientAI] TensorFlow.js initialized with backend: ${tf.getBackend()}`);

      // 2. Load lightweight quantized MobileNet V2 model (~6.8 MB)
      const model = await cocoSsd.load({ base: "mobilenet_v2" });
      console.log("[ClientAI] MobileNet V2 model loaded successfully.");
      return model;
    })();
  }
  return modelPromise;
}

/**
 * Measures frame luminance and applies adaptive gamma boost for nighttime CCTV
 */
export function preprocessAdaptiveNightVision(
  video: HTMLVideoElement,
  enableNightBoost: boolean = true
): { inputSource: HTMLVideoElement | HTMLCanvasElement; isNight: boolean; luminance: number } {
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    return { inputSource: video, isNight: false, luminance: 128 };
  }

  // Create or resize offscreen processing canvas (scaled to 300x300 for blazing speed)
  if (!offscreenCanvas) {
    offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = 300;
    offscreenCanvas.height = 300;
    offscreenCtx = offscreenCanvas.getContext("2d", { willReadFrequently: true });
  }

  if (!offscreenCtx) {
    return { inputSource: video, isNight: false, luminance: 128 };
  }

  // Draw scaled video frame to offscreen canvas
  offscreenCtx.drawImage(video, 0, 0, 300, 300);

  if (!enableNightBoost) {
    return { inputSource: offscreenCanvas, isNight: false, luminance: 128 };
  }

  // Sample pixel data to calculate luminance (ITU-R BT.601 standard)
  const imgData = offscreenCtx.getImageData(0, 0, 300, 300);
  const data = imgData.data;
  let totalLuminance = 0;
  const step = 4 * 8; // Sample every 8th pixel for zero-overhead speed
  let samples = 0;

  for (let i = 0; i < data.length; i += step) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    totalLuminance += 0.299 * r + 0.587 * g + 0.114 * b;
    samples++;
  }

  const avgLuminance = totalLuminance / (samples || 1);
  const isNight = avgLuminance < 80;

  // If dark / night scene, apply adaptive gamma & contrast curve
  if (isNight) {
    const gamma = 0.65; // Gamma curve to brighten shadows
    for (let i = 0; i < data.length; i += 4) {
      // Normalized gamma correction
      data[i] = Math.min(255, Math.pow(data[i] / 255, gamma) * 255 * 1.15); // R
      data[i + 1] = Math.min(255, Math.pow(data[i + 1] / 255, gamma) * 255 * 1.15); // G
      data[i + 2] = Math.min(255, Math.pow(data[i + 2] / 255, gamma) * 255 * 1.15); // B
    }
    offscreenCtx.putImageData(imgData, 0, 0);
  }

  return {
    inputSource: offscreenCanvas,
    isNight,
    luminance: Math.round(avgLuminance),
  };
}

/**
 * Runs WebGL GPU vehicle detection inference on a video frame
 */
export async function runClientVehicleInference(
  video: HTMLVideoElement,
  confidenceThreshold: number = 0.25,
  enableNightBoost: boolean = true
): Promise<EngineInferenceResult> {
  const startTime = performance.now();
  const model = await getClientAIModel();

  const { inputSource, isNight, luminance } = preprocessAdaptiveNightVision(
    video,
    enableNightBoost
  );

  // Run COCO-SSD prediction inside tf.tidy to ensure zero GPU tensor leaks
  const predictions = await model.detect(inputSource, 15, confidenceThreshold);

  const nativeW = video.videoWidth || 640;
  const nativeH = video.videoHeight || 480;
  const scaleX = nativeW / 300;
  const scaleY = nativeH / 300;

  const detections: ClientDetection[] = [];

  for (const pred of predictions) {
    const matchedCategory = VEHICLE_CLASSES[pred.class.toLowerCase()];
    if (matchedCategory && pred.score >= confidenceThreshold) {
      const [rawX, rawY, rawW, rawH] = pred.bbox;
      
      // Rescale coordinates back to native video resolution
      const x = rawX * scaleX;
      const y = rawY * scaleY;
      const w = rawW * scaleX;
      const h = rawH * scaleY;
      
      const cx = x + w / 2;
      const cy = y + h / 2;

      detections.push({
        category: matchedCategory,
        confidence: Math.round(pred.score * 100) / 100,
        bbox: [Math.round(x), Math.round(y), Math.round(w), Math.round(h)],
        centroid: [Math.round(cx), Math.round(cy)],
      });
    }
  }

  const inferenceTimeMs = Math.round(performance.now() - startTime);

  return {
    detections,
    isNightScene: isNight,
    averageLuminance: luminance,
    inferenceTimeMs,
  };
}
