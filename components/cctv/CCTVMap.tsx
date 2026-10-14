'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CCTVChannel } from '@/types/cctv';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTheme } from 'next-themes';
import { Activity, Key, ExternalLink, X, Settings2, Check, Video, Camera, Fuel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getBasemapTileConfig } from '@/lib/map-tile-config';
import baliSPBUData from '@/data/bali-spbu.json';
import type { SPBUNode } from '@/scripts/fetch-bali-spbu';
import { calculateHaversineDistance } from '@/lib/spbu-matcher';

interface CCTVMapProps {
  cameras: CCTVChannel[];
  selectedIds: Set<number>;
  onCameraClick: (cam: CCTVChannel) => void;
}

export interface CCTVStation {
  stationKey: string;
  lat: number;
  lng: number;
  region: string;
  title: string;
  cameras: CCTVChannel[];
}

/**
 * Groups cameras with matching coordinates (within ~10m) into single Station nodes
 */
function groupCamerasByLocation(cameras: CCTVChannel[]): CCTVStation[] {
  const stationMap = new Map<string, CCTVStation>();

  for (const cam of cameras) {
    if (cam.lat === null || cam.lng === null) continue;
    // Round to 4 decimal places (~10m precision) to cluster co-located cameras
    const latKey = cam.lat.toFixed(4);
    const lngKey = cam.lng.toFixed(4);
    const key = `${latKey}_${lngKey}`;

    if (!stationMap.has(key)) {
      const cleanTitle = cam.ch_name
        .replace(/\s*-\s*(ptz|panoramic|cam\s*\d+|cctv\s*\d+)\b/gi, '')
        .replace(/\s+(ptz|panoramic)\b/gi, '')
        .trim();

      stationMap.set(key, {
        stationKey: key,
        lat: cam.lat,
        lng: cam.lng,
        region: cam.region,
        title: cleanTitle || cam.ch_name,
        cameras: [cam],
      });
    } else {
      stationMap.get(key)!.cameras.push(cam);
    }
  }

  return Array.from(stationMap.values());
}

/**
 * Creates a Modern Teardrop CCTV Marker Icon with Multi-Cam Badge
 */
const createCCTVMarkerIcon = (station: CCTVStation, isAnySelected: boolean) => {
  const count = station.cameras.length;
  const isMulti = count > 1;
  const pinColor = isAnySelected ? '#00f0ff' : '#10b981'; // Cyan if selected, Emerald if active
  const glowClass = isAnySelected
    ? 'filter drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]'
    : 'filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]';

  const badgeHtml = isMulti
    ? `<div class="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] px-1 rounded-full bg-cyan-400 text-black text-[10px] font-black font-sans flex items-center justify-center border-2 border-[#13171f] shadow-md z-20">${count}</div>`
    : '';

  return L.divIcon({
    className: 'bg-transparent border-none',
    html: `
      <div class="relative flex items-center justify-center w-8 h-9 cursor-pointer transition-transform duration-200 hover:scale-115">
        ${badgeHtml}
        <svg width="32" height="36" viewBox="0 0 32 36" fill="none" xmlns="http://www.w3.org/2000/svg" class="${glowClass}">
          <!-- Teardrop Pin Base -->
          <path d="M16 35C16 35 30 22.5 30 14C30 6.26801 23.732 0 16 0C8.26801 0 2 6.26801 2 14C2 22.5 16 35 16 35Z" fill="#13171f" stroke="${pinColor}" stroke-width="2"/>
          <!-- CCTV Security Camera Glyph -->
          <g transform="translate(8.5, 6.5)" fill="${pinColor}">
            <!-- Camera Body -->
            <path d="M1 3.5C1 2.67157 1.67157 2 2.5 2H9C9.82843 2 10.5 2.67157 10.5 3.5V8C10.5 8.82843 9.82843 9.5 9 9.5H2.5C1.67157 9.5 1 8.82843 1 8V3.5Z"/>
            <!-- Camera Lens / Viewing Cone -->
            <path d="M10.5 4.5L14 2.5V9L10.5 7V4.5Z"/>
            <!-- Base Stand -->
            <path d="M5 9.5V11.5H7V9.5H5Z"/>
            <path d="M3.5 11.5H8.5V12.5H3.5V11.5Z"/>
          </g>
        </svg>
      </div>
    `,
    iconSize: [32, 36],
    iconAnchor: [16, 35],
    popupAnchor: [0, -32],
  });
};

