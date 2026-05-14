'use client';

import * as React from 'react';
import { CCTVChannel, CCTVRegion } from '@/types/cctv';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Props {
  channels: CCTVChannel[];
  selectedCams: CCTVChannel[];
  maxSlots: number;
  onSelect: (cam: CCTVChannel) => void;
  onDeselect: (id: number) => void;
}

export default function CCTVSidebar({
  channels,
  selectedCams,
  maxSlots,
  onSelect,
  onDeselect,
}: Props) {
  const selectedIds = React.useMemo(
    () => new Set(selectedCams.map((c) => c.cctv_id)),
    [selectedCams]
  );

  const grouped = React.useMemo(() => {
    return channels.reduce<Record<CCTVRegion, CCTVChannel[]>>((acc, cam) => {
      if (!acc[cam.region]) acc[cam.region] = [];
      acc[cam.region].push(cam);
      return acc;
    }, {} as Record<CCTVRegion, CCTVChannel[]>);
  }, [channels]);

  const regions = (Object.keys(grouped).sort() as CCTVRegion[]).filter(
    (r) => grouped[r].length > 0
  );

  return (
    <div className="flex flex-col h-full bg-background/50 backdrop-blur-md">
      <div className="p-4 border-b border-border/50 bg-muted/20">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center justify-between">
          Regional Nodes
          <Badge variant="outline" className="ml-auto font-mono text-[9px] h-4 px-1.5 border-primary/30 text-primary">
            {selectedCams.length}/{maxSlots}
          </Badge>
        </h2>
      </div>

      <ScrollArea className="flex-1">
        <Accordion type="multiple" className="w-full px-2 py-2">
          {regions.map((region) => (
            <AccordionItem key={region} value={region} className="border-none mb-1">
              <AccordionTrigger className="hover:no-underline py-2 px-3 hover:bg-muted/50 rounded-lg transition-all group data-[state=open]:bg-muted/30">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground group-data-[state=open]:text-foreground">
                    {region}
                  </span>
                  <Badge 
                    variant="secondary" 
                    className="h-4 px-1.5 text-[9px] font-bold bg-muted/80 text-muted-foreground group-data-[state=open]:bg-primary group-data-[state=open]:text-primary-foreground"
                  >
                    {grouped[region].length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-1">
                <div className="flex flex-col gap-0.5 mt-1 px-1">
                  {grouped[region].map((cam) => {
                    const isSelected = selectedIds.has(cam.cctv_id);
                    const isFull = selectedCams.length >= maxSlots && !isSelected;

                    return (
                      <button
                        key={cam.cctv_id}
                        disabled={isFull}
                        onClick={() =>
                          isSelected ? onDeselect(cam.cctv_id) : onSelect(cam)
                        }
                        className={cn(
                          "group relative flex items-center w-full h-8 px-2 rounded-md transition-all text-left overflow-hidden",
                          isSelected 
                            ? "bg-primary/10 text-primary ring-1 ring-primary/20" 
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                          isFull && "opacity-40 cursor-not-allowed"
                        )}
                      >
                        <div className={cn(
                          "flex-shrink-0 w-3.5 h-3.5 rounded-sm border flex items-center justify-center mr-2.5 transition-all",
                          isSelected 
                            ? "bg-primary border-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" 
                            : "border-muted-foreground/30 group-hover:border-primary/50"
                        )}>
                          {isSelected && <Check className="w-2.5 h-2.5 text-primary-foreground stroke-[4]" />}
                        </div>
                        
                        <span className="flex-1 text-[11px] font-medium truncate py-1 transition-transform group-hover:translate-x-0.5">
                          {cam.ch_name}
                        </span>

                        {/* Hover Overlay for GPS */}
                        <div className="absolute right-0 top-0 bottom-0 flex items-center bg-gradient-to-l from-muted via-muted/90 to-transparent pl-8 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[9px] font-mono text-primary font-bold tracking-tight">
                            {cam.lat?.toFixed(4)}, {cam.lng?.toFixed(4)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollArea>
    </div>
  );
}
