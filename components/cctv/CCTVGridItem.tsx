"use client";

import { CCTVChannel } from "@/types/cctv";
import { CCTVPlayer } from "./CCTVPlayer";
import { X, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <div ref={containerRef} className="group relative w-full aspect-video bg-background overflow-hidden rounded-lg border border-border/40 hover:border-primary/50 transition-colors">
      {/* The Stream */}
      <CCTVPlayer channel={channel} />

      {/* HUD Overlays */}
      <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between z-10">
        {/* Top HUD */}
        <div className="flex justify-between items-start w-full gap-2">
          <div className="bg-black/90 px-2.5 py-1 rounded border border-white/15 shadow-md flex items-center gap-2 max-w-[65%]">
            <span className="font-headline font-bold text-[10px] uppercase tracking-wider text-white truncate">
              {channel.ch_name}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-black/90 p-0.5 rounded border border-white/15 shadow-md">
            <Badge variant="outline" className="bg-red-950/80 text-red-400 border-red-500/40 flex items-center gap-1.5 py-0.5 px-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider font-headline">Live</span>
            </Badge>
          </div>
        </div>
      </div>

      {/* Interactive Layer (Hover) */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 flex items-center justify-center pointer-events-none z-30">
        <div className="pointer-events-auto flex items-center gap-3">
          <Button 
            variant="secondary" 
            size="icon" 
            className="h-10 w-10 rounded-full shadow-lg"
            onClick={toggleFullScreen}
            title="Fullscreen"
          >
            <Maximize className="h-5 w-5" />
          </Button>
          <Button 
            variant="destructive" 
            size="icon" 
            className="h-10 w-10 rounded-full shadow-lg"
            onClick={() => onRemove(channel.cctv_id)}
            title="Tutup Kamera"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

