'use client';

import React from 'react';
import { CCTVChannel } from '@/types/cctv';
import { CCTVGridItem } from './CCTVGridItem';
import { cn } from '@/lib/utils';
import { LayoutGrid, Maximize, Grid2X2, Grid3X3, Layout } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type GridLayout = '1x1' | '2x2' | '3x3' | '4x4';

export const LAYOUTS: Record<GridLayout, { cols: string; max: number; label: string; icon: React.ElementType }> = {
  '1x1': { cols: 'grid-cols-1', max: 1, label: 'Single', icon: Maximize },
  '2x2': { cols: 'grid-cols-1 sm:grid-cols-2', max: 4, label: '2x2 View', icon: Grid2X2 },
  '3x3': { cols: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', max: 9, label: '3x3 View', icon: Grid3X3 },
  '4x4': { cols: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4', max: 16, label: '4x4 View', icon: Layout },
};

interface CCTVGridViewProps {
  selectedCams: CCTVChannel[];
  layout: GridLayout;
  onRemove: (id: number) => void;
  onLayoutChange: (layout: GridLayout) => void;
}

export default function CCTVGridView({
  selectedCams,
  layout,
  onRemove,
  onLayoutChange,
}: CCTVGridViewProps) {
  const currentLayout = LAYOUTS[layout];

  return (
    <div className="flex flex-col h-full bg-background/20">
      {/* Grid Controls */}
      <div className="flex items-center justify-between p-3 border-b border-border/50 bg-muted/10">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-primary/70" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Display Matrix
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
                  "h-8 px-2.5 gap-2 text-[10px] font-bold uppercase tracking-widest",
                  isActive ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground"
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
        {selectedCams.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-8 border-2 border-dashed border-border/30 rounded-2xl max-w-sm">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
                <LayoutGrid className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-sm font-bold text-foreground mb-1">Matrix Empty</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Select camera nodes from the sidebar to populate the monitoring matrix.
              </p>
            </div>
          </div>
        ) : (
          <div className={cn(
            "grid gap-4",
            currentLayout.cols
          )}>
            {selectedCams.slice(0, currentLayout.max).map((cam) => (
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
