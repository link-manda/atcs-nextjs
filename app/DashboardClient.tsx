'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo } from 'react';
import type { CCTVChannel } from '@/types/cctv';
import { Video, BarChart3, ArrowRight, MapPin, Radio, Compass, Shield } from 'lucide-react';

const DashboardMap = dynamic(() => import('@/components/dashboard/DashboardMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-zinc-950">
      <div className="text-center">
        <MapPin className="w-6 h-6 text-emerald-400 animate-pulse mx-auto mb-2.5" />
        <p className="text-xs font-mono text-zinc-400 tracking-tight">
          Memuat Peta Spasial Bali...
        </p>
      </div>
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
    <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-5.75rem)] min-h-[calc(100vh-5.75rem)] gap-0 bg-zinc-950">
      {/* ─── Tactical Map ─── */}
      <div className="relative isolate h-[58vh] lg:h-auto lg:flex-1">
        <DashboardMap cameras={channels} />
      </div>

      {/* ─── Linear HUD Sidebar ─── */}
      <aside className="w-full lg:w-80 xl:w-96 bg-zinc-950/95 border-t lg:border-t-0 lg:border-l border-white/[0.08] flex flex-col overflow-hidden backdrop-blur-md">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex-shrink-0 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
              Operasi Spasial
            </span>
            <h2 className="text-xs font-semibold tracking-tight text-zinc-100 mt-0.5">
              Sebaran Titik Pantau Bali
            </h2>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>ONLINE</span>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="p-3.5 grid grid-cols-2 gap-2.5 flex-shrink-0">
          <div className="bg-white/[0.03] rounded-md p-3 border border-white/[0.06]">
            <p className="text-[11px] font-medium text-zinc-400">Total Kamera</p>
            <p className="text-xl font-bold font-mono text-zinc-100 mt-1">
              {stats.total}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">titik terdaftar</p>
          </div>
          <div className="bg-white/[0.03] rounded-md p-3 border border-white/[0.06]">
            <p className="text-[11px] font-medium text-zinc-400">Terpetakan GPS</p>
            <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {stats.withGPS}
            </p>
            <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
              {Math.round((stats.withGPS / (stats.total || 1)) * 100)}% terkalibrasi
            </p>
          </div>
          <div className="bg-white/[0.03] rounded-md p-3 border border-white/[0.06]">
            <p className="text-[11px] font-medium text-zinc-400">Cakupan Wilayah</p>
            <p className="text-xl font-bold font-mono text-zinc-200 mt-1">
              {stats.regionEntries.length}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">kabupaten / kota</p>
          </div>
          <div className="bg-white/[0.03] rounded-md p-3 border border-white/[0.06]">
            <p className="text-[11px] font-medium text-zinc-400">Non-Geotag</p>
            <p className="text-xl font-bold font-mono text-zinc-400 mt-1">
              {stats.total - stats.withGPS}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">kamera sekunder</p>
          </div>
        </div>

        {/* Region Breakdown List */}
        <div className="flex-1 overflow-y-auto px-3.5 pb-3.5 no-scrollbar">
          <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2.5">
            Distribusi per Wilayah
          </p>
          <div className="space-y-2">
            {stats.regionEntries.map(([region, count]) => {
              const pct = Math.round((count / (stats.total || 1)) * 100);
              const color = REGION_COLORS[region] ?? '#38bdf8';
              return (
                <div key={region} className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs text-zinc-200 font-medium">{region}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-zinc-100 font-bold">{count}</span>
                      <span className="text-[10px] text-zinc-400 font-normal">({pct}%)</span>
                    </div>
                  </div>
                  <div className="h-1 w-full bg-white/[0.05] rounded-full overflow-hidden">
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

        {/* Quick Action Navigation */}
        <div className="p-3.5 border-t border-white/[0.06] flex-shrink-0 flex flex-col gap-2 bg-zinc-950/80">
          <Link
            href="/cctv"
            className="flex items-center justify-center gap-2 w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium rounded-md transition-all text-xs shadow-[0_1px_8px_rgba(16,185,129,0.2)] group"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Buka Monitoring Multi-CCTV</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/ai-station"
            className="flex items-center justify-center gap-2 w-full py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-200 font-medium rounded-md transition-colors text-xs"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>Deteksi Arus AI Traffic</span>
          </Link>
        </div>
      </aside>
    </div>
  );
}
