export interface MapTileConfig {
  url: string;
  attribution: string;
  maxNativeZoom: number;
  maxZoom: number;
  key: string;
}

export const ESRI_LIGHT_TILE_CONFIG: MapTileConfig = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, DeLorme, NAVTEQ',
  maxNativeZoom: 16,
  maxZoom: 19,
  key: 'esri-light',
};

export const ESRI_DARK_TILE_CONFIG: MapTileConfig = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, DeLorme, NAVTEQ',
  maxNativeZoom: 16,
  maxZoom: 19,
  key: 'esri-dark',
};

/**
 * Returns the ESRI World Gray Canvas tile configuration based on theme.
 * Completely free and requires no API key.
 */
export function getBasemapTileConfig(isLight: boolean): MapTileConfig {
  return isLight ? ESRI_LIGHT_TILE_CONFIG : ESRI_DARK_TILE_CONFIG;
}
