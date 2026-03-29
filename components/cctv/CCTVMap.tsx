'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { CCTVChannel } from '@/types/cctv';

interface CCTVMapProps {
  cameras: CCTVChannel[];
  selectedIds: Set<number>;
  onCameraClick: (cam: CCTVChannel) => void;
}

const BALI_CENTER: [number, number] = [-8.4095, 115.1889];

export default function CCTVMap({ cameras, selectedIds, onCameraClick }: CCTVMapProps) {
  const camerasWithLocation = cameras.filter(
    (c): c is CCTVChannel & { lat: number; lng: number } =>
      c.lat !== null && c.lng !== null
  );

  return (
    <MapContainer
      center={BALI_CENTER}
      zoom={9}
      style={{ width: '100%', height: '100%', background: '#0c0e12' }}
      zoomControl={true}
    >
      {/* Dark CartoDB tiles to match design system */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {camerasWithLocation.map((cam) => {
        const isSelected = selectedIds.has(cam.cctv_id);
        return (
          <CircleMarker
            key={cam.cctv_id}
            center={[cam.lat, cam.lng]}
            radius={isSelected ? 8 : 5}
            pathOptions={{
              color: isSelected ? '#81ecff' : '#00fc40',
              fillColor: isSelected ? '#81ecff' : '#00fc40',
              fillOpacity: 0.9,
              weight: isSelected ? 2 : 1,
            }}
            eventHandlers={{
              click: () => onCameraClick(cam),
            }}
          >
            <Popup className="cctv-popup">
              <div style={{ minWidth: 160 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#00fc40',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: 2,
                  }}
                >
                  {cam.region}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f6f6fc', marginBottom: 8 }}>
                  {cam.ch_name}
                </div>
                <div style={{ fontSize: 9, color: '#aaabb0', fontFamily: 'monospace', marginBottom: 8 }}>
                  {cam.lat.toFixed(6)}°S &nbsp;{Math.abs(cam.lng).toFixed(6)}°E
                </div>
                <button
                  onClick={() => onCameraClick(cam)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '6px 8px',
                    background: isSelected ? '#ff716c33' : '#81ecff',
                    color: isSelected ? '#ff716c' : '#005762',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    cursor: 'pointer',
                  }}
                >
                  {isSelected ? '✕ Hapus dari Grid' : '+ Tambah ke Grid'}
                </button>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
