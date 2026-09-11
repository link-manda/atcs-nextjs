'use client';

import React from 'react';
import { CCTVChannel } from '@/types/cctv';
import { CCTVGridItem } from './CCTVGridItem';
import { cn } from '@/lib/utils';
import { LayoutGrid, Maximize, Grid2X2, Grid3X3, Layout } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type GridLayout = '1x1' | '2x2' | '3x3' | '4x4';

export const LAYOUTS: Record<GridLayout, { cols: string; max: number; label: string; icon: React.ElementType }> = {
  '1x1': { cols: 'grid-cols-1', max: 1, label: '1 Layar', icon: Maximize },
  '2x2': { cols: 'grid-cols-1 sm:grid-cols-2', max: 4, label: '4 Kamera', icon: Grid2X2 },
  '3x3': { cols: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', max: 9, label: '9 Kamera', icon: Grid3X3 },
  '4x4': { cols: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4', max: 16, label: '16 Kamera', icon: Layout },
};

interface CCTVGridViewProps {
  channels: CCTVChannel[];
  layout: GridLayout;
  onRemove: (id: number) => void;
  onLayoutChange: (layout: GridLayout) => void;
}

export default function CCTVGridView({
  channels,
  layout,
  onRemove,
  onLayoutChange,
}: CCTVGridViewProps) {
  const currentLayout = LAYOUTS[layout];

  return (
    <div className="flex flex-col h-full bg-background text-foreground transition-colors">
      {/* Grid Controls Header */}
      <div className="flex items-center justify-between p-2 px-3 border-b border-border bg-card/60 flex-shrink-0">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
          <span className="text-xs font-medium text-foreground">
            Tata Letak Grid
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {(Object.keys(LAYOUTS) as GridLayout[]).map((key) => {
            const config = LAYOUTS[key];
            const isActive = layout === key;
            const Icon = config.icon;
            
            return (
              <button
                key={key}
                onClick={() => onLayoutChange(key)}
                className={cn(
                  "h-7 px-2.5 flex items-center gap-1.5 text-xs font-medium rounded transition-all",
                  isActive 
                    ? "bg-background text-foreground border border-border shadow-sm font-semibold" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent"
                )}
              >
                <Icon className={cn("w-3 h-3", isActive ? "text-emerald-500 dark:text-emerald-400" : "text-muted-foreground")} />
                <span className="hidden sm:inline">{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* The Grid Canvas */}
      <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
        {channels.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-8 border border-border bg-card/50 rounded-xl max-w-sm">
              <div className="w-12 h-12 rounded-full bg-secondary border border-border flex items-center justify-center mx-auto mb-3">
                <LayoutGrid className="w-5 h-5 text-muted-foreground" />
              </div>
              <h3 className="text-xs font-semibold text-foreground mb-1">Belum Ada Kamera Dipilih</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Pilih titik kamera dari daftar di sidebar kiri untuk memantau siaran langsung persimpangan.
              </p>
            </div>
          </div>
        ) : (
          <div className={cn(
            "grid gap-3",
            currentLayout.cols
          )}>
            {channels.slice(0, currentLayout.max).map((cam) => (
              <CCTVGridItem 
                key={cam.cctv_id} 
                channel={cam} 
                onRemove={onRemove} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
