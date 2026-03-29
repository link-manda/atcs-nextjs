'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback, useMemo } from 'react';
import CCTVSidebar from '@/components/cctv/CCTVSidebar';
import CCTVGridView, { LAYOUTS } from '@/components/cctv/CCTVGridView';
import type { CCTVChannel } from '@/types/cctv';
import type { GridLayout } from '@/components/cctv/CCTVGridView';

const CCTVMap = dynamic(() => import('@/components/cctv/CCTVMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-surface-container rounded-xl border border-outline-variant/10">
      <div className="text-center">
        <span className="material-symbols-outlined text-primary text-4xl animate-pulse block mb-2">map</span>
        <p className="text-xs text-on-surface-variant font-headline uppercase tracking-widest">
          Memuat Peta...
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="flex gap-4 h-[calc(100vh-5.5rem)]">
      {/* Sidebar FAB — mobile only (< md) */}
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        className="fixed bottom-20 right-4 z-30 md:hidden w-12 h-12 bg-surface-container-high border border-outline-variant/20 rounded-xl flex items-center justify-center text-on-surface-variant hover:text-primary shadow-xl transition-colors"
        aria-label="Toggle kamera sidebar"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
          {sidebarOpen ? 'close' : 'videocam'}
        </span>
      </button>

      {/* ─── Camera List Sidebar ─── */}
      <section
        className={[
          'flex-shrink-0 w-64 md:w-72',
          'transition-transform duration-200',
          // md+ = always visible in-flow
          'md:block md:relative md:translate-x-0',
          // < md = overlay drawer
          sidebarOpen
            ? 'fixed inset-y-16 left-0 z-20 block'
            : 'hidden md:block',
        ].join(' ')}
      >
        <CCTVSidebar
          channels={channels}
          selectedCams={selectedCams}
          maxSlots={maxSlots}
          onSelect={handleSelect}
          onDeselect={handleDeselect}
        />
      </section>

      {/* Backdrop for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-10 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ─── Main Grid / Map Canvas ─── */}
      <section className="flex-1 flex flex-col gap-3 min-w-0">
        {/* Toolbar: view toggle + status + clear all */}
        <div className="flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
          {/* View tabs */}
          <div className="flex bg-surface-container rounded-lg p-1 gap-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-widest transition-all ${
                viewMode === 'grid'
                  ? 'bg-surface-container-highest text-primary shadow'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-sm">grid_view</span>
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-widest transition-all ${
                viewMode === 'map'
                  ? 'bg-surface-container-highest text-primary shadow'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-sm">map</span>
              <span className="hidden sm:inline">Peta Bali</span>
            </button>
          </div>

          {/* Right side: status + clear all */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span className="text-[10px] font-headline text-on-surface-variant uppercase tracking-widest">
                {channels.length} CCTV Online
              </span>
            </div>

            {/* Clear All — only visible when cameras are selected */}
            {selectedCams.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error/10 border border-error/20 text-error hover:bg-error/20 hover:border-error/40 transition-all text-[10px] font-headline font-bold uppercase tracking-widest"
                title="Hapus semua channel dari grid"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                  clear_all
                </span>
                <span className="hidden sm:inline">Clear All</span>
                <span className="text-error/60">({selectedCams.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {viewMode === 'grid' ? (
          <CCTVGridView
            selectedCams={selectedCams}
            layout={layout}
            onRemove={handleDeselect}
            onLayoutChange={handleLayoutChange}
          />
        ) : (
          <div className="flex-1 rounded-xl overflow-hidden border border-outline-variant/10 min-h-0">
            <CCTVMap
              cameras={channels}
              selectedIds={selectedIds}
              onCameraClick={handleSelect}
            />
          </div>
        )}
      </section>
    </div>
  );
}
