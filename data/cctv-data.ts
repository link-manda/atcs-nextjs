import rawData from '@/data/cctv-bali.json';
import { detectPlayerType, detectRegion } from '@/lib/cctv-utils';
import type { CCTVChannel } from '@/types/cctv';

interface RawEntry {
  cctv_id: number;
  ch_id: string | null;
  ch_name: string;
  lat: number | null;
  lng: number | null;
  streaming_url: string;
}

export const cctvChannels: CCTVChannel[] = (rawData as RawEntry[]).map((item) => ({
  cctv_id: item.cctv_id,
  ch_id: item.ch_id,
  ch_name: item.ch_name,
  lat: item.lat,
  lng: item.lng,
  streaming_url: item.streaming_url,
  player_type: detectPlayerType(item.streaming_url),
  region: detectRegion(item),
}));

export const cctvByRegion = cctvChannels.reduce<Record<string, CCTVChannel[]>>(
  (acc, cam) => {
    if (!acc[cam.region]) acc[cam.region] = [];
    acc[cam.region].push(cam);
    return acc;
  },
  {}
);

export function getCCTVById(id: number): CCTVChannel | undefined {
  return cctvChannels.find((c) => c.cctv_id === id);
}
