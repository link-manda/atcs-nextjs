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
    <div className="flex flex-col h-full bg-background/40">
      {/* Grid Controls */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold font-headline text-foreground">
            Susunan Tampilan Grid
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {(Object.keys(LAYOUTS) as GridLayout[]).map((key) => {
            const config = LAYOUTS[key];
            const isActive = layout === key;
            const Icon = config.icon;
            
            return (
              <Button
                key={key}
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onLayoutChange(key)}
                className={cn(
                  "h-8 px-2.5 gap-1.5 text-xs font-semibold",
                  isActive ? "bg-primary/15 text-primary border border-primary/30" : "text-muted-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{config.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* The Grid */}
      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        {channels.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-8 border-2 border-dashed border-border rounded-2xl max-w-sm">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <LayoutGrid className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-bold text-foreground mb-1">Belum Ada Kamera Dipilih</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pilih kamera dari daftar di sebelah kiri untuk mulai memantau siaran langsung CCTV.
              </p>
            </div>
          </div>
        ) : (
          <div className={cn(
            "grid gap-4",
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
