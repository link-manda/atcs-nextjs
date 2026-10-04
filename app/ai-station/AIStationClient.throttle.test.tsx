import React from "react";
import { render, act } from "@testing-library/react";
import { AIStationClient } from "./AIStationClient";
import { runClientVehicleInference } from "@/lib/ai/client-ai-engine";
import { CCTVChannel } from "@/types/cctv";

jest.mock("@/lib/ai/client-ai-engine", () => ({
  ...jest.requireActual("@/lib/ai/client-ai-engine"),
  getClientAIModel: jest.fn().mockResolvedValue(undefined),
  runClientVehicleInference: jest.fn(),
}));

const channels: CCTVChannel[] = [
  {
    cctv_id: 1,
    ch_id: "DPS-1",
    ch_name: "PASAR SATRIA PTZ",
    streaming_url: "https://atcs.denpasarkota.go.id/hls/pasar_satria.m3u8",
    player_type: "video",
    lat: -8.65,
    lng: 115.22,
    region: "Denpasar",
  },
];

describe("AIStationClient inference scheduling", () => {
  const INFERENCE_MS = 2000;
  const IDLE_GAP_MS = 50;

  beforeEach(() => {
    jest.useFakeTimers();
    window.HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.HTMLMediaElement.prototype, "readyState", { configurable: true, get: () => 4 });
    Object.defineProperty(window.HTMLMediaElement.prototype, "paused", { configurable: true, get: () => false });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("never runs two inferences at once and leaves an idle gap after each one finishes", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const starts: number[] = [];
    const ends: number[] = [];

    (runClientVehicleInference as jest.Mock).mockImplementation(() => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      starts.push(performance.now());
      return new Promise((resolve) => {
        setTimeout(() => {
          inFlight--;
          ends.push(performance.now());
          resolve({
            detections: [],
            isNightScene: false,
            averageLuminance: 100,
            inferenceTimeMs: INFERENCE_MS,
            processedCanvas: null,
          });
        }, INFERENCE_MS);
      });
    });

    render(<AIStationClient channels={channels} />);

    for (let i = 0; i < 400; i++) {
      await act(async () => {
        jest.advanceTimersByTime(16);
      });
    }

    expect(starts.length).toBeGreaterThanOrEqual(2);
    expect(maxInFlight).toBe(1);
    for (let i = 1; i < starts.length; i++) {
      expect(starts[i] - ends[i - 1]).toBeGreaterThanOrEqual(IDLE_GAP_MS);
    }
  });
});
