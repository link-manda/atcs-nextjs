'use client';

import { useRef, useEffect } from 'react';
import type { CCTVChannel } from '@/types/cctv';

// After this many ms of stall, notify parent
const STALL_TIMEOUT_MS = 12_000;
// Iframe must fire onLoad within this many ms, or it's considered stuck
const IFRAME_LOAD_TIMEOUT_MS = 30_000;

interface CCTVPlayerProps {
  camera: CCTVChannel;
  onError?: () => void;
  onStalled?: () => void;
  onLoaded?: () => void;
}

export default function CCTVPlayer({ camera, onError, onStalled, onLoaded }: CCTVPlayerProps) {
  const stallTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearStallTimer  = () => { if (stallTimer.current)  { clearTimeout(stallTimer.current);  stallTimer.current  = null; } };
  const clearLoadTimeout = () => { if (loadTimeout.current) { clearTimeout(loadTimeout.current); loadTimeout.current = null; } };

  const startStallTimer = () => {
    clearStallTimer();
    stallTimer.current = setTimeout(() => { onStalled?.(); }, STALL_TIMEOUT_MS);
  };

  useEffect(() => () => { clearStallTimer(); clearLoadTimeout(); }, []);

  if (camera.player_type === 'video') {
    return (
      <video
        className="w-full h-full object-cover"
        src={camera.streaming_url}
        autoPlay
        muted
        playsInline
        loop
        onError={onError}
        onStalled={startStallTimer}
        onWaiting={startStallTimer}
        onPlaying={() => { clearStallTimer(); onLoaded?.(); }}
        onCanPlay={clearStallTimer}
      />
    );
  }

  return (
    <iframe
      ref={(el) => {
        if (el) {
          clearLoadTimeout();
          loadTimeout.current = setTimeout(() => { onStalled?.(); }, IFRAME_LOAD_TIMEOUT_MS);
        }
      }}
      className="w-full h-full border-0"
      src={camera.streaming_url}
      title={camera.ch_name}
      allow="autoplay; fullscreen"
      loading="lazy"
      onError={onError}
      onLoad={() => { clearLoadTimeout(); onLoaded?.(); }}
    />
  );
}
