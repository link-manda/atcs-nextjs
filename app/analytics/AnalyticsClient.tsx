'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import type { CCTVChannel } from '@/types/cctv';

const AnalyticsMap = dynamic(() => import('@/components/dashboard/DashboardMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-surface-container rounded-xl">
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
          <h1 className="font-headline text-2xl md:text-3xl font-bold tracking-tight text-on-surface">
            CCTV_ANALYTICS
          </h1>
          <p className="text-on-surface-variant text-sm mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            Data Kamera CCTV · Provinsi Bali
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Total Kamera', value: stats.total.toString(), color: 'text-primary' },
            { label: 'Wilayah', value: stats.regionEntries.length.toString(), color: 'text-tertiary' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-surface-container-high px-4 py-2 rounded-lg flex flex-col items-end border border-outline-variant/10">
              <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">{label}</span>
              <span className={`font-headline text-xl font-bold ${color}`}>{value}</span>
            </div>
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
                color: 'text-error',
                bar: '#ff716c',
                pct: Math.round((stats.videoType / stats.total) * 100),
              },
            ].map((card) => (
              <div
                key={card.label}
                className="bg-surface-container rounded-xl p-4 border border-outline-variant/10 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-headline text-on-surface-variant uppercase tracking-widest">
                    {card.label}
                  </p>
                  <span className={`material-symbols-outlined text-lg ${card.color}`} style={{ fontSize: '18px' }}>
                    {card.icon}
                  </span>
                </div>
                <p className={`text-3xl font-headline font-bold tracking-tight ${card.color}`}>
                  {card.value}
                </p>
                <div className="h-1 w-full bg-surface-container-highest rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${card.pct}%`, backgroundColor: card.bar }}
                  />
                </div>
                <p className="text-[9px] text-on-surface-variant">{card.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Region Bar Chart — left */}
        <section className="col-span-1 md:col-span-1 xl:col-span-7 bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
          <div className="px-5 py-4 border-b border-outline-variant/10 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>leaderboard</span>
            <h2 className="font-headline text-xs font-bold tracking-widest text-primary uppercase">
              Distribusi Kamera Per Wilayah
            </h2>
          </div>
          <div className="p-5 space-y-3.5">
            {stats.regionEntries.map(([region, count]) => {
              const pct = Math.round((count / stats.maxCount) * 100);
              const color = REGION_COLORS[region] ?? '#81ecff';
              const totalPct = Math.round((count / stats.total) * 100);
              return (
                <div key={region} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs font-medium text-on-surface">{region}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-on-surface-variant">{totalPct}%</span>
                      <span
                        className="text-xs font-headline font-bold w-6 text-right"
                        style={{ color }}
                      >
                        {count}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.8 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. Stream Type + GPS Summary — right */}
        <section className="col-span-1 md:col-span-1 xl:col-span-5 flex flex-col gap-5">
          {/* GPS coverage card */}
          <div className="bg-surface-container rounded-xl border border-outline-variant/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant/10 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary" style={{ fontSize: '18px' }}>satellite_alt</span>
              <h2 className="font-headline text-xs font-bold tracking-widest text-secondary uppercase">
                Coverage GPS
              </h2>
            </div>
            <div className="p-5">
              {/* Donut-like visual */}
              <div className="flex items-center gap-6">
                <div className="relative w-20 h-20 flex-shrink-0">
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
                    <p className="text-[9px] text-on-surface-variant uppercase tracking-widest">Ber-GPS</p>
                    <p className="text-lg font-headline font-bold text-secondary">{stats.withGPS}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-on-surface-variant uppercase tracking-widest">Tanpa GPS</p>
                    <p className="text-lg font-headline font-bold text-on-surface">{stats.total - stats.withGPS}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stream type card */}
          <div className="bg-surface-container rounded-xl border border-outline-variant/10 overflow-hidden flex-1">
            <div className="px-5 py-4 border-b border-outline-variant/10 flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary" style={{ fontSize: '18px' }}>stream</span>
              <h2 className="font-headline text-xs font-bold tracking-widest text-tertiary uppercase">
                Tipe Stream
              </h2>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: 'iframe / Web Player', count: stats.iframeType, color: '#ffbd5c', icon: 'open_in_browser' },
                { label: 'MP4 / Video Direct', count: stats.videoType, color: '#ff716c', icon: 'movie' },
              ].map(({ label, count, color, icon }) => (
                <div key={label} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color }}>
                      {icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-on-surface">{label}</span>
                      <span className="text-xs font-headline font-bold" style={{ color }}>{count}</span>
                    </div>
                    <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round((count / stats.total) * 100)}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Map section */}
        <section className="col-span-1 md:col-span-2 xl:col-span-12 bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
          <div className="px-5 py-4 border-b border-outline-variant/10 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>map</span>
            <h2 className="font-headline text-xs font-bold tracking-widest text-primary uppercase">
              Peta Persebaran Kamera
            </h2>
            <span className="ml-auto text-[10px] text-on-surface-variant">
              {stats.withGPS} kamera ditampilkan
            </span>
          </div>
          <div className="h-64 md:h-80">
            <AnalyticsMap cameras={channels} />
          </div>
        </section>
      </div>

      {/* ─── Footer ─── */}
      <footer className="mt-10 pt-6 border-t border-outline-variant/10 flex flex-wrap justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant block">SUMBER DATA</span>
            <span className="text-sm font-headline font-bold text-primary">Bali Satu Data · ATCS</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant block">TOTAL UNIT</span>
            <span className="text-sm font-headline font-bold text-on-surface">{stats.total} CCTV</span>
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
