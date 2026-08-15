"use client";

import { CCTVChannel } from "@/types/cctv";
import { CCTVPlayer } from "./CCTVPlayer";
import { X, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div ref={containerRef} className="group relative w-full aspect-video bg-background overflow-hidden rounded-xl border border-border/60 hover:border-primary/50 transition-colors shadow-sm">
      {/* The Stream */}
      <CCTVPlayer channel={channel} />

      {/* Transparent HUD Overlays (No Solid Black Boxes) */}
      <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between z-10">
        {/* Top HUD */}
        <div className="flex justify-between items-start w-full gap-2">
          {/* Camera Name */}
          <div className="flex items-center gap-2 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] max-w-[70%]">
            <span className="font-headline font-bold text-xs text-white truncate">
              {channel.ch_name}
            </span>
          </div>

          {/* Transparent Live Badge */}
          <div className="flex items-center gap-1.5 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-[11px] font-bold text-red-400 font-headline">Live</span>
          </div>
        </div>
      </div>

      {/* Interactive Layer (Hover) */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur-[2px] flex items-center justify-center pointer-events-none z-30">
        <div className="pointer-events-auto flex items-center gap-3">
          <Button 
            variant="secondary" 
            size="icon" 
            className="h-10 w-10 rounded-full shadow-lg"
            onClick={toggleFullScreen}
            title="Layar Penuh"
          >
            <Maximize className="h-4 w-4" />
          </Button>
          <Button 
            variant="destructive" 
            size="icon" 
            className="h-10 w-10 rounded-full shadow-lg"
            onClick={() => onRemove(channel.cctv_id)}
            title="Tutup Kamera"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
