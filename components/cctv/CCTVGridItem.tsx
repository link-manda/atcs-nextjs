"use client";

import { CCTVChannel } from "@/types/cctv";
import { CCTVPlayer } from "./CCTVPlayer";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CCTVGridItemProps {
  channel: CCTVChannel;
  onRemove: (id: number) => void;
}

export function CCTVGridItem({ channel, onRemove }: CCTVGridItemProps) {
  return (
    <div className="group relative w-full aspect-video bg-background overflow-hidden rounded-lg border border-border/40 hover:border-primary/50 transition-colors">
      {/* The Stream */}
      <CCTVPlayer channel={channel} />

      {/* HUD Overlays */}
      <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between">
        {/* Top HUD */}
        <div className="flex justify-between items-start">
          <div className="glass-panel px-3 py-1.5 rounded flex items-center gap-2 border border-border/50">
             <span className="font-headline font-bold text-xs uppercase tracking-wider text-foreground">
               {channel.ch_name}
             </span>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30 flex items-center gap-1.5 py-0.5 px-2 bg-background/80 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-tighter">Live</span>
            </Badge>
          </div>
        </div>

        {/* Bottom HUD */}
        <div className="flex justify-between items-end">
          <div className="glass-panel px-2 py-1 rounded border border-border/50">
            <span className="font-mono text-[9px] text-muted-foreground font-medium">
              COORD: {channel.lat?.toFixed(6) ?? "0.000000"}, {channel.lng?.toFixed(6) ?? "0.000000"}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Layer (Hover) */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-background/40 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <Button 
            variant="destructive" 
            size="icon" 
            className="h-10 w-10 rounded-full shadow-lg"
            onClick={() => onRemove(channel.cctv_id)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
