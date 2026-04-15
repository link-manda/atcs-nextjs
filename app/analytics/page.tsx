import AnalyticsClient from './AnalyticsClient';
import {
  CCTV_DATA_REVALIDATE_SECONDS,
  getCCTVChannels,
} from '@/data/cctv-api';

export const revalidate = CCTV_DATA_REVALIDATE_SECONDS;

export const metadata = {
  title: 'BALI COMMAND CENTER | Analytics — Bali ATCS',
  description:
    'Analitik data kamera CCTV Bali: distribusi wilayah, coverage GPS, tipe stream, dan peta persebaran.',
};

export default async function AnalyticsPage() {
  try {
    const channels = await getCCTVChannels();
    return <AnalyticsClient channels={channels} />;
  } catch {
    return (
      <div className="px-4 md:px-8 py-6">
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
