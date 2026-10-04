import { AutoModel, AutoProcessor, env, RawImage } from "@huggingface/transformers";
import type { WorkerRequest, WorkerResponse } from "./inference-protocol";
import { postProcessYolo } from "./yolo-postprocess";

env.allowLocalModels = false;
env.useBrowserCache = true;

const ctx = self as unknown as {
  postMessage: (message: WorkerResponse) => void;
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
};

let modelPromise: Promise<any> | null = null;
let processorPromise: Promise<any> | null = null;

async function loadModel(modelId: string) {
  if (!modelPromise) {
    const progressCallback = (data: any) => {
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
    };

    // Try webgpu first, then fallback to wasm
    modelPromise = AutoModel.from_pretrained(modelId, {
      progress_callback: progressCallback,
      device: "webgpu",
      dtype: "fp32", // fp16 can be problematic on some devices, using fp32 for safety first
    }).catch((err) => {
      console.warn("WebGPU model load failed, falling back to wasm", err);
      return AutoModel.from_pretrained(modelId, {
        progress_callback: progressCallback,
        device: "wasm",
        dtype: "q8",
      });
    });

    processorPromise = AutoProcessor.from_pretrained(modelId, {
      progress_callback: progressCallback,
    });
  }
  return Promise.all([modelPromise, processorPromise]);
}

ctx.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;

  if (msg.type === "load") {
    try {
      await loadModel(msg.model);
      ctx.postMessage({ type: "ready" });
    } catch (err) {
      ctx.postMessage({ type: "loadError", message: err instanceof Error ? err.message : String(err) });
    }
    return;
  }

  if (msg.type === "detect") {
    try {
      const [model, processor] = await loadModel(msg.model);
      
      const image = new RawImage(new Uint8ClampedArray(msg.buffer), msg.width, msg.height, 4);
      
      // Preprocess
      const inputs = await processor(image);
      
      // Run inference
      const outputs = await model(inputs);
      
      // Postprocess
      const predictions = postProcessYolo(outputs, msg.width, msg.height, msg.threshold);
      
      ctx.postMessage({ type: "result", id: msg.id, predictions });
    } catch (err) {
      ctx.postMessage({ type: "error", id: msg.id, message: err instanceof Error ? err.message : String(err) });
    }
  }
};
