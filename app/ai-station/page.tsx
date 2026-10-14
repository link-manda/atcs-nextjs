import { getAllCCTVChannels, CCTV_DATA_REVALIDATE_SECONDS } from "@/data/cctv-api";
import { AIStationClient } from "./AIStationClient";

export const revalidate = CCTV_DATA_REVALIDATE_SECONDS;

export const metadata = {
  title: 'AI Traffic Station — Deteksi Kendaraan Bali',
  description:
    'Analisis kecerdasan buatan computer vision untuk deteksi dan tracking kepadatan arus kendaraan CCTV Bali secara langsung di browser.',
  alternates: {
    canonical: '/ai-station',
  },
};

export default async function AIStationPage() {
  const channels = await getAllCCTVChannels();

  return <AIStationClient channels={channels} />;
}
