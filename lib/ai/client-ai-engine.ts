"use client";

import { createInferenceWorker } from "./create-inference-worker";
import type { RawPrediction, WorkerRequest, WorkerResponse } from "./inference-protocol";

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
  processedCanvas: HTMLCanvasElement | null;
}

export type ModelLoadingStatus = "idle" | "loading" | "ready" | "error";

export interface ModelProgressInfo {
  status: ModelLoadingStatus;
  progress: number; // 0 to 100
  file?: string;
  loaded?: number;
  total?: number;
}

export type ModelProgressCallback = (info: ModelProgressInfo) => void;

// Vehicle class mapping for YOLOv8 COCO labels
const VEHICLE_CLASSES: Record<string, VehicleCategory> = {
  car: "car",
  motorcycle: "motorcycle",
  bicycle: "motorcycle", // 2-wheeler mapping
  bus: "bus",
  truck: "truck",
};

// High-resolution 640px matching YOLOv8 native input architecture
export const CANVAS_SIZE = 640;

let worker: Worker | null = null;
let loadPromise: Promise<void> | null = null;
let loadSettle: { resolve: () => void; reject: (err: Error) => void } | null = null;
let nextFrameId = 0;
const pendingDetections = new Map<
  number,
  { resolve: (predictions: RawPrediction[]) => void; reject: (err: Error) => void }
>();
let offscreenCanvas: HTMLCanvasElement | null = null;
let offscreenCtx: CanvasRenderingContext2D | null = null;

// Progress tracking listeners
const modelProgressListeners = new Set<ModelProgressCallback>();
let currentProgressInfo: ModelProgressInfo = { status: "idle", progress: 0 };

export function getModelProgress(): ModelProgressInfo {
  return currentProgressInfo;
}

export function subscribeModelProgress(cb: ModelProgressCallback): () => void {
  modelProgressListeners.add(cb);
  cb(currentProgressInfo);
  return () => {
    modelProgressListeners.delete(cb);
  };
}

export function setModelProgressForTest(info: ModelProgressInfo): void {
  notifyModelProgress(info);
}

function notifyModelProgress(info: ModelProgressInfo): void {
  currentProgressInfo = info;
  modelProgressListeners.forEach((listener) => {
    try {
      listener(info);
    } catch (e) {
      console.warn("[ClientAI] Progress listener error:", e);
    }
  });
}

// Official YOLOv10 Nano WebGPU ONNX Model
export const AI_MODEL_NAME = "onnx-community/yolov10n";

// Circuit breaker to prevent rapid network retry loops on failure
let lastLoadError: Error | null = null;
let lastLoadErrorTime = 0;
export const LOAD_COOLDOWN_MS = 10000; // 10 seconds cooldown

function postToWorker(message: WorkerRequest, transfer: Transferable[] = []): void {
  if (!worker) {
    worker = createInferenceWorker();
    worker.onmessage = handleWorkerMessage;
    worker.onerror = (event: ErrorEvent) => failWorker(new Error(event.message || "Inference worker crashed"));
  }
  worker.postMessage(message, transfer);
}

function handleWorkerMessage(event: MessageEvent<WorkerResponse>): void {
  const msg = event.data;
  switch (msg.type) {
    case "progress":
      notifyModelProgress(msg.info);
      break;
    case "ready":
      notifyModelProgress({ status: "ready", progress: 100 });
      console.log(`[ClientAI] ${AI_MODEL_NAME} pipeline ready.`);
      lastLoadError = null;
      lastLoadErrorTime = 0;
      loadSettle?.resolve();
      loadSettle = null;
      break;
    case "loadError":
      loadSettle?.reject(new Error(msg.message));
      loadSettle = null;
      break;
    case "result": {
      // Responses for unknown ids (e.g. after a reset) are stale and ignored
      const pending = pendingDetections.get(msg.id);
      if (pending) {
        pendingDetections.delete(msg.id);
        pending.resolve(msg.predictions);
      }
      break;
    }
    case "error": {
      const pending = pendingDetections.get(msg.id);
      if (pending) {
        pendingDetections.delete(msg.id);
        pending.reject(new Error(msg.message));
      }
      break;
    }
  }
}

