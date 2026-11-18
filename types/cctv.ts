export type PlayerType = 'iframe' | 'video';

export type CCTVRegion =
  | 'Badung'
  | 'Badung Selatan'
  | 'Denpasar'
  | 'Gianyar'
  | 'Klungkung'
  | 'Karangasem'
  | 'Buleleng'
  | 'Jembrana'
  | 'Tabanan'
  | 'Bangli'
  | 'Lainnya';

/**
 * Kondisi sebuah sumber data CCTV.
 * - `ok`          : sumber membalas normal dan mengirim kanal.
 * - `maintenance` : sumber mengalihkan seluruh trafik ke halaman pemeliharaan.
 * - `blocked`     : permintaan ditolak WAF di depan sumber (kode nonstandar).
 * - `unavailable` : gangguan lain (koneksi gagal, HTTP error, payload kosong).
 */
export type CCTVSourceStatus = 'ok' | 'maintenance' | 'blocked' | 'unavailable';

export interface CCTVSourceHealth {
  id: 'provinsi' | 'denpasar' | 'buleleng';
  label: string;
  status: CCTVSourceStatus;
  channelCount: number;
  detail?: string;
}

export interface CCTVChannel {
  cctv_id: number;
  ch_id: string | null;
  ch_name: string;
  lat: number | null;
  lng: number | null;
  streaming_url: string;
  player_type: PlayerType;
  region: CCTVRegion;
  is_online?: boolean;
}
