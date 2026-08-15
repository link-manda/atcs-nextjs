"use client";

import React, { useEffect, useRef } from "react";
import { TrackedVehicle } from "@/lib/ai/client-vehicle-tracker";
import { Moon, Sun } from "lucide-react";

interface ClientAITacticalOverlayProps {
  trackedVehicles: TrackedVehicle[];
  tripwireYRatio: number;
  lineCrossed: boolean;
  isNightScene: boolean;
  videoElement: HTMLVideoElement | null;
}

export function ClientAITacticalOverlay({
  trackedVehicles,
  tripwireYRatio,
  lineCrossed,
  isNightScene,
  videoElement,
}: ClientAITacticalOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastCrossedTimeRef = useRef<number>(0);

  if (lineCrossed) {
    lastCrossedTimeRef.current = Date.now();
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !videoElement) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = videoElement.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // ── CALIBRATE LETTERBOX GEOMETRY (OBJECT-CONTAIN) ──
    const nativeW = videoElement.videoWidth || canvasWidth;
    const nativeH = videoElement.videoHeight || canvasHeight;

    const videoRatio = nativeW / (nativeH || 1);
    const containerRatio = canvasWidth > 0 && canvasHeight > 0 ? canvasWidth / canvasHeight : 1;

    let renderW = canvasWidth;
    let renderH = canvasHeight;
    let offsetX = 0;
    let offsetY = 0;

    if (containerRatio > videoRatio) {
      renderH = canvasHeight;
      renderW = canvasHeight * videoRatio;
      offsetX = (canvasWidth - renderW) / 2;
      offsetY = 0;
    } else {
      renderW = canvasWidth;
      renderH = canvasWidth / (videoRatio || 1);
      offsetX = 0;
      offsetY = (canvasHeight - renderH) / 2;
    }

    const scaleX = renderW / (nativeW || 1);
    const scaleY = renderH / (nativeH || 1);

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    if (canvasWidth <= 0 || canvasHeight <= 0 || renderW <= 0 || renderH <= 0) return;

    const now = Date.now();
    const isGlowing = now - lastCrossedTimeRef.current < 600;
    const tripwireY = offsetY + renderH * tripwireYRatio;

    // 1. Draw Virtual Tripwire Line
    ctx.save();
    ctx.lineWidth = isGlowing ? 3 : 2;
    ctx.strokeStyle = isGlowing ? "rgba(0, 240, 255, 1)" : "rgba(0, 227, 253, 0.6)";
    if (isGlowing) {
      ctx.shadowColor = "rgba(0, 240, 255, 1)";
      ctx.shadowBlur = 18;
    } else {
      ctx.setLineDash([8, 4]);
    }

    ctx.beginPath();
    ctx.moveTo(offsetX, tripwireY);
    ctx.lineTo(offsetX + renderW, tripwireY);
    ctx.stroke();

    // Tripwire HUD Label
    ctx.setLineDash([]);
    ctx.font = "bold 10px 'Space Grotesk', sans-serif";
    ctx.fillStyle = isGlowing ? "#ffffff" : "rgba(0, 227, 253, 0.9)";
    ctx.fillText("── VIRTUAL TRIPWIRE (0ms WebGL) ──", offsetX + 14, tripwireY - 6);
    ctx.restore();

    // 2. Draw Tracked Vehicles
    trackedVehicles.forEach((vehicle) => {
      const [rawX, rawY, rawW, rawH] = vehicle.bbox;
      const x = offsetX + rawX * scaleX;
      const y = offsetY + rawY * scaleY;
      const w = rawW * scaleX;
      const h = rawH * scaleY;

      let color = "#00f0ff"; // Car = Cyan
      let fillColor = "rgba(0, 240, 255, 0.12)";
      let labelCategory = "MOBIL";

      if (vehicle.category === "motorcycle") {
        color = "#10b981"; // Motor = Emerald
        fillColor = "rgba(16, 185, 129, 0.12)";
        labelCategory = "MOTOR";
      } else if (vehicle.category === "bus") {
        color = "#f59e0b"; // Bus = Amber
        fillColor = "rgba(245, 158, 11, 0.15)";
        labelCategory = "BUS";
      } else if (vehicle.category === "truck") {
        color = "#f97316"; // Truck = Orange
        fillColor = "rgba(249, 115, 22, 0.15)";
        labelCategory = "TRUK";
      }

      const confPercent = Math.round(vehicle.confidence * 100);
      const idStr = vehicle.id > 0 ? `#${vehicle.id}` : "";
      const dirStr = vehicle.direction === "down" ? "↓" : vehicle.direction === "up" ? "↑" : "";
      const label = `${labelCategory} ${idStr} ${dirStr} (${confPercent}%)`;

      ctx.save();
      // Box Fill
      ctx.fillStyle = fillColor;
      ctx.fillRect(x, y, w, h);

      // Box Outline
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);

      // Tactical Corner Brackets
      const cornerLen = Math.min(10, w / 4, h / 4);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = color;

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(x, y + cornerLen);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerLen, y);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(x + w - cornerLen, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + cornerLen);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(x, y + h - cornerLen);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x + cornerLen, y + h);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(x + w - cornerLen, y + h);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + w, y + h - cornerLen);
      ctx.stroke();

      // Solid Tactical Label Badge
      ctx.font = "bold 9px 'Space Grotesk', sans-serif";
      const textWidth = ctx.measureText(label).width;
      const badgeHeight = 15;
      const badgeY = Math.max(offsetY, y - badgeHeight);

      ctx.fillStyle = "rgba(0, 0, 0, 0.92)";
      ctx.fillRect(x, badgeY, textWidth + 10, badgeHeight);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, badgeY, textWidth + 10, badgeHeight);

      ctx.fillStyle = color;
      ctx.fillText(label, x + 5, badgeY + 11);

      // Draw Centroid Point
      const cx = offsetX + vehicle.centroid[0] * scaleX;
      const cy = offsetY + vehicle.centroid[1] * scaleY;
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.restore();
    });
  }, [trackedVehicles, tripwireYRatio, lineCrossed, isNightScene, videoElement]);

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Vision Mode Indicator Badge */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/90 px-3 py-1 rounded-lg border border-white/15 shadow-xl text-[10px] font-headline font-bold">
        {isNightScene ? (
          <span className="flex items-center gap-1.5 text-cyan-300">
            <Moon className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            Adaptive Night Vision (Gamma Boost)
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-amber-300">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            Standard Vision (Daylight)
          </span>
        )}
      </div>
    </div>
  );
}