const createSPBUIcon = () => {
  return L.divIcon({
    className: 'bg-transparent border-none',
    html: `
      <div class="relative flex items-center justify-center w-7 h-8 cursor-pointer transition-transform duration-200 hover:scale-120">
        <svg width="28" height="32" viewBox="0 0 32 36" fill="none" xmlns="http://www.w3.org/2000/svg" class="filter drop-shadow-[0_2px_6px_rgba(245,158,11,0.5)]">
          <!-- Teardrop Pin Base -->
          <path d="M16 35C16 35 30 22.5 30 14C30 6.26801 23.732 0 16 0C8.26801 0 2 6.26801 2 14C2 22.5 16 35 16 35Z" fill="#1c1917" stroke="#f59e0b" stroke-width="2.5"/>
          <!-- Fuel Dispenser Icon -->
          <g transform="translate(8.5, 6.5)" fill="#f59e0b">
            <path d="M3 2C2.44772 2 2 2.44772 2 3V12C2 12.5523 2.44772 13 3 13H9C9.5523 13 10 12.5523 10 12V3C10 2.44772 9.5523 2 9 2H3ZM4 4H8V7H4V4Z"/>
            <path d="M10.5 5H11.5C12.0523 5 12.5 5.44772 12.5 6V9.5C12.5 10.0523 12.0523 10.5 11.5 10.5H10.5"/>
          </g>
        </svg>
      </div>
    `,
    iconSize: [28, 32],
    iconAnchor: [14, 31],
    popupAnchor: [0, -28],
  });
};

