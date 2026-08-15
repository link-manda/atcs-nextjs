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
  Gauge,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VehicleCounts } from "@/lib/ai/client-vehicle-tracker";

interface AITrafficTelemetryProps {
  counts: VehicleCounts;
  fps: number;
  inferenceTimeMs: number;
  targetFps: number;
  onTargetFpsChange: (fps: number) => void;
  isNightScene: boolean;
  enableNightBoost: boolean;
  onToggleNightBoost: () => void;
  tripwireYRatio: number;
  onTripwireChange: (val: number) => void;
  confidence: number;
  onConfidenceChange: (val: number) => void;
  onResetCounts: () => void;
  onClearCache?: () => void;
}

export function AITrafficTelemetry({
  counts,
  fps,
  inferenceTimeMs,
  targetFps,
  onTargetFpsChange,
  isNightScene,
  enableNightBoost,
  onToggleNightBoost,
  tripwireYRatio,
  onTripwireChange,
  confidence,
  onConfidenceChange,
  onResetCounts,
  onClearCache,
}: AITrafficTelemetryProps) {
  const total = counts.total || 0;
  const carPercent = total > 0 ? Math.round((counts.cars / total) * 100) : 0;
  const bikePercent = total > 0 ? Math.round((counts.motorcycles / total) * 100) : 0;
  const busPercent = total > 0 ? Math.round((counts.buses / total) * 100) : 0;
  const truckPercent = total > 0 ? Math.round((counts.trucks / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4 w-full text-foreground">
      {/* ─── 1. Total Volume Card ─── */}
      <div className="bg-card rounded-xl p-5 border border-border shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-xs font-semibold font-headline text-foreground/80">
              Total Kendaraan Terhitung
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              {fps} FPS • {inferenceTimeMs}ms
            </span>
          </div>
        </div>

        <div className="flex items-baseline justify-between mt-1 gap-2 flex-wrap">
          <div className="text-4xl sm:text-5xl font-black font-headline tracking-tight text-foreground">
            {total.toLocaleString("id-ID")}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={onResetCounts}
              className="h-8 px-2.5 text-xs bg-background border-border hover:bg-muted font-semibold text-foreground shadow-sm flex items-center gap-1"
              title="Reset Jumlah Hitungan Kendaraan"
            >
              <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Reset</span>
            </Button>

            {onClearCache && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearCache}
                className="h-8 px-2.5 text-xs bg-background border-border hover:bg-muted font-semibold text-muted-foreground hover:text-foreground shadow-sm flex items-center gap-1"
                title="Hapus Cache Model AI & Muat Ulang"
              >
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Hapus Cache</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ─── 2. Categorical Distribution ─── */}
      <div className="bg-card rounded-xl p-4 border border-border shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold font-headline text-foreground/80">
            Klasifikasi Jenis Kendaraan
          </span>
          <span className="text-[11px] font-normal text-muted-foreground">
            Penghitungan Langsung
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Mobil */}
          <div className="p-3 rounded-lg bg-background border border-cyan-500/30 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-cyan-600 dark:text-cyan-400">
              <div className="flex items-center gap-1.5">
                <Car className="w-4 h-4" />
                <span className="text-xs font-semibold font-headline">Mobil</span>
              </div>
              <span className="text-[11px] font-medium">{carPercent}%</span>
            </div>
            <div className="text-2xl font-black font-headline text-foreground mt-1.5">
              {counts.cars.toLocaleString("id-ID")}
            </div>
          </div>

          {/* Sepeda Motor */}
          <div className="p-3 rounded-lg bg-background border border-emerald-500/30 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <div className="flex items-center gap-1.5">
                <Bike className="w-4 h-4" />
                <span className="text-xs font-semibold font-headline">Motor</span>
              </div>
              <span className="text-[11px] font-medium">{bikePercent}%</span>
            </div>
            <div className="text-2xl font-black font-headline text-foreground mt-1.5">
              {counts.motorcycles.toLocaleString("id-ID")}
            </div>
          </div>

          {/* Bus */}
          <div className="p-3 rounded-lg bg-background border border-amber-500/30 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
              <div className="flex items-center gap-1.5">
                <Bus className="w-4 h-4" />
                <span className="text-xs font-semibold font-headline">Bus</span>
              </div>
              <span className="text-[11px] font-medium">{busPercent}%</span>
            </div>
            <div className="text-2xl font-black font-headline text-foreground mt-1.5">
              {counts.buses.toLocaleString("id-ID")}
            </div>
          </div>

          {/* Truk */}
          <div className="p-3 rounded-lg bg-background border border-orange-500/30 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-orange-600 dark:text-orange-400">
              <div className="flex items-center gap-1.5">
                <Truck className="w-4 h-4" />
                <span className="text-xs font-semibold font-headline">Truk</span>
              </div>
              <span className="text-[11px] font-medium">{truckPercent}%</span>
            </div>
            <div className="text-2xl font-black font-headline text-foreground mt-1.5">
              {counts.trucks.toLocaleString("id-ID")}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. Calibration & Settings ─── */}
      <div className="bg-card rounded-xl p-4 border border-border shadow-sm flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold font-headline text-foreground/80">
              Pengaturan & Sensitivitas Deteksi
            </span>
          </div>
        </div>

        {/* Laju Sampling FPS AI Selector */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-xs font-medium">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Gauge className="w-3.5 h-3.5 text-primary" />
              <span>Laju Analisis AI (FPS)</span>
            </div>
            <span className="text-primary font-semibold font-mono">{targetFps} FPS Target</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[
              { rate: 15, label: "15 FPS" },
              { rate: 20, label: "20 FPS" },
              { rate: 25, label: "25 FPS" },
              { rate: 30, label: "30 FPS" },
            ].map(({ rate, label }) => {
              const isSelected = targetFps === rate;
              return (
                <button
                  key={rate}
                  type="button"
                  onClick={() => onTargetFpsChange(rate)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold font-headline transition-all text-center border ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background text-muted-foreground hover:text-foreground border-border"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {targetFps === 20 ? "💡 20 FPS: Rekomendasi seimbang untuk sudut kamera bird's-eye" : "Laju pengambilan frame gambar untuk inferensi AI"}
          </span>
        </div>

        {/* Mode Malam Otomatis Toggle */}
        <div className="p-3 rounded-lg bg-background border border-border flex items-center justify-between shadow-sm mt-0.5">
          <div className="flex items-center gap-2.5">
            {enableNightBoost ? (
              <Moon className="w-4 h-4 text-cyan-600 dark:text-cyan-400 animate-pulse" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
            <div className="flex flex-col">
              <span className="text-xs font-semibold font-headline text-foreground">
                Mode Malam Otomatis
              </span>
              <span className="text-[11px] font-normal text-muted-foreground">
                Meningkatkan kejelasan di jalanan minim cahaya
              </span>
            </div>
          </div>

          <Button
            size="sm"
            variant={enableNightBoost ? "default" : "outline"}
            onClick={onToggleNightBoost}
            className={`h-7 px-3 text-xs font-semibold ${
              enableNightBoost
                ? "bg-cyan-500 text-black hover:bg-cyan-400 font-bold"
                : "text-muted-foreground"
            }`}
          >
            {enableNightBoost ? "Aktif" : "Nonaktif"}
          </Button>
        </div>

        {/* Tripwire Height */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground">Posisi Garis Hitung</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-semibold">{Math.round(tripwireYRatio * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.15"
            max="0.85"
            step="0.05"
            value={tripwireYRatio}
            onChange={(e) => onTripwireChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

        {/* Confidence Threshold */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground">Tingkat Ketelitian (Sensitivitas)</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{Math.round(confidence * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.15"
            max="0.75"
            step="0.05"
            value={confidence}
            onChange={(e) => onConfidenceChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>
      </div>
    </div>
  );
}