function teardownWorker(reason: Error): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  pendingDetections.forEach((pending) => pending.reject(reason));
  pendingDetections.clear();
}

function failWorker(err: Error): void {
  const wasLoading = loadSettle !== null;
  const settle = loadSettle;
  loadSettle = null;
  teardownWorker(err);
  if (wasLoading) {
    settle?.reject(err);
  } else {
    console.error("[ClientAI] Inference worker failed:", err);
    notifyModelProgress({ status: "error", progress: 0 });
    lastLoadError = err;
    lastLoadErrorTime = Date.now();
    loadPromise = null;
  }
}

/**
 * Starts the inference worker and loads the model inside it (~9.6 MB INT8 ONNX).
 * Resolves once the model is ready. Download progress is forwarded to subscribers.
 */
export async function getClientAIModel(): Promise<void> {
  // Fast fail during cooldown period to protect browser event loop
  if (lastLoadError && Date.now() - lastLoadErrorTime < LOAD_COOLDOWN_MS) {
    throw lastLoadError;
  }

  if (!loadPromise) {
    notifyModelProgress({ status: "loading", progress: 0 });
    console.log(`[ClientAI] Initializing ${AI_MODEL_NAME} object detection pipeline...`);
    const attempt: Promise<void> = new Promise<void>((resolve, reject) => {
      loadSettle = { resolve, reject };
      postToWorker({ type: "load", model: AI_MODEL_NAME });
    }).catch((err: unknown) => {
      const error = err instanceof Error ? err : new Error(String(err));
      // A reset already replaced this attempt: just propagate to the awaiting caller
      if (loadPromise === attempt) {
        console.error(`[ClientAI] Failed to load ${AI_MODEL_NAME} model:`, error);
        notifyModelProgress({ status: "error", progress: 0 });
        lastLoadError = error;
        lastLoadErrorTime = Date.now();
        loadSettle = null;
        loadPromise = null;
        teardownWorker(error);
      }
      throw error;
    });
    loadPromise = attempt;
  }
  return loadPromise;
}

function detectInWorker(buffer: ArrayBuffer, threshold: number): Promise<RawPrediction[]> {
  const id = ++nextFrameId;
  return new Promise<RawPrediction[]>((resolve, reject) => {
    pendingDetections.set(id, { resolve, reject });
    postToWorker(
      { type: "detect", id, model: AI_MODEL_NAME, buffer, width: CANVAS_SIZE, height: CANVAS_SIZE, threshold },
      [buffer]
    );
  });
}

/**
 * Terminate the worker and clear circuit breaker (useful for manual retry or cache purge)
 */
export function resetClientAIModel(): void {
  const settle = loadSettle;
  const reason = new Error("AI engine reset");
  loadSettle = null;
  loadPromise = null;
  teardownWorker(reason);
  settle?.reject(reason);
  lastLoadError = null;
  lastLoadErrorTime = 0;
  notifyModelProgress({ status: "idle", progress: 0 });
}

/**
 * Clears cached YOLOv8/Transformers.js models from browser CacheStorage, IndexedDB, and localStorage.
 */
