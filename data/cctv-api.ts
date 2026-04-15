import 'server-only';

import { cache } from 'react';
import { detectPlayerType, detectRegion } from '@/lib/cctv-utils';
import type { CCTVChannel } from '@/types/cctv';

const DEFAULT_CCTV_API_URL = 'https://balisatudata.baliprov.go.id/api/v1/report-cctv';
const CCTV_REVALIDATE_SECONDS = 900;

interface RawCCTVEntry {
  cctv_id?: number | string;
  ch_id?: string | null;
  ch_name?: string;
  lat?: number | string | null;
  lng?: number | string | null;
  streaming_url?: string;
}

interface CCTVApiResponse {
  data?: RawCCTVEntry[] | Record<string, RawCCTVEntry>;
}

function toNullableNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeEntries(rawData: CCTVApiResponse['data']): RawCCTVEntry[] {
  if (!rawData) return [];
  if (Array.isArray(rawData)) return rawData;
  return Object.values(rawData);
}

function mapToChannel(entry: RawCCTVEntry): CCTVChannel {
  const cctvId = Number(entry.cctv_id);
  const chName = (entry.ch_name ?? '').trim();
  const streamingUrl = (entry.streaming_url ?? '').trim();
  const lat = toNullableNumber(entry.lat);
  const lng = toNullableNumber(entry.lng);

  if (!Number.isFinite(cctvId) || cctvId <= 0) {
    throw new Error('Invalid cctv_id in API payload');
  }

  if (!chName || !streamingUrl) {
    throw new Error(`Invalid channel payload for CCTV ${cctvId}`);
  }

  return {
    cctv_id: cctvId,
    ch_id: entry.ch_id ?? null,
    ch_name: chName,
    lat,
    lng,
    streaming_url: streamingUrl,
    player_type: detectPlayerType(streamingUrl),
    region: detectRegion({
      ch_name: chName,
      streaming_url: streamingUrl,
      lat,
      lng,
    }),
  };
}

const loadCCTVChannels = cache(async (): Promise<CCTVChannel[]> => {
  const endpoint = process.env.CCTV_API_URL ?? DEFAULT_CCTV_API_URL;
  const response = await fetch(endpoint, {
    next: { revalidate: CCTV_REVALIDATE_SECONDS },
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`CCTV API request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as CCTVApiResponse;
  const entries = normalizeEntries(payload.data);

  if (!entries.length) {
    throw new Error('CCTV API payload contains no channels');
  }

  return entries.map(mapToChannel);
});

export async function getCCTVChannels(): Promise<CCTVChannel[]> {
  return loadCCTVChannels();
}

export async function getCCTVByRegion(): Promise<Record<string, CCTVChannel[]>> {
  const channels = await getCCTVChannels();
  return channels.reduce<Record<string, CCTVChannel[]>>((acc, cam) => {
    if (!acc[cam.region]) acc[cam.region] = [];
    acc[cam.region].push(cam);
    return acc;
  }, {});
}

export async function getCCTVById(id: number): Promise<CCTVChannel | undefined> {
  const channels = await getCCTVChannels();
  return channels.find((c) => c.cctv_id === id);
}

export const CCTV_DATA_REVALIDATE_SECONDS = CCTV_REVALIDATE_SECONDS;
