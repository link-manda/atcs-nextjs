'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutGrid,
  BarChart3,
  Map as MapIcon,
  Radio,
  Menu,
  Sparkles,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ElementType;
  active?: boolean;
}

function NavItem({ href, label, icon: Icon, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-xs font-medium tracking-tight",
        active
          ? "bg-white/[0.08] text-white border border-white/[0.12] shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent"
      )}
    >
      <Icon
        className={cn(
          "w-3.5 h-3.5 transition-colors",
          active ? "text-emerald-400" : "text-zinc-400"
        )}
      />
      <span>{label}</span>
      {active && (
        <span className="absolute -bottom-px left-3 right-3 h-px bg-gradient-to-r from-emerald-500/0 via-emerald-400 to-emerald-500/0" />
      )}
    </Link>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [timeString, setTimeString] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Makassar',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WITA'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* ─── Top Linear Header ─── */}
      <header className="h-14 flex-shrink-0 border-b border-white/[0.08] bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 px-4 md:px-6">
        <div className="h-full max-w-[1800px] mx-auto flex items-center justify-between">
          {/* Brand Mark */}
          <div className="flex items-center gap-5 md:gap-7">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center transition-all group-hover:bg-emerald-500/20 group-hover:border-emerald-500/50 group-hover:shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold tracking-tight text-zinc-100 uppercase">
                  Bali Command
                </span>
                <span className="text-[10px] font-mono font-medium text-zinc-400 tracking-wider hidden sm:inline-block">
                  ATCS OPS
                </span>
              </div>
            </Link>

            <div className="hidden md:block h-4 w-px bg-white/[0.08]" />

            {/* Desktop Nav Items */}
            <nav className="hidden md:flex items-center gap-1">
              <NavItem
                href="/"
                label="Peta Lalu Lintas"
                icon={MapIcon}
                active={pathname === '/'}
              />
              <NavItem
                href="/cctv"
                label="Pantau CCTV"
                icon={LayoutGrid}
                active={pathname === '/cctv'}
              />
              <NavItem
                href="/ai-station"
                label="Deteksi AI"
                icon={Sparkles}
                active={pathname === '/ai-station'}
              />
              <NavItem
                href="/analytics"
                label="Analisis Data"
                icon={BarChart3}
                active={pathname === '/analytics'}
              />
            </nav>
          </div>

          {/* Status Telemetry */}
          <div className="flex items-center gap-3 md:gap-4">
            {timeString && (
              <span className="hidden lg:inline-block text-[11px] font-mono text-zinc-400 bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded">
                {timeString}
              </span>
            )}

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium tracking-tight">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Sistem Siaga</span>
            </div>

            {/* Mobile Sheet Nav */}
            <div className="md:hidden flex items-center">
              <Sheet>
                <SheetTrigger asChild>
                  <button className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] rounded-md transition-colors">
                    <Menu className="w-4 h-4" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 p-0 bg-zinc-950 border-white/[0.08] text-zinc-100">
                  <div className="p-5 border-b border-white/[0.08] flex items-center gap-3">
                    <div className="w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                      <Radio className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold tracking-tight">Bali Command Center</span>
                      <span className="text-[10px] font-mono text-zinc-400">Area Traffic Control</span>
                    </div>
                  </div>
                  <nav className="p-4 flex flex-col gap-1.5">
                    <NavItem href="/" label="Peta Lalu Lintas" icon={MapIcon} active={pathname === '/'} />
                    <NavItem href="/cctv" label="Pantau CCTV" icon={LayoutGrid} active={pathname === '/cctv'} />
                    <NavItem href="/ai-station" label="Deteksi AI" icon={Sparkles} active={pathname === '/ai-station'} />
                    <NavItem href="/analytics" label="Analisis Data" icon={BarChart3} active={pathname === '/analytics'} />
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-1 overflow-auto relative isolate">
        {children}
      </main>

      {/* ─── Minimal Linear Footer ─── */}
      <footer className="h-9 flex-shrink-0 border-t border-white/[0.06] bg-zinc-950/90 backdrop-blur-md px-6 flex items-center justify-between text-[11px] text-zinc-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-medium text-zinc-300">Dinas Perhubungan Provinsi Bali</span>
          <span className="hidden sm:inline text-zinc-400">•</span>
          <span className="hidden sm:inline text-zinc-400">Sistem Kendali Lalu Lintas Terpadu</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-400">
          <Activity className="w-3 h-3 text-emerald-400" />
          <span>Real-time Telemetry</span>
        </div>
      </footer>
    </div>
  );
}
