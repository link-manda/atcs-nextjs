import {
  getClientAIModel,
  resetClientAIModel,
  runClientVehicleInference,
  subscribeModelProgress,
  clearClientAICache,
  getModelProgress,
  CANVAS_SIZE,
} from "./client-ai-engine";
import { createInferenceWorker } from "./create-inference-worker";
import type { RawPrediction, WorkerRequest, WorkerResponse } from "./inference-protocol";

jest.mock("./create-inference-worker", () => ({
  createInferenceWorker: jest.fn(),
}));

const DEFAULT_PREDICTIONS: RawPrediction[] = [
  { label: "car", score: 0.85, box: { xmin: 100, ymin: 100, xmax: 200, ymax: 200 } },
  { label: "motorcycle", score: 0.75, box: { xmin: 300, ymin: 150, xmax: 350, ymax: 220 } },
  { label: "person", score: 0.9, box: { xmin: 50, ymin: 50, xmax: 80, ymax: 120 } }, // filtered out
];

class FakeWorker {
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminate = jest.fn();
  postMessage = jest.fn((message: WorkerRequest) => {
    Promise.resolve().then(() => this.handle(message));
  });

  constructor(
    private readonly options: {
      loadError?: string;
      predictions?: RawPrediction[];
      beforeResult?: (worker: FakeWorker, id: number) => void;
    } = {}
  ) {}

  emit(message: WorkerResponse): void {
    this.onmessage?.({ data: message } as MessageEvent<WorkerResponse>);
  }

  private handle(message: WorkerRequest): void {
    if (message.type === "load") {
      if (this.options.loadError) {
        this.emit({ type: "loadError", message: this.options.loadError });
      } else {
        this.emit({ type: "progress", info: { status: "loading", progress: 50 } });
        this.emit({ type: "ready" });
      }
      return;
    }
    this.options.beforeResult?.(this, message.id);
    this.emit({ type: "result", id: message.id, predictions: this.options.predictions ?? DEFAULT_PREDICTIONS });
  }
}

function useWorker(worker: FakeWorker): void {
  (createInferenceWorker as jest.Mock).mockReturnValueOnce(worker);
}

const mockVideo = (w: number, h: number) =>
  ({ videoWidth: w, videoHeight: h }) as unknown as HTMLVideoElement;

