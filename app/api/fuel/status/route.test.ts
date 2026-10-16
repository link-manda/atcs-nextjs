/**
 * @jest-environment node
 */
import { GET } from './route';

describe('/api/fuel/status route', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches upstream reports and returns aggregated status with cache headers', async () => {
    const mockBFWResponse = {
      v: 2,
      rows: [
        [1, 1, 0, 1, 1, 1700000000],
        [2, 1, 1, 0, 2, 1700000010],
      ],
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockBFWResponse),
    });

    const response = await GET();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.stations).toBeDefined();
    expect(data.stations[1]).toBeDefined();
    expect(data.stations[1].pertalite?.available).toBe('available');
    expect(data.stations[1].pertamax?.available).toBe('empty');
    expect(data.stations[1].queue).toBe('medium');
    expect(data.by_spbu_id).toBeDefined();
  });

  it('serves from in-memory cache on subsequent call within TTL', async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy;

    // Second call should hit in-memory cache
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Cache-Status')).toBe('HIT');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
