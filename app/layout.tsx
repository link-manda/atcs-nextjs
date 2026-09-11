import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { cn } from "@/lib/utils";

import { ThemeProvider } from "@/components/theme/ThemeProvider";

export const metadata: Metadata = {
  title: "BALI COMMAND CENTER | ATCS TRAFFIC OPS",
  description:
    "Area Traffic Control System & Smart CCTV Operations — Provinsi Bali. Real-time multi-camera monitoring, live map telemetry, and AI vision analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={cn("font-sans", GeistSans.variable, GeistMono.variable)}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-400">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