describe("Client AI Engine (worker-based)", () => {
  beforeEach(() => {
    resetClientAIModel();
    jest.clearAllMocks();
    (createInferenceWorker as jest.Mock).mockReset();
  });

  it("exports 640px CANVAS_SIZE matching YOLOv8 geometry", () => {
    expect(CANVAS_SIZE).toBe(640);
  });

  it("loads the model once inside the worker and forwards progress to subscribers", async () => {
    const worker = new FakeWorker();
    useWorker(worker);
    const updates: number[] = [];
    const unsubscribe = subscribeModelProgress((info) => updates.push(info.progress));

    await getClientAIModel();
    await getClientAIModel();

    expect(createInferenceWorker).toHaveBeenCalledTimes(1);
    expect(worker.postMessage).toHaveBeenCalledTimes(1);
    expect(worker.postMessage.mock.calls[0][0]).toEqual({ type: "load", model: "Xenova/yolos-tiny" });
    expect(updates).toContain(50);
    expect(getModelProgress().status).toBe("ready");
    unsubscribe();
  });

  it("enforces circuit breaker cooldown on load error and avoids respawning the worker", async () => {
    useWorker(new FakeWorker({ loadError: "Network timeout" }));

    await expect(getClientAIModel()).rejects.toThrow("Network timeout");
    expect(createInferenceWorker).toHaveBeenCalledTimes(1);
    expect(getModelProgress().status).toBe("error");

    // Immediate second call fast-fails without creating a new worker
    await expect(getClientAIModel()).rejects.toThrow("Network timeout");
    expect(createInferenceWorker).toHaveBeenCalledTimes(1);

    // Reset clears the circuit breaker
    resetClientAIModel();
    useWorker(new FakeWorker());
    await getClientAIModel();
    expect(createInferenceWorker).toHaveBeenCalledTimes(2);
  });

  it("sends the 640px frame to the worker and never runs inference on the calling thread", async () => {
    const worker = new FakeWorker();
    useWorker(worker);

    await runClientVehicleInference(mockVideo(1280, 720), 0.25, false, false);

    const detect = worker.postMessage.mock.calls.map((c) => c[0]).find((m) => m.type === "detect");
    expect(detect).toEqual(
      expect.objectContaining({ type: "detect", width: 640, height: 640, model: "Xenova/yolos-tiny" })
    );
    // buffer is passed in the transfer list so it is moved, not copied
    const detectCall = worker.postMessage.mock.calls.find((c) => c[0].type === "detect");
    expect(detectCall?.[1]).toHaveLength(1);
  });

  it("filters non-vehicle objects and normalizes bounding boxes and centroids", async () => {
    useWorker(new FakeWorker());

    const result = await runClientVehicleInference(mockVideo(1280, 720), 0.25, false, false);

    // Only 'car' and 'motorcycle' remain, 'person' is filtered out
    expect(result.detections.length).toBe(2);

    const car = result.detections.find((d) => d.category === "car");
    expect(car).toBeDefined();
    expect(car?.confidence).toBe(0.85);

    // Scaling: videoWidth 1280 / 640 = 2
    expect(car?.bbox[0]).toBe(200);
    expect(car?.bbox[2]).toBe(200);
    expect(car?.centroid[0]).toBe(300); // 200 + 200/2

    const moto = result.detections.find((d) => d.category === "motorcycle");
    expect(moto).toBeDefined();
    expect(moto?.confidence).toBe(0.75);
  });

  it("correctly handles bicycle as motorcycle and bus/truck categories", async () => {
    useWorker(
      new FakeWorker({
        predictions: [
          { label: "bicycle", score: 0.8, box: { xmin: 10, ymin: 20, xmax: 30, ymax: 50 } },
          { label: "bus", score: 0.92, box: { xmin: 50, ymin: 50, xmax: 150, ymax: 200 } },
          { label: "truck", score: 0.88, box: { xmin: 200, ymin: 200, xmax: 350, ymax: 400 } },
        ],
      })
    );

    const result = await runClientVehicleInference(mockVideo(640, 480), 0.25, false, false);

    expect(result.detections.map((d) => d.category)).toEqual(["motorcycle", "bus", "truck"]);
  });

  it("ignores stale worker responses whose frame id is unknown", async () => {
    useWorker(
      new FakeWorker({
        beforeResult: (worker) =>
          worker.emit({
            type: "result",
            id: 99999,
            predictions: [{ label: "bus", score: 0.99, box: { xmin: 0, ymin: 0, xmax: 10, ymax: 10 } }],
          }),
      })
    );

    const result = await runClientVehicleInference(mockVideo(1280, 720), 0.25, false, false);

    expect(result.detections.map((d) => d.category)).toEqual(["car", "motorcycle"]);
  });

  it("rejects the pending frame and flags error when the worker crashes", async () => {
    const worker = new FakeWorker({
      beforeResult: (w) => w.onerror?.({ message: "boom" } as ErrorEvent),
    });
    useWorker(worker);
    jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(runClientVehicleInference(mockVideo(640, 480), 0.25, false, false)).rejects.toThrow("boom");

    expect(worker.terminate).toHaveBeenCalled();
    expect(getModelProgress().status).toBe("error");
    (console.error as jest.Mock).mockRestore();
  });

  it("terminates the worker on reset and spawns a fresh one afterwards", async () => {
    const first = new FakeWorker();
    useWorker(first);
    await getClientAIModel();

    resetClientAIModel();
    expect(first.terminate).toHaveBeenCalledTimes(1);
    expect(getModelProgress().status).toBe("idle");

    const second = new FakeWorker();
    useWorker(second);
    await getClientAIModel();
    expect(createInferenceWorker).toHaveBeenCalledTimes(2);
  });

  it("clears AI cache without throwing and preserves non-AI keys", async () => {
    const mockDelete = jest.fn().mockResolvedValue(true);
    Object.defineProperty(window, "caches", {
      value: {
        keys: jest.fn().mockResolvedValue(["transformers-cache", "user-other-cache"]),
        delete: mockDelete,
      },
      writable: true,
    });

    localStorage.setItem("ai_cam_pref_1", JSON.stringify({ targetFps: 25 }));
    localStorage.setItem("NEXT_PUBLIC_TOMTOM_API_KEY", "keep_this_key");

    await clearClientAICache(false);

    expect(mockDelete).toHaveBeenCalledWith("transformers-cache");
    expect(mockDelete).not.toHaveBeenCalledWith("user-other-cache");
    expect(localStorage.getItem("ai_cam_pref_1")).toBeNull();
    expect(localStorage.getItem("NEXT_PUBLIC_TOMTOM_API_KEY")).toBe("keep_this_key");
  });
});
