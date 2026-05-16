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
  let streamingUrl = (entry.streaming_url ?? '').trim();
  const lat = toNullableNumber(entry.lat);
  const lng = toNullableNumber(entry.lng);

  if (!Number.isFinite(cctvId) || cctvId <= 0) {
    throw new Error('Invalid cctv_id in API payload');
  }

  if (!chName || !streamingUrl) {
    throw new Error(`Invalid channel payload for CCTV ${cctvId}`);
  }

  // Rewrite Shinobi Buleleng MP4 pseudo-stream to native Shinobi iframe embed to fix AbortError / 504 timeouts
  // Pattern matches: [protocol]//[domain]/[token]/mp4/[group]/[monitor]/s.mp4
  const shinobiRegex = /^(https?:\/\/shinobi\.bulelengkab\.go\.id\/[^\/]+)\/mp4\/([^\/]+\/[^\/]+)\/s\.mp4$/i;
  const match = streamingUrl.match(shinobiRegex);
  if (match) {
    // Encode pipes as %7C to avoid confusing browser URL parsers in some environments (like Firefox)
    // which can lead to malformed window.location.origin inside the iframe.
    const embedUrl = `${match[1]}/embed/${match[2]}/fullscreen%7Cjquery%7Chd`;
    // Route through our proxy to inject socket.io fix for their duplicate URL bug
    streamingUrl = `/api/proxy/shinobi?url=${encodeURIComponent(embedUrl)}`;
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

const loadDenpasarCCTVChannels = cache(async (): Promise<CCTVChannel[]> => {
  const DENPASAR_API_URL = 'https://atcs.denpasarkota.go.id/api/v3/pv/ldevice';
  try {
    const response = await fetch(DENPASAR_API_URL, {
      next: { revalidate: CCTV_REVALIDATE_SECONDS },
      headers: {
        Accept: 'application/json',
        'x-client-id': 'a194e6ae-d4dd-4b62-a0ac-388922f09303',
        'x-client-secret': 'f430fde38a031fb657a2a7d6f84644a9aed767a4c22314d4b7c565648acc2396',
      },
    });

    if (!response.ok) return [];

    const result = await response.json();
    const channels: CCTVChannel[] = [];

    if (result && result.data && Array.isArray(result.data)) {
      result.data.forEach((lokasi: any) => {
        if (lokasi.tb_device_lokasi && Array.isArray(lokasi.tb_device_lokasi)) {
          lokasi.tb_device_lokasi.forEach((cam: any, idx: number) => {
            channels.push({
              cctv_id: parseInt(`999${lokasi.id_lokasi}${idx}`),
              ch_id: `DPS-${lokasi.id_lokasi}-${idx}`,
              ch_name: cam.nama_alias || cam.nama || 'Denpasar CCTV',
              lat: toNullableNumber(lokasi.lat_lokasi),
              lng: toNullableNumber(lokasi.lon_lokasi),
              streaming_url: (cam.url_proxy_hls || '').trim(),
              player_type: 'iframe',
              region: 'Denpasar',
            });
          });
        }
      });
    }

    return channels;
  } catch (error) {
    console.error('Failed to load Denpasar CCTV:', error);
    return [];
  }
});

export async function getDenpasarCCTVs(): Promise<CCTVChannel[]> {
  return loadDenpasarCCTVChannels();
}

export async function getAllCCTVChannels(): Promise<CCTVChannel[]> {
  const [provincial, denpasar] = await Promise.all([
    getCCTVChannels().catch(() => [] as CCTVChannel[]),
    getDenpasarCCTVs()
  ]);
  
  // We no longer blindly filter out all provincial Denpasar cameras 
  // because the provincial API contains unique cameras (e.g. Padang Galak)
  // that the Denpasar API does not have.
  return [...provincial, ...denpasar];
}

export async function getCCTVByRegion(): Promise<Record<string, CCTVChannel[]>> {
  const channels = await getAllCCTVChannels();
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
