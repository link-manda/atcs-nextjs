import {
  aggregateBFWReports,
  formatRelativeTime,
  getQueueDisplay,
  RawBFWReport,
} from './fuel-utils';

describe('fuel-utils', () => {
  describe('aggregateBFWReports', () => {
    it('aggregates raw reports correctly with newest data overriding older', () => {
      const rows: RawBFWReport[] = [
        [1, 10, 0, 1, 1, 1000], // station 10, pertalite available, short queue, time 1000
        [2, 10, 0, 0, 3, 1500], // station 10, pertalite empty, long queue, time 1500 (newer)
        [3, 10, 1, 1, null, 1200], // station 10, pertamax available, time 1200
        [4, 25, 2, 1, 0, 900], // station 25, solar available, none queue, time 900
      ];

      const mapping = { 10: 'node/1001', 25: 'node/2002' };
      const result = aggregateBFWReports(rows, mapping);

      expect(result[10]).toBeDefined();
      expect(result[10].spbu_id).toBe('node/1001');
      expect(result[10].last_updated).toBe(1500);
      expect(result[10].pertalite?.available).toBe('empty');
      expect(result[10].pertalite?.updated_at).toBe(1500);
      expect(result[10].pertamax?.available).toBe('available');
      expect(result[10].pertamax?.updated_at).toBe(1200);
      expect(result[10].queue).toBe('long');

      expect(result[25]).toBeDefined();
      expect(result[25].spbu_id).toBe('node/2002');
      expect(result[25].solar?.available).toBe('available');
      expect(result[25].queue).toBe('none');
    });

    it('returns empty object for empty or invalid rows', () => {
      expect(aggregateBFWReports([])).toEqual({});
      // @ts-expect-error testing null safety
      expect(aggregateBFWReports(null)).toEqual({});
    });
  });

  describe('formatRelativeTime', () => {
    it('formats seconds difference correctly', () => {
      const now = 1700000000;
      expect(formatRelativeTime(now - 30, now)).toBe('Baru saja');
      expect(formatRelativeTime(now - 120, now)).toBe('2 mnt lalu');
      expect(formatRelativeTime(now - 7200, now)).toBe('2 jam lalu');
      expect(formatRelativeTime(now - 86400 * 3, now)).toBe('3 hari lalu');
      expect(formatRelativeTime(0, now)).toBe('Belum ada data');
    });
  });

  describe('getQueueDisplay', () => {
    it('returns proper labels for each queue level', () => {
      expect(getQueueDisplay('none').label).toBe('Antrean Lancar');
      expect(getQueueDisplay('short').label).toBe('Antrean Pendek');
      expect(getQueueDisplay('medium').label).toBe('Antrean Sedang');
      expect(getQueueDisplay('long').label).toBe('Antrean Panjang');
      expect(getQueueDisplay(undefined).label).toBe('Antrean Belum Dilaporkan');
    });
  });
});
