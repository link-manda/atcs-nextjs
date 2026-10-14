import { CCTVChannel, NearbySPBU } from '@/types/cctv';
import type { SPBUNode } from '@/scripts/fetch-bali-spbu';

/**
 * Calculates great-circle distance between two geographic coordinates
 * using the Haversine formula (pure math, no external library).
 * ponytail: native standard library Math only.
 *
 * @returns Distance in meters rounded to nearest integer
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's mean radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Finds the closest SPBU within maxDistanceMeters (default: 200m).
 */
export function findNearestSPBU(
  lat: number | null | undefined,
  lng: number | null | undefined,
  spbuList: SPBUNode[],
  maxDistanceMeters: number = 200
): { spbu: SPBUNode; distance_meters: number } | null {
  if (lat == null || lng == null || !Array.isArray(spbuList) || spbuList.length === 0) {
    return null;
  }

  let nearest: SPBUNode | null = null;
  let minDistance = Infinity;

  for (const spbu of spbuList) {
    if (spbu.lat == null || spbu.lng == null) continue;
    const dist = calculateHaversineDistance(lat, lng, spbu.lat, spbu.lng);
    if (dist < minDistance && dist <= maxDistanceMeters) {
      minDistance = dist;
      nearest = spbu;
    }
  }

  if (!nearest) return null;

  return {
    spbu: nearest,
    distance_meters: minDistance,
  };
}

/**
 * Enriches a CCTVChannel with nearby SPBU metadata if within radius.
 * Sets is_panoramic_recommended = true if camera is panoramic.
 */
export function enrichChannelWithSPBU(
  channel: CCTVChannel,
  spbuList: SPBUNode[],
  maxDistanceMeters: number = 200
): CCTVChannel {
  if (channel.lat == null || channel.lng == null) {
    return channel;
  }

  const result = findNearestSPBU(channel.lat, channel.lng, spbuList, maxDistanceMeters);
  if (!result) {
    return channel;
  }

  const isPanoramic = /panoramic/i.test(channel.ch_name);

  const nearby_spbu: NearbySPBU = {
    id: result.spbu.id,
    name: result.spbu.name,
    operator: result.spbu.operator || result.spbu.brand,
    distance_meters: result.distance_meters,
    is_panoramic_recommended: isPanoramic,
  };

  return {
    ...channel,
    nearby_spbu,
  };
}
