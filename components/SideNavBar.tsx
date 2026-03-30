'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/components/layout/SidebarContext';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/',          label: 'Dashboard',  icon: 'dashboard' },
  { href: '/cctv',      label: 'CCTV Grid',  icon: 'videocam'  },
  { href: '/analytics', label: 'Analytics',  icon: 'insights'  },
];

export default function SideNavBar() {
  const pathname = usePathname();
  const { isCollapsed, isMobileOpen, toggle, closeMobile } = useSidebar();

  return (
    <aside
      className={[
        'fixed top-0 left-0 h-full z-[1000] flex flex-col',
        'bg-surface-container-low border-r border-outline-variant/20',
        'transition-[transform,width] duration-300 ease-in-out',
        isCollapsed ? 'md:w-14' : 'md:w-64',
        'w-64',
        isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      ].join(' ')}
    >
      {/* ─── Header ─── */}
      <div
        className={[
          'flex items-center h-16 border-b border-outline-variant/20 flex-shrink-0 px-3 gap-2',
        ].join(' ')}
      >
        {/* Brand */}
        <div className={`flex-1 min-w-0 transition-all duration-200 overflow-hidden ${isCollapsed ? 'md:hidden' : ''}`}>
          <p className="text-[11px] font-headline font-bold text-primary uppercase tracking-widest truncate">
            ATCS_COMMAND
          </p>
          <p className="text-[9px] text-on-surface-variant truncate mt-0.5">
            Bali Province · Active
          </p>
        </div>

        {/* Close button — mobile only (desktop collapse is in nav section below TopNavBar) */}
        <button
          onClick={closeMobile}
          className="flex md:hidden items-center justify-center w-8 h-8 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors flex-shrink-0"
          aria-label="Tutup sidebar"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
        </button>
      </div>

      {/* ─── Navigation ─── */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden no-scrollbar">
        {/* Collapse toggle — desktop only, in nav area (below TopNavBar so it's clickable) */}
        <button
          onClick={toggle}
          className={[
            'hidden md:flex items-center w-full px-3 py-2 mb-2 rounded-lg',
            'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors',
            isCollapsed ? 'justify-center' : 'justify-between',
          ].join(' ')}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {!isCollapsed && (
            <span className="text-[9px] font-headline text-on-surface-variant/40 uppercase tracking-[0.2em]">
              Menu
            </span>
          )}
          <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '18px' }}>
            {isCollapsed ? 'menu_open' : 'chevron_left'}
          </span>
        </button>
        <ul className="space-y-0.5 px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={closeMobile}
                  className={[
                    'flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all group relative',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
                  ].join(' ')}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span
                    className="material-symbols-outlined flex-shrink-0"
                    style={{
                      fontSize: '20px',
                      fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                    }}
                  >
                    {item.icon}
                  </span>

                  {/* Label — hidden when collapsed on desktop */}
                  <span
                    className={[
                      'text-xs font-headline font-bold uppercase tracking-widest truncate',
                      isCollapsed ? 'md:hidden' : '',
                    ].join(' ')}
                  >
                    {item.label}
                  </span>

                  {/* Active indicator */}
                  {isActive && (
                    <span className="ml-auto w-1 h-1 rounded-full bg-primary flex-shrink-0 hidden md:block" />
                  )}

                  {/* Tooltip when collapsed (desktop only) */}
                  <span
                    className={[
                      'absolute left-full ml-2 px-2.5 py-1.5 rounded-lg z-50',
                      'bg-surface-container-highest text-on-surface text-xs font-headline uppercase tracking-wider',
                      'whitespace-nowrap pointer-events-none shadow-xl border border-outline-variant/20',
                      'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
                      isCollapsed ? 'hidden md:block' : 'hidden',
                    ].join(' ')}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ─── Footer ─── */}
      <div className={`border-t border-outline-variant/20 p-3 flex-shrink-0`}>
        <div className={`flex items-center gap-2 ${isCollapsed ? 'md:justify-center' : ''}`}>
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse flex-shrink-0" />
          <span
            className={[
              'text-[9px] font-headline text-on-surface-variant uppercase tracking-wider',
              isCollapsed ? 'md:hidden' : '',
            ].join(' ')}
          >
            Sistem Aktif
          </span>
        </div>
      </div>
    </aside>
  );
}
