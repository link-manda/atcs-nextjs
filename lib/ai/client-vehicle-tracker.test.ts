import { ClientVehicleTracker } from "./client-vehicle-tracker";
import { ClientDetection } from "./client-ai-engine";

describe("ClientVehicleTracker", () => {
  let tracker: ClientVehicleTracker;

  beforeEach(() => {
    tracker = new ClientVehicleTracker();
  });

  it("initializes with zero counts", () => {
    const counts = tracker.getCounts();
    expect(counts.total).toBe(0);
    expect(counts.cars).toBe(0);
    expect(counts.motorcycles).toBe(0);
    expect(counts.buses).toBe(0);
    expect(counts.trucks).toBe(0);
  });

  it("tracks vehicle movement and detects tripwire line crossing", () => {
    const frameHeight = 480;
    const tripwireYRatio = 0.5; // Tripwire at Y = 240

    // Frame 1: Car above line (Y = 180)
    const frame1Detections: ClientDetection[] = [
      {
        category: "car",
        confidence: 0.9,
        bbox: [100, 160, 40, 40],
        centroid: [120, 180],
      },
    ];

    let result = tracker.update(frame1Detections, frameHeight, tripwireYRatio);
    expect(result.counts.total).toBe(0);
    expect(result.trackedVehicles.length).toBe(1);
    expect(result.trackedVehicles[0].id).toBe(1);

    // Frame 2: Car moves down across tripwire (Y = 260)
    const frame2Detections: ClientDetection[] = [
      {
        category: "car",
        confidence: 0.92,
        bbox: [100, 240, 40, 40],
        centroid: [120, 260],
      },
    ];

    result = tracker.update(frame2Detections, frameHeight, tripwireYRatio);
    expect(result.counts.total).toBe(1);
    expect(result.counts.cars).toBe(1);
    expect(result.lineCrossed).toBe(true);
    expect(result.trackedVehicles[0].direction).toBe("down");

    // Frame 3: Car continues moving down (Y = 320) - Should NOT be counted again
    const frame3Detections: ClientDetection[] = [
      {
        category: "car",
        confidence: 0.88,
        bbox: [100, 300, 40, 40],
        centroid: [120, 320],
      },
    ];

    result = tracker.update(frame3Detections, frameHeight, tripwireYRatio);
    expect(result.counts.total).toBe(1);
    expect(result.counts.cars).toBe(1);
    expect(result.lineCrossed).toBe(false);
  });

  it("counts motorcycle and bus correctly", () => {
    const frameHeight = 480;
    const tripwireYRatio = 0.5; // Y = 240

    // Motorcycle moving from above to below
    tracker.update(
      [{ category: "motorcycle", confidence: 0.85, bbox: [50, 200, 20, 30], centroid: [60, 215] }],
      frameHeight,
      tripwireYRatio
    );
    const motoResult = tracker.update(
      [{ category: "motorcycle", confidence: 0.89, bbox: [50, 250, 20, 30], centroid: [60, 265] }],
      frameHeight,
      tripwireYRatio
    );

    expect(motoResult.counts.motorcycles).toBe(1);
    expect(motoResult.counts.total).toBe(1);

    // Reset counts
    tracker.resetCounts();
    expect(tracker.getCounts().total).toBe(0);
  });
});
