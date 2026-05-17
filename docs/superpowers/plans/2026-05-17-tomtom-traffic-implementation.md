# TomTom Live Traffic Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan layer Live Traffic dari TomTom API ke Tactical Map (di dalam `/cctv`) beserta tombol toggle UI-nya tanpa mengubah peta di halaman Analytics.

**Architecture:** Modifikasi akan dilakukan pada komponen `CCTVMap.tsx`. Sebuah state lokal `showTraffic` akan dikelola. Tombol UI bergaya *glass-panel* akan diletakkan secara absolut (menumpuk di atas peta) untuk mengubah state tersebut. Jika `showTraffic` aktif dan API key tersedia dari environment, `TileLayer` TomTom akan di-render di dalam `MapContainer`.

**Tech Stack:** React, Next.js, react-leaflet, Tailwind CSS

---

### Task 1: Add State and Toggle UI in CCTVMap

**Files:**
- Modify: `components/cctv/CCTVMap.tsx`

- [ ] **Step 1: Update imports and add state**

Ubah baris import React untuk menyertakan `useState`, dan tambahkan state `showTraffic` ke komponen `CCTVMap`.

```tsx
import React, { useEffect, useMemo, useState } from 'react';
// ... (import lainnya tidak diubah)

export default function CCTVMap({ cameras, selectedIds, onCameraClick }: CCTVMapProps) {
  const [showTraffic, setShowTraffic] = useState(false);
  
  const withGps = useMemo(
// ...
```

- [ ] **Step 2: Build the UI Toggle Button**

Tambahkan elemen tombol melayang di dalam div `relative` pembungkus utama, di bawah atau di atas `<MapContainer>`. Kita akan meletakkannya di bawah `MapContainer` secara kode (karena `absolute z-10` akan membuatnya tampil di atas).

```tsx
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
// ...
```

- [ ] **Step 3: Add TomTom TileLayer Conditionally**

Tambahkan `TileLayer` baru di dalam `MapContainer`. Pastikan layer ini di-render *setelah* basemap (agar ada di atas basemap) tapi *sebelum* `Marker` (agar marker tetap bisa diklik).

```tsx
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
// ...
```

- [ ] **Step 4: Commit changes**

```bash
git add components/cctv/CCTVMap.tsx
git commit -m "feat: integrate TomTom live traffic layer with UI toggle in tactical map"
```
