"use client";

import { CCTVChannel } from "@/types/cctv";
import { useEffect, useState, useRef, useCallback } from "react";
import Hls from "hls.js";

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

  // Diagnostic log to track URL duplication/mangling
  console.log(`[CCTVPlayer] Rendering ${channel.ch_name} with URL: ${channel.streaming_url} (Type: ${channel.player_type})`);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    const url = channel.streaming_url;
    const isHlsStream = url.includes(".m3u8") || url.includes("/api/proxy/hls");

    if (isHlsStream && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 0,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 8,
        liveDurationInfinity: true,
        manifestLoadingTimeOut: 15000,
        manifestLoadingMaxRetry: 5,
        levelLoadingTimeOut: 15000,
        levelLoadingMaxRetry: 5,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 6,
      });

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((err) => {
          console.warn("[CCTVPlayer] Autoplay prevented:", err);
        });
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
          if (video.paused) {
            video.play().catch(() => {});
          }
          return;
        }

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
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
      video.src = url;
      video.play().catch(() => {});
    } else {
      // Direct MP4 playback
      video.src = url;
      video.play().catch(() => {});
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [mounted, channel.streaming_url, channel.player_type, key, handleError]);

  if (channel.player_type === "iframe") {
    return (
      <div className="w-full h-full relative bg-black">
        <iframe
          key={key}
          src={channel.streaming_url}
          className="w-full h-full border-0"
          allow="autoplay; encrypted-media"
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
            <span className="material-symbols-outlined text-error mb-2 text-2xl">videocam_off</span>
            <span className="text-error text-xs font-bold uppercase tracking-widest">Stream Failed</span>
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
        className="w-full h-full object-contain pointer-events-none"
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
          <span className="material-symbols-outlined text-error mb-2 text-2xl">videocam_off</span>
          <span className="text-error text-xs font-bold uppercase tracking-widest">Stream Failed</span>
        </div>
      )}
    </div>
  );
}

