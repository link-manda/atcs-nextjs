import React from 'react';
import { render } from '@testing-library/react';
import { CCTVPlayer } from './CCTVPlayer';
import { CCTVChannel } from '@/types/cctv';
import Hls from 'hls.js';

jest.mock('hls.js', () => {
  const mHls = {
    loadSource: jest.fn(),
    attachMedia: jest.fn(),
    on: jest.fn(),
    destroy: jest.fn(),
    startLoad: jest.fn(),
    recoverMediaError: jest.fn(),
  };
  const HlsConstructor = jest.fn(() => mHls);
  (HlsConstructor as any).isSupported = jest.fn(() => true);
  (HlsConstructor as any).Events = {
    MANIFEST_PARSED: 'hlsManifestParsed',
    ERROR: 'hlsError',
  };
  (HlsConstructor as any).ErrorDetails = {
    BUFFER_STALLED_ERROR: 'bufferStalledError',
  };
  (HlsConstructor as any).ErrorTypes = {
    NETWORK_ERROR: 'networkError',
    MEDIA_ERROR: 'mediaError',
  };
  return HlsConstructor;
});

describe('CCTVPlayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.HTMLMediaElement.prototype.play = jest.fn().mockImplementation(() => Promise.resolve());
  });

  const mockChannel: CCTVChannel = {
    cctv_id: 101,
    ch_id: 'DPS-1',
    ch_name: 'Simpang Gunung Agung',
    streaming_url: 'https://atcs.denpasarkota.go.id/stream/A001GUNUNGAGUNGPTZ/index.m3u8',
    player_type: 'video',
    lat: -8.65,
    lng: 115.21,
    region: 'Denpasar',
  };

  it('initializes Hls with low-latency and cold-start mitigations', () => {
    render(<CCTVPlayer channel={mockChannel} />);

    expect(Hls).toHaveBeenCalledTimes(1);
    const passedConfig = (Hls as unknown as jest.Mock).mock.calls[0][0];

    // Assert low-latency and cold-start parameters
    expect(passedConfig.lowLatencyMode).toBe(true);
    expect(passedConfig.liveSyncDurationCount).toBe(2);
    expect(passedConfig.liveMaxLatencyDurationCount).toBe(4);
    expect(passedConfig.initialLiveManifestSize).toBe(2);
    expect(passedConfig.maxBufferLength).toBe(10);
  });

  it('renders iframe directly for iframe player_type channels', () => {
    const iframeChannel: CCTVChannel = {
      ...mockChannel,
      player_type: 'iframe',
      streaming_url: 'https://shinobi.bulelengkab.go.id/embed/camera1',
    };

    const { container } = render(<CCTVPlayer channel={iframeChannel} />);
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', iframeChannel.streaming_url);
  });
});
