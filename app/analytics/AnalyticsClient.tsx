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
import {
  BarChart3,
  Video,
  MapPin,
  Satellite,
  Tv,
  Film,
  ArrowRight,
  Database,
} from 'lucide-react';
import Link from 'next/link';

const AnalyticsMap = dynamic(() => import('@/components/dashboard/DashboardMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-card rounded-xl">
      <MapPin className="w-8 h-8 text-primary animate-pulse" />
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
            Analisis & Statistik Kamera
          </h1>
          <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Data Persebaran Kamera CCTV · Provinsi Bali
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Total Kamera', value: stats.total.toString(), color: 'text-foreground' },
            { label: 'Wilayah Terpantau', value: stats.regionEntries.length.toString(), color: 'text-primary' },
          ].map(({ label, value, color }) => (
            <Card key={label} className="px-4 py-2 flex flex-col items-end bg-card shadow-sm border-border">
              <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
              <span className={`font-headline text-2xl font-black ${color}`}>{value}</span>
            </Card>
          ))}
        </div>
      </header>

      {/* ─── Bento Grid ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-5">

        {/* 1. Overview Stat Cards */}
        <section className="col-span-1 md:col-span-2 xl:col-span-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: 'Total Kamera',
                value: stats.total,
                sub: 'unit aktif terdaftar',
                icon: Video,
                color: 'text-primary',
                bar: '#00f0ff',
                pct: 100,
              },
              {
                label: 'Kamera Ber-GPS',
                value: stats.withGPS,
                sub: `${Math.round((stats.withGPS / stats.total) * 100)}% dari total`,
                icon: MapPin,
                color: 'text-emerald-600 dark:text-emerald-400',
                bar: '#10b981',
                pct: Math.round((stats.withGPS / stats.total) * 100),
              },
              {
                label: 'Stream Web Player',
                value: stats.iframeType,
                sub: `${Math.round((stats.iframeType / stats.total) * 100)}% dari total`,
                icon: Tv,
                color: 'text-amber-600 dark:text-amber-400',
                bar: '#f59e0b',
                pct: Math.round((stats.iframeType / stats.total) * 100),
              },
              {
                label: 'Stream Video MP4/HLS',
                value: stats.videoType,
                sub: `${Math.round((stats.videoType / stats.total) * 100)}% dari total`,
                icon: Film,
                color: 'text-orange-600 dark:text-orange-400',
                bar: '#f97316',
                pct: Math.round((stats.videoType / stats.total) * 100),
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <Card
                  key={card.label}
                  className="bg-card shadow-sm border-border flex flex-col justify-between p-4"
                >
                  <CardHeader className="flex flex-row items-center justify-between p-0 pb-2">
                    <CardTitle className="text-xs font-semibold font-headline text-muted-foreground">
                      {card.label}
                    </CardTitle>
                    <Icon className={`w-4 h-4 ${card.color}`} />
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2 p-0">
                    <p className={`text-3xl font-headline font-black tracking-tight ${card.color}`}>
                      {card.value}
                    </p>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${card.pct}%`, backgroundColor: card.bar }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">{card.sub}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* 2. Region Bar Chart */}
        <Card className="col-span-1 md:col-span-1 xl:col-span-7 flex flex-col p-0 overflow-hidden shadow-sm border-border bg-card">
          <CardHeader className="px-5 py-4 flex-row items-center gap-2 space-y-0 border-b border-border">
            <BarChart3 className="w-4 h-4 text-primary" />
            <CardTitle className="font-headline text-sm font-bold text-foreground">
              Distribusi Kamera per Wilayah
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-3.5 flex-1">
            {stats.regionEntries.map(([region, count]) => {
              const pct = Math.round((count / stats.maxCount) * 100);
              const color = REGION_COLORS[region] ?? '#81ecff';
              const totalPct = Math.round((count / stats.total) * 100);
              return (
                <div key={region} className="group">
                  <div className="flex items-center justify-between mb-1.5 transition-colors">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs font-medium text-foreground">{region}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground font-medium">{totalPct}%</span>
                      <span
                        className="text-xs font-headline font-bold w-8 text-right"
                        style={{ color }}
                      >
                        {count}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* 3. Stream Type + GPS Summary */}
        <section className="col-span-1 md:col-span-1 xl:col-span-5 flex flex-col gap-5">
          {/* GPS coverage card */}
          <Card className="flex flex-col p-0 overflow-hidden shadow-sm border-border bg-card">
            <CardHeader className="px-5 py-4 flex-row items-center gap-2 space-y-0 border-b border-border">
              <Satellite className="w-4 h-4 text-emerald-500" />
              <CardTitle className="font-headline text-sm font-bold text-foreground">
                Kesiapan Lokasi GPS
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-6">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" className="text-muted" strokeWidth="3.8" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke="#10b981" strokeWidth="3.8"
                      strokeDasharray={`${(stats.withGPS / stats.total) * 100} 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-headline font-bold text-emerald-600 dark:text-emerald-400">
                      {Math.round((stats.withGPS / stats.total) * 100)}%
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Terpetakan GPS</p>
                    <p className="text-lg font-headline font-bold text-emerald-600 dark:text-emerald-400">{stats.withGPS} Titik</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Tanpa Koordinat</p>
                    <p className="text-lg font-headline font-bold text-foreground">{stats.total - stats.withGPS} Titik</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stream type card */}
          <Card className="flex flex-col p-0 overflow-hidden flex-1 shadow-sm border-border bg-card">
            <CardHeader className="px-5 py-4 flex-row items-center gap-2 space-y-0 border-b border-border">
              <Film className="w-4 h-4 text-primary" />
              <CardTitle className="font-headline text-sm font-bold text-foreground">
                Protokol Streaming Kamera
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-center">
              {[
                { label: 'Web Embed Player (iframe)', count: stats.iframeType, color: '#f59e0b', icon: Tv },
                { label: 'Live Video Direct (MP4 / HLS)', count: stats.videoType, color: '#00f0ff', icon: Film },
              ].map(({ label, count, color, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-foreground font-medium">{label}</span>
                      <span className="text-xs font-headline font-bold" style={{ color }}>{count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
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
        <Card className="col-span-1 md:col-span-2 xl:col-span-12 p-0 overflow-hidden shadow-sm border-border bg-card">
          <CardHeader className="px-5 py-4 flex-row items-center gap-2 space-y-0 border-b border-border">
            <MapPin className="w-4 h-4 text-primary" />
            <CardTitle className="font-headline text-sm font-bold text-foreground flex-1">
              Peta Persebaran Titik Kamera
            </CardTitle>
            <span className="ml-auto text-xs text-muted-foreground">
              {stats.withGPS} kamera terpetakan
            </span>
          </CardHeader>
          <CardContent className="p-0 h-64 md:h-80">
            <AnalyticsMap cameras={channels} />
          </CardContent>
        </Card>
      </div>

      {/* ─── Footer ─── */}
      <footer className="mt-10 pt-6 border-t border-border flex flex-wrap justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <span className="text-xs text-muted-foreground block">Sumber Data Terpadu</span>
            <span className="text-sm font-headline font-bold text-primary">Bali Satu Data · Dishub ATCS</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Total Kamera Aktif</span>
            <span className="text-sm font-headline font-bold text-foreground">{stats.total} Titik CCTV</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            href="/cctv"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
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