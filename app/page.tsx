import DashboardClient from '@/app/DashboardClient';
import {
  CCTV_DATA_REVALIDATE_SECONDS,
  getAllCCTVChannels,
} from '@/data/cctv-api';

export const revalidate = CCTV_DATA_REVALIDATE_SECONDS;

export const metadata = {
  title: 'BALI COMMAND CENTER | Dashboard — Bali ATCS',
  description:
    'Peta persebaran CCTV dan command center Area Traffic Control System Bali.',
};

export default async function DashboardPage() {
  try {
    const channels = await getAllCCTVChannels();
    return <DashboardClient channels={channels} />;
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
