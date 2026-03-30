'use client';

import { ReactNode } from 'react';
import { SidebarProvider, useSidebar } from './SidebarContext';
import TopNavBar from '@/components/TopNavBar';
import SideNavBar from '@/components/SideNavBar';

function MobileBackdrop() {
  const { isMobileOpen, closeMobile } = useSidebar();
  if (!isMobileOpen) return null;
  return (
    <div
      className="fixed inset-0 bg-black/60 z-[999] md:hidden"
      onClick={closeMobile}
      aria-hidden="true"
    />
  );
}

function ShellLayout({ children }: { children: ReactNode }) {
  const { isCollapsed } = useSidebar();
  return (
    <>
      <TopNavBar />
      <SideNavBar />
      <MobileBackdrop />
      <main
        className={`pt-16 min-h-screen transition-[margin] duration-300 ml-0 ${
          isCollapsed ? 'md:ml-14' : 'md:ml-64'
        }`}
      >
        {children}
      </main>
    </>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <ShellLayout>{children}</ShellLayout>
    </SidebarProvider>
  );
}
