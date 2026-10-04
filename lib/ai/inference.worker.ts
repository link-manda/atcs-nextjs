import { pipeline, env, RawImage } from "@xenova/transformers";

/**
 * Inference Web Worker.
 * Owns model download + ONNX execution so the UI thread never blocks on inference.
 * Protocol is defined in lib/ai/inference-protocol.ts.
 */
import type { WorkerRequest, WorkerResponse } from "./inference-protocol";

env.allowLocalModels = false;
env.useBrowserCache = true;

const ctx = self as unknown as {
  postMessage: (message: WorkerResponse) => void;
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Detector = (image: RawImage, options: { threshold: number; percentage: boolean }) => Promise<any>;

let detectorPromise: Promise<Detector> | null = null;

function loadDetector(model: string): Promise<Detector> {
  if (!detectorPromise) {
    detectorPromise = pipeline("object-detection", model, {
      progress_callback: (data: { status?: string; progress?: number; file?: string; loaded?: number; total?: number }) => {
        if (data && data.status === "progress" && typeof data.progress === "number") {
          ctx.postMessage({
            type: "progress",
            info: {
              status: "loading",
              progress: Math.min(100, Math.max(0, Math.round(data.progress))),
              file: data.file,
              loaded: data.loaded,
              total: data.total,
            },
          });
        } else if (data && data.status === "done") {
          ctx.postMessage({ type: "progress", info: { status: "loading", progress: 100, file: data.file } });
        }
      },
    }) as unknown as Promise<Detector>;
    detectorPromise.catch(() => {
      detectorPromise = null;
    });
  }
  return detectorPromise;
}

ctx.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;

  if (msg.type === "load") {
    try {
      await loadDetector(msg.model);
      ctx.postMessage({ type: "ready" });
    } catch (err) {
      ctx.postMessage({ type: "loadError", message: err instanceof Error ? err.message : String(err) });
    }
    return;
  }

  if (msg.type === "detect") {
    try {
      const detector = await loadDetector(msg.model);
      const image = new RawImage(new Uint8ClampedArray(msg.buffer), msg.width, msg.height, 4);
      const predictions = await detector(image, { threshold: msg.threshold, percentage: false });
      ctx.postMessage({ type: "result", id: msg.id, predictions: Array.isArray(predictions) ? predictions : [] });
    } catch (err) {
      ctx.postMessage({ type: "error", id: msg.id, message: err instanceof Error ? err.message : String(err) });
    }
  }
};
