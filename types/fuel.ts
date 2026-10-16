export type FuelType = 'pertalite' | 'pertamax' | 'solar';

export type FuelAvailability = 'available' | 'empty' | 'unknown';

export type QueueLevel = 'none' | 'short' | 'medium' | 'long' | 'unknown';

export interface SingleFuelStatus {
  available: FuelAvailability;
  updated_at: number; // Unix timestamp in seconds
}

export interface StationFuelStatus {
  station_id: number; // Bali Fuel Watch station ID (1-181)
  spbu_id?: string; // OSM SPBU ID in data/bali-spbu.json (if mapped)
  pertalite?: SingleFuelStatus;
  pertamax?: SingleFuelStatus;
  solar?: SingleFuelStatus;
  queue?: QueueLevel;
  last_updated?: number; // Unix timestamp in seconds
}

export type FuelStatusMap = Record<number, StationFuelStatus>; // Keyed by BFW station_id

export interface SPBUToBFWMapping {
  spbu_id: string; // OSM node/way ID e.g. "node/123456"
  bfw_station_id: number;
  distance_meters: number;
  name: string;
}
