"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { CCTVChannel } from "@/types/cctv";
import {
  runClientVehicleInference,
  clearClientAICache,
} from "@/lib/ai/client-ai-engine";
import {
  ClientVehicleTracker,
  VehicleCounts,
  TrackedVehicle,
} from "@/lib/ai/client-vehicle-tracker";
import { ClientAITacticalOverlay } from "@/components/ai-station/ClientAITacticalOverlay";
import { AITrafficTelemetry } from "@/components/ai-station/AITrafficTelemetry";
import { ALL_REGIONS } from "@/lib/cctv-utils";
import Hls from "hls.js";
import {
  ChevronDown,
  Search,
  Maximize2,
  Video,
  Check,
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

  const trackerRef = useRef<ClientVehicleTracker>(new ClientVehicleTracker());
  const isInferringRef = useRef<boolean>(false);

  // Load camera-specific AI settings from localStorage
  useEffect(() => {
    if (!selectedChannel) return;
    try {
      const saved = localStorage.getItem(`ai_cam_pref_${selectedChannel.cctv_id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.targetFps) setTargetFps(parsed.targetFps);
        if (typeof parsed.enableSharpening === "boolean") setEnableSharpening(parsed.enableSharpening);
        if (typeof parsed.syncFrameLock === "boolean") setSyncFrameLock(parsed.syncFrameLock);
        if (typeof parsed.enableNightBoost === "boolean") setEnableNightBoost(parsed.enableNightBoost);
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

  // Video Player Mount & HLS Setup
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedChannel) return;

    setVideoElement(video);

    let hls: Hls | null = null;
    const url = selectedChannel.streaming_url;
    const isHlsStream = url.includes(".m3u8") || url.includes("/api/proxy/hls");

    if (isHlsStream && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 0,
        maxBufferLength: 30,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 8,
        liveDurationInfinity: true,
      });

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
          if (video.paused) video.play().catch(() => {});
        } else if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls?.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls?.recoverMediaError();
          }
        }
      });
    } else {
      video.src = url;
      video.play().catch(() => {});
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [selectedChannel, videoKey]);

  // 4. Real-Time Client-Side WebGL AI Inference Loop with Dynamic Throttle & 512px Frame Lock
  useEffect(() => {
    let animationFrameId: number;
    let lastInferenceTime = 0;
    let frameCount = 0;
    let fpsCalcTime = performance.now();
    const throttleInterval = Math.round(1000 / targetFps);

    const loop = async (timestamp: number) => {
      const video = videoRef.current;

      if (
        video &&
        video.readyState >= 2 &&
        !video.paused &&
        !isInferringRef.current &&
        timestamp - lastInferenceTime >= throttleInterval
      ) {
        isInferringRef.current = true;
        lastInferenceTime = timestamp;

        try {
          // Run 512px WebGL inference with unsharp masking filter
          const result = await runClientVehicleInference(
            video,
            confidence,
            enableNightBoost,
            enableSharpening
          );

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
          if (result.processedCanvas) {
            setProcessedCanvas(result.processedCanvas);
          }

          // Calculate actual FPS
          frameCount++;
          if (timestamp - fpsCalcTime >= 1000) {
            setFps(Math.round((frameCount * 1000) / (timestamp - fpsCalcTime)));
            frameCount = 0;
            fpsCalcTime = timestamp;
          }
        } catch (err) {
          console.warn("[AIStation] Inference frame dropped:", err);
        } finally {
          isInferringRef.current = false;
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

  return (
    <div className="w-full max-w-[1800px] mx-auto p-3 md:p-5 flex flex-col gap-4 bg-zinc-950 text-zinc-100 font-sans">
      {/* ─── Header & Camera Selection Bar ─── */}
      <div className="relative z-40 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-900/40 rounded-lg p-4 border border-white/[0.08] backdrop-blur-md">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono font-medium text-emerald-400 uppercase">
              {selectedChannel.region}
            </span>
            <span className="text-xs font-mono text-zinc-400 flex items-center gap-1">
              <Video className="w-3 h-3 text-emerald-400" />
              {selectedChannel.ch_name}
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
            Pantauan Cerdas AI
          </h1>
          <p className="text-xs text-zinc-400">
            Analisis arus kendaraan real-time, estimasi volume per menit, dan inferensi neural vision berbasis WebGL.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto relative">
          {/* Camera Selector Dropdown Button */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setShowCameraSelector(!showCameraSelector)}
              className="flex items-center gap-2 h-8 px-3 text-xs bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] font-medium text-zinc-200 rounded-md shadow-sm min-w-[200px] sm:min-w-[240px] max-w-[280px] transition-colors"
            >
              <Video className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="truncate flex-1 text-left">{selectedChannel.ch_name}</span>
              <ChevronDown className="w-3 h-3 text-zinc-400 flex-shrink-0 ml-1" />
            </button>

            {/* Dropdown Menu Modal */}
            {showCameraSelector && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-[calc(100vw-2.5rem)] sm:w-96 max-w-sm bg-[#09090b] border border-white/[0.15] ring-1 ring-white/[0.08] rounded-lg shadow-[0_25px_60px_rgba(0,0,0,0.95)] z-50 p-3 flex flex-col gap-2.5 animate-in fade-in zoom-in-95">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <Input
                    type="text"
                    placeholder="Cari kamera atau wilayah..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs bg-zinc-900 border-white/[0.1] text-zinc-100 placeholder:text-zinc-500 rounded-md focus-visible:ring-1 focus-visible:ring-emerald-500/50"
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
                        : "bg-zinc-900 text-zinc-400 border-white/[0.06] hover:text-zinc-200 hover:bg-zinc-800"
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
                          : "bg-zinc-900 text-zinc-400 border-white/[0.06] hover:text-zinc-200 hover:bg-zinc-800"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {/* Camera List */}
                <div className="max-h-64 overflow-y-auto flex flex-col gap-1 pr-1 divide-y divide-white/[0.04]">
                  {filteredChannels.length === 0 ? (
                    <div className="p-4 text-center text-xs text-zinc-400 font-mono">
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
                              ? "bg-emerald-500/15 text-emerald-300 font-medium border border-emerald-500/30"
                              : "hover:bg-zinc-900 text-zinc-200 border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 animate-pulse" />
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="truncate text-zinc-100 font-medium">{cam.ch_name}</span>
                              <span className="text-[10px] font-mono text-zinc-400">
                                {cam.region}
                              </span>
                            </div>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
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
            className="h-8 w-8 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-zinc-300 rounded-md flex items-center justify-center transition-colors"
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

            {/* Viewport Top HUD */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between pointer-events-none z-30">
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded border border-white/[0.1]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-medium text-white tracking-tight">
                  {selectedChannel.ch_name}
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-emerald-500/20 backdrop-blur-sm px-2 py-1 rounded border border-emerald-500/30 font-mono text-[10px] text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>LIVE TRACKER</span>
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
