import type { HlsConfig } from 'hls.js';
import Hls from 'hls.js';

/**
 * Optimized Hls.js configuration for low-latency live streams (2-4s from live edge)
 * with cold-start gating to prevent instant buffer stalls on on-demand transcoders.
 */
export const HLS_LOW_LATENCY_CONFIG: Partial<HlsConfig> = {
  enableWorker: true,
  lowLatencyMode: true,
  backBufferLength: 4,
  maxBufferLength: 10,
  maxMaxBufferLength: 20,
  liveSyncDurationCount: 2,          // Target 4s behind live edge
  liveMaxLatencyDurationCount: 4,     // If lag exceeds 8s, fast-forward to live
  initialLiveManifestSize: 2,        // Wait until at least 2 segments to prevent cold-start freeze
  maxBufferHole: 0.5,
  highBufferWatchdogPeriod: 2,
  nudgeOffset: 0.2,
  nudgeMaxRetry: 5,
  manifestLoadingTimeOut: 10000,
  manifestLoadingMaxRetry: 5,
  levelLoadingTimeOut: 10000,
  levelLoadingMaxRetry: 5,
  fragLoadingTimeOut: 15000,
  fragLoadingMaxRetry: 6,
};

/**
 * Resolves proxy fallback URL when direct HLS stream fails (e.g. CORS or network error).
 */
export function resolveHlsFallbackUrl(currentUrl: string): string | null {
  if (
    !currentUrl.includes('/api/proxy/hls') &&
    currentUrl.startsWith('https://atcs.denpasarkota.go.id')
  ) {
    return `/api/proxy/hls?url=${encodeURIComponent(currentUrl)}`;
  }
  return null;
}

/**
 * Handles buffer stalls by performing an intelligent live edge catch-up
 * if the playhead has accumulated lag beyond the threshold.
 */
export function handleHlsStallCatchUp(
  hls: Hls | null,
  video: HTMLVideoElement | null,
  maxLagSeconds = 4
): void {
  if (!hls || !video) return;

  const livePos = hls.liveSyncPosition;
  if (
    typeof livePos === 'number' &&
    livePos > 0 &&
    Math.abs(livePos - video.currentTime) > maxLagSeconds
  ) {
    video.currentTime = livePos;
  }

  if (video.paused && video.readyState >= 2) {
    video.play().catch(() => {});
  }
}
