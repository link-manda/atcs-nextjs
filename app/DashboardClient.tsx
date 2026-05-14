'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo } from 'react';
import type { CCTVChannel } from '@/types/cctv';

const DashboardMap = dynamic(() => import('@/components/dashboard/DashboardMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-background">
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
      <div className="flex-1 relative isolate min-h-[50vh] lg:min-h-0">
        <DashboardMap cameras={channels} />
      </div>

      {/* ─── Stats Panel ─── */}
      <aside className="w-full lg:w-80 xl:w-96 bg-surface-container border-t lg:border-t-0 lg:border-l border-border/20 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/10 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">
              System Status
            </span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(var(--secondary-rgb),0.5)] animate-pulse" />
              <span className="text-[9px] font-bold text-on-surface font-mono uppercase">
                OPERATIONAL
              </span>
            </div>
          </div>
          <p className="text-xs font-bold text-primary font-headline">
            Tactical Map Interface v4.2
          </p>
        </div>

        {/* Stat Cards */}
        <div className="p-4 grid grid-cols-2 gap-3 flex-shrink-0">
          <div className="bg-surface-container-high rounded-xl p-3 border border-border/10">
            <p className="text-[9px] font-headline text-on-surface-variant uppercase tracking-widest mb-1">
              Total Kamera
            </p>
            <p className="text-2xl font-headline font-bold text-primary tracking-tight">
              {stats.total}
            </p>
            <p className="text-[9px] text-on-surface-variant mt-0.5">unit terpasang</p>
          </div>
          <div className="bg-surface-container-high rounded-xl p-3 border border-border/10">
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
          <div className="bg-surface-container-high rounded-xl p-3 border border-border/10">
            <p className="text-[9px] font-headline text-on-surface-variant uppercase tracking-widest mb-1">
              Total Wilayah
            </p>
            <p className="text-2xl font-headline font-bold text-tertiary tracking-tight">
              {stats.regionEntries.length}
            </p>
            <p className="text-[9px] text-on-surface-variant mt-0.5">kabupaten/kota</p>
          </div>
          <div className="bg-surface-container-high rounded-xl p-3 border border-border/10">
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
            Regional Clusters (Legend)
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
        <div className="p-4 border-t border-border/10 flex-shrink-0">
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
            className="flex items-center justify-center gap-2 w-full py-2.5 mt-2 bg-surface-container-high border border-border/20 text-on-surface-variant rounded-lg hover:text-on-surface transition-colors text-xs font-headline font-bold uppercase tracking-widest"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>insights</span>
            Lihat Analytics
          </Link>
        </div>
      </aside>
    </div>
  );
}
