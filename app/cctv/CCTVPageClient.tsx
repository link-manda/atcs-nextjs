'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback, useMemo } from 'react';
import CCTVSidebar from '@/components/cctv/CCTVSidebar';
import CCTVGridView, { LAYOUTS } from '@/components/cctv/CCTVGridView';
import type { CCTVChannel } from '@/types/cctv';
import type { GridLayout } from '@/components/cctv/CCTVGridView';
import { LayoutGrid, Map as MapIcon, Trash2, Video, Activity } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const CCTVMap = dynamic(() => import('@/components/cctv/CCTVMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-muted/30 rounded-xl border border-border/50">
      <div className="text-center">
        <MapIcon className="w-8 h-8 text-primary animate-pulse mx-auto mb-3" />
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">
          Initializing Tactical Map...
        </p>
      </div>
    </div>
  ),
});

type ViewMode = 'grid' | 'map';

interface Props {
  channels: CCTVChannel[];
}

export default function CCTVPageClient({ channels }: Props) {
  const [selectedCams, setSelectedCams] = useState<CCTVChannel[]>(
    channels.slice(0, 9)
  );
  const [layout, setLayout]         = useState<GridLayout>('3x3');
  const [viewMode, setViewMode]     = useState<ViewMode>('grid');

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
    <div className="flex gap-6 h-[calc(100vh-6.5rem)]">
      {/* ─── Camera List Sidebar (Desktop) ─── */}
      <section className="hidden md:block flex-shrink-0 w-80">
        <div className="h-full rounded-xl overflow-hidden border border-border/50 shadow-2xl">
          <CCTVSidebar
            channels={channels}
            selectedCams={selectedCams}
            maxSlots={maxSlots}
            onSelect={handleSelect}
            onDeselect={handleDeselect}
          />
        </div>
      </section>

      {/* Sidebar (Mobile) */}
      <div className="md:hidden fixed bottom-6 right-6 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" className="w-14 h-14 rounded-full shadow-2xl">
              <Video className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80">
            <CCTVSidebar
              channels={channels}
              selectedCams={selectedCams}
              maxSlots={maxSlots}
              onSelect={handleSelect}
              onDeselect={handleDeselect}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* ─── Main Content Canvas ─── */}
      <section className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between flex-shrink-0 gap-4 flex-wrap">
          <Tabs 
            value={viewMode} 
            onValueChange={(v) => setViewMode(v as ViewMode)} 
            className="w-auto"
          >
            <TabsList className="bg-muted/50 border border-border/50">
              <TabsTrigger value="grid" className="gap-2 text-[10px] font-bold uppercase tracking-widest px-4">
                <LayoutGrid className="w-3.5 h-3.5" />
                Grid View
              </TabsTrigger>
              <TabsTrigger value="map" className="gap-2 text-[10px] font-bold uppercase tracking-widest px-4">
                <MapIcon className="w-3.5 h-3.5" />
                Tactical Map
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-4">
             <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/30 border border-border/50">
                <Activity className="w-3 h-3 text-secondary animate-pulse" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {channels.length} Nodes Operational
                </span>
             </div>

             {selectedCams.length > 0 && (
               <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleClearAll}
                className="gap-2 text-[10px] font-bold uppercase tracking-widest h-9"
               >
                 <Trash2 className="w-3.5 h-3.5" />
                 Clear All ({selectedCams.length})
               </Button>
             )}
          </div>
        </div>

        {/* Dynamic Display */}
        <div className="flex-1 min-h-0 bg-background/30 rounded-xl overflow-hidden border border-border/50 shadow-inner">
          {viewMode === 'grid' ? (
            <CCTVGridView
              selectedCams={selectedCams}
              layout={layout}
              onRemove={handleDeselect}
              onLayoutChange={handleLayoutChange}
            />
          ) : (
            <CCTVMap
              cameras={channels}
              selectedIds={selectedIds}
              onCameraClick={handleSelect}
            />
          )}
        </div>
      </section>
    </div>
  );
}
