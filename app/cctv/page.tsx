import CCTVPageClient from './CCTVPageClient';
import { cctvChannels } from '@/data/cctv-data';

export const metadata = {
  title: 'KINETIC OBSERVATORY | CCTV Grid — Bali ATCS',
  description:
    'Live CCTV monitoring grid untuk Area Traffic Control System Bali. 92 kamera aktif dengan streaming real-time, peta interaktif, dan filter per wilayah.',
};

export default function CCTVPage() {
  return (
    <div className="p-4 md:p-5 min-h-[calc(100vh-4rem)]">
      <CCTVPageClient channels={cctvChannels} />
    </div>
  );
}
