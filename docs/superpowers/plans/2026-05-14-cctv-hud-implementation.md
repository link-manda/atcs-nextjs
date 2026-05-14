# CCTV Tactical HUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the visual representation of CCTV feeds in the grid, featuring a tactical HUD with camera details, LIVE status, and coordinate overlays.

**Architecture:** 
- `CCTVPlayer`: A low-level component that handles the actual rendering of the stream (video/iframe).
- `CCTVGridItem`: A wrapper component that provides the tactical HUD overlays and interaction logic (remove from grid).

**Tech Stack:** React, Tailwind CSS, Lucide React (for icons), shadcn/ui.

---

### Task 1: Implement CCTVPlayer Component

**Files:**
- Create: `components/cctv/CCTVPlayer.tsx`

- [ ] **Step 1: Create CCTVPlayer component**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add components/cctv/CCTVPlayer.tsx
git commit -m "feat(cctv): add CCTVPlayer component"
```

---

### Task 2: Implement CCTVGridItem with Tactical HUD

**Files:**
- Create: `components/cctv/CCTVGridItem.tsx`

- [ ] **Step 1: Create CCTVGridItem component**

```tsx
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
    <div className="group relative w-full aspect-video bg-black overflow-hidden rounded-lg border border-border/40 hover:border-primary/50 transition-colors">
      {/* The Stream */}
      <CCTVPlayer channel={channel} />

      {/* HUD Overlays */}
      <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between">
        {/* Top HUD */}
        <div className="flex justify-between items-start">
          <div className="glass-panel px-3 py-1.5 rounded flex items-center gap-2 border border-white/10">
             <span className="font-headline font-bold text-xs uppercase tracking-wider text-white">
               {channel.ch_name}
             </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30 flex items-center gap-1.5 py-0.5 px-2">
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
          <div className="glass-panel px-2 py-1 rounded border border-white/10">
            <span className="font-mono text-[9px] text-white/70">
              COORD: {channel.lat?.toFixed(6) ?? "0.000000"}, {channel.lng?.toFixed(6) ?? "0.000000"}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Layer (Hover) */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 flex items-center justify-center pointer-events-none">
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
```

- [ ] **Step 2: Commit**

```bash
git add components/cctv/CCTVGridItem.tsx
git commit -m "feat(cctv): add CCTVGridItem with tactical HUD"
```

---

### Task 3: Verification

- [ ] **Step 1: Verify types and imports**
Ensure `CCTVChannel` is correctly imported and props are satisfied.
Check that `glass-panel` and `font-headline` are working as expected (via Tailwind config).

- [ ] **Step 2: Manual Check**
Since we don't have the parent component hooked up yet, we'll verify the files exist and are syntactically correct.
Run build to check for type errors.

```bash
npm run build
```
