import AnalyticsClient from './AnalyticsClient';
import {
  CCTV_DATA_REVALIDATE_SECONDS,
  getAllCCTVChannels,
} from '@/data/cctv-api';

export const revalidate = CCTV_DATA_REVALIDATE_SECONDS;

export const metadata = {
  title: 'Statistik & Persebaran CCTV ATCS Bali',
  description:
    'Data analitik persebaran kamera pengawas lalu lintas, tipe streaming, dan cakupan wilayah se-Provinsi Bali.',
  alternates: {
    canonical: '/analytics',
  },
};

export default async function AnalyticsPage() {
  try {
    const channels = await getAllCCTVChannels();
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