export async function clearClientAICache(reloadPage: boolean = true): Promise<void> {
  try {
    resetClientAIModel();

    if (typeof window !== "undefined" && "caches" in window) {
      try {
        const keys = await window.caches.keys();
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          if (/^(transformers|xenova|onnx|tensorflow|tfjs|coco-ssd)/i.test(key)) {
            await window.caches.delete(key);
          }
        }
      } catch (e) {
        console.warn("[ClientAI] CacheStorage clear skipped:", e);
      }
    }

    if (typeof window !== "undefined" && window.indexedDB && window.indexedDB.databases) {
      try {
        const dbs = await window.indexedDB.databases();
        for (let i = 0; i < dbs.length; i++) {
          const dbName = dbs[i].name;
          if (dbName && /^(transformers|xenova|onnx|tensorflow|tfjs)/i.test(dbName)) {
            window.indexedDB.deleteDatabase(dbName);
          }
        }
      } catch (e) {
        console.warn("[ClientAI] IndexedDB enumeration skipped:", e);
      }
    }

    // Selectively clear AI preferences, preserving API keys (e.g. tomtom_api_key)
    if (typeof localStorage !== "undefined") {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith("ai_cam_pref_") ||
            key.startsWith("xenova_") ||
            key.startsWith("transformers_") ||
            key.startsWith("tfjs_") ||
            key.startsWith("tensorflow"))
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    }

    if (typeof sessionStorage !== "undefined") {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith("ai_") || key.startsWith("xenova_") || key.startsWith("tfjs_"))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => sessionStorage.removeItem(k));
    }

    if (reloadPage && typeof window !== "undefined" && typeof window.location?.reload === "function") {
      window.location.reload();
    }
  } catch (err) {
    console.error("[ClientAI] Failed to clear AI cache:", err);
  }
}

// 256-byte Lookup Table for Night Mode Gamma Boost (gamma = 0.65, factor = 1.15)
const NIGHT_GAMMA_LUT = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  const boosted = Math.pow(i / 255, 0.65) * 255 * 1.15;
  NIGHT_GAMMA_LUT[i] = boosted > 255 ? 255 : (boosted | 0);
}

// Reusable scratch buffer to eliminate GC heap churn at 15-30 FPS
let scratchBuffer: Uint8ClampedArray | null = null;

/**
 * Enhanced Bird's-Eye POV & High-Resolution Preprocessor:
 * 1. 640px Extraction matching YOLOv8 geometry
 * 2. Spatial Unsharp Masking (High-Pass Kernel Sharpening) for vehicle contours
 * 3. Adaptive Gamma & Contrast Stretching for Night CCTV (O(1) LUT)
 */
export function preprocessAdaptiveVision(
  video: HTMLVideoElement,
  enableNightBoost: boolean = true,
  enableSharpening: boolean = true
): {
  pixels: Uint8ClampedArray;
  inputSource: HTMLCanvasElement;
  isNight: boolean;
  luminance: number;
  canvas: HTMLCanvasElement;
} {
  if (!offscreenCanvas) {
    offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = CANVAS_SIZE;
    offscreenCanvas.height = CANVAS_SIZE;
    offscreenCtx = offscreenCanvas.getContext("2d", { willReadFrequently: true });
  }

  if (!offscreenCtx) {
    return {
      pixels: new Uint8ClampedArray(CANVAS_SIZE * CANVAS_SIZE * 4),
      inputSource: offscreenCanvas,
      isNight: false,
      luminance: 128,
      canvas: offscreenCanvas,
    };
  }

  // Draw scaled video frame to offscreen canvas
  offscreenCtx.drawImage(video, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // Sample pixel data to calculate luminance (ITU-R BT.601 standard)
  const imgData = offscreenCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  const data = imgData.data;
  let totalLuminance = 0;
  const step = 4 * 16; // Fast sampling
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

  let modified = false;

  // 1. Night Vision Gamma Boost with O(1) Precomputed LUT
  if (isNight && enableNightBoost) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = NIGHT_GAMMA_LUT[data[i]];
      data[i + 1] = NIGHT_GAMMA_LUT[data[i + 1]];
      data[i + 2] = NIGHT_GAMMA_LUT[data[i + 2]];
    }
    modified = true;
  }

  // 2. High-Pass Spatial Unsharp Masking Kernel (Sharpening Filter) with reused scratch buffer
  if (enableSharpening) {
    if (!scratchBuffer || scratchBuffer.length !== data.length) {
      scratchBuffer = new Uint8ClampedArray(data.length);
    }
    scratchBuffer.set(data);
    const copy = scratchBuffer;
    const w = CANVAS_SIZE;
    const h = CANVAS_SIZE;

    // Fast 3x3 kernel convolution on RGB channels with direct index offsets
    for (let y = 1; y < h - 1; y += 1) {
      const rowOffset = y * w;
      const topOffset = (y - 1) * w;
      const bottomOffset = (y + 1) * w;

      for (let x = 1; x < w - 1; x += 1) {
        const idx = (rowOffset + x) << 2;
        const topIdx = (topOffset + x) << 2;
        const btmIdx = (bottomOffset + x) << 2;
        const leftIdx = idx - 4;
        const rightIdx = idx + 4;

        for (let c = 0; c < 3; c++) {
          const center = copy[idx + c];
          const top = copy[topIdx + c];
          const bottom = copy[btmIdx + c];
          const left = copy[leftIdx + c];
          const right = copy[rightIdx + c];

          // High-pass filter boost
          const sharpVal = center * 2.4 - (top + bottom + left + right) * 0.35;
          data[idx + c] = sharpVal < 0 ? 0 : sharpVal > 255 ? 255 : (sharpVal | 0);
        }
      }
    }
    modified = true;
  }

  if (modified) {
    offscreenCtx.putImageData(imgData, 0, 0);
  }

  // Pixel buffer is transferred (not copied) to the worker, which builds the RawImage
  // and runs inference off the UI thread.
  return {
    pixels: data,
    inputSource: offscreenCanvas,
    isNight,
    luminance: Math.round(avgLuminance),
    canvas: offscreenCanvas,
  };
}

