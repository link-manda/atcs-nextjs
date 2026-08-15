import time
from typing import Dict, List, Any, Optional

class VehicleFlowTracker:
    def __init__(self, tripwire_y_ratio: float = 0.55):
        self.tripwire_y_ratio = tripwire_y_ratio
        self.counts = {
            "total": 0,
            "cars": 0,
            "motorcycles": 0,
            "buses": 0,
            "trucks": 0,
        }
        # Vehicle history: id -> { category, history: [(x, y, timestamp)], counted: bool, last_seen: float }
        self.vehicles: Dict[int, Dict[str, Any]] = {}
        self.last_crossed_timestamp = 0.0

    def reset_counts(self):
        self.counts = {
            "total": 0,
            "cars": 0,
            "motorcycles": 0,
            "buses": 0,
            "trucks": 0,
        }
        self.vehicles.clear()

    def update(
        self,
        detections: List[Dict[str, Any]],
        frame_height: int,
        tripwire_y_ratio: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Updates tracking trajectories, detects line crossing, and produces counts.
        """
        if tripwire_y_ratio is not None:
            self.tripwire_y_ratio = tripwire_y_ratio

        now = time.time()
        tripwire_y = frame_height * self.tripwire_y_ratio
        current_tracked_list = []
        line_crossed_this_frame = False

        for det in detections:
            track_id = det["id"]
            if track_id < 0:
                continue

            cx, cy = det["centroid"]
            category = det["category"]
            bbox = det["bbox"]

            if track_id not in self.vehicles:
                self.vehicles[track_id] = {
                    "id": track_id,
                    "category": category,
                    "history": [(cx, cy, now)],
                    "counted": False,
                    "last_seen": now,
                    "direction": "unknown",
                }
            else:
                v = self.vehicles[track_id]
                prev_cx, prev_cy, _ = v["history"][-1]
                v["history"].append((cx, cy, now))
                v["last_seen"] = now
                v["category"] = category

                # Limit history length
                if len(v["history"]) > 30:
                    v["history"].pop(0)

                # Determine direction
                dy = cy - prev_cy
                if abs(dy) > 2.0:
                    v["direction"] = "down" if dy > 0 else "up"

                # Check line crossing if not already counted
                if not v["counted"] and len(v["history"]) >= 2:
                    # Trajectory crossing check
                    p1_y = v["history"][-2][1]
                    p2_y = cy

                    # Bounding box span
                    ymin = bbox[1]
                    ymax = bbox[1] + bbox[3]

                    crossed_down = p1_y <= tripwire_y and p2_y >= tripwire_y
                    crossed_up = p1_y >= tripwire_y and p2_y <= tripwire_y
                    box_spanned = ymin <= tripwire_y <= ymax

                    if crossed_down or crossed_up or box_spanned:
                        v["counted"] = True
                        self.counts["total"] += 1
                        
                        if category == "car":
                            self.counts["cars"] += 1
                        elif category == "motorcycle":
                            self.counts["motorcycles"] += 1
                        elif category == "bus":
                            self.counts["buses"] += 1
                        elif category == "truck":
                            self.counts["trucks"] += 1

                        self.last_crossed_timestamp = now
                        line_crossed_this_frame = True

            v_entry = self.vehicles[track_id]
            current_tracked_list.append({
                "id": track_id,
                "category": v_entry["category"],
                "confidence": det["confidence"],
                "bbox": det["bbox"],
                "centroid": det["centroid"],
                "direction": v_entry["direction"],
                "counted": v_entry["counted"],
            })

        # Garbage collect vehicles not seen for > 3.0 seconds
        stale_ids = [
            vid for vid, v in self.vehicles.items()
            if now - v["last_seen"] > 3.0
        ]
        for vid in stale_ids:
            del self.vehicles[vid]

        return {
            "counts": dict(self.counts),
            "tracked": current_tracked_list,
            "line_crossed": line_crossed_this_frame,
            "last_crossed": self.last_crossed_timestamp,
        }
