'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CCTVChannel } from '@/types/cctv';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Activity, Key, ExternalLink, X, Settings2, Check, Video, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  const [showTraffic, setShowTraffic] = useState(false);
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

  if (stations.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-card">
        <p className="text-sm font-semibold text-muted-foreground">
          Tidak ada data koordinat GPS kamera yang tersedia.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-background isolate">
      {/* ─── Map Controls ─── */}
      <div className="absolute top-4 right-4 z-[1000] flex items-center gap-2">
        <button
          onClick={handleToggleTraffic}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold font-headline transition-all duration-300 shadow-md backdrop-blur-md border ${
            showTraffic 
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30' 
              : 'bg-card/90 border-border text-muted-foreground hover:text-foreground hover:bg-card'
          }`}
          title="Pantauan Kepadatan Arus Lalu Lintas Real-Time"
        >
          <Activity className={`w-3.5 h-3.5 ${showTraffic ? 'animate-pulse text-emerald-500' : ''}`} />
          <span>Live Traffic</span>
        </button>

        {showTraffic && (
          <button
            onClick={() => setShowKeyModal(true)}
            className="p-2 rounded-xl bg-card/90 border border-border text-muted-foreground hover:text-foreground shadow-md backdrop-blur-md"
            title="Pengaturan API Key TomTom"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ─── API Key Modal Dialog ─── */}
      {showKeyModal && (
        <div className="absolute inset-0 z-[1001] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowKeyModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-base font-bold font-headline text-foreground">
                  Aktifkan Live Traffic Bali
                </h3>
                <p className="text-xs text-muted-foreground">
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
                  className="text-[11px] text-primary hover:underline flex items-center gap-1"
                >
                  Dapatkan Key Gratis (1 Menit)
                  <ExternalLink className="w-3 h-3" />
                </a>
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Masukkan API Key TomTom Anda..."
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  className="pl-9 text-xs font-mono"
                />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                💡 TomTom menyediakan tier gratis 2.500 request/hari. Kunci ini akan disimpan dengan aman di browser Anda.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowKeyModal(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleSaveKey}
                disabled={!inputKey.trim()}
                className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5"
              >
                {keySaved ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Tersimpan!</span>
                  </>
                ) : (
                  <span>Simpan & Aktifkan</span>
                )}
              </Button>
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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
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
                            <span className="text-[11px] font-semibold text-foreground truncate max-w-[130px]" title={cam.ch_name}>
                              {cam.ch_name}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-background border border-border text-muted-foreground flex-shrink-0">
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
        <MapBounds stations={stations} />
      </MapContainer>
    </div>
  );
}
