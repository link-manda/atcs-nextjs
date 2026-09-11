# AGENTS.md — Bali Command Center / ATCS Next

## Quick Commands
```bash
npm run dev          # dev server at localhost:3000
npm run build        # production build
npm run start        # start prod server (after build)
npm run lint         # eslint (next lint)
npx jest             # all tests
npx jest app/cctv/CCTVPageClient.test.tsx  # single file
npx jest -t "caps selection"                # by test name
```

## Architecture Essentials

**Server → Client data flow:** `data/cctv-api.ts` (marked `import 'server-only'`) fetches from two upstream APIs with 15-min ISR (`next: { revalidate: 900 }`). Pages re-export `CCTV_DATA_REVALIDATE_SECONDS` as route-level `revalidate`.

**Two upstream sources merged in `getAllCCTVChannels()`:**
1. Provincial — `balisatudata.baliprov.go.id/api/v1/report-cctv`
2. Denpasar ATCS — `atcs.denpasarkota.go.id/api/v3/pv/ldevice` (requires `x-client-id`/`x-client-secret` headers)

**Provincial Denpasar entries are NOT filtered out** — provincial feed has unique cameras (e.g., Padang Galak) the Denpasar feed lacks.

**Normalization:** `mapToChannel()` → `CCTVChannel` type. Adds:
- `player_type` — `detectPlayerType()` in `lib/cctv-utils.ts`: `.mp4` or `/mp4/` → `video`, else `iframe`
- `region` — `detectRegion()` heuristic (name keywords, URL host, lat/lng fallback). **Edit this function when classification looks wrong** rather than patching display logic downstream.

## Proxy and Stream Architecture

1. **Secured HLS Streaming Proxy** at `app/api/proxy/hls/route.ts`:
   - Proxies `.m3u8` playlists and `.ts` video chunks to resolve browser CORS limitations on cross-origin media streams.
   - Enforces strict security allowlist restricting targets to `atcs.denpasarkota.go.id` and `transcode.baliprov.go.id`.
   - Rejects non-HTTPS schemes, private IP ranges (SSRF protection), and non-whitelisted hostnames.

## Routes
- `/` → `app/page.tsx` → `DashboardClient.tsx` (Bali-wide tactical map + stats)
- `/cctv` → `app/cctv/page.tsx` → `CCTVPageClient.tsx` (grid of live streams, sidebar selection, capped by `maxSlots`)
- `/ai-station` → `app/ai-station/page.tsx` → `AIStationClient.tsx` (client-side WebGL vehicle detection & tripwire tracking)
- `/analytics` — traffic visualizations
- `/api/proxy/hls` — secured HLS stream proxy

## Map Components
Anything importing `leaflet` or `react-leaflet` **must** use `next/dynamic` with `{ ssr: false }`. Pattern in `DashboardClient.tsx` — `DashboardMap` is dynamic, delegates to `components/cctv/CCTVMap.tsx` with no-op selection handlers. TomTom traffic layer toggled in `CCTVMap` via `showTraffic` state, reads `NEXT_PUBLIC_TOMTOM_API_KEY`.

## Layout
`app/layout.tsx` wraps every route in `components/layout/AppShell.tsx` (top nav, mobile sheet, footer, radial-gradient background). Pages render only content — **do not re-add a header**.

## Conventions
- **Path alias:** `@/*` → repo root. Use everywhere instead of `../../` chains.
- **Server vs client:** Fetch in Server Components (`app/**/page.tsx`), pass plain props into `'use client'` components. Keep `data/*` server-only.
- **Design system ("Kinetic Observatory"):** No 1px solid borders for sectioning (use `surface-container` tonal tiers), `glass-panel` utility for HUD overlays, Space Grotesk headlines + Inter body, luminous accents via soft shadows/gradients on active state.
- **Tailwind tokens:** `tailwind.config.js` exposes `surface-container`, `surface-container-high`, `surface-container-highest`, `on-surface`, `on-surface-variant`, plus `primary.fixed`/`primary.dim` and `secondary.fixed`/`secondary.dim`. Region marker colors in `DashboardClient.tsx`'s `REGION_COLORS` — keep in sync with `CCTVRegion` union in `types/cctv.ts`.
- **UI text is Indonesian** — match locale of surrounding code ("Memuat", "Wilayah", "Kamera").

## Gotchas
- `revalidate` export on a page must be a literal or re-exported constant from a server module — re-exporting `CCTV_DATA_REVALIDATE_SECONDS` from `data/cctv-api.ts` works because that module is server-only.
- Adding a new region requires updates in **three places**: `CCTVRegion` union (`types/cctv.ts`), `ALL_REGIONS` + `detectRegion` heuristic (`lib/cctv-utils.ts`), and `REGION_COLORS` in `DashboardClient.tsx`.
- `next.config.js` only allowlists `lh3.googleusercontent.com` and `shinobi.bulelengkab.go.id` for `next/image` remote patterns. Add new hosts there before using `<Image>` against them.
- TypeScript `target: "es5"` and `strict: true` — avoid syntax requiring downlevel helpers in shared utilities.
- **AI Vision Engine:** Runs in-browser via `@tensorflow/tfjs` (WebGL backend) + `@tensorflow-models/coco-ssd` (mobilenet_v2). It processes video frame pixels directly via canvas rendering and lightweight unsharp mask convolution, feeding real-time bounding boxes to the client-side centroid vehicle tracker.

## Environment Variables
- `CCTV_API_URL` — optional override for provincial CCTV endpoint
- `NEXT_PUBLIC_TOMTOM_API_KEY` — required for live traffic tile layer
- `DENPASAR_CLIENT_ID` — Denpasar ATCS API client ID header (fallback provided for development)
- `DENPASAR_CLIENT_SECRET` — Denpasar ATCS API client secret header (fallback provided for development)
- `BULELENG_TOKEN` — Buleleng stream access token