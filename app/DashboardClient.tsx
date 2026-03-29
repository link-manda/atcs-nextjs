'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo } from 'react';
import type { CCTVChannel } from '@/types/cctv';

const DashboardMap = dynamic(() => import('@/components/dashboard/DashboardMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-surface-container-lowest">
      <div className="text-center">
        <span className="material-symbols-outlined text-primary text-4xl animate-pulse block mb-3">
          map
        </span>
        <p className="text-xs font-headline text-on-surface-variant uppercase tracking-widest">
          Memuat Peta Bali...
        </p>
      </div>
    </div>
  ),
});

const REGION_COLORS: Record<string, string> = {
  'Badung':         '#81ecff',
  'Badung Selatan': '#00d4ec',
  'Denpasar':       '#00fc40',
  'Gianyar':        '#ffbd5c',
  'Klungkung':      '#ec9e00',
  'Karangasem':     '#ff716c',
  'Buleleng':       '#aaabb0',
  'Jembrana':       '#74757a',
  'Tabanan':        '#c8c6d0',
  'Bangli':         '#46484d',
  'Lainnya':        '#535353',
};

interface Props {
  channels: CCTVChannel[];
}

export default function DashboardClient({ channels }: Props) {
  const stats = useMemo(() => {
    const total = channels.length;
    const withGPS = channels.filter((c) => c.lat !== null && c.lng !== null).length;

    const byRegion = channels.reduce<Record<string, number>>((acc, cam) => {
      acc[cam.region] = (acc[cam.region] ?? 0) + 1;
      return acc;
    }, {});

    const regionEntries = Object.entries(byRegion)
      .sort((a, b) => b[1] - a[1]);

    return { total, withGPS, byRegion, regionEntries };
  }, [channels]);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] gap-0">
      {/* ─── Map ─── */}
      <div className="flex-1 relative min-h-[50vh] lg:min-h-0">
        <DashboardMap cameras={channels} />

        {/* Map overlay badge */}
        <div className="absolute top-4 left-4 z-[400] glass-panel px-3 py-2 rounded-lg border border-outline-variant/20 pointer-events-none">
          <p className="text-[9px] font-headline text-on-surface-variant uppercase tracking-widest mb-0.5">
            Persebaran CCTV
          </p>
          <p className="text-sm font-headline font-bold text-primary">
            Provinsi Bali
          </p>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[400] glass-panel px-3 py-2.5 rounded-lg border border-outline-variant/20 max-w-[180px]">
          <p className="text-[9px] font-headline text-on-surface-variant uppercase tracking-widest mb-2">
            Legend Region
          </p>
          <div className="space-y-1">
            {stats.regionEntries.slice(0, 6).map(([region, count]) => (
              <div key={region} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: REGION_COLORS[region] ?? '#81ecff' }}
                />
                <span className="text-[9px] text-on-surface flex-1 truncate">{region}</span>
                <span className="text-[9px] font-bold text-primary">{count}</span>
              </div>
            ))}
            {stats.regionEntries.length > 6 && (
              <p className="text-[8px] text-on-surface-variant">
                +{stats.regionEntries.length - 6} lainnya
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Stats Panel ─── */}
      <aside className="w-full lg:w-80 xl:w-96 bg-surface-container border-t lg:border-t-0 lg:border-l border-outline-variant/20 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-outline-variant/10 flex-shrink-0">
          <h2 className="font-headline text-xs font-bold text-on-surface uppercase tracking-widest">
            Ringkasan Sistem
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            <span className="text-[10px] text-on-surface-variant font-headline uppercase tracking-wider">
              Data Aktif
            </span>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="p-4 grid grid-cols-2 gap-3 flex-shrink-0">
          <div className="bg-surface-container-high rounded-xl p-3 border border-outline-variant/10">
            <p className="text-[9px] font-headline text-on-surface-variant uppercase tracking-widest mb-1">
              Total Kamera
            </p>
            <p className="text-2xl font-headline font-bold text-primary tracking-tight">
              {stats.total}
            </p>
            <p className="text-[9px] text-on-surface-variant mt-0.5">unit terpasang</p>
          </div>
          <div className="bg-surface-container-high rounded-xl p-3 border border-outline-variant/10">
            <p className="text-[9px] font-headline text-on-surface-variant uppercase tracking-widest mb-1">
              Ber-GPS
            </p>
            <p className="text-2xl font-headline font-bold text-secondary tracking-tight">
              {stats.withGPS}
            </p>
            <p className="text-[9px] text-on-surface-variant mt-0.5">
              {Math.round((stats.withGPS / stats.total) * 100)}% coverage
            </p>
          </div>
          <div className="bg-surface-container-high rounded-xl p-3 border border-outline-variant/10">
            <p className="text-[9px] font-headline text-on-surface-variant uppercase tracking-widest mb-1">
              Total Wilayah
            </p>
            <p className="text-2xl font-headline font-bold text-tertiary tracking-tight">
              {stats.regionEntries.length}
            </p>
            <p className="text-[9px] text-on-surface-variant mt-0.5">kabupaten/kota</p>
          </div>
          <div className="bg-surface-container-high rounded-xl p-3 border border-outline-variant/10">
            <p className="text-[9px] font-headline text-on-surface-variant uppercase tracking-widest mb-1">
              Tanpa GPS
            </p>
            <p className="text-2xl font-headline font-bold text-on-surface tracking-tight">
              {stats.total - stats.withGPS}
            </p>
            <p className="text-[9px] text-on-surface-variant mt-0.5">perlu update data</p>
          </div>
        </div>

        {/* Region Breakdown */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 no-scrollbar">
          <p className="text-[9px] font-headline text-on-surface-variant uppercase tracking-widest mb-3">
            Distribusi Per Wilayah
          </p>
          <div className="space-y-2.5">
            {stats.regionEntries.map(([region, count]) => {
              const pct = Math.round((count / stats.total) * 100);
              const color = REGION_COLORS[region] ?? '#81ecff';
              return (
                <div key={region}>
                  <div className="flex justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-[10px] text-on-surface font-medium">{region}</span>
                    </div>
                    <span className="text-[10px] font-bold font-headline" style={{ color }}>
                      {count}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.8 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="p-4 border-t border-outline-variant/10 flex-shrink-0">
          <Link
            href="/cctv"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary/10 border border-primary/30 text-primary rounded-lg hover:bg-primary/20 transition-colors text-xs font-headline font-bold uppercase tracking-widest group"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>videocam</span>
            Buka CCTV Grid
            <span className="material-symbols-outlined group-hover:translate-x-0.5 transition-transform" style={{ fontSize: '16px' }}>
              arrow_forward
            </span>
          </Link>
          <Link
            href="/analytics"
            className="flex items-center justify-center gap-2 w-full py-2.5 mt-2 bg-surface-container-high border border-outline-variant/20 text-on-surface-variant rounded-lg hover:text-on-surface transition-colors text-xs font-headline font-bold uppercase tracking-widest"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>insights</span>
            Lihat Analytics
          </Link>
        </div>
      </aside>
    </div>
  );
}
