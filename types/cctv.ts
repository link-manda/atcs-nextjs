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

export interface NearbySPBU {
  id: string | number;
  name: string;
  operator?: string;
  distance_meters: number;
  is_panoramic_recommended?: boolean;
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
  nearby_spbu?: NearbySPBU;
}
