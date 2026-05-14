"use client";

import { CCTVChannel } from "@/types/cctv";
import ReactPlayer from "react-player";
import { useEffect, useState } from "react";

interface CCTVPlayerProps {
  channel: CCTVChannel;
}

export function CCTVPlayer({ channel }: CCTVPlayerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (channel.player_type === "iframe") {
    return (
      <iframe
        src={channel.streaming_url}
        className="w-full h-full border-0"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    );
  }

  if (!mounted) return null;

  return (
    <div className="w-full h-full relative">
      <ReactPlayer
        url={channel.streaming_url}
        playing
        muted
        width="100%"
        height="100%"
        style={{ position: "absolute", top: 0, left: 0 }}
        config={{
          file: {
            attributes: {
              style: { width: "100%", height: "100%", objectFit: "cover" },
            },
            forceHLS: channel.streaming_url.includes(".m3u8"),
          },
        }}
      />
    </div>
  );
}

