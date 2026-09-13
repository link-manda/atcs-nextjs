"use client";

import { CCTVChannel } from "@/types/cctv";
import { useEffect, useState, useRef, useCallback } from "react";
import Hls from "hls.js";
import { VideoOff } from "lucide-react";

interface CCTVPlayerProps {
  channel: CCTVChannel;
}

export function CCTVPlayer({ channel }: CCTVPlayerProps) {
  const [mounted, setMounted] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [key, setKey] = useState(0);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const MAX_RETRIES = 5;

  useEffect(() => {
    setMounted(true);
  }, []);

  const [currentUrl, setCurrentUrl] = useState(channel.streaming_url);

  useEffect(() => {
    setCurrentUrl(channel.streaming_url);
  }, [channel.streaming_url]);

  const handleError = useCallback(() => {
    if (retryCount < MAX_RETRIES) {
      setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        setKey((prev) => prev + 1); // Increment key to force remount
      }, 3000); // 3 seconds delay before retry
    }
  }, [retryCount]);

  // Setup HLS / Video playback
  useEffect(() => {
    if (!mounted || channel.player_type === "iframe") return;

    const video = videoRef.current;
    if (!video) return;

    setVideoElement(video);

    let hls: Hls | null = null;
    const isHlsStream = currentUrl.includes(".m3u8") || currentUrl.includes("/api/proxy/hls");

    if (isHlsStream && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 4,
        maxBufferLength: 10,
        maxMaxBufferLength: 20,
        liveSyncDurationCount: 2,          // Target 4s behind live edge
        liveMaxLatencyDurationCount: 4,     // If lag exceeds 8s, fast-forward to live
        initialLiveManifestSize: 2,        // Wait until at least 2 segments to prevent cold-start freeze
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.2,
        nudgeMaxRetry: 5,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 5,
        levelLoadingTimeOut: 10000,
        levelLoadingMaxRetry: 5,
        fragLoadingTimeOut: 15000,
        fragLoadingMaxRetry: 6,
      });

      hls.loadSource(currentUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((err) => {
          console.warn("[CCTVPlayer] Autoplay prevented:", err);
        });
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
          if (hls && video) {
            const livePos = hls.liveSyncPosition;
            if (typeof livePos === "number" && livePos > 0 && Math.abs(livePos - video.currentTime) > 4) {
              video.currentTime = livePos;
            }
            if (video.paused && video.readyState >= 2) {
              video.play().catch(() => {});
            }
          }
          return;
        }

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // If direct stream fails (e.g. CORS block or connection timeout), fallback to proxy
              if (!currentUrl.includes('/api/proxy/hls') && currentUrl.startsWith('https://atcs.denpasarkota.go.id')) {
                console.warn("[CCTVPlayer] Direct HLS network error, switching to proxy fallback...");
                const fallbackUrl = `/api/proxy/hls?url=${encodeURIComponent(currentUrl)}`;
                setCurrentUrl(fallbackUrl);
                hls?.loadSource(fallbackUrl);
                hls?.startLoad();
                return;
              }
              console.warn("[CCTVPlayer] HLS network error, recovering...", data);
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn("[CCTVPlayer] HLS media error, recovering...", data);
              hls?.recoverMediaError();
              break;
            default:
              console.error("[CCTVPlayer] Fatal HLS error:", data);
              hls?.destroy();
              handleError();
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native Safari HLS support
      video.src = currentUrl;
      video.play().catch(() => {});
    } else {
      // Direct MP4 playback
      video.src = currentUrl;
      video.play().catch(() => {});
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [mounted, currentUrl, channel.player_type, key, handleError]);

  if (channel.player_type === "iframe") {
    return (
      <div className="w-full h-full relative bg-black">
        <iframe
          key={key}
          src={channel.streaming_url}
          className="w-full h-full border-0"
          allow="fullscreen; picture-in-picture"
          allowFullScreen
          onError={handleError}
        />
        {retryCount > 0 && retryCount < MAX_RETRIES && (
          <div className="absolute top-2 right-2 bg-black/90 border border-white/20 text-white text-[10px] px-2 py-1 rounded pointer-events-none">
            Reconnecting... ({retryCount}/{MAX_RETRIES})
          </div>
        )}
        {retryCount >= MAX_RETRIES && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95">
            <VideoOff className="w-8 h-8 text-rose-500 mb-2" />
            <span className="text-rose-500 text-xs font-bold uppercase tracking-widest">Stream Failed</span>
          </div>
        )}
      </div>
    );
  }

  if (!mounted) return null;

  return (
    <div className="w-full h-full relative bg-black flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        key={key}
        className="w-full h-full object-fill pointer-events-none"
        autoPlay
        muted
        playsInline
        crossOrigin="anonymous"
      />

      {retryCount > 0 && retryCount < MAX_RETRIES && (
        <div className="absolute top-2 right-2 bg-black/90 border border-white/20 text-white text-[10px] px-2 py-1 rounded pointer-events-none z-30">
          Reconnecting... ({retryCount}/{MAX_RETRIES})
        </div>
      )}
      {retryCount >= MAX_RETRIES && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-30">
          <VideoOff className="w-8 h-8 text-rose-500 mb-2" />
          <span className="text-rose-500 text-xs font-bold uppercase tracking-widest">Stream Failed</span>
        </div>
      )}
    </div>
  );
}

