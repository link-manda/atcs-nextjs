'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import CCTVSidebar from '@/components/cctv/CCTVSidebar';
import CCTVGridView, { LAYOUTS } from '@/components/cctv/CCTVGridView';
import type { CCTVChannel } from '@/types/cctv';
import type { GridLayout } from '@/components/cctv/CCTVGridView';
import {
  LayoutGrid,
  Map as MapIcon,
  Trash2,
  Video,
  PanelLeftClose,
  PanelLeft,
  Grid2X2,
  Grid3X3,
  Maximize,
  Layout,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const CCTVMap = dynamic(() => import('@/components/cctv/CCTVMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-zinc-950">
      <div className="text-center">
        <MapIcon className="w-6 h-6 text-emerald-400 animate-pulse mx-auto mb-2.5" />
        <p className="text-xs font-mono text-zinc-400">
          Memuat Peta Spasial CCTV...
        </p>
      </div>
    </div>
  ),
});

type ViewMode = 'grid' | 'map';

interface Props {
  channels: CCTVChannel[];
}

export default function CCTVPageClient(props: Props) {
  const allChannels = props.channels;

  const [selectedCams, setSelectedCams] = useState<CCTVChannel[]>([]);
  const [layout, setLayout]         = useState<GridLayout>('3x3');
  const [viewMode, setViewMode]     = useState<ViewMode>('grid');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const hasInitialized = useRef(false);

  // Set default selection once when channels load
  useEffect(() => {
    if (!hasInitialized.current && allChannels.length > 0) {
      setSelectedCams(allChannels.slice(0, 9));
      hasInitialized.current = true;
    }
  }, [allChannels]);

  const maxSlots = LAYOUTS[layout].max;

  const handleSelect = useCallback(
    (cam: CCTVChannel) => {
      setSelectedCams((prev) => {
        if (prev.length >= maxSlots) return prev;
        if (prev.find((c) => c.cctv_id === cam.cctv_id)) return prev;
        return [...prev, cam];
      });
    },
    [maxSlots]
  );

  const handleDeselect = useCallback((id: number) => {
    setSelectedCams((prev) => prev.filter((c) => c.cctv_id !== id));
  }, []);

  const handleLayoutChange = useCallback((newLayout: GridLayout) => {
    const newMax = LAYOUTS[newLayout].max;
    setLayout(newLayout);
    setSelectedCams((prev) => prev.slice(0, newMax));
  }, []);

  const handleClearAll = useCallback(() => {
    setSelectedCams([]);
  }, []);

  const selectedIds = useMemo(
    () => new Set(selectedCams.map((c) => c.cctv_id)),
    [selectedCams]
  );

  return (
    <div className="flex gap-4 h-full p-3 md:p-4 bg-zinc-950 overflow-hidden">
      {/* ─── Camera List Sidebar (Desktop) ─── */}
      <section
        className={cn(
          "hidden md:block flex-shrink-0 transition-all duration-300 ease-in-out",
          isSidebarOpen ? "w-80 opacity-100" : "w-0 opacity-0 overflow-hidden pointer-events-none"
        )}
      >
        <div className="h-full w-80 rounded-lg overflow-hidden border border-white/[0.08] bg-zinc-950/90 shadow-lg">
          <CCTVSidebar
            channels={allChannels}
            selectedCams={selectedCams}
            maxSlots={maxSlots}
            onSelect={handleSelect}
            onDeselect={handleDeselect}
          />
        </div>
      </section>

      {/* Sidebar Mobile Trigger */}
      <div className="md:hidden fixed bottom-5 right-5 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-xl">
              <Video className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80 bg-zinc-950 border-white/[0.08]">
            <CCTVSidebar
              channels={allChannels}
              selectedCams={selectedCams}
              maxSlots={maxSlots}
              onSelect={handleSelect}
              onDeselect={handleDeselect}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* ─── Main Monitoring Canvas ─── */}
      <section className="flex-1 flex flex-col gap-3 min-w-0 transition-all duration-300">
        {/* Floating Top Linear Toolbar */}
        <div className="flex items-center justify-between flex-shrink-0 gap-3 flex-wrap bg-zinc-900/60 border border-white/[0.08] p-2 rounded-lg backdrop-blur-md">
          {/* Left Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] rounded-md"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title={isSidebarOpen ? "Sembunyikan Sidebar" : "Buka Sidebar"}
            >
              {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </Button>

            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 bg-black/40 border border-white/[0.06] rounded-md">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-all",
                  viewMode === 'grid'
                    ? "bg-white/[0.1] text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid Video</span>
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-all",
                  viewMode === 'map'
                    ? "bg-white/[0.1] text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Peta Kamera</span>
              </button>
            </div>
          </div>

          {/* Right Controls & Telemetry */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-white/[0.03] border border-white/[0.06] text-zinc-300 font-mono text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{selectedCams.length}/{maxSlots} Slot Aktif</span>
            </div>

            {selectedCams.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-8 px-2.5 gap-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-md font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kosongkan</span>
              </Button>
            )}
          </div>
        </div>

        {/* Dynamic Display Surface */}
        <div className="flex-1 min-h-0 bg-zinc-950 rounded-lg overflow-hidden border border-white/[0.08] shadow-inner">
          {viewMode === 'grid' ? (
            <CCTVGridView
              channels={selectedCams}
              layout={layout}
              onLayoutChange={handleLayoutChange}
              onRemove={handleDeselect}
            />
          ) : (
            <CCTVMap
              cameras={allChannels}
              selectedIds={selectedIds}
              onCameraClick={handleSelect}
            />
          )}
        </div>
      </section>
    </div>
  );
}
