import {
  calculateHaversineDistance,
  findNearestSPBU,
  enrichChannelWithSPBU,
} from './spbu-matcher';
import { CCTVChannel } from '@/types/cctv';
import { SPBUNode } from '@/scripts/fetch-bali-spbu';

describe('spbu-matcher', () => {
  const mockSPBUs: SPBUNode[] = [
    {
      id: 'spbu-setiabudi',
      name: 'SPBU Pertamina 54.801.06 Setiabudi',
      operator: 'Pertamina',
      brand: 'Pertamina',
      lat: -8.65012,
      lng: 115.20915,
      regency: 'Denpasar',
      street: 'Jl. Setiabudi',
    },
    {
      id: 'spbu-gatot-subroto',
      name: 'SPBU Pertamina Gatot Subroto Barat',
      operator: 'Pertamina',
      brand: 'Pertamina',
      lat: -8.6345,
      lng: 115.1950,
      regency: 'Denpasar',
    },
  ];

  describe('calculateHaversineDistance', () => {
    it('returns 0 when coordinates are identical', () => {
      expect(calculateHaversineDistance(-8.6506, 115.2088, -8.6506, 115.2088)).toBe(0);
    });

    it('calculates realistic distance between Simpang Wibisana and SPBU Setiabudi (~60-100m)', () => {
      // Simpang Wibisana - Setiabudi: -8.650645, 115.208828
      // SPBU Setiabudi: -8.65012, 115.20915
      const dist = calculateHaversineDistance(-8.650645, 115.208828, -8.65012, 115.20915);
      expect(dist).toBeGreaterThanOrEqual(60);
      expect(dist).toBeLessThanOrEqual(100);
    });
  });

  describe('findNearestSPBU', () => {
    it('returns null if coordinates are null or undefined', () => {
      expect(findNearestSPBU(null, null, mockSPBUs)).toBeNull();
      expect(findNearestSPBU(undefined, undefined, mockSPBUs)).toBeNull();
    });

    it('finds nearest SPBU when within threshold', () => {
      const match = findNearestSPBU(-8.650645, 115.208828, mockSPBUs, 200);
      expect(match).not.toBeNull();
      expect(match?.spbu.id).toBe('spbu-setiabudi');
      expect(match?.distance_meters).toBeLessThanOrEqual(200);
    });

    it('returns null if all SPBUs are further than maxDistanceMeters', () => {
      // Koordinat Sanur (jauh dari Setiabudi)
      const match = findNearestSPBU(-8.6850, 115.2600, mockSPBUs, 200);
      expect(match).toBeNull();
    });
  });

  describe('enrichChannelWithSPBU', () => {
    const baseCam: CCTVChannel = {
      cctv_id: 101,
      ch_id: 'wibisana_01',
      ch_name: 'WIBISANA - SETIABUDI PANORAMIC',
      lat: -8.650645,
      lng: 115.208828,
      streaming_url: 'https://example.com/stream.m3u8',
      player_type: 'video',
      region: 'Denpasar',
    };

    it('enriches camera within radius and marks is_panoramic_recommended if camera name contains panoramic', () => {
      const enriched = enrichChannelWithSPBU(baseCam, mockSPBUs, 200);
      expect(enriched.nearby_spbu).toBeDefined();
      expect(enriched.nearby_spbu?.name).toBe('SPBU Pertamina 54.801.06 Setiabudi');
      expect(enriched.nearby_spbu?.is_panoramic_recommended).toBe(true);
      expect(enriched.nearby_spbu?.distance_meters).toBeLessThan(100);
    });

    it('sets is_panoramic_recommended to false for PTZ camera', () => {
      const ptzCam: CCTVChannel = {
        ...baseCam,
        ch_name: 'WIBISANA - SETIABUDI PTZ',
      };
      const enriched = enrichChannelWithSPBU(ptzCam, mockSPBUs, 200);
      expect(enriched.nearby_spbu).toBeDefined();
      expect(enriched.nearby_spbu?.is_panoramic_recommended).toBe(false);
    });

    it('leaves channel untouched if no SPBU within radius', () => {
      const distantCam: CCTVChannel = {
        ...baseCam,
        lat: -8.8500,
        lng: 115.1500,
      };
      const enriched = enrichChannelWithSPBU(distantCam, mockSPBUs, 200);
      expect(enriched.nearby_spbu).toBeUndefined();
    });

    it('handles camera with null coordinates safely', () => {
      const nullCoordCam: CCTVChannel = {
        ...baseCam,
        lat: null,
        lng: null,
      };
      const enriched = enrichChannelWithSPBU(nullCoordCam, mockSPBUs, 200);
      expect(enriched.nearby_spbu).toBeUndefined();
    });
  });
});
