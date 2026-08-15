import { getAllCCTVChannels, CCTV_DATA_REVALIDATE_SECONDS } from "@/data/cctv-api";
import { AIStationClient } from "./AIStationClient";

export const revalidate = CCTV_DATA_REVALIDATE_SECONDS;

export const metadata = {
  title: "AI Traffic Vision Station — Bali Command Center",
  description: "Real-time YOLOv12 + ByteTrack Multi-Object Vehicle Tracking & Traffic Flow Intelligence for Bali ATCS",
};

export default async function AIStationPage() {
  const channels = await getAllCCTVChannels();

  return <AIStationClient channels={channels} />;
}
