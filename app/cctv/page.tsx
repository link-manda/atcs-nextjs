import CCTVPageClient from './CCTVPageClient';
import {
  CCTV_DATA_REVALIDATE_SECONDS,
  getAllCCTVChannels,
} from '@/data/cctv-api';

export const revalidate = CCTV_DATA_REVALIDATE_SECONDS;

export const metadata = {
  title: 'Pantau CCTV Jalan & Antrean SPBU Bali Live',
  description:
    'Streaming langsung 90+ kamera CCTV lalu lintas persimpangan dan titik pantau SPBU di Denpasar, Badung, dan wilayah Bali secara real-time.',
  alternates: {
    canonical: '/cctv',
  },
};

export default async function CCTVPage() {
  try {
    const channels = await getAllCCTVChannels();

    return (
      <div className="h-[calc(100vh-5.75rem)] overflow-hidden">
        <CCTVPageClient channels={channels} />
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
