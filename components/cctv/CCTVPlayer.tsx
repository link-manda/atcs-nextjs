"use client";

import { CCTVChannel } from "@/types/cctv";

interface CCTVPlayerProps {
  channel: CCTVChannel;
}

export function CCTVPlayer({ channel }: CCTVPlayerProps) {
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

  return (
    <video
      src={channel.streaming_url}
      className="w-full h-full object-cover"
      autoPlay
      muted
      loop
      playsInline
    />
  );
}
