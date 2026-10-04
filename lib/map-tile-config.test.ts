import {
  getBasemapTileConfig,
  ESRI_LIGHT_TILE_CONFIG,
  ESRI_DARK_TILE_CONFIG,
} from './map-tile-config';

describe('map-tile-config', () => {
  it('returns ESRI Light Gray Base tile config for light theme', () => {
    const config = getBasemapTileConfig(true);
    expect(config).toEqual(ESRI_LIGHT_TILE_CONFIG);
    expect(config.key).toBe('esri-light');
    expect(config.url).toContain('World_Light_Gray_Base');
    expect(config.url).not.toContain('cartocdn');
    expect(config.maxNativeZoom).toBe(16);
    expect(config.maxZoom).toBe(19);
    expect(config.attribution).toContain('Esri');
  });

  it('returns ESRI Dark Gray Base tile config for dark theme', () => {
    const config = getBasemapTileConfig(false);
    expect(config).toEqual(ESRI_DARK_TILE_CONFIG);
    expect(config.key).toBe('esri-dark');
    expect(config.url).toContain('World_Dark_Gray_Base');
    expect(config.url).not.toContain('cartocdn');
    expect(config.maxNativeZoom).toBe(16);
    expect(config.maxZoom).toBe(19);
    expect(config.attribution).toContain('Esri');
  });
});
