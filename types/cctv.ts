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

export interface CCTVChannel {
  cctv_id: number;
  ch_id: string | null;
  ch_name: string;
  lat: number | null;
  lng: number | null;
  streaming_url: string;
  player_type: PlayerType;
  region: CCTVRegion;
}
