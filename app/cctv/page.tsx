import CCTVPageClient from './CCTVPageClient';
import SourceStatusBanner from '@/components/cctv/SourceStatusBanner';
import {
  CCTV_DATA_REVALIDATE_SECONDS,
  getAllCCTVChannels,
  getCCTVSourceHealth,
} from '@/data/cctv-api';

export const revalidate = CCTV_DATA_REVALIDATE_SECONDS;

export const metadata = {
  title: 'Pantau CCTV Jalan & Lalu Lintas Bali Live',
  description:
    'Streaming langsung 90+ kamera CCTV lalu lintas persimpangan di Denpasar, Badung, dan wilayah Bali secara real-time.',
  alternates: {
    canonical: '/cctv',
  },
};

export default async function CCTVPage() {
  try {
    const [channels, health] = await Promise.all([
      getAllCCTVChannels(),
      getCCTVSourceHealth(),
    ]);
    const hasDegradedSource = health.some((source) => source.status !== 'ok');

    return (
      <div className="h-[calc(100vh-5.75rem)] overflow-hidden flex flex-col">
        {hasDegradedSource && (
          <div className="flex-shrink-0 px-3 md:px-4 pt-3 md:pt-4">
            <SourceStatusBanner health={health} />
          </div>
        )}
        <div className="flex-1 min-h-0">
          <CCTVPageClient channels={channels} />
        </div>
      </div>
    );
  } catch {
    return (
      <div className="p-4 md:p-5 min-h-[calc(100vh-5.75rem)]">
        <div className="rounded-xl border border-error/30 bg-error/10 p-5 text-error">
          <h2 className="font-headline text-sm font-bold uppercase tracking-widest">
            Gagal Memuat Data CCTV
          </h2>
          <p className="mt-2 text-sm text-on-surface">
            Data CCTV sementara tidak tersedia dari API. Silakan coba beberapa saat lagi.
          </p>
        </div>
      </div>
    );
  }
}
