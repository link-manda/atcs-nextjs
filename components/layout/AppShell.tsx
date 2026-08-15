'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutGrid, BarChart3, Map as MapIcon, Radio, Menu, Sparkles, ShieldCheck } from 'lucide-react';
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
        "flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all text-xs font-semibold font-headline",
        active 
          ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
      )}
    >
      <Icon className={cn("w-4 h-4", active ? "text-primary" : "text-muted-foreground")} />
      <span>{label}</span>
    </Link>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* ─── Top Navigation Bar ─── */}
      <header className="h-16 flex-shrink-0 border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50 px-4 md:px-6 shadow-sm">
        <div className="h-full max-w-[1800px] mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-4 md:gap-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center transition-all group-hover:bg-primary/20 group-hover:shadow-[0_0_12px_rgba(0,227,253,0.3)]">
                <Radio className="w-4 h-4 text-primary animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black font-headline tracking-wide text-foreground leading-none">
                  Pantau Bali
                </span>
                <span className="text-[10px] font-medium text-muted-foreground mt-1 hidden sm:inline-block">
                  Lalu Lintas & CCTV Live
                </span>
              </div>
            </Link>

            <div className="hidden md:block h-5 w-px bg-border mx-1" />

            {/* Desktop Navigation Menu */}
            <nav className="hidden md:flex items-center gap-1.5">
              <NavItem 
                href="/" 
                label="Peta Lalu Lintas" 
                icon={MapIcon} 
                active={pathname === '/'} 
              />
              <NavItem 
                href="/cctv" 
                label="CCTV Live" 
                icon={LayoutGrid} 
                active={pathname === '/cctv'} 
              />
              <NavItem 
                href="/ai-station" 
                label="Pantau Cerdas AI" 
                icon={Sparkles} 
                active={pathname === '/ai-station'} 
              />
              <NavItem 
                href="/analytics" 
                label="Analisis Jalan" 
                icon={BarChart3} 
                active={pathname === '/analytics'} 
              />
            </nav>
          </div>

          {/* Right Section: Status & Meta */}
          <div className="flex items-center gap-3 md:gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold font-headline">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sistem Aktif Normal</span>
            </div>

            {/* Mobile Navigation Toggle */}
            <div className="md:hidden flex items-center">
              <Sheet>
                <SheetTrigger asChild>
                  <button className="p-2 -mr-2 bg-transparent text-foreground hover:bg-muted rounded-lg transition-colors">
                    <Menu className="w-5 h-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 p-0">
                  <div className="p-5 border-b border-border flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                      <Radio className="w-4 h-4 text-primary animate-pulse" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-black font-headline">Pantau Bali</span>
                      <span className="text-[10px] text-muted-foreground">Lalu Lintas & CCTV Live</span>
                    </div>
                  </div>
                  <nav className="p-4 flex flex-col gap-2">
                    <NavItem href="/" label="Peta Lalu Lintas" icon={MapIcon} active={pathname === '/'} />
                    <NavItem href="/cctv" label="CCTV Live" icon={LayoutGrid} active={pathname === '/cctv'} />
                    <NavItem href="/ai-station" label="Pantau Cerdas AI" icon={Sparkles} active={pathname === '/ai-station'} />
                    <NavItem href="/analytics" label="Analisis Jalan" icon={BarChart3} active={pathname === '/analytics'} />
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

      {/* ─── Global Footer ─── */}
      <footer className="h-10 flex-shrink-0 border-t border-border bg-card/60 backdrop-blur-md px-6 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span className="font-semibold text-foreground/80">Dinas Perhubungan Provinsi Bali</span>
          <span className="hidden sm:inline text-muted-foreground/60">•</span>
          <span className="hidden sm:inline text-muted-foreground">Sistem Informasi Pantauan Lalu Lintas Terbuka</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Real-time ATCS</span>
        </div>
      </footer>
    </div>
  );
}
