import {
  classifyDenpasarResponse,
  classifyNetworkFailure,
  MAINTENANCE_HOST,
  WAF_BLOCKED_STATUS,
} from './cctv-source-status';

describe('classifyDenpasarResponse', () => {
  it('menandai sumber sehat saat respons 200', () => {
    expect(classifyDenpasarResponse(200, null)).toEqual({ status: 'ok' });
  });

  it('mengenali redirect ke halaman pemeliharaan sebagai maintenance', () => {
    const result = classifyDenpasarResponse(
      308,
      `https://${MAINTENANCE_HOST}/api/v3/pv/ldevice`
    );

    expect(result.status).toBe('maintenance');
    expect(result.detail).toContain('pemeliharaan');
  });

  it('menganggap redirect tanpa tujuan maintenance sebagai gangguan', () => {
    const result = classifyDenpasarResponse(302, 'https://example.test/login');

    expect(result.status).toBe('unavailable');
    expect(result.detail).toContain('example.test');
  });

  it('menangani redirect tanpa header location', () => {
    expect(classifyDenpasarResponse(308, null).status).toBe('unavailable');
  });

  it('mengenali kode nonstandar WAF 468 sebagai blocked', () => {
    const result = classifyDenpasarResponse(WAF_BLOCKED_STATUS, null);

    expect(result.status).toBe('blocked');
    expect(result.detail).toContain('468');
  });

  it('memetakan 403 menjadi blocked', () => {
    expect(classifyDenpasarResponse(403, null).status).toBe('blocked');
  });

  it.each([404, 429, 500, 503])('memetakan HTTP %i menjadi unavailable', (status) => {
    expect(classifyDenpasarResponse(status, null).status).toBe('unavailable');
  });
});

describe('classifyNetworkFailure', () => {
  it('menyertakan kode kegagalan jaringan bila tersedia', () => {
    const error = Object.assign(new Error('fetch failed'), {
      cause: { code: 'ECONNREFUSED' },
    });

    const result = classifyNetworkFailure(error);

    expect(result.status).toBe('unavailable');
    expect(result.detail).toContain('ECONNREFUSED');
  });

  it('tetap memberi status saat error tidak punya cause', () => {
    expect(classifyNetworkFailure(new Error('boom')).status).toBe('unavailable');
  });
});
