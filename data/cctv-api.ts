import 'server-only';

import { cache } from 'react';
import { detectPlayerType, detectRegion } from '@/lib/cctv-utils';
import type { CCTVChannel, CCTVRegion } from '@/types/cctv';

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

  // Rewrite Bali Satu Data transcode iframe wrapper to proxied native HLS m3u8
  const transcodeMatch = streamingUrl.match(/transcode\.baliprov\.go\.id\/cctv-player\.html\?id=([^&]+)/i);
  if (transcodeMatch) {
    const camId = transcodeMatch[1];
    const m3u8Url = `https://transcode.baliprov.go.id/cctv/${camId}/index.m3u8`;
    streamingUrl = `/api/proxy/hls?url=${encodeURIComponent(m3u8Url)}`;
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

  return entries
    .map(mapToChannel)
    .filter((c) => !c.streaming_url.includes('shinobi.bulelengkab.go.id') && c.region !== 'Buleleng');
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) return [];

    const result = await response.json();
    const channels: CCTVChannel[] = [];

    if (result && result.data && Array.isArray(result.data)) {
      result.data.forEach((lokasi: any) => {
        if (lokasi.tb_device_lokasi && Array.isArray(lokasi.tb_device_lokasi)) {
          lokasi.tb_device_lokasi.forEach((cam: any, idx: number) => {
            const rawUrl = (cam.url_proxy_hls || '').trim().replace(/\/+$/, '');
            const m3u8Url = rawUrl ? `${rawUrl}/index.m3u8` : '';
            const proxiedUrl = m3u8Url ? `/api/proxy/hls?url=${encodeURIComponent(m3u8Url)}` : (cam.url_proxy_hls || '').trim();

            channels.push({
              cctv_id: parseInt(`999${lokasi.id_lokasi}${idx}`),
              ch_id: `DPS-${lokasi.id_lokasi}-${idx}`,
              ch_name: cam.nama_alias || cam.nama || 'Denpasar CCTV',
              lat: toNullableNumber(lokasi.lat_lokasi),
              lng: toNullableNumber(lokasi.lon_lokasi),
              streaming_url: proxiedUrl,
              player_type: 'video',
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

const BULELENG_MONITOR_METADATA: Record<string, { name: string; lat: number; lng: number }> = {
  lkRSReT3h580: { name: 'Taman Bung Karno (TBK)', lat: -8.1188, lng: 115.1052 },
  qQxLmg544p80: { name: 'Taman Kota Singaraja', lat: -8.1147, lng: 115.0881 },
  edROyIUx2v80: { name: 'Simpang Seririt', lat: -8.1963, lng: 114.9332 },
  '8HbHNfGypg80': { name: 'Simpang Penarukan', lat: -8.1118, lng: 115.1114 },
  J7gwj3VUE280: { name: 'Pertigaan Penarukan', lat: -8.1125, lng: 115.1130 },
  MVXokBuNsO80: { name: 'Simpang Penarungan', lat: -8.1210, lng: 115.1080 },
  isOvCBwVIA80: { name: 'Taman Yuwana Asri', lat: -8.1235, lng: 115.0920 },
  '44Z85N153j80': { name: 'Pasar Anyar Singaraja', lat: -8.1119, lng: 115.0911 },
  jRuL9udZUp80: { name: 'Simpang Udayana', lat: -8.1252, lng: 115.0827 },
  VmqTvLw4ki80: { name: 'Simpang Diponegoro', lat: -8.1145, lng: 115.0935 },
  '0RRzM22qNF80': { name: 'PTZ Gedung Kesenian Gde Manik', lat: -8.1158, lng: 115.0890 },
  d4LXaKRi2380: { name: 'Barat Tugu Singa Ambara Raja', lat: -8.1165, lng: 115.0885 },
  XB9YtCug4880: { name: 'Simpang Yudistira', lat: -8.1205, lng: 115.0910 },
  hw5JUl3wFQ: { name: 'Matasinga Singaraja', lat: -8.1170, lng: 115.0900 },
  qhxKZHlnKs80: { name: 'Ruas Jalan Singaraja', lat: -8.1190, lng: 115.0950 },
};

interface BulelengMonitor {
  mid: string;
  name: string;
  mode: string;
  status?: string;
}

const loadBulelengCCTVChannels = cache(async (): Promise<CCTVChannel[]> => {
  const BULELENG_API_KEY = 'Amk60KFacq87lQMvTCMHu17u00ONuC';
  const BULELENG_GROUP = 'admin';
  const BULELENG_API_URL = `https://shinobi.bulelengkab.go.id/${BULELENG_API_KEY}/monitor/${BULELENG_GROUP}`;

  try {
    const response = await fetch(BULELENG_API_URL, {
      next: { revalidate: CCTV_REVALIDATE_SECONDS },
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:150.0) Gecko/20100101 Firefox/150.0',
      },
    });

    if (!response.ok) return [];

    const data = (await response.json()) as BulelengMonitor[];
    if (!Array.isArray(data)) return [];

    return data.map((monitor, idx) => {
      const mid = monitor.mid;
      const meta = BULELENG_MONITOR_METADATA[mid];
      const chName = meta?.name || monitor.name || `Buleleng CCTV ${mid}`;
      const lat = meta?.lat ?? -8.112;
      const lng = meta?.lng ?? 115.088;

      // Direct native s.mp4 stream enables native video decoding & AI detection compatibility
      const mp4Url = `https://shinobi.bulelengkab.go.id/${BULELENG_API_KEY}/mp4/${BULELENG_GROUP}/${mid}/s.mp4`;

      // Generate consistent numeric ID for Buleleng (888 + index)
      const cctvId = parseInt(`888${idx.toString().padStart(2, '0')}`);

      return {
        cctv_id: cctvId,
        ch_id: `BLL-${mid}`,
        ch_name: chName,
        lat,
        lng,
        streaming_url: mp4Url,
        player_type: 'video',
        region: 'Buleleng' as CCTVRegion,
        is_online: monitor.mode !== 'stop',
      };
    });
  } catch (error) {
    console.error('Failed to load Buleleng CCTV:', error);
    return [];
  }
});

export async function getBulelengCCTVs(): Promise<CCTVChannel[]> {
  return loadBulelengCCTVChannels();
}

export async function getDenpasarCCTVs(): Promise<CCTVChannel[]> {
  return loadDenpasarCCTVChannels();
}

export async function getAllCCTVChannels(): Promise<CCTVChannel[]> {
  const [provincial, denpasar, buleleng] = await Promise.all([
    getCCTVChannels().catch(() => [] as CCTVChannel[]),
    getDenpasarCCTVs().catch(() => [] as CCTVChannel[]),
    getBulelengCCTVs().catch(() => [] as CCTVChannel[]),
  ]);
  
  return [...provincial, ...denpasar, ...buleleng];
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
  const channels = await getAllCCTVChannels();
  return channels.find((c) => c.cctv_id === id);
}

export const CCTV_DATA_REVALIDATE_SECONDS = CCTV_REVALIDATE_SECONDS;
