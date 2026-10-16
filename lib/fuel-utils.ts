import {
  FuelType,
  FuelAvailability,
  QueueLevel,
  StationFuelStatus,
  FuelStatusMap,
} from '@/types/fuel';

/**
 * Raw report tuple format from Bali Fuel Watch:
 * [id, station_id, fuel_idx, available, queue, timestamp]
 */
export type RawBFWReport = [
  number, // id
  number, // station_id (1-181)
  number, // fuel_idx: 0=pertalite, 1=pertamax, 2=solar
  number, // available: 1=available, 0=empty
  number | null, // queue: 0=none, 1=short, 2=medium, 3=long, null=not reported
  number // timestamp (unix seconds)
];

export interface BFWResponse {
  v: number;
  rows: RawBFWReport[];
}

const FUEL_INDEX_MAP: Record<number, FuelType> = {
  0: 'pertalite',
  1: 'pertamax',
  2: 'solar',
};

const QUEUE_LEVEL_MAP: Record<number, QueueLevel> = {
  0: 'none',
  1: 'short',
  2: 'medium',
  3: 'long',
};

/**
 * Parses raw report rows into an aggregated StationFuelStatus map keyed by station_id.
 * ponytail: clean O(N) array reduce, native Math without external date libs.
 */
export function aggregateBFWReports(
  rows: RawBFWReport[],
  bfwToSpbuMap?: Record<number, string>
): FuelStatusMap {
  const result: FuelStatusMap = {};

  if (!Array.isArray(rows) || rows.length === 0) {
    return result;
  }

  for (const row of rows) {
    const [, stationId, fuelIdx, availableNum, queueNum, timestamp] = row;
    if (stationId == null || timestamp == null) continue;

    const fuelType = FUEL_INDEX_MAP[fuelIdx];
    const availability: FuelAvailability = availableNum === 1 ? 'available' : 'empty';
    const queueLevel: QueueLevel =
      queueNum != null && QUEUE_LEVEL_MAP[queueNum] ? QUEUE_LEVEL_MAP[queueNum] : 'none';

    if (!result[stationId]) {
      result[stationId] = {
        station_id: stationId,
        spbu_id: bfwToSpbuMap ? bfwToSpbuMap[stationId] : undefined,
        last_updated: timestamp,
      };
    }

    const station = result[stationId];

    // Keep track of the most recent timestamp across all fuel reports for this station
    if (station.last_updated === undefined || timestamp >= station.last_updated) {
      station.last_updated = timestamp;
      if (queueNum != null) {
        station.queue = queueLevel;
      }
    }

    // Update fuel type status if newer or not yet set
    if (fuelType) {
      const existing = station[fuelType];
      if (!existing || timestamp >= existing.updated_at) {
        station[fuelType] = {
          available: availability,
          updated_at: timestamp,
        };
      }
    }
  }

  return result;
}

/**
 * Returns human-readable relative time string in Indonesian.
 * e.g., "baru saja", "5 mnt lalu", "2 jam lalu".
 */
export function formatRelativeTime(
  timestampSeconds: number,
  currentTimestampSeconds: number = Math.floor(Date.now() / 1000)
): string {
  if (timestampSeconds == null || timestampSeconds <= 0) return 'Belum ada data';

  const diff = Math.max(0, currentTimestampSeconds - timestampSeconds);

  if (diff < 60) {
    return 'Baru saja';
  }
  const minutes = Math.floor(diff / 60);
  if (minutes < 60) {
    return `${minutes} mnt lalu`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} jam lalu`;
  }
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

/**
 * Returns Indonesian label and color token for queue level.
 */
export function getQueueDisplay(queue?: QueueLevel): {
  label: string;
  badgeClass: string;
} {
  switch (queue) {
    case 'none':
      return {
        label: 'Antrean Lancar',
        badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      };
    case 'short':
      return {
        label: 'Antrean Pendek',
        badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
      };
    case 'medium':
      return {
        label: 'Antrean Sedang',
        badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      };
    case 'long':
      return {
        label: 'Antrean Panjang',
        badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
      };
    default:
      return {
        label: 'Antrean Belum Dilaporkan',
        badgeClass: 'bg-muted/50 text-muted-foreground border-border/50',
      };
  }
}
