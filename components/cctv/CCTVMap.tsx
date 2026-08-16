'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CCTVChannel } from '@/types/cctv';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Activity, Key, ExternalLink, X, Settings2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CCTVMapProps {
  cameras: CCTVChannel[];
  selectedIds: Set<number>;
  onCameraClick: (cam: CCTVChannel) => void;
}

// Custom icon factory
const createIcon = (isSelected: boolean) => {
  const colorClass = isSelected ? 'bg-primary' : 'bg-emerald-500';
  const shadowClass = isSelected 
    ? 'shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)]' 
    : 'shadow-[0_0_8px_rgba(16,185,129,0.7)]';

  return L.divIcon({
    className: 'bg-transparent border-none',
    html: `<div class="relative flex items-center justify-center w-6 h-6 cursor-pointer">
             <div class="absolute inset-0 rounded-full border ${isSelected ? 'border-primary' : 'border-emerald-500'} animate-ping opacity-40"></div>
             <div class="w-3 h-3 rounded-full ${colorClass} ${shadowClass}"></div>
           </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

// Component to handle map bounds
function MapBounds({ cameras }: { cameras: CCTVChannel[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (cameras.length === 0) return;
    const bounds = L.latLngBounds(
      cameras.map(c => [c.lat as number, c.lng as number])
    );
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [cameras, map]);

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

  const withGps = useMemo(
    () => cameras.filter((c) => c.lat !== null && c.lng !== null),
    [cameras]
  );

  if (withGps.length === 0) {
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
        
        {withGps.map((cam) => {
          const isSelected = selectedIds.has(cam.cctv_id);
          return (
            <Marker
              key={cam.cctv_id}
              position={[cam.lat as number, cam.lng as number]}
              icon={createIcon(isSelected)}
              eventHandlers={{
                click: () => onCameraClick(cam),
              }}
            >
              <Popup className="tactical-popup">
                <div className="flex flex-col gap-1 min-w-[120px]">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1 border-b border-border/50 pb-1">
                    {cam.region}
                  </span>
                  <span className="text-xs font-bold text-foreground leading-tight">
                    {cam.ch_name}
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground mt-1">
                    {cam.lat?.toFixed(5)}, {cam.lng?.toFixed(5)}
                  </span>
                </div>
              </Popup>
            </Marker>
          );
        })}
        <MapBounds cameras={withGps} />
      </MapContainer>
    </div>
  );
}