/**
 * Runs object detection on a video frame inside the inference worker with 640px High-Def & Perspective Scaling
 */
export async function runClientVehicleInference(
  video: HTMLVideoElement,
  confidenceThreshold: number = 0.25,
  enableNightBoost: boolean = true,
  enableSharpening: boolean = true
): Promise<EngineInferenceResult> {
  const startTime = performance.now();
  await getClientAIModel();

  const { pixels, isNight, luminance, canvas } = preprocessAdaptiveVision(
    video,
    enableNightBoost,
    enableSharpening
  );

  // Baseline threshold for YOLOv8
  const baseThreshold = Math.max(0.15, confidenceThreshold * 0.7);

  const rawPredictions: RawPrediction[] = await detectInWorker(pixels.buffer as ArrayBuffer, baseThreshold);

  const nativeW = video.videoWidth || 640;
  const nativeH = video.videoHeight || 480;
  const scaleX = nativeW / CANVAS_SIZE;
  const scaleY = nativeH / CANVAS_SIZE;

  const detections: ClientDetection[] = [];
  const predictions = Array.isArray(rawPredictions) ? rawPredictions : [];

  for (let i = 0; i < predictions.length; i++) {
    const pred = predictions[i];
    const labelKey = String(pred.label || "").toLowerCase();
    const matchedCategory = VEHICLE_CLASSES[labelKey];

    if (matchedCategory && pred.box) {
      const { xmin, ymin, xmax, ymax } = pred.box;
      const rawW = Math.max(0, xmax - xmin);
      const rawH = Math.max(0, ymax - ymin);

      // Depth-aware perspective thresholding for Bird's-Eye camera:
      // Vehicles far away (top of screen) have smaller profile -> lower required threshold
      const normalizedY = Math.max(0, Math.min(1, ymin / CANVAS_SIZE));
      const dynamicThreshold = confidenceThreshold * (0.75 + 0.35 * normalizedY);

      if (pred.score >= dynamicThreshold) {
        const x = xmin * scaleX;
        const y = ymin * scaleY;
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
  }

  const inferenceTimeMs = Math.round(performance.now() - startTime);

  return {
    detections,
    isNightScene: isNight,
    averageLuminance: luminance,
    inferenceTimeMs,
    processedCanvas: canvas,
  };
}