// Component to handle map bounds
function MapBounds({ stations }: { stations: CCTVStation[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (stations.length === 0) return;
    const bounds = L.latLngBounds(
      stations.map(s => [s.lat, s.lng])
    );
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [stations, map]);

  return null;
}

export default function CCTVMap({ cameras, selectedIds, onCameraClick }: CCTVMapProps) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const basemap = getBasemapTileConfig(isLight);
  const [showTraffic, setShowTraffic] = useState(false);
  const [showSPBU, setShowSPBU] = useState(true);
  const [apiKey, setApiKey] = useState<string>('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);

  // Initialize API key from env or localStorage
  useEffect(() => {
    const envKey = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || '';
    const storedKey = typeof window !== 'undefined' ? localStorage.getItem('tomtom_api_key') || '' : '';
    const effectiveKey = envKey || storedKey;
    setApiKey(effectiveKey);
    setInputKey(effectiveKey);
  }, []);

  const handleToggleTraffic = () => {
    if (!showTraffic) {
      if (!apiKey) {
        setShowKeyModal(true);
        return;
      }
      setShowTraffic(true);
    } else {
      setShowTraffic(false);
    }
  };

  const handleSaveKey = () => {
    const trimmed = inputKey.trim();
    if (trimmed) {
      localStorage.setItem('tomtom_api_key', trimmed);
      setApiKey(trimmed);
      setShowTraffic(true);
      setKeySaved(true);
      setTimeout(() => {
        setKeySaved(false);
        setShowKeyModal(false);
      }, 800);
    }
  };

  // Group cameras into stations to eliminate overlapping pins
  const stations = useMemo(() => groupCamerasByLocation(cameras), [cameras]);

  // SPBU Nodes with associated nearby cameras (radius <= 250m)
  const spbuStations = useMemo(() => {
    const rawSPBUs = baliSPBUData as SPBUNode[];
    return rawSPBUs.map((spbu) => {
      let nearestCam: CCTVChannel | null = null;
      let minCamDist = Infinity;

      for (const cam of cameras) {
        if (cam.lat == null || cam.lng == null) continue;
        const d = calculateHaversineDistance(spbu.lat, spbu.lng, cam.lat, cam.lng);
        if (d < minCamDist) {
          minCamDist = d;
          nearestCam = cam;
        }
      }

      return {
        ...spbu,
        nearestCam: minCamDist <= 250 ? nearestCam : null,
        distanceToCam: minCamDist <= 250 ? minCamDist : null,
      };
    });
  }, [cameras]);

  if (stations.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background text-muted-foreground font-mono text-xs">
        Memuat data telemetri kamera...
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-background isolate">
      {/* ─── Map Controls ─── */}
      <div className="absolute top-4 right-4 z-[1000] flex items-center gap-2">
        <button
          onClick={() => setShowSPBU((prev) => !prev)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium font-sans transition-all shadow-md backdrop-blur-md border ${
            showSPBU
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-300 ring-1 ring-amber-500/30'
              : 'bg-background/90 border-border text-foreground hover:bg-secondary'
          }`}
          title="Tampilkan / Sembunyikan Titik SPBU se-Bali"
        >
          <Fuel className={`w-3.5 h-3.5 ${showSPBU ? 'text-amber-500 dark:text-amber-400' : 'text-muted-foreground'}`} />
          <span>Titik SPBU</span>
        </button>

        <button
          onClick={handleToggleTraffic}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium font-sans transition-all shadow-md backdrop-blur-md border ${
            showTraffic 
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-300 ring-1 ring-emerald-500/30' 
              : 'bg-background/90 border-border text-foreground hover:bg-secondary'
          }`}
          title="Pantauan Kepadatan Arus Lalu Lintas Real-Time"
        >
          <Activity className={`w-3.5 h-3.5 ${showTraffic ? 'animate-pulse text-emerald-500 dark:text-emerald-400' : 'text-muted-foreground'}`} />
          <span>Live Traffic</span>
        </button>

        {showTraffic && (
          <button
            onClick={() => setShowKeyModal(true)}
            className="p-1.5 rounded-md bg-background/90 border border-border text-muted-foreground hover:text-foreground shadow-md backdrop-blur-md"
            title="Pengaturan API Key TomTom"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ─── API Key Modal Dialog ─── */}
      {showKeyModal && (
        <div className="absolute inset-0 z-[1001] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-xl p-5 max-w-md w-full shadow-2xl flex flex-col gap-4 relative animate-in fade-in zoom-in-95 font-sans">
            <button
              onClick={() => setShowKeyModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <Activity className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Aktifkan Live Traffic Bali
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Lapisan visualisasi kepadatan lalu lintas real-time (TomTom Flow)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>TomTom API Key</span>
                <a
                  href="https://developer.tomtom.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-emerald-500 hover:underline flex items-center gap-1 font-mono"
                >
                  Dapatkan Key Gratis
                  <ExternalLink className="w-3 h-3" />
                </a>
              </label>
              <div className="relative">
                <Key className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Masukkan API Key TomTom..."
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  className="pl-9 text-xs font-mono bg-muted/50 border-border text-foreground placeholder:text-muted-foreground rounded-md"
                />
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                💡 TomTom menyediakan tier gratis 2.500 request/hari. Kunci ini disimpan di browser lokal Anda.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 mt-1">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-muted border border-border text-foreground hover:bg-muted/80 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveKey}
                disabled={!inputKey.trim()}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center gap-1.5 transition-colors disabled:opacity-40"
              >
                {keySaved ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Tersimpan!</span>
                  </>
                ) : (
                  <span>Simpan & Aktifkan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Leaflet Map Container ─── */}
      <MapContainer
        center={[-8.4095, 115.1889]} // Bali Center
        zoom={10}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          key={basemap.key}
          attribution={basemap.attribution}
          url={basemap.url}
          maxNativeZoom={basemap.maxNativeZoom}
          maxZoom={basemap.maxZoom}
        />
        
        {/* TomTom Real-Time Traffic Flow Layer */}
        {showTraffic && apiKey && (
          <TileLayer
            url={`https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png?key=${apiKey}`}
            attribution='&copy; <a href="https://www.tomtom.com">TomTom</a>'
            opacity={0.85}
            zIndex={10}
          />
        )}
        
        {/* Render Station Pins (Grouped Co-located Cameras) */}
        {stations.map((station) => {
          const isAnySelected = station.cameras.some((cam) => selectedIds.has(cam.cctv_id));
          const icon = createCCTVMarkerIcon(station, isAnySelected);

          return (
            <Marker
              key={station.stationKey}
              position={[station.lat, station.lng]}
              icon={icon}
            >
              <Popup className="tactical-popup">
                <div className="flex flex-col gap-2 min-w-[200px] max-w-[260px] p-1 font-sans">
                  {/* Station Header */}
                  <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                      {station.region}
                    </span>
                    <span className="text-[9px] font-mono text-muted-foreground">
                      {station.cameras.length} Kamera
                    </span>
                  </div>

                  <div className="text-xs font-bold text-foreground leading-tight">
                    {station.title}
                  </div>

                  {/* List of Cameras at this Station (PTZ + Panoramic) */}
                  <div className="flex flex-col gap-1.5 mt-1">
                    {station.cameras.map((cam) => {
                      const isSelected = selectedIds.has(cam.cctv_id);
                      const isPanoramic = cam.ch_name.toLowerCase().includes('panoramic');
                      const isPTZ = cam.ch_name.toLowerCase().includes('ptz');

                      return (
                        <div
                          key={cam.cctv_id}
                          className={`p-2 rounded-lg border flex flex-col gap-1.5 transition-colors ${
                            isSelected
                              ? 'bg-primary/10 border-primary/30'
                              : 'bg-muted/40 border-border/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />
                              <span className="text-[11px] font-semibold text-foreground truncate" title={cam.ch_name}>
                                {cam.ch_name}
                              </span>
                            </div>
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-background border border-border text-muted-foreground flex-shrink-0">
                              {isPanoramic ? 'Panoramic' : isPTZ ? 'PTZ' : 'Video'}
                            </span>
                          </div>

                          <button
                            onClick={() => onCameraClick(cam)}
                            className={`w-full py-1 px-2 rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors ${
                              isSelected
                                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                : 'bg-background hover:bg-muted text-foreground border border-border'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Terpilih di Grid</span>
                              </>
                            ) : (
                              <>
                                <span>+ Tambah ke Grid</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <span className="text-[9px] font-mono text-muted-foreground/80 mt-0.5 text-center">
                    {station.lat.toFixed(5)}, {station.lng.toFixed(5)}
                  </span>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* ─── SPBU Marker Layer ─── */}
        {showSPBU &&
          spbuStations.map((spbu) => {
            const hasCamera = Boolean(spbu.nearestCam);
            const isCamSelected = spbu.nearestCam ? selectedIds.has(spbu.nearestCam.cctv_id) : false;

            return (
              <Marker
                key={`spbu-${spbu.id}`}
                position={[spbu.lat, spbu.lng]}
                icon={createSPBUIcon()}
              >
                <Popup className="cctv-custom-popup">
                  <div className="flex flex-col gap-2 p-1 max-w-[260px] font-sans">
                    <div className="flex items-center gap-2 border-b border-border/60 pb-1.5">
                      <div className="w-6 h-6 rounded bg-amber-500/20 text-amber-500 flex items-center justify-center flex-shrink-0">
                        <Fuel className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-foreground leading-tight truncate">
                          {spbu.name}
                        </h4>
                        <span className="text-[10px] text-muted-foreground">
                          {spbu.street || spbu.regency || 'Bali'} {spbu.operator ? `• ${spbu.operator}` : ''}
                        </span>
                      </div>
                    </div>

                    {hasCamera && spbu.nearestCam && spbu.distanceToCam ? (
                      <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-amber-600 dark:text-amber-400">
                            Kamera Terdekat:
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground font-semibold">
                            ~{spbu.distanceToCam}m
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-foreground truncate">
                          {spbu.nearestCam.ch_name}
                        </span>
                        <button
                          onClick={() => spbu.nearestCam && onCameraClick(spbu.nearestCam)}
                          className={`w-full mt-1 py-1 px-2 rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors ${
                            isCamSelected
                              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                              : 'bg-amber-500 hover:bg-amber-600 text-black font-semibold'
                          }`}
                        >
                          {isCamSelected ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Terpilih di Grid</span>
                            </>
                          ) : (
                            <>
                              <Video className="w-3 h-3" />
                              <span>Pantau di Grid</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="p-2 rounded-md bg-secondary/40 text-[10px] text-muted-foreground italic">
                        Belum ada tiang kamera ATCS dalam radius 250m.
                      </div>
                    )}

                    <span className="text-[9px] font-mono text-muted-foreground/70 text-center">
                      {spbu.lat.toFixed(5)}, {spbu.lng.toFixed(5)}
                    </span>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        <MapBounds stations={stations} />
      </MapContainer>
    </div>
  );
}
