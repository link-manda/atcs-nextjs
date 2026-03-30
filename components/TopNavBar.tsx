'use client';

import { useSidebar } from '@/components/layout/SidebarContext';

export default function TopNavBar() {
  const { toggleMobile } = useSidebar();

  return (
    <header className="fixed top-0 left-0 right-0 z-[1001] bg-surface-container-low/90 backdrop-blur-xl border-b border-outline-variant/20 h-16">
      <div className="flex items-center h-full px-4 gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={toggleMobile}
          className="flex md:hidden items-center justify-center w-9 h-9 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors flex-shrink-0"
          aria-label="Buka menu"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>menu</span>
        </button>

        {/* Logo */}
        <span className="font-headline font-bold text-primary uppercase tracking-tight text-sm sm:text-base flex-shrink-0">
          KINETIC_OBSERVATORY
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* System Status — desktop only */}
        <div className="hidden lg:flex items-center gap-4 bg-surface-container-lowest/40 px-4 py-1.5 rounded-lg border border-outline-variant/10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-headline text-on-surface-variant uppercase tracking-widest">CPU</span>
            <div className="w-12 h-1 bg-surface-container-highest rounded-full overflow-hidden">
              <div className="bg-primary h-full w-[42%]" />
            </div>
          </div>
          <div className="w-px h-4 bg-outline-variant/20" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-headline text-on-surface-variant uppercase tracking-widest">NET</span>
            <span className="text-[10px] font-headline text-secondary">STABLE</span>
          </div>
          <div className="w-px h-4 bg-outline-variant/20" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-headline text-on-surface-variant uppercase tracking-widest">CAMS</span>
            <span className="text-[10px] font-headline text-primary">92 ONLINE</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            className="p-2 text-on-surface-variant hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container-high active:scale-90"
            aria-label="Notifikasi"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              notifications
            </span>
          </button>
          <button
            className="p-2 text-on-surface-variant hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container-high active:scale-90"
            aria-label="Pengaturan"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              settings
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
