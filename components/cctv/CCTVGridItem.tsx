"use client";

import { CCTVChannel } from "@/types/cctv";
import { CCTVPlayer } from "./CCTVPlayer";
import { X, Maximize, Radio, MapPin } from "lucide-react";
import { useRef } from "react";

interface CCTVGridItemProps {
  channel: CCTVChannel;
  onRemove: (id: number) => void;
}

export function CCTVGridItem({ channel, onRemove }: CCTVGridItemProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div
      ref={containerRef}
      className="group relative w-full aspect-video bg-black overflow-hidden rounded-md border border-white/[0.08] hover:border-emerald-500/40 transition-all shadow-sm"
    >
      {/* Video Stream Element */}
      <CCTVPlayer channel={channel} />

      {/* Top Floating Glass HUD */}
      <div className="absolute inset-x-0 top-0 pointer-events-none p-2.5 bg-gradient-to-b from-black/80 via-black/30 to-transparent flex items-center justify-between gap-2 z-10">
        <div className="flex items-center gap-1.5 max-w-[75%] min-w-0">
          <span className="text-xs font-medium text-white truncate tracking-tight drop-shadow-sm">
            {channel.ch_name}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[9px] font-medium">
            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        </div>
      </div>

      {/* Bottom Minimal Region Label */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none p-2 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-center justify-between z-10">
        <span className="text-[10px] font-mono text-zinc-400">
          {channel.region}
        </span>
      </div>

      {/* Hover Action Overlay */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[1px] flex items-center justify-center pointer-events-none z-30">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={toggleFullScreen}
            title="Layar Penuh"
            className="w-8 h-8 rounded-md bg-white/[0.1] hover:bg-white/[0.2] text-white border border-white/[0.15] flex items-center justify-center transition-all shadow-md"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onRemove(channel.cctv_id)}
            title="Tutup Kamera"
            className="w-8 h-8 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 flex items-center justify-center transition-all shadow-md"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
