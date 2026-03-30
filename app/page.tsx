import DashboardClient from '@/app/DashboardClient';
import { cctvChannels } from '@/data/cctv-data';

export const metadata = {
  title: 'BALI COMMAND CENTER | Dashboard — Bali ATCS',
  description:
    'Peta persebaran CCTV dan command center Area Traffic Control System Bali.',
};

export default function DashboardPage() {
  return <DashboardClient channels={cctvChannels} />;
}
