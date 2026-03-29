'use client';

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { CCTVChannel } from '@/types/cctv';

const REGION_COLORS: Record<string, string> = {
  'Badung':         '#81ecff',
  'Badung Selatan': '#00d4ec',
  'Denpasar':       '#00fc40',
  'Gianyar':        '#ffbd5c',
  'Klungkung':      '#ec9e00',
  'Karangasem':     '#ff716c',
  'Buleleng':       '#aaabb0',
  'Jembrana':       '#74757a',
  'Tabanan':        '#c8c6d0',
  'Bangli':         '#46484d',
  'Lainnya':        '#535353',
};

interface Props {
  cameras: CCTVChannel[];
}

export default function DashboardMap({ cameras }: Props) {
  const geolocated = cameras.filter((c) => c.lat !== null && c.lng !== null);

  return (
    <MapContainer
      center={[-8.4095, 115.1889]}
      zoom={9}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />
      {geolocated.map((cam) => (
        <CircleMarker
          key={cam.cctv_id}
          center={[cam.lat!, cam.lng!]}
          radius={5}
          pathOptions={{
            color: REGION_COLORS[cam.region] ?? '#81ecff',
            fillColor: REGION_COLORS[cam.region] ?? '#81ecff',
            fillOpacity: 0.85,
            weight: 1,
          }}
        >
        <Popup maxWidth={220}>
            <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 170 }}>
              {/* Region badge */}
              <p style={{
                fontSize: 9,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: REGION_COLORS[cam.region] ?? '#81ecff',
                marginBottom: 5,
                marginTop: 0,
              }}>
                {cam.region}
              </p>
              {/* Channel name — explicit dark bg text */}
              <p style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#f0f1f5',
                lineHeight: 1.4,
                marginBottom: cam.lat && cam.lng ? 6 : 0,
                marginTop: 0,
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              }}>
                {cam.ch_name}
              </p>
              {cam.lat && cam.lng && (
                <p style={{
                  fontSize: 9,
                  color: '#74757a',
                  fontFamily: 'monospace',
                  marginTop: 0,
                  marginBottom: 0,
                }}>
                  {cam.lat.toFixed(5)}, {cam.lng.toFixed(5)}
                </p>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
