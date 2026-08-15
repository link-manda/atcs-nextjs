"use client";

import { ClientDetection, VehicleCategory } from "./client-ai-engine";

export interface TrackedVehicle {
  id: number;
  category: VehicleCategory;
  confidence: number;
  bbox: [number, number, number, number];
  centroid: [number, number];
  history: [number, number, number][]; // [cx, cy, timestamp]
  direction: "down" | "up" | "unknown";
  counted: boolean;
  lastSeen: number;
}

export interface VehicleCounts {
  total: number;
  cars: number;
  motorcycles: number;
  buses: number;
  trucks: number;
}

export interface TrackerUpdateResult {
  counts: VehicleCounts;
  trackedVehicles: TrackedVehicle[];
  lineCrossed: boolean;
  lastCrossedTimestamp: number;
}

export class ClientVehicleTracker {
  private vehicles: Map<number, TrackedVehicle> = new Map();
  private nextId: number = 1;
  private counts: VehicleCounts = {
    total: 0,
    cars: 0,
    motorcycles: 0,
    buses: 0,
    trucks: 0,
  };
  private lastCrossedTimestamp: number = 0;
  private maxDistanceThreshold: number = 90; // pixels Euclidean distance for tracking match

  public resetCounts(): void {
    this.counts = {
      total: 0,
      cars: 0,
      motorcycles: 0,
      buses: 0,
      trucks: 0,
    };
    this.vehicles.clear();
    this.nextId = 1;
    this.lastCrossedTimestamp = 0;
  }

  public getCounts(): VehicleCounts {
    return { ...this.counts };
  }

  public update(
    detections: ClientDetection[],
    frameHeight: number,
    tripwireYRatio: number = 0.55
  ): TrackerUpdateResult {
    const now = performance.now();
    const tripwireY = frameHeight * tripwireYRatio;
    let lineCrossedThisFrame = false;

    const matchedVehicleIds = new Set<number>();
    const currentTrackedList: TrackedVehicle[] = [];

    // 1. Match new detections to existing tracks by minimum centroid distance
    for (let d = 0; d < detections.length; d++) {
      const det = detections[d];
      const [cx, cy] = det.centroid;
      let bestId: number | null = null;
      let minDistance = Infinity;

      this.vehicles.forEach((vehicle, id) => {
        if (matchedVehicleIds.has(id)) return;

        // Same category preference
        const categoryMatch = vehicle.category === det.category;
        const [prevCx, prevCy] = vehicle.centroid;
        const dist = Math.hypot(cx - prevCx, cy - prevCy);

        const threshold = categoryMatch
          ? this.maxDistanceThreshold
          : this.maxDistanceThreshold * 0.7;

        if (dist < threshold && dist < minDistance) {
          minDistance = dist;
          bestId = id;
        }
      });

      if (bestId !== null) {
        // Update existing track
        matchedVehicleIds.add(bestId);
        const vehicle = this.vehicles.get(bestId)!;
        const [prevCx, prevCy] = vehicle.centroid;

        vehicle.bbox = det.bbox;
        vehicle.centroid = det.centroid;
        vehicle.confidence = det.confidence;
        vehicle.category = det.category;
        vehicle.lastSeen = now;
        vehicle.history.push([cx, cy, now]);

        if (vehicle.history.length > 25) {
          vehicle.history.shift();
        }

        // Calculate direction
        const dy = cy - prevCy;
        if (Math.abs(dy) > 1.5) {
          vehicle.direction = dy > 0 ? "down" : "up";
        }

        // Check line crossing if not yet counted
        if (!vehicle.counted && vehicle.history.length >= 2) {
          const p1Y = vehicle.history[vehicle.history.length - 2][1];
          const p2Y = cy;
          const yMin = det.bbox[1];
          const yMax = det.bbox[1] + det.bbox[3];

          const crossedDown = p1Y <= tripwireY && p2Y >= tripwireY;
          const crossedUp = p1Y >= tripwireY && p2Y <= tripwireY;
          const boxSpanned = yMin <= tripwireY && tripwireY <= yMax;

          if (crossedDown || crossedUp || boxSpanned) {
            vehicle.counted = true;
            this.counts.total++;

            if (det.category === "car") this.counts.cars++;
            else if (det.category === "motorcycle") this.counts.motorcycles++;
            else if (det.category === "bus") this.counts.buses++;
            else if (det.category === "truck") this.counts.trucks++;

            this.lastCrossedTimestamp = now;
            lineCrossedThisFrame = true;
          }
        }

        currentTrackedList.push({ ...vehicle });
      } else {
        // Register new vehicle track
        const newVehicle: TrackedVehicle = {
          id: this.nextId++,
          category: det.category,
          confidence: det.confidence,
          bbox: det.bbox,
          centroid: det.centroid,
          history: [[cx, cy, now]],
          direction: "unknown",
          counted: false,
          lastSeen: now,
        };

        this.vehicles.set(newVehicle.id, newVehicle);
        currentTrackedList.push({ ...newVehicle });
      }
    }

    // 2. Remove stale vehicles not seen for > 2.5 seconds (2500ms)
    const staleIds: number[] = [];
    this.vehicles.forEach((vehicle, id) => {
      if (now - vehicle.lastSeen > 2500) {
        staleIds.push(id);
      }
    });
    for (let i = 0; i < staleIds.length; i++) {
      this.vehicles.delete(staleIds[i]);
    }

    return {
      counts: { ...this.counts },
      trackedVehicles: currentTrackedList,
      lineCrossed: lineCrossedThisFrame,
      lastCrossedTimestamp: this.lastCrossedTimestamp,
    };
  }
}
