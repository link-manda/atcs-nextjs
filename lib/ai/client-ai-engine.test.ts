import {
  getClientAIModel,
  resetClientAIModel,
  runClientVehicleInference,
  subscribeModelProgress,
  clearClientAICache,
  CANVAS_SIZE,
} from "./client-ai-engine";

// Mock @xenova/transformers
jest.mock("@xenova/transformers", () => {
  return {
    pipeline: jest.fn(),
    env: {
      allowLocalModels: true,
      useBrowserCache: false,
    },
  };
});

import { pipeline } from "@xenova/transformers";

describe("Client AI Engine (YOLOv8 Nano)", () => {
  let mockDetector: jest.Mock;

  beforeEach(() => {
    resetClientAIModel();
    jest.clearAllMocks();

    mockDetector = jest.fn().mockResolvedValue([
      {
        label: "car",
        score: 0.85,
        box: { xmin: 100, ymin: 100, xmax: 200, ymax: 200 },
      },
      {
        label: "motorcycle",
        score: 0.75,
        box: { xmin: 300, ymin: 150, xmax: 350, ymax: 220 },
      },
      {
        label: "person", // Should be filtered out
        score: 0.9,
        box: { xmin: 50, ymin: 50, xmax: 80, ymax: 120 },
      },
    ]);

    (pipeline as jest.Mock).mockResolvedValue(mockDetector);
  });

  it("exports 640px CANVAS_SIZE matching YOLOv8 geometry", () => {
    expect(CANVAS_SIZE).toBe(640);
  });

  it("initializes model singleton and notifies progress subscribers", async () => {
    const progressUpdates: any[] = [];
    const unsubscribe = subscribeModelProgress((info) => {
      progressUpdates.push(info);
    });

    const model = await getClientAIModel();
    expect(pipeline).toHaveBeenCalledWith("object-detection", "Xenova/yolov8n", expect.any(Object));
    expect(model).toBe(mockDetector);

    // Call again to verify singleton behavior
    const model2 = await getClientAIModel();
    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(model2).toBe(model);

    unsubscribe();
  });

  it("filters non-vehicle objects and normalizes bounding boxes and centroids", async () => {
    const mockVideo = {
      videoWidth: 1280,
      videoHeight: 720,
    } as unknown as HTMLVideoElement;

    const result = await runClientVehicleInference(mockVideo, 0.25, false, false);

    expect(mockDetector).toHaveBeenCalled();
    // Only 'car' and 'motorcycle' should be in detections, 'person' must be filtered out
    expect(result.detections.length).toBe(2);

    // Car detection verification
    const car = result.detections.find((d) => d.category === "car");
    expect(car).toBeDefined();
    expect(car?.confidence).toBe(0.85);

    // Scaling: videoWidth 1280 / 640 = 2, videoHeight 720 / 640 = 1.125
    // xmin: 100 * 2 = 200, width: (200 - 100) * 2 = 200
    // ymin: 100 * 1.125 = 113 (rounded), height: (200 - 100) * 1.125 = 113 (rounded)
    expect(car?.bbox[0]).toBe(200);
    expect(car?.bbox[2]).toBe(200);
    expect(car?.centroid[0]).toBe(300); // 200 + 200/2

    // Motorcycle detection verification
    const moto = result.detections.find((d) => d.category === "motorcycle");
    expect(moto).toBeDefined();
    expect(moto?.confidence).toBe(0.75);
  });

  it("correctly handles bicycle as motorcycle and bus/truck categories", async () => {
    mockDetector.mockResolvedValueOnce([
      {
        label: "bicycle",
        score: 0.8,
        box: { xmin: 10, ymin: 20, xmax: 30, ymax: 50 },
      },
      {
        label: "bus",
        score: 0.92,
        box: { xmin: 50, ymin: 50, xmax: 150, ymax: 200 },
      },
      {
        label: "truck",
        score: 0.88,
        box: { xmin: 200, ymin: 200, xmax: 350, ymax: 400 },
      },
    ]);

    const mockVideo = {
      videoWidth: 640,
      videoHeight: 480,
    } as unknown as HTMLVideoElement;

    const result = await runClientVehicleInference(mockVideo, 0.25, false, false);

    expect(result.detections.length).toBe(3);
    expect(result.detections.map((d) => d.category)).toEqual(["motorcycle", "bus", "truck"]);
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

    localStorage.setItem("ai_cam_pref_1", JSON.stringify({ targetFps: 25 }));
    localStorage.setItem("NEXT_PUBLIC_TOMTOM_API_KEY", "keep_this_key");

    await clearClientAICache(false);

    expect(mockDelete).toHaveBeenCalledWith("transformers-cache");
    expect(mockDelete).not.toHaveBeenCalledWith("user-other-cache");
    expect(localStorage.getItem("ai_cam_pref_1")).toBeNull();
    expect(localStorage.getItem("NEXT_PUBLIC_TOMTOM_API_KEY")).toBe("keep_this_key");
  });
});
