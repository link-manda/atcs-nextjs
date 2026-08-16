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

  // Filtered cameras list
  const filteredChannels = useMemo(() => {
    return channels.filter((ch) => {
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
    <div className="w-full max-w-[1800px] mx-auto p-4 md:p-6 flex flex-col gap-6">
      {/* ─── Header & Camera Selection Bar ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card rounded-2xl p-5 border border-border shadow-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-[11px] font-bold text-primary font-headline uppercase tracking-wider">
              {selectedChannel.region}
            </span>
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Video className="w-3.5 h-3.5 text-primary" />
              {selectedChannel.ch_name}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-headline tracking-tight text-foreground">
            Pantauan Cerdas AI
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Analisis arus kendaraan, klasifikasi objek, dan deteksi kepadatan real-time berbasis WebGL GPU.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto relative">
          {/* Camera Selector Dropdown Button */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowCameraSelector(!showCameraSelector)}
              className="flex items-center gap-2 h-9 px-3 text-xs bg-background border-border hover:bg-muted font-semibold text-foreground shadow-sm min-w-[200px] sm:min-w-[240px] max-w-[280px]"
            >
              <Video className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="truncate flex-1 text-left">{selectedChannel.ch_name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 ml-1" />
            </Button>

            {/* Dropdown Menu Modal */}
            {showCameraSelector && (
              <div className="absolute right-0 top-11 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-2xl z-50 p-3 flex flex-col gap-2.5 animate-in fade-in zoom-in-95">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Cari kamera atau wilayah..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs bg-background border-border"
                    autoFocus
                  />
                </div>

                {/* Region Chips */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setRegionFilter("ALL")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap border transition-colors ${
                      regionFilter === "ALL"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    Semua Wilayah
                  </button>
                  {ALL_REGIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRegionFilter(r)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap border transition-colors ${
                        regionFilter === r
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {/* Camera List */}
                <div className="max-h-60 overflow-y-auto flex flex-col gap-1 pr-1">
                  {filteredChannels.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
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
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                            isSelected
                              ? "bg-primary/10 text-primary font-bold border border-primary/20"
                              : "hover:bg-muted text-foreground border border-transparent"
                          }`}
                        >
                          <div className="flex flex-col min-w-0 flex-1 pr-2">
                            <span className="truncate">{cam.ch_name}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {cam.region}
                            </span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Fullscreen Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullScreen}
            className="h-9 w-9 bg-background border-border shadow-sm"
            title="Layar Penuh"
          >
            <Maximize2 className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* ─── Main Content Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Center Viewport (8 Columns) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div
            id="ai-viewport-container"
            className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-border shadow-lg flex items-center justify-center isolate"
          >
            {/* Live Video Feed (100% Full Autofit - Hidden in background if 1:1 Frame-Lock is active) */}
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

            {/* Viewport Top HUD with Transparent Badges */}
            <div className="absolute top-3 left-3 right-3 flex items-start justify-between pointer-events-none z-30">
              <div className="flex items-center gap-2 drop-shadow-md">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-sm font-bold text-white tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                  {selectedChannel.ch_name}
                </span>
              </div>

              <div className="flex items-center gap-1.5 drop-shadow-md">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs font-bold text-red-400 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                  Siaran Langsung
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Telemetry & Controls (4 Columns) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <AITrafficTelemetry
            counts={counts}
            fps={fps}
            inferenceTimeMs={inferenceTimeMs}
            targetFps={targetFps}
            onTargetFpsChange={handleTargetFpsChange}
            isNightScene={isNightScene}
            enableNightBoost={enableNightBoost}
            onToggleNightBoost={() => setEnableNightBoost((prev) => !prev)}
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
