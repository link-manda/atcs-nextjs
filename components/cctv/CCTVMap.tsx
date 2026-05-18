'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CCTVChannel } from '@/types/cctv';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

interface CCTVMapProps {
  cameras: CCTVChannel[];
  selectedIds: Set<number>;
  onCameraClick: (cam: CCTVChannel) => void;
}

// Custom icon factory
const createIcon = (isSelected: boolean) => {
  const colorClass = isSelected ? 'bg-secondary' : 'bg-primary';
  const shadowClass = isSelected 
    ? 'shadow-[0_0_10px_rgba(var(--secondary-rgb),0.8)]' 
    : 'shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)]';

  return L.divIcon({
    className: 'bg-transparent border-none',
    html: `<div class="relative flex items-center justify-center w-6 h-6 cursor-pointer">
             <div class="absolute inset-0 rounded-full border ${isSelected ? 'border-secondary' : 'border-primary'} animate-ping opacity-50"></div>
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

  const withGps = useMemo(
    () => cameras.filter((c) => c.lat !== null && c.lng !== null),
    [cameras]
  );

  if (withGps.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/20">
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
          No GPS Data Available
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-background/50 isolate">
      {/* Toggle Button */}
      <div className="absolute top-4 right-4 z-[1000]">
        <button
          onClick={() => setShowTraffic(!showTraffic)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-lg backdrop-blur-md border ${
            showTraffic 
              ? 'bg-secondary/20 border-secondary/50 text-secondary ring-1 ring-secondary/50' 
              : 'bg-background/80 border-border/50 text-muted-foreground hover:bg-background/90'
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            traffic
          </span>
          Live Traffic
        </button>
      </div>

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
        
        {showTraffic && process.env.NEXT_PUBLIC_TOMTOM_API_KEY && (
          <TileLayer
            url={`https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png?key=${process.env.NEXT_PUBLIC_TOMTOM_API_KEY}`}
            attribution='&copy; <a href="https://www.tomtom.com">TomTom</a>'
            opacity={0.8}
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
