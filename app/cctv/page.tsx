import CCTVPageClient from './CCTVPageClient';
import {
  CCTV_DATA_REVALIDATE_SECONDS,
  getCCTVChannels,
} from '@/data/cctv-api';

export const revalidate = CCTV_DATA_REVALIDATE_SECONDS;

export const metadata = {
  title: 'BALI COMMAND CENTER | CCTV Grid — Bali ATCS',
  description:
    'Live CCTV monitoring grid untuk Area Traffic Control System Bali. 92 kamera aktif dengan streaming real-time, peta interaktif, dan filter per wilayah.',
};

export default async function CCTVPage() {
  try {
    const channels = await getCCTVChannels();

    return (
      <div className="p-4 md:p-5 min-h-[calc(100vh-4rem)]">
        <CCTVPageClient channels={channels} />
      </div>
    );
  } catch {
    return (
      <div className="p-4 md:p-5 min-h-[calc(100vh-4rem)]">
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
