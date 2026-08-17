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
  jRuL9udZUp80: { name: 'Simpang Udayana', lat: -8.1148627, lng: 115.0910133 },
  '3JFbU8gu4j80': { name: 'Catus Pata', lat: -8.124527, lng: 115.096989 },
  '0RRzM22qNF80': { name: 'PTZ Laksmigraha', lat: -8.124449, lng: 115.09272 },
  d4LXaKRi2380: { name: 'Barat Tugu Singa', lat: -8.12486, lng: 115.092519 },
  VmqTvLw4ki80: { name: 'Simpang Ponogoro', lat: -8.109503, lng: 115.089716 },
  '44Z85N153j80': { name: 'Pasar Anyar', lat: -8.107835, lng: 115.088853 },
  '1eB6RDETQG80': { name: 'Pasar Anyar 2', lat: -8.108402, lng: 115.089164 },
  isOvCBwVIA80: { name: 'Yuwana Asri', lat: -8.115619, lng: 115.07944 },
  XB9YtCug4880: { name: 'Yudistira', lat: -8.119656, lng: 115.093449 },
  lkRSReT3h580: { name: 'CCTV Taman Bungkarno (TBK)', lat: -8.134957, lng: 115.100849 },
  qQxLmg544p80: { name: 'CCTV Taman Kota', lat: -8.11703, lng: 115.090968 },
  '8HbHNfGypg80': { name: 'CCTV Simpang Penarukan', lat: -8.093357, lng: 115.116053 },
  edROyIUx2v80: { name: 'CCTV Simpang Seririt', lat: -8.19305, lng: 114.933679 },
  hw5JUl3wFQ: { name: 'CCTV Simpang Pantai Penimbangan', lat: -8.125135, lng: 115.068071 },
  qhxKZHlnKs80: { name: 'TBK Taman Bermain', lat: -8.134373, lng: 115.099321 },
  J7gwj3VUE280: { name: 'Pertigaan Penarukan', lat: -8.102778, lng: 115.120243 },
  MVXokBuNsO80: { name: 'Simpang Penarungan', lat: -8.111461, lng: 115.110933 },
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

      // Official Buleleng Satu Data stream structure: Direct s.mp4 rendered inside iframe
      const streamUrl = `https://shinobi.bulelengkab.go.id/${BULELENG_API_KEY}/mp4/${BULELENG_GROUP}/${mid}/s.mp4`;

      // Generate consistent numeric ID for Buleleng (888 + index)
      const cctvId = parseInt(`888${idx.toString().padStart(2, '0')}`);

      return {
        cctv_id: cctvId,
        ch_id: `BLL-${mid}`,
        ch_name: chName,
        lat,
        lng,
        streaming_url: streamUrl,
        player_type: 'iframe',
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
