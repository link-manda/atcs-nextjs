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

## Critical Proxy Quirks

1. **Shinobi (Buleleng) MP4 → iframe rewrite** in `mapToChannel()`: provincial API returns `https://shinobi.bulelengkab.go.id/<token>/mp4/<group>/<monitor>/s.mp4` (504/AbortError). Rewritten to `/embed/<group>/<monitor>/fullscreen%7Cjquery%7Chd` iframe URL, then proxied via `app/api/proxy/shinobi/route.ts`. The proxy injects a `<script>` after `socket.io.min.js` that monkey-patches `window.io` to fix a duplicate-URL bug in their `bs5.embed.js`. **Touch carefully — breaking it kills all Buleleng streams.**

2. **Generic Denpasar JSON proxy** at `app/api/proxy/route.ts` — forwards arbitrary URLs with spoofed Denpasar headers/User-Agent for client-side reads needing server-side credentials.

## Routes
- `/` → `app/page.tsx` → `DashboardClient.tsx` (Bali-wide tactical map + stats)
- `/cctv` → `app/cctv/page.tsx` → `CCTVPageClient.tsx` (grid of live streams, sidebar selection, capped by `maxSlots`)
- `/analytics` — traffic visualizations
- `/api/proxy`, `/api/proxy/shinobi` — described above

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
- **AI Vision Input Contract:** `@xenova/transformers` (YOLOS / ONNX) requires a `RawImage` or `ImageData` input tensor and will throw if passed a raw `HTMLVideoElement`. Always use `extractRawImageFromVideo()` in `lib/ai/frame-extractor.ts` to convert video frames before running detector inference.

## Environment Variables
- `CCTV_API_URL` — optional override for provincial CCTV endpoint
- `NEXT_PUBLIC_TOMTOM_API_KEY` — required for live traffic tile layer