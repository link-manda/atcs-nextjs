import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { cn } from "@/lib/utils";

import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { JsonLd } from "@/components/seo/JsonLd";

const baseUrl = "https://atcs.andhira-tech.my.id";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "CCTV Bali Live — Pantau Macet & Antrean SPBU Real-Time | ATCS Bali",
    template: "%s | CCTV ATCS Bali",
  },
  description:
    "Pantau siaran langsung kamera CCTV ATCS se-Bali, cek antrean SPBU, dan kondisi kemacetan lalu lintas real-time di Denpasar, Badung, Buleleng, dan sekitarnya.",
  keywords: [
    "CCTV Bali",
    "CCTV Bali Live",
    "ATCS Denpasar",
    "ATCS Bali",
    "Pantau Antrean SPBU Bali",
    "CCTV SPBU Bali",
    "Macet Bali Live",
    "Kamera Lalu Lintas Bali",
    "CCTV Jalan Raya Bali",
    "Bali Command Center",
  ],
  authors: [{ name: "Bali Command Center / Andhira Tech" }],
  creator: "Andhira Tech",
  publisher: "Bali Command Center",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: baseUrl,
    siteName: "Bali Command Center — ATCS CCTV Live",
    title: "CCTV Bali Live — Pantau Macet & Antrean SPBU Real-Time",
    description:
      "Akses 90+ siaran langsung kamera CCTV ATCS Bali, peta interaktif kepadatan lalu lintas, dan pemantau antrean SPBU se-Bali secara gratis dan cepat.",
  },
  twitter: {
    card: "summary_large_image",
    title: "CCTV Bali Live — Pantau Macet & Antrean SPBU Real-Time",
    description:
      "Akses 90+ siaran langsung kamera CCTV ATCS Bali, peta interaktif kepadatan lalu lintas, dan pemantau antrean SPBU se-Bali.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google:
      process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
      "YuSIPB6zDAne34YWMOpEe6DpprlXYcrT2EKIkcvYei8",
  },
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
      <head>
        <JsonLd />
      </head>
      <body className="bg-background text-foreground font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-400">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
