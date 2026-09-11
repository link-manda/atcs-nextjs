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
import { Check, Search, Camera, Radio } from 'lucide-react';
import { Input } from '@/components/ui/input';

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
  const [search, setSearch] = React.useState('');

  const selectedIds = React.useMemo(
    () => new Set(selectedCams.map((c) => c.cctv_id)),
    [selectedCams]
  );

  const filteredChannels = React.useMemo(() => {
    if (!search) return channels;
    return channels.filter(c => 
      c.ch_name.toLowerCase().includes(search.toLowerCase()) ||
      c.region.toLowerCase().includes(search.toLowerCase())
    );
  }, [channels, search]);

  const grouped = React.useMemo(() => {
    return filteredChannels.reduce<Record<CCTVRegion, CCTVChannel[]>>((acc, cam) => {
      if (!acc[cam.region]) acc[cam.region] = [];
      acc[cam.region].push(cam);
      return acc;
    }, {} as Record<CCTVRegion, CCTVChannel[]>);
  }, [filteredChannels]);

  const regions = (Object.keys(grouped).sort() as CCTVRegion[]).filter(
    (r) => grouped[r].length > 0
  );

  return (
    <div className="flex flex-col h-full bg-card text-foreground transition-colors">
      {/* Search & Header */}
      <div className="p-3.5 border-b border-border space-y-2.5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            Daftar Kamera Wilayah
          </span>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium">
            {selectedCams.length}/{maxSlots} Terpilih
          </span>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input 
            placeholder="Cari kamera atau jalan..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs bg-secondary/50 border-border focus:border-emerald-500/50 text-foreground placeholder:text-muted-foreground rounded-md font-sans transition-colors"
          />
        </div>
      </div>

      {/* Accordion Region Groups */}
      <ScrollArea className="flex-1 min-h-0">
        <Accordion type="multiple" className="w-full px-2 py-2">
          {regions.map((region) => (
            <AccordionItem key={region} value={region} className="border-none mb-1">
              <AccordionTrigger className="hover:no-underline py-1.5 px-2.5 hover:bg-secondary/70 rounded-md transition-all group data-[state=open]:bg-secondary/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {region}
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-secondary text-muted-foreground group-data-[state=open]:bg-emerald-500/20 group-data-[state=open]:text-emerald-600 dark:group-data-[state=open]:text-emerald-300">
                    {grouped[region].length}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-1">
                <div className="flex flex-col gap-0.5 mt-1 px-1">
                  {grouped[region].map((cam) => {
                    const isSelected = selectedIds.has(cam.cctv_id);
                    const isFull = selectedCams.length >= maxSlots;
                    const isDisabled = !isSelected && isFull;

                    return (
                      <button
                        key={cam.cctv_id}
                        disabled={isDisabled}
                        onClick={() => isSelected ? onDeselect(cam.cctv_id) : onSelect(cam)}
                        title={cam.ch_name}
                        className={cn(
                          "w-full min-w-0 flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-left transition-all text-xs font-sans group/item",
                          isSelected 
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-medium border border-emerald-500/30" 
                            : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground border border-transparent",
                          isDisabled && "opacity-35 cursor-not-allowed hover:bg-transparent"
                        )}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full flex-shrink-0",
                              isSelected ? "bg-emerald-500 dark:bg-emerald-400 animate-pulse" : "bg-muted-foreground/50"
                            )}
                          />
                          <span className="truncate">{cam.ch_name}</span>
                        </div>
                        {isSelected ? (
                          <div className="w-3.5 h-3.5 rounded bg-emerald-500 flex items-center justify-center flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-white dark:text-zinc-950 stroke-[3]" />
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-mono opacity-0 group-hover/item:opacity-100 transition-opacity flex-shrink-0">
                            +Pilih
                          </span>
                        )}
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
