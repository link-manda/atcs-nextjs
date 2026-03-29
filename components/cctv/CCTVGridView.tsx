'use client';

import CCTVCard from './CCTVCard';
import type { CCTVChannel } from '@/types/cctv';

export type GridLayout = '2x2' | '3x3' | '4x3';

interface LayoutConfig {
  cols: number;
  rows: number;
  max: number;
  label: string;
}

export const LAYOUTS: Record<GridLayout, LayoutConfig> = {
  '2x2': { cols: 2, rows: 2, max: 4,  label: '2×2' },
  '3x3': { cols: 3, rows: 3, max: 9,  label: '3×3' },
  '4x3': { cols: 4, rows: 3, max: 12, label: '4×3' },
};

interface CCTVGridViewProps {
  selectedCams: CCTVChannel[];
  layout: GridLayout;
  onRemove: (id: number) => void;
  onLayoutChange: (l: GridLayout) => void;
}

export default function CCTVGridView({
  selectedCams,
  layout,
  onRemove,
  onLayoutChange,
}: CCTVGridViewProps) {
  const { cols, rows, max } = LAYOUTS[layout];
  const slots = Array.from({ length: max });

  return (
    <div className="flex-1 flex flex-col gap-3 min-h-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Layout switcher */}
          <div className="flex bg-surface-container rounded-lg p-1 gap-0.5">
            {(Object.keys(LAYOUTS) as GridLayout[]).map((l) => (
              <button
                key={l}
                onClick={() => onLayoutChange(l)}
                className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-widest transition-all ${
                  layout === l
                    ? 'bg-surface-container-highest text-primary shadow'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {LAYOUTS[l].label}
              </button>
            ))}
          </div>
          <div className="h-4 w-px bg-outline-variant/30" />
          <span className="text-xs text-on-surface-variant">
            Aktif:{' '}
            <span className="text-primary font-bold">
              {String(selectedCams.length).padStart(2, '0')}
            </span>
            /{max} Slot
          </span>
        </div>

        <span className="text-[10px] font-headline text-on-surface-variant/50 uppercase tracking-widest">
          Klik kamera untuk fullscreen
        </span>
      </div>

      {/* Grid */}
      <div
        className="flex-1 min-h-0"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gap: '0.625rem',
        }}
      >
        {slots.map((_, idx) => {
          const cam = selectedCams[idx];

          if (cam) {
            return (
              <CCTVCard
                key={cam.cctv_id}
                camera={cam}
                onRemove={() => onRemove(cam.cctv_id)}
              />
            );
          }

          return (
            <div
              key={`empty-${idx}`}
              className="relative rounded-lg border border-outline-variant/10 border-dashed flex flex-col items-center justify-center bg-surface-container/30 text-center"
            >
              <span className="material-symbols-outlined text-outline-variant/30 text-4xl">
                add_circle
              </span>
              <p className="text-[9px] text-outline-variant/40 mt-1.5 uppercase tracking-widest font-headline">
                Slot Kosong
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
