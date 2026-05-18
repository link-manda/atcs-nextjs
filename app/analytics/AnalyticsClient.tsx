'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import type { CCTVChannel } from '@/types/cctv';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const AnalyticsMap = dynamic(() => import('@/components/dashboard/DashboardMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-card rounded-xl">
      <span className="material-symbols-outlined text-primary text-3xl animate-pulse">map</span>
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
    <div className="px-4 md:px-8 py-6 pb-12">
      {/* ─── Header ─── */}
      <header className="mb-8 flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1 className="font-headline text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            CCTV_ANALYTICS
          </h1>
          <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            Data Kamera CCTV · Provinsi Bali
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Total Kamera', value: stats.total.toString(), color: 'text-primary' },
            { label: 'Wilayah', value: stats.regionEntries.length.toString(), color: 'text-tertiary' },
          ].map(({ label, value, color }) => (
            <Card key={label} className="px-4 py-2 flex flex-col items-end bg-muted/20">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{label}</span>
              <span className={`font-headline text-xl font-bold ${color}`}>{value}</span>
            </Card>
          ))}
        </div>
      </header>

      {/* ─── Bento Grid ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-5">

        {/* 1. Overview Stat Cards — full width row */}
        <section className="col-span-1 md:col-span-2 xl:col-span-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: 'Total Kamera',
                value: stats.total,
                sub: 'unit aktif terdaftar',
                icon: 'videocam',
                color: 'text-primary',
                bar: '#81ecff',
                pct: 100,
              },
              {
                label: 'Kamera Ber-GPS',
                value: stats.withGPS,
                sub: `${Math.round((stats.withGPS / stats.total) * 100)}% dari total`,
                icon: 'location_on',
                color: 'text-secondary',
                bar: '#00fc40',
                pct: Math.round((stats.withGPS / stats.total) * 100),
              },
              {
                label: 'Stream · iframe',
                value: stats.iframeType,
                sub: `${Math.round((stats.iframeType / stats.total) * 100)}% dari total`,
                icon: 'open_in_browser',
                color: 'text-tertiary',
                bar: '#ffbd5c',
                pct: Math.round((stats.iframeType / stats.total) * 100),
              },
              {
                label: 'Stream · MP4',
                value: stats.videoType,
                sub: `${Math.round((stats.videoType / stats.total) * 100)}% dari total`,
                icon: 'movie',
                color: 'text-destructive',
                bar: '#ff716c',
                pct: Math.round((stats.videoType / stats.total) * 100),
              },
            ].map((card) => (
              <Card
                key={card.label}
                className="cursor-pointer transition-colors duration-200 hover:bg-muted/50 flex flex-col justify-between"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-[10px] font-headline text-muted-foreground uppercase tracking-widest font-normal">
                    {card.label}
                  </CardTitle>
                  <span className={`material-symbols-outlined text-lg ${card.color}`} style={{ fontSize: '18px' }}>
                    {card.icon}
                  </span>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <p className={`text-3xl font-headline font-bold tracking-tight ${card.color}`}>
                    {card.value}
                  </p>
                  <div className="h-1 w-full bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${card.pct}%`, backgroundColor: card.bar }}
                    />
                  </div>
                  <p className="text-[9px] text-muted-foreground">{card.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 2. Region Bar Chart — left */}
        <Card className="col-span-1 md:col-span-1 xl:col-span-7 flex flex-col p-0 overflow-hidden">
          <CardHeader className="px-5 py-4 flex-row items-center gap-2 space-y-0">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>leaderboard</span>
            <CardTitle className="font-headline text-xs font-bold tracking-widest text-primary uppercase">
              Distribusi Kamera Per Wilayah
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-3.5 flex-1">
            {stats.regionEntries.map(([region, count]) => {
              const pct = Math.round((count / stats.maxCount) * 100);
              const color = REGION_COLORS[region] ?? '#81ecff';
              const totalPct = Math.round((count / stats.total) * 100);
              return (
                <div key={region} className="group cursor-pointer">
                  <div className="flex items-center justify-between mb-1.5 transition-colors duration-200 group-hover:text-primary">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0 transition-transform duration-200 group-hover:scale-125"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs font-medium text-foreground">{region}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-muted-foreground">{totalPct}%</span>
                      <span
                        className="text-xs font-headline font-bold w-6 text-right transition-colors duration-200"
                        style={{ color }}
                      >
                        {count}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.8 }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* 3. Stream Type + GPS Summary — right */}
        <section className="col-span-1 md:col-span-1 xl:col-span-5 flex flex-col gap-5">
          {/* GPS coverage card */}
          <Card className="flex flex-col p-0 overflow-hidden cursor-pointer transition-colors duration-200 hover:bg-muted/30">
            <CardHeader className="px-5 py-4 flex-row items-center gap-2 space-y-0">
              <span className="material-symbols-outlined text-secondary" style={{ fontSize: '18px' }}>satellite_alt</span>
              <CardTitle className="font-headline text-xs font-bold tracking-widest text-secondary uppercase">
                Coverage GPS
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 flex-1 flex flex-col justify-center">
              {/* Donut-like visual */}
              <div className="flex items-center gap-6">
                <div className="relative w-20 h-20 flex-shrink-0 transition-transform duration-300 hover:scale-105">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" className="text-muted" strokeWidth="3.8" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke="#00fc40" strokeWidth="3.8"
                      strokeDasharray={`${(stats.withGPS / stats.total) * 100} 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-headline font-bold text-secondary">
                      {Math.round((stats.withGPS / stats.total) * 100)}%
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Ber-GPS</p>
                    <p className="text-lg font-headline font-bold text-secondary">{stats.withGPS}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Tanpa GPS</p>
                    <p className="text-lg font-headline font-bold text-foreground">{stats.total - stats.withGPS}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stream type card */}
          <Card className="flex flex-col p-0 overflow-hidden flex-1 cursor-pointer transition-colors duration-200 hover:bg-muted/30">
            <CardHeader className="px-5 py-4 flex-row items-center gap-2 space-y-0">
              <span className="material-symbols-outlined text-tertiary" style={{ fontSize: '18px' }}>stream</span>
              <CardTitle className="font-headline text-xs font-bold tracking-widest text-tertiary uppercase">
                Tipe Stream
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-center">
              {[
                { label: 'iframe / Web Player', count: stats.iframeType, color: '#ffbd5c', icon: 'open_in_browser' },
                { label: 'MP4 / Video Direct', count: stats.videoType, color: '#ff716c', icon: 'movie' },
              ].map(({ label, count, color, icon }) => (
                <div key={label} className="flex items-center gap-3 group">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color }}>
                      {icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-foreground">{label}</span>
                      <span className="text-xs font-headline font-bold transition-transform duration-200 group-hover:translate-x-[-2px]" style={{ color }}>{count}</span>
                    </div>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.round((count / stats.total) * 100)}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* 4. Map section */}
        <Card className="col-span-1 md:col-span-2 xl:col-span-12 p-0 overflow-hidden">
          <CardHeader className="px-5 py-4 flex-row items-center gap-2 space-y-0">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>map</span>
            <CardTitle className="font-headline text-xs font-bold tracking-widest text-primary uppercase flex-1">
              Peta Persebaran Kamera
            </CardTitle>
            <span className="ml-auto text-[10px] text-muted-foreground font-normal">
              {stats.withGPS} kamera ditampilkan
            </span>
          </CardHeader>
          <CardContent className="p-0 h-64 md:h-80">
            <AnalyticsMap cameras={channels} />
          </CardContent>
        </Card>
      </div>

      {/* ─── Footer ─── */}
      <footer className="mt-10 pt-6 border-t border-border/50 flex flex-wrap justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground block">SUMBER DATA</span>
            <span className="text-sm font-headline font-bold text-primary">Bali Satu Data · ATCS</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground block">TOTAL UNIT</span>
            <span className="text-sm font-headline font-bold text-foreground">{stats.total} CCTV</span>
          </div>
        </div>
        <div className="flex gap-3">
          <a
            href="/cctv"
            className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 border border-primary/30 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-colors uppercase tracking-widest font-headline"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>videocam</span>
            Buka CCTV Grid
          </a>
        </div>
      </footer>
    </div>
  );
}