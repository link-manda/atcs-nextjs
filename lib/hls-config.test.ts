import { HLS_LOW_LATENCY_CONFIG, resolveHlsFallbackUrl, handleHlsStallCatchUp } from './hls-config';

describe('hls-config', () => {
  describe('HLS_LOW_LATENCY_CONFIG', () => {
    it('has correct low-latency and cold-start parameters', () => {
      expect(HLS_LOW_LATENCY_CONFIG.lowLatencyMode).toBe(true);
      expect(HLS_LOW_LATENCY_CONFIG.liveSyncDurationCount).toBe(2);
      expect(HLS_LOW_LATENCY_CONFIG.liveMaxLatencyDurationCount).toBe(4);
      expect(HLS_LOW_LATENCY_CONFIG.initialLiveManifestSize).toBe(2);
      expect(HLS_LOW_LATENCY_CONFIG.maxBufferLength).toBe(10);
    });
  });

  describe('resolveHlsFallbackUrl', () => {
    it('returns proxy URL for direct Denpasar HLS stream', () => {
      const direct = 'https://atcs.denpasarkota.go.id/stream/A001GUNUNGAGUNGPTZ/index.m3u8';
      const fallback = resolveHlsFallbackUrl(direct);
      expect(fallback).toBe(`/api/proxy/hls?url=${encodeURIComponent(direct)}`);
    });

    it('returns null if stream is already proxied', () => {
      const proxied = '/api/proxy/hls?url=https%3A%2F%2Fatcs.denpasarkota.go.id%2Fstream%2Findex.m3u8';
      expect(resolveHlsFallbackUrl(proxied)).toBeNull();
    });

    it('returns null for non-Denpasar external URLs', () => {
      const nonDenpasar = 'https://other-domain.com/live/stream.m3u8';
      expect(resolveHlsFallbackUrl(nonDenpasar)).toBeNull();
    });
  });

  describe('handleHlsStallCatchUp', () => {
    it('nudges video currentTime to liveSyncPosition when lag exceeds threshold', () => {
      const mockHls = { liveSyncPosition: 100 } as any;
      const mockVideo = { currentTime: 90, paused: false, readyState: 4, play: jest.fn() } as any;

      handleHlsStallCatchUp(mockHls, mockVideo, 4);

      expect(mockVideo.currentTime).toBe(100);
    });

    it('does not seek if lag is within acceptable threshold', () => {
      const mockHls = { liveSyncPosition: 100 } as any;
      const mockVideo = { currentTime: 98, paused: false, readyState: 4, play: jest.fn() } as any;

      handleHlsStallCatchUp(mockHls, mockVideo, 4);

      expect(mockVideo.currentTime).toBe(98);
    });

    it('attempts to play video if paused and readyState >= 2', () => {
      const mockHls = { liveSyncPosition: 100 } as any;
      const mockPlay = jest.fn().mockReturnValue(Promise.resolve());
      const mockVideo = { currentTime: 100, paused: true, readyState: 2, play: mockPlay } as any;

      handleHlsStallCatchUp(mockHls, mockVideo, 4);

      expect(mockPlay).toHaveBeenCalled();
    });
  });
});
