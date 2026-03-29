'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import type { CCTVChannel } from '@/types/cctv';
import CCTVPlayer from './CCTVPlayer';

const MAX_RETRIES = 5;
const RETRY_DELAY = 5; // seconds between each retry attempt

interface CCTVCardProps {
  camera: CCTVChannel;
  onRemove?: () => void;
}

export default function CCTVCard({ camera, onRemove }: CCTVCardProps) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const retryTimer     = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isVisible,    setIsVisible]    = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError,     setHasError]     = useState(false);
  const [isRetrying,   setIsRetrying]   = useState(false);
  const [retryCount,   setRetryCount]   = useState(0);
  const [secondsLeft,  setSecondsLeft]  = useState(0);
  const [playerKey,    setPlayerKey]    = useState(0); // incrementing forces CCTVPlayer remount

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      if (retryTimer.current)     clearTimeout(retryTimer.current);
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    };
  }, []);

  // Lazy-load: only mount player once card enters viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); }
      },
      { threshold: 0.1 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Track fullscreen state
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  }, []);

  // Schedule an automatic retry with countdown UI
  const scheduleRetry = useCallback((currentCount: number) => {
    if (retryTimer.current)     clearTimeout(retryTimer.current);
    if (countdownTimer.current) clearInterval(countdownTimer.current);

    setIsRetrying(true);
    setSecondsLeft(RETRY_DELAY);

    let remaining = RETRY_DELAY;
    countdownTimer.current = setInterval(() => {
      remaining -= 1;
      setSecondsLeft(remaining);
      if (remaining <= 0) { clearInterval(countdownTimer.current!); countdownTimer.current = null; }
    }, 1000);

    retryTimer.current = setTimeout(() => {
      retryTimer.current = null;
      setPlayerKey((k) => k + 1);        // remount the player
      setRetryCount(currentCount + 1);
      setIsRetrying(false);
    }, RETRY_DELAY * 1000);
  }, []);

  const handleError = useCallback(() => {
    // Prevent double-scheduling if already counting down
    if (retryTimer.current || countdownTimer.current) return;
    setRetryCount((c) => {
      if (c >= MAX_RETRIES) { setHasError(true); return c; }
      scheduleRetry(c);
      return c;
    });
  }, [scheduleRetry]);

  const handleStalled = useCallback(() => {
    if (isRetrying || hasError) return;
    if (retryTimer.current || countdownTimer.current) return;
    setRetryCount((c) => {
      if (c >= MAX_RETRIES) { setHasError(true); return c; }
      scheduleRetry(c);
      return c;
    });
  }, [isRetrying, hasError, scheduleRetry]);

  // Manual retry — resets everything and forces a fresh player mount
  const handleManualRetry = useCallback(() => {
    if (retryTimer.current)     { clearTimeout(retryTimer.current);  retryTimer.current     = null; }
    if (countdownTimer.current) { clearInterval(countdownTimer.current); countdownTimer.current = null; }
    setHasError(false);
    setIsRetrying(false);
    setRetryCount(0);
    setSecondsLeft(0);
    setPlayerKey((k) => k + 1);
  }, []);

  const showOverlay = !hasError && !isRetrying;

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-lg overflow-hidden group border border-outline-variant/10 hover:border-primary/40 transition-all duration-300"
    >
      {/* ── Content area ── */}
      {hasError ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-surface-container-low gap-2 min-h-[120px]">
          <span className="material-symbols-outlined text-outline-variant text-3xl">videocam_off</span>
          <p className="text-[10px] font-headline text-outline-variant uppercase tracking-widest">Signal Lost</p>
          <button
            onClick={handleManualRetry}
            className="mt-1 px-3 py-1 rounded bg-surface-container-high border border-outline-variant/20 text-on-surface-variant hover:text-primary hover:border-primary/30 transition-colors text-[10px] font-headline uppercase tracking-widest flex items-center gap-1"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>refresh</span>
            Coba Lagi
          </button>
        </div>
      ) : isRetrying ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black/90 gap-2 min-h-[120px]">
          <span className="material-symbols-outlined text-primary text-3xl animate-spin">
            sync
          </span>
          <p className="text-[10px] font-headline text-primary uppercase tracking-widest">Reconnecting…</p>
          <p className="text-[10px] font-mono text-on-surface-variant">
            {secondsLeft}s · {retryCount + 1}/{MAX_RETRIES}
          </p>
        </div>
      ) : isVisible ? (
        <CCTVPlayer
          key={playerKey}
          camera={camera}
          onError={handleError}
          onStalled={handleStalled}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-surface-container animate-pulse min-h-[120px]">
          <span className="material-symbols-outlined text-outline-variant/40 text-3xl">videocam</span>
        </div>
      )}

      {/* ── Gradient overlay (only when stream is showing) ── */}
      {showOverlay && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/50 pointer-events-none" />
      )}

      {/* ── LIVE badge + ID ── */}
      {showOverlay && (
        <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-black/70 backdrop-blur-md rounded text-[9px] font-bold text-on-surface">
            <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-pulse" />
            LIVE
          </span>
          <span className="px-1.5 py-0.5 bg-black/70 backdrop-blur-md rounded text-[9px] font-mono text-on-surface-variant">
            #{camera.cctv_id}
          </span>
          {retryCount > 0 && (
            <span className="px-1.5 py-0.5 bg-tertiary/20 backdrop-blur-md rounded text-[9px] font-headline text-tertiary border border-tertiary/20">
              ↺{retryCount}
            </span>
          )}
        </div>
      )}

      {/* ── Hover controls ── */}
      <div className="absolute top-2 right-2 flex items-center gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {(hasError || isRetrying) && (
          <button
            onClick={handleManualRetry}
            className="p-1 bg-black/70 backdrop-blur-md rounded hover:bg-primary/80 transition-colors"
            title="Muat ulang"
          >
            <span className="material-symbols-outlined text-on-surface text-sm leading-none">refresh</span>
          </button>
        )}
        {showOverlay && (
          <button
            onClick={handleFullscreen}
            className="p-1 bg-black/70 backdrop-blur-md rounded hover:bg-primary/80 transition-colors"
            title="Fullscreen"
          >
            <span className="material-symbols-outlined text-on-surface text-sm leading-none">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>
        )}
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-1 bg-black/70 backdrop-blur-md rounded hover:bg-error/80 transition-colors"
            title="Hapus dari grid"
          >
            <span className="material-symbols-outlined text-on-surface text-sm leading-none">close</span>
          </button>
        )}
      </div>

      {/* ── Bottom info bar ── */}
      {!isRetrying && (
        <div className="absolute bottom-0 left-0 right-0 p-2 z-10 pointer-events-none">
          <div className="text-[10px] font-bold text-primary uppercase tracking-tight truncate">
            {camera.ch_name}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[8px] text-on-surface-variant font-headline uppercase tracking-widest">
              {camera.region}
            </span>
            {camera.lat && camera.lng && (
              <span className="text-[8px] text-on-surface-variant/60 font-mono">
                {camera.lat.toFixed(4)}°S {Math.abs(camera.lng).toFixed(4)}°E
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
