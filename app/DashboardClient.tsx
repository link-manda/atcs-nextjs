'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo } from 'react';
import type { CCTVChannel } from '@/types/cctv';
import { Video, BarChart3, ArrowRight, MapPin, Radio } from 'lucide-react';

const DashboardMap = dynamic(() => import('@/components/dashboard/DashboardMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-background">
      <div className="text-center">
        <MapPin className="w-8 h-8 text-primary animate-pulse mx-auto mb-3" />
        <p className="text-xs font-semibold font-headline text-muted-foreground">
          Memuat Peta Lalu Lintas Bali...
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
    <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-4rem)] min-h-[calc(100vh-4rem)] gap-0">
      {/* ─── Map ─── */}
      <div className="relative isolate h-[55vh] lg:h-auto lg:flex-1">
        <DashboardMap cameras={channels} />
      </div>

      {/* ─── Stats Panel ─── */}
      <aside className="w-full lg:w-80 xl:w-96 bg-card border-t lg:border-t-0 lg:border-l border-border flex flex-col overflow-hidden shadow-md">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold font-headline text-muted-foreground">
              Status Pemantauan
            </span>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Aktif Normal
              </span>
            </div>
          </div>
          <h2 className="text-sm font-bold text-foreground font-headline mt-0.5">
            Peta Sebaran Kamera Bali
          </h2>
        </div>

        {/* Stat Cards */}
        <div className="p-4 grid grid-cols-2 gap-3 flex-shrink-0">
          <div className="bg-background rounded-xl p-3 border border-border shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground mb-0.5">
              Total Kamera
            </p>
            <p className="text-2xl font-black font-headline text-foreground">
              {stats.total}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">kamera terpasang</p>
          </div>
          <div className="bg-background rounded-xl p-3 border border-border shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground mb-0.5">
              Terpetakan GPS
            </p>
            <p className="text-2xl font-black font-headline text-emerald-600 dark:text-emerald-400">
              {stats.withGPS}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {Math.round((stats.withGPS / stats.total) * 100)}% titik lokasi
            </p>
          </div>
          <div className="bg-background rounded-xl p-3 border border-border shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground mb-0.5">
              Total Wilayah
            </p>
            <p className="text-2xl font-black font-headline text-primary">
              {stats.regionEntries.length}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">kabupaten / kota</p>
          </div>
          <div className="bg-background rounded-xl p-3 border border-border shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground mb-0.5">
              Kamera Lainnya
            </p>
            <p className="text-2xl font-black font-headline text-foreground">
              {stats.total - stats.withGPS}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">titik terdaftar</p>
          </div>
        </div>

        {/* Region Breakdown */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 no-scrollbar">
          <p className="text-xs font-semibold font-headline text-foreground/80 mb-3">
            Sebaran per Wilayah
          </p>
          <div className="space-y-2.5">
            {stats.regionEntries.map(([region, count]) => {
              const pct = Math.round((count / stats.total) * 100);
              const color = REGION_COLORS[region] ?? '#81ecff';
              return (
                <div key={region}>
                  <div className="flex justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs text-foreground font-medium">{region}</span>
                    </div>
                    <span className="text-xs font-bold font-headline text-foreground">
                      {count} <span className="text-[10px] text-muted-foreground font-normal">kamera</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="p-4 border-t border-border flex-shrink-0 flex flex-col gap-2">
          <Link
            href="/cctv"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary text-primary-foreground font-headline font-semibold rounded-lg hover:bg-primary/90 transition-colors text-xs shadow-sm group"
          >
            <Video className="w-4 h-4" />
            <span>Buka Pantauan CCTV Live</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/analytics"
            className="flex items-center justify-center gap-2 w-full py-2 bg-background border border-border text-foreground font-headline font-semibold rounded-lg hover:bg-muted transition-colors text-xs"
          >
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <span>Lihat Analisis Lalu Lintas</span>
          </Link>
        </div>
      </aside>
    </div>
  );
}
