import AnalyticsClient from './AnalyticsClient';
import { cctvChannels } from '@/data/cctv-data';

export const metadata = {
  title: 'KINETIC OBSERVATORY | Analytics — Bali ATCS',
  description:
    'Analitik data kamera CCTV Bali: distribusi wilayah, coverage GPS, tipe stream, dan peta persebaran.',
};

export default function AnalyticsPage() {
  return <AnalyticsClient channels={cctvChannels} />;
}
