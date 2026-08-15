"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { CCTVChannel } from "@/types/cctv";
import { ALL_REGIONS } from "@/lib/cctv-utils";
import { ClientAITacticalOverlay } from "@/components/ai-station/ClientAITacticalOverlay";
import { AITrafficTelemetry } from "@/components/ai-station/AITrafficTelemetry";
import { runClientVehicleInference } from "@/lib/ai/client-ai-engine";
import {
  ClientVehicleTracker,
  TrackedVehicle,
  VehicleCounts,
} from "@/lib/ai/client-vehicle-tracker";
import Hls from "hls.js";
import {
  Camera,
  Search,
  Maximize2,
  ChevronDown,
  Scaling,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  const [fitMode, setFitMode] = useState<"cover" | "contain">("cover");

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
  const [isNightScene, setIsNightScene] = useState<boolean>(false);

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

  // 4. Real-Time Client-Side WebGL AI Inference Loop with Dynamic Throttle
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
          // Run WebGL inference
          const result = await runClientVehicleInference(
            video,
            confidence,
            enableNightBoost
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
  }, [selectedChannel, confidence, tripwireYRatio, enableNightBoost, targetFps]);

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
      {/* ─── Top Control & Status Bar ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card rounded-xl p-4 border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold font-headline text-foreground">
              Pantauan Cerdas AI
            </h1>
            <p className="text-xs text-muted-foreground">
              Penghitungan dan pemantauan arus kendaraan otomatis
            </p>
          </div>
        </div>

        {/* Camera Selector & Region Filter Trigger */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Fit Mode Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFitMode((prev) => (prev === "cover" ? "contain" : "cover"))}
            className="h-9 px-3 bg-background border-border text-foreground font-semibold text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Scaling className="w-3.5 h-3.5 text-primary" />
            <span>{fitMode === "cover" ? "Tampilan Penuh" : "Sesuai Ukuran"}</span>
          </Button>

          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowCameraSelector(!showCameraSelector)}
              className="h-9 px-3.5 bg-background border-border text-foreground font-semibold text-xs flex items-center gap-2 shadow-sm"
            >
              <Camera className="w-3.5 h-3.5 text-primary" />
              <span className="max-w-[200px] truncate">{selectedChannel.ch_name}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
                {selectedChannel.region}
              </Badge>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
            </Button>

            {/* Camera Dropdown Popover */}
            {showCameraSelector && (
              <div className="absolute right-0 top-11 w-80 sm:w-96 bg-card border border-border rounded-xl p-3 shadow-xl z-50 flex flex-col gap-2.5">
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-background rounded-lg border border-border">
                  <Search className="w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Cari nama jalan atau wilayah..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-xs text-foreground focus:outline-none"
                  />
                </div>

                {/* Region Filter Chips */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
                  <button
                    onClick={() => setRegionFilter("ALL")}
                    className={`px-2.5 py-1 rounded-md font-medium ${
                      regionFilter === "ALL"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Semua
                  </button>
                  {ALL_REGIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRegionFilter(r)}
                      className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap ${
                        regionFilter === r
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {/* Camera List */}
                <div className="max-h-60 overflow-y-auto flex flex-col gap-1 pr-1">
                  {filteredChannels.length === 0 ? (
                    <span className="text-xs text-muted-foreground text-center py-4">
                      Kamera tidak ditemukan
                    </span>
                  ) : (
                    filteredChannels.map((ch) => (
                      <button
                        key={ch.cctv_id}
                        onClick={() => {
                          setSelectedChannel(ch);
                          setShowCameraSelector(false);
                          setVideoKey((k) => k + 1);
                          handleResetCounts();
                        }}
                        className={`p-2 rounded-lg text-left text-xs flex items-center justify-between transition-colors ${
                          selectedChannel.cctv_id === ch.cctv_id
                            ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                            : "hover:bg-muted text-foreground"
                        }`}
                      >
                        <span className="truncate max-w-[200px]">{ch.ch_name}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {ch.region}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

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
            {/* Live Video Feed */}
            <video
              ref={videoRef}
              key={videoKey}
              className={`w-full h-full pointer-events-none ${
                fitMode === "cover" ? "object-cover" : "object-contain"
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
              fitMode={fitMode}
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
            onTargetFpsChange={setTargetFps}
            isNightScene={isNightScene}
            enableNightBoost={enableNightBoost}
            onToggleNightBoost={() => setEnableNightBoost((prev) => !prev)}
            tripwireYRatio={tripwireYRatio}
            onTripwireChange={setTripwireYRatio}
            confidence={confidence}
            onConfidenceChange={setConfidence}
            onResetCounts={handleResetCounts}
          />
        </div>
      </div>
    </div>
  );
}
