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
  Sparkles,
  Lock,
} from "lucide-react";
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
  enableSharpening: boolean;
  onToggleSharpening: () => void;
  syncFrameLock: boolean;
  onToggleSyncFrameLock: () => void;
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
  enableSharpening,
  onToggleSharpening,
  syncFrameLock,
  onToggleSyncFrameLock,
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
    <div className="flex flex-col gap-3 w-full text-zinc-100 font-sans">
      {/* ─── 1. Total Volume Card ─── */}
      <div className="bg-zinc-950/90 rounded-lg p-4 border border-white/[0.08] relative overflow-hidden backdrop-blur-md">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Total Kendaraan Terhitung
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>{fps} FPS • {inferenceTimeMs}ms</span>
          </div>
        </div>

        <div className="flex items-baseline justify-between mt-1 gap-2 flex-wrap">
          <div className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-white">
            {total.toLocaleString("id-ID")}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onResetCounts}
              className="h-7 px-2.5 text-xs bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-zinc-300 rounded flex items-center gap-1 font-medium transition-colors"
              title="Reset Jumlah Hitungan Kendaraan"
            >
              <RotateCcw className="w-3 h-3 text-zinc-400" />
              <span>Reset</span>
            </button>

            {onClearCache && (
              <button
                onClick={onClearCache}
                className="h-7 px-2.5 text-xs bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 rounded flex items-center gap-1 font-medium transition-colors"
                title="Hapus Cache Model AI & Muat Ulang"
              >
                <Trash2 className="w-3 h-3 text-zinc-400" />
                <span>Hapus Cache</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── 2. Categorical Distribution ─── */}
      <div className="bg-zinc-950/90 rounded-lg p-3.5 border border-white/[0.08] flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-200">
            Klasifikasi Arus Kendaraan
          </span>
          <span className="text-[10px] font-mono text-zinc-400">
            Real-time Tracker
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Mobil */}
          <div className="p-2.5 rounded-md bg-white/[0.02] border border-cyan-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between text-cyan-400">
              <div className="flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Mobil</span>
              </div>
              <span className="text-[10px] font-mono font-medium">{carPercent}%</span>
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {counts.cars.toLocaleString("id-ID")}
            </div>
          </div>

          {/* Sepeda Motor */}
          <div className="p-2.5 rounded-md bg-white/[0.02] border border-emerald-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-400">
              <div className="flex items-center gap-1.5">
                <Bike className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Motor</span>
              </div>
              <span className="text-[10px] font-mono font-medium">{bikePercent}%</span>
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {counts.motorcycles.toLocaleString("id-ID")}
            </div>
          </div>

          {/* Bus */}
          <div className="p-2.5 rounded-md bg-white/[0.02] border border-amber-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-400">
              <div className="flex items-center gap-1.5">
                <Bus className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Bus</span>
              </div>
              <span className="text-[10px] font-mono font-medium">{busPercent}%</span>
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {counts.buses.toLocaleString("id-ID")}
            </div>
          </div>

          {/* Truk */}
          <div className="p-2.5 rounded-md bg-white/[0.02] border border-orange-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between text-orange-400">
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Truk</span>
              </div>
              <span className="text-[10px] font-mono font-medium">{truckPercent}%</span>
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {counts.trucks.toLocaleString("id-ID")}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. Calibration & Settings ─── */}
      <div className="bg-zinc-950/90 rounded-lg p-3.5 border border-white/[0.08] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-semibold">
              Sensitivitas & Kalibrasi AI
            </span>
          </div>
        </div>

        {/* Laju Sampling FPS AI Selector */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Gauge className="w-3 h-3 text-emerald-400" />
              <span>Laju Analisis AI (FPS)</span>
            </div>
            <span className="text-emerald-400 font-mono text-[11px] font-medium">{targetFps} FPS Target</span>
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
                  className={`py-1 px-2 rounded text-xs font-mono font-medium transition-all text-center border ${
                    isSelected
                      ? "bg-emerald-500 text-zinc-950 border-emerald-400 font-semibold"
                      : "bg-white/[0.03] text-zinc-400 hover:text-zinc-200 border-white/[0.06]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sinkronisasi Frame Video AI (1:1 Frame-Lock) */}
        <div className="p-2.5 rounded-md bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className={`w-3.5 h-3.5 ${syncFrameLock ? "text-emerald-400" : "text-zinc-400"}`} />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-zinc-200">
                Sinkronisasi Frame (1:1 Lock)
              </span>
              <span className="text-[10px] text-zinc-400">
                Kunci visual video selaras dengan analisis AI
              </span>
            </div>
          </div>

          <button
            onClick={onToggleSyncFrameLock}
            className={`h-6 px-2.5 text-xs font-mono rounded transition-colors ${
              syncFrameLock
                ? "bg-emerald-500 text-zinc-950 font-bold"
                : "bg-white/[0.04] text-zinc-400 border border-white/[0.08] hover:text-zinc-200"
            }`}
          >
            {syncFrameLock ? "Aktif" : "Nonaktif"}
          </button>
        </div>

        {/* Penajaman Citra AI (512px High-Def) */}
        <div className="p-2.5 rounded-md bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className={`w-3.5 h-3.5 ${enableSharpening ? "text-cyan-400 animate-pulse" : "text-zinc-400"}`} />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-zinc-200">
                Penajaman Citra (512px HD)
              </span>
              <span className="text-[10px] text-zinc-400">
                Perjelas kontur kap mobil & bodi motor
              </span>
            </div>
          </div>

          <button
            onClick={onToggleSharpening}
            className={`h-6 px-2.5 text-xs font-mono rounded transition-colors ${
              enableSharpening
                ? "bg-cyan-500 text-zinc-950 font-bold"
                : "bg-white/[0.04] text-zinc-400 border border-white/[0.08] hover:text-zinc-200"
            }`}
          >
            {enableSharpening ? "Aktif" : "Nonaktif"}
          </button>
        </div>

        {/* Mode Malam Otomatis Toggle */}
        <div className="p-2.5 rounded-md bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {enableNightBoost ? (
              <Moon className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-zinc-400" />
            )}
            <div className="flex flex-col">
              <span className="text-xs font-medium text-zinc-200">
                Mode Malam Otomatis
              </span>
              <span className="text-[10px] text-zinc-400">
                Tingkatkan kontras di kondisi minim cahaya
              </span>
            </div>
          </div>

          <button
            onClick={onToggleNightBoost}
            className={`h-6 px-2.5 text-xs font-mono rounded transition-colors ${
              enableNightBoost
                ? "bg-cyan-500 text-zinc-950 font-bold"
                : "bg-white/[0.04] text-zinc-400 border border-white/[0.08] hover:text-zinc-200"
            }`}
          >
            {enableNightBoost ? "Aktif" : "Nonaktif"}
          </button>
        </div>

        {/* Tripwire Height */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400">Posisi Garis Hitung</span>
            <span className="text-cyan-400 font-mono text-[11px] font-medium">{Math.round(tripwireYRatio * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.15"
            max="0.85"
            step="0.05"
            value={tripwireYRatio}
            onChange={(e) => onTripwireChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-white/[0.1] rounded appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Confidence Threshold */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400">Tingkat Ketelitian AI</span>
            <span className="text-emerald-400 font-mono text-[11px] font-medium">{Math.round(confidence * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.15"
            max="0.75"
            step="0.05"
            value={confidence}
            onChange={(e) => onConfidenceChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-white/[0.1] rounded appearance-none cursor-pointer accent-emerald-400"
          />
        </div>
      </div>
    </div>
  );
}
