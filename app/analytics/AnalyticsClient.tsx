'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import type { CCTVChannel } from '@/types/cctv';
import {
  BarChart3,
  Video,
  MapPin,
  Tv,
  Film,
  ArrowRight,
  Database,
  Layers,
  Compass,
} from 'lucide-react';
import Link from 'next/link';

const AnalyticsMap = dynamic(() => import('@/components/dashboard/DashboardMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-background">
      <MapPin className="w-6 h-6 text-emerald-500 dark:text-emerald-400 animate-pulse" />
    </div>
  ),
});

const REGION_COLORS: Record<string, string> = {
  'Badung':         '#38bdf8',
  'Badung Selatan': '#0ea5e9',
  'Denpasar':       '#10b981',
  'Gianyar':        '#f59e0b',
  'Klungkung':      '#fbbf24',
  'Karangasem':     '#f87171',
  'Buleleng':       '#94a3b8',
  'Jembrana':       '#64748b',
  'Tabanan':        '#cbd5e1',
  'Bangli':         '#475569',
  'Lainnya':        '#71717a',
};

interface Props {
  channels: CCTVChannel[];
}

export default function AnalyticsClient({ channels }: Props) {
  const stats = useMemo(() => {
    const total = channels.length;
    const withGPS = channels.filter((c) => c.lat !== null && c.lng !== null).length;
    const videoType = channels.filter((c) => c.player_type === 'video').length;
    const iframeType = total - videoType;

    const byRegion = channels.reduce<Record<string, number>>((acc, cam) => {
      acc[cam.region] = (acc[cam.region] ?? 0) + 1;
      return acc;
    }, {});

    const regionEntries = Object.entries(byRegion).sort((a, b) => b[1] - a[1]);
    const maxCount = regionEntries[0]?.[1] ?? 1;

    return { total, withGPS, videoType, iframeType, regionEntries, maxCount };
  }, [channels]);

  return (
    <div className="min-h-screen bg-background text-foreground px-4 md:px-8 py-6 pb-12 font-sans">
      {/* ─── Top Header ─── */}
      <header className="mb-6 flex flex-wrap justify-between items-end gap-4 border-b border-border pb-5">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Telemetri & Analisis Jaringan
          </span>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground mt-0.5">
            Statistik & Distribusi Infrastruktur CCTV
          </h1>
          <p className="text-muted-foreground text-xs mt-1 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            Integrasi Multi-Sumber Satu Data Bali & ATCS Denpasar
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <div className="px-3.5 py-2 rounded-lg bg-card border border-border shadow-sm flex flex-col items-end">
            <span className="text-[10px] font-mono uppercase text-muted-foreground">Total Terpasang</span>
            <span className="font-mono text-xl font-bold text-foreground">{stats.total}</span>
          </div>
          <div className="px-3.5 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-end">
            <span className="text-[10px] font-mono uppercase text-emerald-600 dark:text-emerald-400">Wilayah Tercakup</span>
            <span className="font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.regionEntries.length}</span>
          </div>
        </div>
      </header>

      {/* ─── Bento Grid ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        {/* 1. Overview Stat Cards */}
        <section className="col-span-1 md:col-span-2 xl:col-span-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: 'Total Titik Kamera',
                value: stats.total,
                sub: 'unit terdaftar di Bali',
                icon: Video,
                color: 'text-foreground',
                bar: '#10b981',
                pct: 100,
              },
              {
                label: 'Kamera Ber-GPS',
                value: stats.withGPS,
                sub: `${Math.round((stats.withGPS / (stats.total || 1)) * 100)}% terkalibrasi spasial`,
                icon: MapPin,
                color: 'text-emerald-400',
                bar: '#10b981',
                pct: Math.round((stats.withGPS / (stats.total || 1)) * 100),
              },
              {
                label: 'Format Web Frame',
                value: stats.iframeType,
                sub: `${Math.round((stats.iframeType / (stats.total || 1)) * 100)}% iframe stream`,
                icon: Tv,
                color: 'text-amber-400',
                bar: '#f59e0b',
                pct: Math.round((stats.iframeType / (stats.total || 1)) * 100),
              },
              {
                label: 'Format Langsung MP4/HLS',
                value: stats.videoType,
                sub: `${Math.round((stats.videoType / (stats.total || 1)) * 100)}% direct stream`,
                icon: Film,
                color: 'text-cyan-400',
                bar: '#06b6d4',
                pct: Math.round((stats.videoType / (stats.total || 1)) * 100),
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="bg-card border border-border rounded-lg p-3.5 flex flex-col justify-between shadow-sm"
                >
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {card.label}
                    </span>
                    <Icon className={`w-3.5 h-3.5 ${card.color}`} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <p className={`text-2xl font-mono font-bold tracking-tight ${card.color}`}>
                      {card.value}
                    </p>
                    <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${card.pct}%`, backgroundColor: card.bar }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{card.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 2. Region Bar Chart */}
        <div className="col-span-1 md:col-span-1 xl:col-span-7 flex flex-col rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2 border-b border-border">
            <BarChart3 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-foreground">
              Sebaran Titik Kamera per Wilayah
            </span>
          </div>
          <div className="p-4 space-y-2.5 flex-1">
            {stats.regionEntries.map(([region, count]) => {
              const pct = Math.round((count / stats.maxCount) * 100);
              const color = REGION_COLORS[region] ?? '#38bdf8';
              const totalPct = Math.round((count / (stats.total || 1)) * 100);
              return (
                <div key={region} className="p-2 rounded bg-muted/40 border border-border/50">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs font-medium text-foreground">{region}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-muted-foreground text-[10px]">{totalPct}%</span>
                      <span className="font-bold" style={{ color }}>{count}</span>
                    </div>
                  </div>
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Tactical Map Preview */}
        <div className="col-span-1 md:col-span-1 xl:col-span-5 flex flex-col rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              <span className="text-xs font-semibold text-foreground">
                Peta Spasial Terpadu
              </span>
            </div>
            <Link
              href="/"
              className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
            >
              <span>Buka Penuh</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex-1 min-h-[320px] relative">
            <AnalyticsMap cameras={channels} />
          </div>
        </div>
      </div>

      {/* ─── Footer Action Bar ─── */}
      <footer className="mt-8 pt-5 border-t border-border flex flex-wrap justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <span className="text-[10px] font-mono uppercase text-muted-foreground">Sumber Data Terpadu</span>
            <p className="text-xs font-semibold text-foreground">Bali Satu Data · Dishub ATCS</p>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-muted-foreground">Status Node Kamera</span>
            <p className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400">{stats.total} Titik Terhubung</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/cctv"
            className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-medium rounded-md transition-all shadow-[0_1px_8px_rgba(16,185,129,0.2)]"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Buka Pantauan CCTV Live</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </footer>
    </div>
  );
}