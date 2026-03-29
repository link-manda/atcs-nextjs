'use client';

import { useState, useMemo } from 'react';
import { ALL_REGIONS } from '@/lib/cctv-utils';
import type { CCTVChannel, CCTVRegion } from '@/types/cctv';

interface CCTVSidebarProps {
  channels: CCTVChannel[];
  selectedCams: CCTVChannel[];
  maxSlots: number;
  onSelect: (cam: CCTVChannel) => void;
  onDeselect: (id: number) => void;
}

const REGION_COLORS: Record<string, string> = {
  'Badung':         'text-primary',
  'Badung Selatan': 'text-primary',
  'Denpasar':       'text-secondary',
  'Gianyar':        'text-tertiary',
  'Klungkung':      'text-tertiary',
  'Karangasem':     'text-error',
  'Buleleng':       'text-on-surface-variant',
  'Jembrana':       'text-on-surface-variant',
  'Tabanan':        'text-on-surface-variant',
  'Bangli':         'text-on-surface-variant',
  'Lainnya':        'text-outline',
};

export default function CCTVSidebar({
  channels,
  selectedCams,
  maxSlots,
  onSelect,
  onDeselect,
}: CCTVSidebarProps) {
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState<'all' | CCTVRegion>('all');

  const selectedIds = useMemo(
    () => new Set(selectedCams.map((c) => c.cctv_id)),
    [selectedCams]
  );

  const filtered = useMemo(() => {
    return channels.filter((cam) => {
      const matchSearch =
        search === '' ||
        cam.ch_name.toLowerCase().includes(search.toLowerCase());
      const matchRegion = region === 'all' || cam.region === region;
      return matchSearch && matchRegion;
    });
  }, [channels, search, region]);

  const canAdd = selectedCams.length < maxSlots;

  return (
    <div className="bg-surface-container rounded-xl overflow-hidden shadow-2xl flex flex-col h-full border border-outline-variant/10">
      {/* Header */}
      <div className="px-4 py-3 bg-surface-container-high flex items-center justify-between flex-shrink-0">
        <h2 className="font-headline text-xs font-bold tracking-widest text-on-surface uppercase">
          Daftar Kamera
        </h2>
        <span className="text-[10px] font-bold text-primary">
          {channels.length} CCTV
        </span>
      </div>

      {/* Search + Filter */}
      <div className="p-3 space-y-2 flex-shrink-0 border-b border-outline-variant/10">
        <div className="relative">
          <input
            className="w-full bg-surface-container-lowest ring-1 ring-outline-variant/30 rounded-lg py-2 pl-9 pr-3 text-xs focus:ring-primary transition-all outline-none text-on-surface placeholder:text-on-surface-variant/60"
            placeholder="Cari nama kamera..."
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="material-symbols-outlined absolute left-2.5 top-2 text-on-surface-variant text-base">
            search
          </span>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-2 text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
        </div>

        <select
          className="w-full bg-surface-container-lowest ring-1 ring-outline-variant/30 rounded-lg py-2 px-3 text-xs focus:ring-primary transition-all outline-none text-on-surface cursor-pointer"
          value={region}
          onChange={(e) => setRegion(e.target.value as 'all' | CCTVRegion)}
        >
          <option value="all">— Semua Wilayah —</option>
          {ALL_REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Count */}
      <div className="px-3 py-2 flex items-center justify-between flex-shrink-0">
        <span className="text-[10px] text-on-surface-variant">
          {filtered.length} ditemukan
        </span>
        <span className="text-[10px] font-bold">
          <span className="text-primary">{selectedCams.length}</span>
          <span className="text-on-surface-variant">/{maxSlots} slot</span>
        </span>
      </div>

      {/* Camera list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 no-scrollbar">
        {filtered.length === 0 && (
          <div className="text-center py-8 text-on-surface-variant text-xs">
            <span className="material-symbols-outlined text-3xl block mb-2 opacity-30">search_off</span>
            Tidak ditemukan
          </div>
        )}
        {filtered.map((cam) => {
          const isSelected = selectedIds.has(cam.cctv_id);
          const colorClass = REGION_COLORS[cam.region] ?? 'text-outline';

          return (
            <button
              key={cam.cctv_id}
              onClick={() =>
                isSelected ? onDeselect(cam.cctv_id) : canAdd ? onSelect(cam) : null
              }
              className={`w-full text-left p-2.5 rounded-lg transition-all group border ${
                isSelected
                  ? 'bg-primary/10 border-primary/30'
                  : canAdd
                  ? 'bg-surface-container-high hover:bg-surface-bright border-transparent hover:border-outline-variant/20 cursor-pointer'
                  : 'bg-surface-container-high border-transparent opacity-40 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[9px] font-bold uppercase tracking-widest ${colorClass}`}>
                  {cam.region}
                </span>
                <span className="material-symbols-outlined text-xs">
                  {isSelected ? 'check_circle' : canAdd ? 'add_circle_outline' : 'block'}
                </span>
              </div>
              <div className="text-xs font-medium text-on-surface leading-tight line-clamp-2">
                {cam.ch_name}
              </div>
              {cam.player_type === 'video' && (
                <span className="mt-1 inline-block text-[8px] px-1.5 py-0.5 rounded bg-secondary/10 text-secondary font-bold uppercase tracking-widest">
                  MP4
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
