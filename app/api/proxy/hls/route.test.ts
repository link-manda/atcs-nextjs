/**
 * @jest-environment node
 */
import { GET, OPTIONS } from './route';
import { NextRequest } from 'next/server';

describe('HLS Proxy Route Security & Handlers', () => {
  it('returns 400 when url parameter is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/proxy/hls');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 403 when protocol is not https', async () => {
    const req = new NextRequest('http://localhost:3000/api/proxy/hls?url=http://atcs.denpasarkota.go.id/stream.m3u8');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('returns 403 when hostname is not in allowlist', async () => {
    const req = new NextRequest('http://localhost:3000/api/proxy/hls?url=https://evil.com/malicious.m3u8');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('returns 403 when non-standard port is targeted', async () => {
    const req = new NextRequest('http://localhost:3000/api/proxy/hls?url=https://atcs.denpasarkota.go.id:8080/stream.m3u8');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('returns 403 when URL contains embedded credentials', async () => {
    const req = new NextRequest('http://localhost:3000/api/proxy/hls?url=https://admin:pass@atcs.denpasarkota.go.id/stream.m3u8');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('handles OPTIONS preflight with 204 and CORS headers', async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
  });
});
