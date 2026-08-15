"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { CCTVChannel, CCTVRegion } from "@/types/cctv";
import { ALL_REGIONS } from "@/lib/cctv-utils";
import { AIWebSocketOverlay, DetectionItem } from "@/components/ai-station/AIWebSocketOverlay";
import { AITrafficTelemetry, VehicleCountsData } from "@/components/ai-station/AITrafficTelemetry";
import Hls from "hls.js";
import {
  Camera,
  Search,
  Maximize2,
  VideoOff,
  Radio,
  SlidersHorizontal,
  ChevronDown,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  // 2. Video Player Ref
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [videoKey, setVideoKey] = useState(0);

  // 3. AI & WebSocket State
  const [backendUrl, setBackendUrl] = useState<string>(
    "wss://githadewi2002--bali-atcs-yolov12-serve.modal.run/ws/track"
  );
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "connecting" | "disconnected" | "error"
  >("disconnected");
  const [fps, setFps] = useState<number>(0);
  const [tripwireYRatio, setTripwireYRatio] = useState<number>(0.55);
  const [confidence, setConfidence] = useState<number>(0.25);
  const [counts, setCounts] = useState<VehicleCountsData>({
    total: 0,
    cars: 0,
    motorcycles: 0,
    buses: 0,
    trucks: 0,
  });
  const [detections, setDetections] = useState<DetectionItem[]>([]);
  const [lineCrossed, setLineCrossed] = useState<boolean>(false);
  const [resolution, setResolution] = useState<{ width: number; height: number } | undefined>();

  const wsRef = useRef<WebSocket | null>(null);
  const tripwireRef = useRef(tripwireYRatio);
  tripwireRef.current = tripwireYRatio;
  const confidenceRef = useRef(confidence);
  confidenceRef.current = confidence;

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

  // Video Player Mount / Stream Setup
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

  // Helper to extract clean upstream stream URL for cloud backend
  const cleanStreamUrl = useMemo(() => {
    if (!selectedChannel) return "";
    let raw = selectedChannel.streaming_url;
    if (raw.includes("url=")) {
      try {
        const parts = raw.split("url=");
        if (parts[1]) {
          return decodeURIComponent(parts[1]);
        }
      } catch (e) {
        console.warn("[AIStation] Error decoding proxy url:", e);
      }
    }
    return raw;
  }, [selectedChannel]);

  // WebSocket Live Tracking Lifecycle (Only reconnects if channel or backendUrl changes)
  useEffect(() => {
    if (!selectedChannel || !backendUrl || !cleanStreamUrl) return;

    let isSubscribed = true;
    let ws: WebSocket | null = null;

    const connectWebSocket = () => {
      try {
        setConnectionStatus("connecting");
        const encodedStreamUrl = encodeURIComponent(cleanStreamUrl);
        const fullWsUrl = `${backendUrl}?stream_url=${encodedStreamUrl}&tripwire_y=${tripwireRef.current}&confidence=${confidenceRef.current}`;

        ws = new WebSocket(fullWsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isSubscribed) return;
          setConnectionStatus("connected");
        };

        ws.onmessage = (event) => {
          if (!isSubscribed) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === "init") {
              setConnectionStatus("connected");
              return;
            }
            if (data.fps !== undefined) setFps(data.fps);
            if (data.counts) setCounts(data.counts);
            if (data.detections) setDetections(data.detections);
            if (data.line_crossed !== undefined) setLineCrossed(data.line_crossed);
            if (data.resolution) setResolution(data.resolution);
          } catch (parseErr) {
            console.warn("[AIStation] WebSocket parse error:", parseErr);
          }
        };

        ws.onerror = () => {
          if (!isSubscribed) return;
          setConnectionStatus("error");
        };

        ws.onclose = () => {
          if (!isSubscribed) return;
          setConnectionStatus("disconnected");
        };
      } catch (err) {
        console.error("[AIStation] WebSocket connection error:", err);
        setConnectionStatus("error");
      }
    };

    connectWebSocket();

    return () => {
      isSubscribed = false;
      if (ws) {
        ws.close();
      }
    };
  }, [selectedChannel, backendUrl, cleanStreamUrl]);

  // Dynamic Slider Config Pusher (Sends without dropping WebSocket connection)
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "config",
          tripwire_y: tripwireYRatio,
          confidence: confidence,
        })
      );
    }
  }, [tripwireYRatio, confidence]);

  const handleResetCounts = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send("reset");
    }
    setCounts({
      total: 0,
      cars: 0,
      motorcycles: 0,
      buses: 0,
      trucks: 0,
    });
  };

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-container rounded-xl p-4 border border-border/40 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Radio className="w-5 h-5 text-primary animate-pulse" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black font-headline tracking-[0.2em] uppercase text-white">
              AI Traffic Vision Station
            </h1>
            <p className="text-[11px] font-sans text-muted-foreground">
              Pemantauan Kendaraan Real-Time SOTA YOLOv12 + ByteTrack Multi-Object Tracking
            </p>
          </div>
        </div>

        {/* Camera Selector & Region Filter Trigger */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowCameraSelector(!showCameraSelector)}
              className="h-9 px-3.5 bg-surface-container-high border-border text-foreground font-headline font-bold text-xs flex items-center gap-2"
            >
              <Camera className="w-3.5 h-3.5 text-primary" />
              <span className="max-w-[200px] truncate">{selectedChannel.ch_name}</span>
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-mono">
                {selectedChannel.region}
              </Badge>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
            </Button>

            {/* Camera Dropdown Popover */}
            {showCameraSelector && (
              <div className="absolute right-0 top-11 w-80 sm:w-96 bg-surface-container-highest border border-border rounded-xl p-3 shadow-2xl z-50 flex flex-col gap-2.5">
                <div className="flex items-center gap-2 px-2 py-1 bg-background rounded-md border border-border">
                  <Search className="w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Cari kamera atau wilayah..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-xs text-foreground focus:outline-none font-sans"
                  />
                </div>

                {/* Region Filter Chips */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
                  <button
                    onClick={() => setRegionFilter("ALL")}
                    className={`px-2 py-0.5 rounded font-headline font-bold ${
                      regionFilter === "ALL"
                        ? "bg-primary text-background"
                        : "bg-surface-container text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Semua
                  </button>
                  {ALL_REGIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRegionFilter(r)}
                      className={`px-2 py-0.5 rounded font-headline font-bold whitespace-nowrap ${
                        regionFilter === r
                          ? "bg-primary text-background"
                          : "bg-surface-container text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {/* Camera List */}
                <div className="max-h-60 overflow-y-auto flex flex-col gap-1 pr-1">
                  {filteredChannels.length === 0 ? (
                    <span className="text-xs text-muted-foreground text-center py-4 font-sans">
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
                        }}
                        className={`p-2 rounded-lg text-left text-xs font-headline flex items-center justify-between transition-colors ${
                          selectedChannel.cctv_id === ch.cctv_id
                            ? "bg-primary/15 text-primary border border-primary/30"
                            : "hover:bg-muted/40 text-foreground"
                        }`}
                      >
                        <span className="truncate max-w-[200px]">{ch.ch_name}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">
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
            className="h-9 w-9 bg-surface-container-high border-border"
            title="Fullscreen Viewport"
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
            className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-border/40 shadow-2xl flex items-center justify-center isolate"
          >
            {/* Live Video Feed */}
            <video
              ref={videoRef}
              key={videoKey}
              className="w-full h-full object-contain pointer-events-none"
              autoPlay
              muted
              playsInline
              crossOrigin="anonymous"
            />

            {/* Real-time WebSocket Tactical Overlay */}
            <AIWebSocketOverlay
              detections={detections}
              tripwireYRatio={tripwireYRatio}
              lineCrossed={lineCrossed}
              resolution={resolution}
              videoElement={videoElement}
            />

            {/* Viewport Top HUD */}
            <div className="absolute top-3 left-3 right-3 flex items-start justify-between pointer-events-none z-30">
              <div className="bg-black/90 px-3 py-1.5 rounded-lg border border-white/15 shadow-xl flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-black font-headline uppercase text-white tracking-wider">
                  {selectedChannel.ch_name}
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-black/90 px-2.5 py-1 rounded-lg border border-white/15 shadow-xl">
                <Badge variant="outline" className="bg-red-950/80 text-red-400 border-red-500/40 text-[10px] font-headline font-bold uppercase">
                  Live ATCS
                </Badge>
              </div>
            </div>

            {/* Connection Lost Notification */}
            {(connectionStatus === "disconnected" || connectionStatus === "error") && (
              <div className="absolute bottom-4 left-4 right-4 bg-black/90 border border-amber-500/40 rounded-lg p-3 z-30 flex items-center justify-between text-xs text-amber-300">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>
                    Backend Python YOLOv12 belum terhubung ({backendUrl}). Menunggu service...
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  Jalankan: uvicorn app.main:app
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side Telemetry & Controls (4 Columns) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <AITrafficTelemetry
            counts={counts}
            fps={fps}
            connectionStatus={connectionStatus}
            tripwireYRatio={tripwireYRatio}
            onTripwireChange={setTripwireYRatio}
            confidence={confidence}
            onConfidenceChange={setConfidence}
            backendUrl={backendUrl}
            onBackendUrlChange={setBackendUrl}
            onResetCounts={handleResetCounts}
          />
        </div>
      </div>
    </div>
  );
}
