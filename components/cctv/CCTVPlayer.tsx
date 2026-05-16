"use client";

import { CCTVChannel } from "@/types/cctv";
import ReactPlayer from "react-player";
import { useEffect, useState } from "react";

interface CCTVPlayerProps {
  channel: CCTVChannel;
}

export function CCTVPlayer({ channel }: CCTVPlayerProps) {
  const [mounted, setMounted] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [key, setKey] = useState(0);
  const MAX_RETRIES = 5;

  // Diagnostic log to track URL duplication/mangling
  console.log(`[CCTVPlayer] Rendering ${channel.ch_name} with URL: ${channel.streaming_url} (Type: ${channel.player_type})`);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleError = () => {
    if (retryCount < MAX_RETRIES) {
      setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        setKey((prev) => prev + 1); // Increment key to force remount
      }, 3000); // 3 seconds delay before retry
    }
  };

  if (channel.player_type === "iframe") {
    return (
      <div className="w-full h-full relative">
        <iframe
          key={key}
          src={channel.streaming_url}
          className="w-full h-full border-0"
          allow="autoplay; encrypted-media"
          allowFullScreen
          onError={handleError}
        />
        {retryCount > 0 && retryCount < MAX_RETRIES && (
          <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
            Reconnecting... ({retryCount}/{MAX_RETRIES})
          </div>
        )}
        {retryCount >= MAX_RETRIES && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-container/90 backdrop-blur-md">
            <span className="material-symbols-outlined text-error mb-2 text-2xl">videocam_off</span>
            <span className="text-error text-xs font-bold uppercase tracking-widest">Stream Failed</span>
          </div>
        )}
      </div>
    );
  }

  if (!mounted) return null;

  const Player = ReactPlayer as any;

  return (
    <div className="w-full h-full relative">
      <Player
        key={key}
        url={channel.streaming_url}
        playing
        muted
        width="100%"
        height="100%"
        style={{ position: "absolute", top: 0, left: 0 }}
        onError={handleError}
        config={{
          file: {
            attributes: {
              style: { width: "100%", height: "100%", objectFit: "cover" },
            },
            forceHLS: channel.streaming_url.includes(".m3u8"),
          },
        }}
      />
      {retryCount > 0 && retryCount < MAX_RETRIES && (
        <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
          Reconnecting... ({retryCount}/{MAX_RETRIES})
        </div>
      )}
      {retryCount >= MAX_RETRIES && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-container/90 backdrop-blur-md">
          <span className="material-symbols-outlined text-error mb-2 text-2xl">videocam_off</span>
          <span className="text-error text-xs font-bold uppercase tracking-widest">Stream Failed</span>
        </div>
      )}
    </div>
  );
}

