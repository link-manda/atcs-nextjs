"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { CCTVChannel } from "@/types/cctv";
import {
  runClientVehicleInference,
  clearClientAICache,
  subscribeModelProgress,
  resetClientAIModel,
  getClientAIModel,
  ModelProgressInfo,
  ModelLoadingStatus,
} from "@/lib/ai/client-ai-engine";
import {
  ClientVehicleTracker,
  VehicleCounts,
  TrackedVehicle,
} from "@/lib/ai/client-vehicle-tracker";
import { InferenceBenchmark } from "@/lib/ai/benchmark";
import { ClientAITacticalOverlay } from "@/components/ai-station/ClientAITacticalOverlay";
import { AITrafficTelemetry } from "@/components/ai-station/AITrafficTelemetry";
import { ALL_REGIONS } from "@/lib/cctv-utils";
import {
  HLS_LOW_LATENCY_CONFIG,
  resolveHlsFallbackUrl,
  handleHlsStallCatchUp,
} from "@/lib/hls-config";
import Hls from "hls.js";
import {
  ChevronDown,
  Search,
  Maximize2,
  Video,
  Check,
  Sparkles,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AIStationClientProps {
  channels: CCTVChannel[];
}

export function AIStationClient({ channels }: AIStationClientProps) {
  // 1. Camera Selection State
  const directChannels = useMemo(
    () => channels.filter((c) => c.player_type === "video"),
    [channels]
  );

  const [selectedChannel, setSelectedChannel] = useState<CCTVChannel>(
    () => directChannels[0] || channels[0]
  );
  const [regionFilter, setRegionFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCameraSelector, setShowCameraSelector] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    if (!showCameraSelector) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCameraSelector(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowCameraSelector(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showCameraSelector]);

  // 2. Video Player Ref
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [videoKey, setVideoKey] = useState(0);

  // 3. AI Detection & Tracking State (100% Client-Side WebGL)
  const [targetFps, setTargetFps] = useState<number>(20); // Default 20 FPS sweet spot
  const [fps, setFps] = useState<number>(0);
  const [inferenceTimeMs, setInferenceTimeMs] = useState<number>(0);
  const [tripwireYRatio, setTripwireYRatio] = useState<number>(0.55);
  const [confidence, setConfidence] = useState<number>(0.25);
  const [enableNightBoost, setEnableNightBoost] = useState<boolean>(true);
  const [enableSharpening, setEnableSharpening] = useState<boolean>(true);
  const [syncFrameLock, setSyncFrameLock] = useState<boolean>(true);
  const [isNightScene, setIsNightScene] = useState<boolean>(false);
  const [processedCanvas, setProcessedCanvas] = useState<HTMLCanvasElement | null>(null);

  const [counts, setCounts] = useState<VehicleCounts>({
    total: 0,
    cars: 0,
    motorcycles: 0,
    buses: 0,
    trucks: 0,
  });
  const [trackedVehicles, setTrackedVehicles] = useState<TrackedVehicle[]>([]);
  const [lineCrossed, setLineCrossed] = useState<boolean>(false);

  // Model loading progress state
  const [modelProgress, setModelProgress] = useState<ModelProgressInfo>({
    status: "idle",
    progress: 0,
  });

  useEffect(() => {
    const unsubscribe = subscribeModelProgress((info) => {
      setModelProgress(info);
    });
    return unsubscribe;
  }, []);

  const modelStatusRef = useRef<ModelLoadingStatus>("idle");
  useEffect(() => {
    modelStatusRef.current = modelProgress.status;
  }, [modelProgress.status]);

  const handleRetryModel = useCallback(() => {
    resetClientAIModel();
    getClientAIModel().catch(() => {});
  }, []);

  const trackerRef = useRef<ClientVehicleTracker>(new ClientVehicleTracker());
  const benchmarkRef = useRef<InferenceBenchmark>(new InferenceBenchmark(100));
  const isInferringRef = useRef<boolean>(false);

  // Load camera-specific AI settings from localStorage
  useEffect(() => {
    if (!selectedChannel) return;
    try {
      const saved = localStorage.getItem(`ai_cam_pref_${selectedChannel.cctv_id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.targetFps === "number") setTargetFps(parsed.targetFps);
        if (typeof parsed.enableSharpening === "boolean") setEnableSharpening(parsed.enableSharpening);
        if (typeof parsed.syncFrameLock === "boolean") setSyncFrameLock(parsed.syncFrameLock);
        if (typeof parsed.enableNightBoost === "boolean") setEnableNightBoost(parsed.enableNightBoost);
      } else {
        // Reset to default preferences when switching to a camera without saved overrides
        setTargetFps(20);
        setEnableSharpening(true);
        setSyncFrameLock(true);
        setEnableNightBoost(true);
      }
    } catch {}
  }, [selectedChannel]);

  // Save camera-specific settings
  const saveCameraPreference = useCallback((key: string, value: any) => {
    if (!selectedChannel) return;
    try {
      const storageKey = `ai_cam_pref_${selectedChannel.cctv_id}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || "{}");
      existing[key] = value;
      localStorage.setItem(storageKey, JSON.stringify(existing));
    } catch {}
  }, [selectedChannel]);

  const handleTargetFpsChange = (newFps: number) => {
    setTargetFps(newFps);
    saveCameraPreference("targetFps", newFps);
  };

  const handleToggleSharpening = () => {
    setEnableSharpening((prev) => {
      const next = !prev;
      saveCameraPreference("enableSharpening", next);
      return next;
    });
  };

  const handleToggleSyncFrameLock = () => {
    setSyncFrameLock((prev) => {
      const next = !prev;
      saveCameraPreference("syncFrameLock", next);
      return next;
    });
  };

  const handleToggleNightBoost = () => {
    setEnableNightBoost((prev) => {
      const next = !prev;
      saveCameraPreference("enableNightBoost", next);
      return next;
    });
  };

  // Filtered cameras list (strictly video feeds for AI inference)
  const filteredChannels = useMemo(() => {
    return channels.filter((ch) => {
      if (ch.player_type !== "video") return false;
      const matchRegion = regionFilter === "ALL" || ch.region === regionFilter;
      const matchSearch =
        searchQuery === "" ||
        ch.ch_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ch.region.toLowerCase().includes(searchQuery.toLowerCase());
      return matchRegion && matchSearch;
    });
  }, [channels, regionFilter, searchQuery]);

  const [currentUrl, setCurrentUrl] = useState<string>(selectedChannel?.streaming_url || "");

  useEffect(() => {
    if (selectedChannel) {
      setCurrentUrl(selectedChannel.streaming_url);
    }
  }, [selectedChannel]);

  // Video Player Mount & HLS Setup
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedChannel || !currentUrl) return;

    setVideoElement(video);

    let hls: Hls | null = null;
    const isHlsStream = currentUrl.includes(".m3u8") || currentUrl.includes("/api/proxy/hls");

    if (isHlsStream && Hls.isSupported()) {
      hls = new Hls(HLS_LOW_LATENCY_CONFIG);

      hls.loadSource(currentUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });

      let networkRetryCount = 0;
      const MAX_NETWORK_RETRIES = 3;

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
          handleHlsStallCatchUp(hls, video, 4);
        } else if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            const fallbackUrl = resolveHlsFallbackUrl(currentUrl);
            if (fallbackUrl) {
              console.warn("[AIStation] Direct HLS network error, switching to proxy fallback...");
              setCurrentUrl(fallbackUrl);
              hls?.loadSource(fallbackUrl);
              hls?.startLoad();
              return;
            }
            if (networkRetryCount < MAX_NETWORK_RETRIES) {
              networkRetryCount++;
              console.warn(`[AIStation] HLS network error, retry ${networkRetryCount}/${MAX_NETWORK_RETRIES}...`);
              setTimeout(() => {
                hls?.startLoad();
              }, 1500 * networkRetryCount);
            } else {
              console.error("[AIStation] HLS network retries exhausted. Stream unavailable.");
              hls?.destroy();
            }
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls?.recoverMediaError();
          }
        }
      });
    } else {
      video.src = currentUrl;
      video.play().catch(() => {});
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [selectedChannel, currentUrl, videoKey]);

  // 4. Real-Time Client-Side WebGL AI Inference Loop with Dynamic Throttle & 512px Frame Lock
  useEffect(() => {
    let animationFrameId: number;
    let nextAllowedTime = 0;
    let frameCount = 0;
    let fpsCalcTime = performance.now();
    let consecutiveErrors = 0;
    let coolOffUntil = 0;
    const throttleInterval = Math.round(1000 / targetFps);
    // Guaranteed breathing room for the UI thread between two inferences
    const MIN_IDLE_GAP_MS = 50;

    const loop = async (timestamp: number) => {
      // Circuit breaker: do not run inference if model is loading or in error state
      if (modelStatusRef.current === "error" || modelStatusRef.current === "loading") {
        animationFrameId = requestAnimationFrame(loop);
        return;
      }

      // Cool-off backoff: skip frames during cool-off to protect browser UI thread
      if (timestamp < coolOffUntil) {
        animationFrameId = requestAnimationFrame(loop);
        return;
      }

      const video = videoRef.current;

      if (
        video &&
        video.readyState >= 2 &&
        !video.paused &&
        !isInferringRef.current &&
        timestamp >= nextAllowedTime
      ) {
        isInferringRef.current = true;
        const startedAt = timestamp;

        try {
          // Run inference with adaptive vision preprocessor
          const result = await runClientVehicleInference(
            video,
            confidence,
            enableNightBoost,
            enableSharpening
          );

          // Reset consecutive errors upon successful inference
          consecutiveErrors = 0;

          // Update trajectory tracker
          const trackerResult = trackerRef.current.update(
            result.detections,
            video.videoHeight || 480,
            tripwireYRatio
          );

          setTrackedVehicles(trackerResult.trackedVehicles);
          setCounts(trackerResult.counts);
          setLineCrossed(trackerResult.lineCrossed);
          setIsNightScene(result.isNightScene);
          setInferenceTimeMs(result.inferenceTimeMs);
          benchmarkRef.current.recordInference(result.inferenceTimeMs);
          
          if (result.processedCanvas) {
            setProcessedCanvas(result.processedCanvas);
          }

          // Calculate actual FPS and log benchmark
          frameCount++;
          if (timestamp - fpsCalcTime >= 1000) {
            const currentFps = Math.round((frameCount * 1000) / (timestamp - fpsCalcTime));
            setFps(currentFps);
            frameCount = 0;
            fpsCalcTime = timestamp;
            
            // Console log benchmark
            const metrics = benchmarkRef.current.getMetrics();
            if (metrics) {
              console.log(`[AI Benchmark] Latency: median ${metrics.medianMs.toFixed(1)}ms, p95 ${metrics.p95Ms.toFixed(1)}ms | max FPS: ${metrics.averageFps.toFixed(1)} | Actual FPS: ${currentFps}`);
            }
          }
        } catch (err) {
          consecutiveErrors++;
          if (consecutiveErrors <= 2) {
            console.debug("[AIStation] Inference frame dropped:", err);
          } else if (consecutiveErrors === 3) {
            console.warn(
              "[AIStation] Consecutive inference failures detected. Entering 3s cool-off to protect browser UI thread:",
              err
            );
            coolOffUntil = performance.now() + 3000;
          } else {
            coolOffUntil = performance.now() + 5000;
          }
        } finally {
          isInferringRef.current = false;
          nextAllowedTime = Math.max(startedAt + throttleInterval, performance.now() + MIN_IDLE_GAP_MS);
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [selectedChannel, confidence, tripwireYRatio, enableNightBoost, enableSharpening, targetFps]);

  const handleResetCounts = useCallback(() => {
    trackerRef.current.resetCounts();
    setCounts({
      total: 0,
      cars: 0,
      motorcycles: 0,
      buses: 0,
      trucks: 0,
    });
    setTrackedVehicles([]);
  }, []);

  const toggleFullScreen = () => {
    const el = document.getElementById("ai-viewport-container");
    if (!document.fullscreenElement) {
      el?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  if (!selectedChannel) {
    return (
      <div className="w-full max-w-[1800px] mx-auto p-6 flex flex-col items-center justify-center min-h-[60vh] bg-background text-foreground font-sans">
        <div className="rounded-xl border border-border bg-card p-8 text-center max-w-md">
          <Video className="w-8 h-8 text-muted-foreground mx-auto mb-3 animate-pulse" />
          <h2 className="text-base font-bold text-foreground mb-2">Tidak Ada Feed Kamera Video Aktif</h2>
          <p className="text-xs text-muted-foreground">
            Kamera dengan format streaming video langsung belum tersedia atau sedang offline. Silakan periksa kembali beberapa saat lagi.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1800px] mx-auto p-3 md:p-5 flex flex-col gap-4 bg-background text-foreground font-sans transition-colors">
      {/* ─── Header & Camera Selection Bar ─── */}
      <div className="relative z-40 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card/85 rounded-lg p-4 border border-border backdrop-blur-md">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono font-medium text-emerald-600 dark:text-emerald-400 uppercase">
              {selectedChannel.region}
            </span>
            <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
              <Video className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
              {selectedChannel.ch_name}
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            Pantauan Cerdas AI
          </h1>
          <p className="text-xs text-muted-foreground">
            Analisis arus kendaraan real-time, estimasi volume per menit, dan inferensi neural vision berbasis WebGL.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto relative">
          {/* Camera Selector Dropdown Button */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setShowCameraSelector(!showCameraSelector)}
              className="flex items-center gap-2 h-8 px-3 text-xs bg-secondary/60 border border-border hover:bg-secondary font-medium text-foreground rounded-md shadow-sm min-w-[200px] sm:min-w-[240px] max-w-[280px] transition-colors"
            >
              <Video className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
              <span className="truncate flex-1 text-left">{selectedChannel.ch_name}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0 ml-1" />
            </button>

            {/* Dropdown Menu Modal */}
            {showCameraSelector && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-[calc(100vw-2.5rem)] sm:w-96 max-w-sm bg-card border border-border rounded-lg shadow-xl z-50 p-3 flex flex-col gap-2.5 animate-in fade-in zoom-in-95">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Cari kamera atau wilayah..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground rounded-md focus-visible:ring-1 focus-visible:ring-emerald-500/50"
                    autoFocus
                  />
                </div>

                {/* Region Chips */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    onClick={() => setRegionFilter("ALL")}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap border transition-colors ${
                      regionFilter === "ALL"
                        ? "bg-emerald-500 text-zinc-950 font-bold border-emerald-400"
                        : "bg-secondary text-muted-foreground border-border hover:text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    Semua
                  </button>
                  {ALL_REGIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRegionFilter(r)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap border transition-colors ${
                        regionFilter === r
                          ? "bg-emerald-500 text-zinc-950 font-bold border-emerald-400"
                          : "bg-secondary text-muted-foreground border-border hover:text-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {/* Camera List */}
                <div className="max-h-64 overflow-y-auto flex flex-col gap-1 pr-1 divide-y divide-border/40">
                  {filteredChannels.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground font-mono">
                      Tidak ada kamera yang cocok
                    </div>
                  ) : (
                    filteredChannels.map((cam) => {
                      const isSelected = cam.cctv_id === selectedChannel.cctv_id;
                      return (
                        <button
                          key={cam.cctv_id}
                          onClick={() => {
                            setSelectedChannel(cam);
                            setShowCameraSelector(false);
                            setVideoKey((k) => k + 1);
                            handleResetCounts();
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded text-left text-xs transition-colors ${
                            isSelected
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-medium border border-emerald-500/30"
                              : "hover:bg-secondary text-foreground border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 flex-shrink-0 animate-pulse" />
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="truncate text-foreground font-medium">{cam.ch_name}</span>
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {cam.region}
                              </span>
                            </div>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullScreen}
            className="h-8 w-8 bg-secondary/60 border border-border hover:bg-secondary text-muted-foreground hover:text-foreground rounded-md flex items-center justify-center transition-colors"
            title="Layar Penuh"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Main Content Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left / Center Viewport (8 Columns) */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div
            id="ai-viewport-container"
            className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-white/[0.08] shadow-2xl flex items-center justify-center isolate"
          >
            {/* Live Video Feed */}
            <video
              ref={videoRef}
              key={videoKey}
              className={`w-full h-full object-fill pointer-events-none ${
                syncFrameLock ? "opacity-0 absolute inset-0" : "opacity-100"
              }`}
              autoPlay
              muted
              playsInline
              crossOrigin="anonymous"
            />

            {/* Real-time 0ms Client-Side Tactical Overlay */}
            <ClientAITacticalOverlay
              trackedVehicles={trackedVehicles}
              tripwireYRatio={tripwireYRatio}
              lineCrossed={lineCrossed}
              isNightScene={isNightScene}
              videoElement={videoElement}
              fitMode="fill"
              syncFrameLock={syncFrameLock}
              enableSharpening={enableSharpening}
              processedCanvas={processedCanvas}
            />

            {/* Model Download / Preparation Progress Overlay */}
            {modelProgress.status === "loading" && (
              <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                <div className="max-w-md w-full flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-emerald-400 animate-spin" />
                  </div>
                  <div className="flex flex-col gap-1 text-center">
                    <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                      Mengunduh Model YOLOS Tiny (ViT)
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      {modelProgress.file
                        ? `Memuat ${modelProgress.file.split("/").pop()} (${modelProgress.progress}%)`
                        : `Menyiapkan akselerasi neural WebGL (${modelProgress.progress}%)...`}
                    </p>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden border border-white/10">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                      style={{ width: `${Math.max(5, modelProgress.progress)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400">
                    {modelProgress.progress}% • 100% In-Browser (Zero GPU Cost)
                  </span>
                </div>
              </div>
            )}

            {/* Model Error State Overlay */}
            {modelProgress.status === "error" && (
              <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                <div className="max-w-md w-full flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col gap-1 text-center">
                    <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                      Gagal Memuat Model AI
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      Terjadi kendala jaringan saat mengunduh model neural dari CDN. Silakan klik tombol di bawah untuk mencoba kembali.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={handleRetryModel}
                      className="px-3.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-900/30"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Coba Lagi</span>
                    </button>
                    <button
                      onClick={() => clearClientAICache()}
                      className="px-3.5 py-1.5 rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground font-mono text-xs border border-border transition-colors"
                    >
                      Hapus Cache
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Viewport Top HUD */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between pointer-events-none z-30">
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded border border-white/[0.1]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-medium text-white tracking-tight">
                  {selectedChannel.ch_name}
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-emerald-500/20 backdrop-blur-sm px-2 py-1 rounded border border-emerald-500/30 font-mono text-[10px] text-emerald-300">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    modelProgress.status === "error"
                      ? "bg-rose-500"
                      : "bg-emerald-400 animate-ping"
                  }`}
                />
                <span>{modelProgress.status === "error" ? "AI OFFLINE" : "YOLOS LIVE"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Telemetry & Controls (4 Columns) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <AITrafficTelemetry
            counts={counts}
            fps={fps}
            inferenceTimeMs={inferenceTimeMs}
            targetFps={targetFps}
            onTargetFpsChange={handleTargetFpsChange}
            isNightScene={isNightScene}
            enableNightBoost={enableNightBoost}
            onToggleNightBoost={handleToggleNightBoost}
            enableSharpening={enableSharpening}
            onToggleSharpening={handleToggleSharpening}
            syncFrameLock={syncFrameLock}
            onToggleSyncFrameLock={handleToggleSyncFrameLock}
            tripwireYRatio={tripwireYRatio}
            onTripwireChange={setTripwireYRatio}
            confidence={confidence}
            onConfidenceChange={setConfidence}
            onResetCounts={handleResetCounts}
            onClearCache={clearClientAICache}
          />
        </div>
      </div>
    </div>
  );
}
