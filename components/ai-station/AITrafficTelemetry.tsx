"use client";

import React from "react";
import {
  Car,
  Bike,
  Bus,
  Truck,
  Activity,
  RotateCcw,
  SlidersHorizontal,
  Moon,
  Sun,
  Cpu,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VehicleCounts } from "@/lib/ai/client-vehicle-tracker";

interface AITrafficTelemetryProps {
  counts: VehicleCounts;
  fps: number;
  inferenceTimeMs: number;
  isNightScene: boolean;
  enableNightBoost: boolean;
  onToggleNightBoost: () => void;
  tripwireYRatio: number;
  onTripwireChange: (val: number) => void;
  confidence: number;
  onConfidenceChange: (val: number) => void;
  onResetCounts: () => void;
}

export function AITrafficTelemetry({
  counts,
  fps,
  inferenceTimeMs,
  isNightScene,
  enableNightBoost,
  onToggleNightBoost,
  tripwireYRatio,
  onTripwireChange,
  confidence,
  onConfidenceChange,
  onResetCounts,
}: AITrafficTelemetryProps) {
  const total = counts.total || 0;
  const carPercent = total > 0 ? Math.round((counts.cars / total) * 100) : 0;
  const bikePercent = total > 0 ? Math.round((counts.motorcycles / total) * 100) : 0;
  const busPercent = total > 0 ? Math.round((counts.buses / total) * 100) : 0;
  const truckPercent = total > 0 ? Math.round((counts.trucks / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4 w-full text-foreground">
      {/* ─── 1. Primary Volume Counter Header ─── */}
      <div className="bg-surface-container rounded-xl p-5 border border-border/40 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-[11px] font-bold font-headline uppercase tracking-[0.2em] text-muted-foreground">
              Total Volume Kendaraan
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              WebGL GPU • {fps} FPS ({inferenceTimeMs}ms)
            </span>
          </div>
        </div>

        <div className="flex items-baseline justify-between mt-1">
          <div className="text-4xl sm:text-5xl font-black font-headline tracking-tight text-white">
            {total.toLocaleString("id-ID")}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onResetCounts}
            className="h-8 px-3 text-[11px] bg-background/60 border-border hover:bg-muted font-headline font-bold text-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            Reset
          </Button>
        </div>
      </div>

      {/* ─── 2. Categorical Distribution Breakdown ─── */}
      <div className="bg-surface-container rounded-xl p-4 border border-border/40 shadow-xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold font-headline uppercase tracking-[0.2em] text-muted-foreground">
            Klasifikasi Armada
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            0ms Synchronized
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Mobil */}
          <div className="p-3 rounded-lg bg-surface-container-high border border-cyan-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between text-cyan-400">
              <div className="flex items-center gap-1.5">
                <Car className="w-4 h-4" />
                <span className="text-xs font-bold font-headline uppercase">Mobil</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-300/80">{carPercent}%</span>
            </div>
            <div className="text-xl font-bold font-headline text-white mt-1">
              {counts.cars.toLocaleString("id-ID")}
            </div>
          </div>

          {/* Motor / Roda Dua */}
          <div className="p-3 rounded-lg bg-surface-container-high border border-emerald-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-400">
              <div className="flex items-center gap-1.5">
                <Bike className="w-4 h-4" />
                <span className="text-xs font-bold font-headline uppercase">Motor</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-300/80">{bikePercent}%</span>
            </div>
            <div className="text-xl font-bold font-headline text-white mt-1">
              {counts.motorcycles.toLocaleString("id-ID")}
            </div>
          </div>

          {/* Bus */}
          <div className="p-3 rounded-lg bg-surface-container-high border border-amber-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-400">
              <div className="flex items-center gap-1.5">
                <Bus className="w-4 h-4" />
                <span className="text-xs font-bold font-headline uppercase">Bus</span>
              </div>
              <span className="text-[10px] font-mono text-amber-300/80">{busPercent}%</span>
            </div>
            <div className="text-xl font-bold font-headline text-white mt-1">
              {counts.buses.toLocaleString("id-ID")}
            </div>
          </div>

          {/* Truk */}
          <div className="p-3 rounded-lg bg-surface-container-high border border-orange-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between text-orange-400">
              <div className="flex items-center gap-1.5">
                <Truck className="w-4 h-4" />
                <span className="text-xs font-bold font-headline uppercase">Truk</span>
              </div>
              <span className="text-[10px] font-mono text-orange-300/80">{truckPercent}%</span>
            </div>
            <div className="text-xl font-bold font-headline text-white mt-1">
              {counts.trucks.toLocaleString("id-ID")}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. Calibration & Adaptive Night-Vision Controls ─── */}
      <div className="bg-surface-container rounded-xl p-4 border border-border/40 shadow-xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <span className="text-[11px] font-bold font-headline uppercase tracking-[0.2em] text-muted-foreground">
              Kalibrasi & Sensitivitas
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono text-cyan-400">
            <Cpu className="w-3 h-3" />
            <span>WebGL 6.8MB</span>
          </div>
        </div>

        {/* Adaptive Night-Vision Toggle */}
        <div className="p-3 rounded-lg bg-surface-container-high border border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            {enableNightBoost ? (
              <Moon className="w-4 h-4 text-cyan-400 animate-pulse" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
            <div className="flex flex-col">
              <span className="text-xs font-headline font-bold text-foreground">
                Adaptive Night Vision
              </span>
              <span className="text-[10px] font-sans text-muted-foreground">
                Auto-boost kontras & gamma pada kondisi gelap
              </span>
            </div>
          </div>

          <Button
            size="sm"
            variant={enableNightBoost ? "default" : "outline"}
            onClick={onToggleNightBoost}
            className={`h-7 px-3 text-[11px] font-headline font-bold ${
              enableNightBoost
                ? "bg-cyan-500 text-black hover:bg-cyan-400"
                : "text-muted-foreground"
            }`}
          >
            {enableNightBoost ? "Aktif" : "Nonaktif"}
          </Button>
        </div>

        {/* Tripwire Height */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-headline font-bold">
            <span className="text-muted-foreground">Posisi Garis Hitung (Tripwire)</span>
            <span className="text-cyan-400 font-mono">{Math.round(tripwireYRatio * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.15"
            max="0.85"
            step="0.05"
            value={tripwireYRatio}
            onChange={(e) => onTripwireChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Confidence Threshold */}
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="flex justify-between text-xs font-headline font-bold">
            <span className="text-muted-foreground">Ambang Batas Keyakinan (Confidence)</span>
            <span className="text-emerald-400 font-mono">{Math.round(confidence * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.15"
            max="0.75"
            step="0.05"
            value={confidence}
            onChange={(e) => onConfidenceChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
        </div>
      </div>
    </div>
  );
}
