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
import { Check, Search, Camera } from 'lucide-react';
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
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="p-4 border-b border-border space-y-3">
        <h2 className="text-xs font-bold font-headline text-foreground flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-primary" />
            Daftar Kamera Wilayah
          </span>
          <Badge variant="outline" className="ml-auto font-mono text-[10px] h-5 px-2 border-primary/30 text-primary">
            {selectedCams.length}/{maxSlots} Terpilih
          </Badge>
        </h2>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input 
            placeholder="Cari kamera atau jalan..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs bg-background border-border focus:border-primary shadow-sm font-sans"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <Accordion type="multiple" className="w-full px-2 py-2">
          {regions.map((region) => (
            <AccordionItem key={region} value={region} className="border-none mb-1">
              <AccordionTrigger className="hover:no-underline py-2 px-3 hover:bg-muted rounded-lg transition-all group data-[state=open]:bg-muted/60">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold text-foreground">
                    {region}
                  </span>
                  <Badge 
                    variant="secondary" 
                    className="h-4 px-1.5 text-[10px] font-medium bg-muted text-muted-foreground group-data-[state=open]:bg-primary group-data-[state=open]:text-primary-foreground"
                  >
                    {grouped[region].length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-1">
                <div className="flex flex-col gap-1 mt-1 px-1">
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
                          "w-full min-w-0 flex items-center justify-between gap-2 p-2 rounded-lg text-left transition-all text-xs font-sans group/item",
                          isSelected 
                            ? "bg-primary/10 text-primary font-semibold border border-primary/20" 
                            : "hover:bg-muted text-foreground border border-transparent",
                          isDisabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
                        )}
                      >
                        <span className="flex-1 min-w-0 truncate">{cam.ch_name}</span>
                        {isSelected ? (
                          <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-primary-foreground" />
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
