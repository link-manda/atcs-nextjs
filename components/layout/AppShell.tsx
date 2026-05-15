'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutGrid, BarChart3, Map as MapIcon, Activity, Radio, Menu } from 'lucide-react';
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
        "flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-[10px] font-bold uppercase tracking-[0.2em]",
        active 
          ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-transparent"
      )}
    >
      <Icon className={cn("w-3.5 h-3.5", active ? "text-primary" : "text-muted-foreground")} />
      {label}
    </Link>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* ─── Top Navigation Bar ─── */}
      <header className="h-16 flex-shrink-0 border-b border-border/50 bg-white/70 backdrop-blur-xl sticky top-0 z-50 px-4 md:px-6">
        <div className="h-full max-w-[1800px] mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-4 md:gap-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded bg-primary/10 border border-primary/30 flex items-center justify-center transition-all group-hover:bg-primary/20 group-hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]">
                <Radio className="w-4 h-4 text-primary animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black tracking-[0.3em] text-foreground leading-none">
                  ATCS_BALI
                </span>
                <span className="text-[8px] font-bold tracking-[0.4em] text-primary/80 uppercase mt-0.5 hidden sm:inline-block">
                  Kinetic Observatory
                </span>
              </div>
            </Link>

            <div className="hidden md:block h-4 w-px bg-border mx-2" />

            {/* Desktop Navigation Menu */}
            <nav className="hidden md:flex items-center gap-1">
              <NavItem 
                href="/" 
                label="Dashboard" 
                icon={MapIcon} 
                active={pathname === '/'} 
              />
              <NavItem 
                href="/cctv" 
                label="Monitoring" 
                icon={LayoutGrid} 
                active={pathname === '/cctv'} 
              />
              <NavItem 
                href="/analytics" 
                label="Analytics" 
                icon={BarChart3} 
                active={pathname === '/analytics'} 
              />
            </nav>
          </div>

          {/* Right Section: Status & Meta */}
          <div className="flex items-center gap-3 md:gap-6">
            <div className="hidden lg:flex flex-col items-end mr-2">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                System Status
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(0,252,64,0.5)] animate-pulse" />
                <span className="text-[10px] font-mono font-bold text-foreground">OPERATIONAL</span>
              </div>
            </div>
            
            <div className="hidden md:block h-8 w-px bg-border" />
            
            <div className="hidden md:flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted/20 border border-border flex items-center justify-center">
                <Activity className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            {/* Mobile Navigation Toggle */}
            <div className="md:hidden flex items-center">
              <Sheet>
                <SheetTrigger asChild>
                  <button className="p-2 -mr-2 bg-transparent text-foreground hover:bg-muted/50 rounded-lg transition-colors">
                    <Menu className="w-5 h-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64 p-0">
                  <div className="p-6 border-b border-border/50 flex items-center gap-3">
                    <Radio className="w-5 h-5 text-primary animate-pulse" />
                    <span className="text-sm font-black tracking-[0.3em] uppercase">ATCS_BALI</span>
                  </div>
                  <nav className="p-4 flex flex-col gap-2">
                    <NavItem href="/" label="Dashboard" icon={MapIcon} active={pathname === '/'} />
                    <NavItem href="/cctv" label="Monitoring" icon={LayoutGrid} active={pathname === '/cctv'} />
                    <NavItem href="/analytics" label="Analytics" icon={BarChart3} active={pathname === '/analytics'} />
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-1 overflow-auto relative isolate">
        {/* Subtle background effects */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(0,227,253,0.03),transparent_50%)]" />
        <div className="absolute inset-0 -z-10 bg-[url('/grid.svg')] opacity-[0.02] [mask-image:radial-gradient(ellipse_at_center,black,transparent)]" />
        
        {children}
      </main>

      {/* ─── Global Footer / Status Bar ─── */}
      <footer className="h-8 flex-shrink-0 border-t border-border/50 bg-white/70 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest">
            v4.2.0-STABLE
          </span>
          <div className="h-3 w-px bg-border" />
          <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest">
            Lat: -8.4095 · Lng: 115.1889 (BALI_CENTER)
          </span>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-[8px] font-bold text-primary uppercase tracking-[0.2em]">
             Command Center Interface
           </span>
        </div>
      </footer>
    </div>
  );
}
