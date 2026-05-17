# Design Specification: TomTom Live Traffic Integration

## 1. Overview
Integrasi fitur pemantauan kemacetan lalu lintas (*Live Traffic*) menggunakan TomTom Traffic API (Tile Flow). Fitur ini akan digabungkan secara eksklusif pada halaman Monitoring (`/cctv`), khusus saat pengguna sedang membuka tampilan **Tactical Map**.

## 2. Architecture & Data Flow
- **Data Source:** TomTom Traffic API (Endpoint: `traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png`).
- **Security:** API Key akan dikelola menggunakan *environment variable* `NEXT_PUBLIC_TOMTOM_API_KEY`.
- **Component Scope:** Perubahan difokuskan pada komponen `CCTVMap.tsx` atau komponen *wrapper* peta yang di-*render* oleh halaman `/cctv`. Halaman Analytics (`DashboardMap`) tidak akan terpengaruh.

## 3. UI/UX & Interaction
- **Toggle Control:** Layer kemacetan tidak aktif secara bawaan (*default off*). Akan disediakan tombol/sakelar (contoh: "Live Traffic") di antarmuka peta (contoh: pojok kanan atas, atau bersamaan dengan kontrol peta lainnya) dengan gaya *glass-panel*.
- **Visual Feedback:** 
  - Saat tombol *toggle* aktif, indikator visual (seperti pendaran/glow atau perubahan warna) akan menyala.
  - Garis warna-warni (Merah = Macet, Kuning = Padat, Hijau/Bening = Lancar) akan menutupi jalan utama pada *basemap*.
  - Layer kemacetan akan di-*render* di antara *basemap* utama dan layer Marker CCTV (agar marker tetap bisa diklik).

## 4. Performance & Quota Management
- Layer TomTom hanya di-*mount* ke dalam DOM/Leaflet instance jika status *toggle* bernilai `true`.
- Begitu dimatikan, request jaringan ke server TomTom untuk *tiles* baru akan sepenuhnya berhenti untuk menghemat kuota harian *Freemium* (50.000 tile requests/hari).

## 5. Implementation Steps (Draft)
1. Set up environment variable in `.env`.
2. Update `CCTVMap.tsx` state to include `showTraffic` boolean.
3. Build the UI Toggle Button overlay inside the Map component.
4. Add `TileLayer` conditionally rendering TomTom endpoint.
