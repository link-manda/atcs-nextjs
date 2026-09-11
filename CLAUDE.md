# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Bali Command Center / ATCS — a Next.js 14 (App Router) dashboard that aggregates Bali province CCTV feeds, traffic monitoring, and analytics. Stack: TypeScript, Tailwind + Shadcn UI (Radix), Leaflet via `react-leaflet`, native HTML5 video / Hls.js for streams, TensorFlow.js for in-browser neural vision, Lucide + Material Symbols for icons.

## Commands

```bash
npm run dev      # next dev — http://localhost:3000
npm run build    # next build
npm run start    # next start (after build)
npm run lint     # next lint (eslint-config-next)
npx jest         # run all tests (no npm script defined)
npx jest app/cctv/CCTVPageClient.test.tsx   # single test file
npx jest -t "caps selection"                # run by test name
```

There is no `test` script in `package.json`; invoke Jest directly. Jest uses `next/jest`, jsdom, `@/` → repo root path alias (mirrors `tsconfig.json`), and `jest.setup.ts` (imports `@testing-library/jest-dom`).

`CCTV_API_URL` env var optionally overrides the provincial CCTV endpoint. `NEXT_PUBLIC_TOMTOM_API_KEY` is required for the live traffic tile layer. `DENPASAR_CLIENT_ID` and `DENPASAR_CLIENT_SECRET` can override default ATCS API credentials.

## Architecture

### Data flow (server → client)

The data layer lives in `data/cctv-api.ts` and is marked `import 'server-only'` — never import it from a `'use client'` component. It exposes `cache()`-wrapped fetchers with `next: { revalidate: 900 }` (15 min ISR). Pages re-export `CCTV_DATA_REVALIDATE_SECONDS` as their route-level `revalidate`.

Two upstream sources are merged in `getAllCCTVChannels()`:
1. **Provincial** — `balisatudata.baliprov.go.id/api/v1/report-cctv` (Bali Satu Data)
2. **Denpasar ATCS** — `atcs.denpasarkota.go.id/api/v3/pv/ldevice` (requires `x-client-id` / `x-client-secret` headers, uses a flattened `tb_device_lokasi` shape)

Provincial Denpasar entries are **not** filtered out — the provincial feed contains unique cameras (e.g. Padang Galak) the Denpasar feed lacks. Both pages (`app/page.tsx`, `app/cctv/page.tsx`) wrap the server fetch in try/catch and render a styled error block on failure rather than throwing.

Each upstream entry is normalized through `mapToChannel()` into `CCTVChannel` (`types/cctv.ts`). Two derived fields are attached at this stage:
- `player_type` — `detectPlayerType()` in `lib/cctv-utils.ts`: `.mp4` or `/mp4/` → `video`, otherwise `iframe`.
- `region` — `detectRegion()` heuristic that combines name keywords, URL host, and lat/lng fallback bounds. **Edit this function when classification looks wrong** rather than patching display logic downstream.

### Stream rewrites and proxies

1. **Secured HLS Proxy.** `app/api/proxy/hls/route.ts` proxies `.m3u8` playlists and `.ts` video chunks to resolve browser CORS limitations on cross-origin media streams. Enforces strict security allowlist restricting targets to `atcs.denpasarkota.go.id` and `transcode.baliprov.go.id`, rejecting SSRF attempts and non-whitelisted hosts.

### Routes

- `/` (`app/page.tsx` → `DashboardClient.tsx`) — Bali-wide tactical map + stats panel.
- `/cctv` (`CCTVPageClient.tsx`) — grid of live streams with sidebar selection, capped by current layout's `maxSlots`.
- `/ai-station` (`AIStationClient.tsx`) — client-side WebGL vehicle detection & tripwire tracking.
- `/analytics` — traffic report visualizations.
- `/api/proxy/hls` — secured HLS stream proxy.

### Map components

Anything that imports `leaflet` or `react-leaflet` **must** be loaded via `next/dynamic` with `{ ssr: false }`. The pattern is in `DashboardClient.tsx` (`DashboardMap` is dynamic). Leaflet touches `window` at module load and will break SSR/hydration otherwise. `DashboardMap` is a thin wrapper that delegates to `components/cctv/CCTVMap.tsx` with no-op selection handlers.

The TomTom traffic layer is toggled inside `CCTVMap` via `showTraffic` state and reads `NEXT_PUBLIC_TOMTOM_API_KEY`.

### Layout

`app/layout.tsx` wraps every route in `components/layout/AppShell.tsx`, which provides the top nav, mobile sheet, footer, and the radial-gradient background. Pages render only their content; do not re-add a header.

## Conventions

- **Path alias.** `@/*` → repo root. Use it everywhere instead of relative `../../` chains.
- **Server vs client.** Fetch in Server Components (`app/**/page.tsx`), pass plain props into `'use client'` components for interactivity. Keep `data/*` server-only.
- **Design system — "Kinetic Observatory".** Detailed in `GEMINI.md`. Highlights: no 1px solid borders for sectioning (use `surface-container` tonal tiers), `glass-panel` utility for HUD overlays, headlines in Space Grotesk + body in Inter, luminous accents via soft shadows/gradients on active state.
- **Tailwind tokens.** `tailwind.config.js` exposes `surface-container`, `surface-container-high`, `surface-container-highest`, `on-surface`, `on-surface-variant`, plus `primary.fixed`/`primary.dim` and `secondary.fixed`/`secondary.dim` kinetic aliases. Region marker colors live in `DashboardClient.tsx`'s `REGION_COLORS` map — keep it in sync with the `CCTVRegion` union in `types/cctv.ts`.
- **UI text is Indonesian.** Existing copy ("Memuat", "Wilayah", "Kamera") — match the locale of the surrounding code.

## Gotchas

- The `revalidate` export on a page must be a literal or a re-exported constant from a server module — re-exporting `CCTV_DATA_REVALIDATE_SECONDS` from `data/cctv-api.ts` works because that module is server-only.
- Adding a new region requires updates in three places: the `CCTVRegion` union (`types/cctv.ts`), `ALL_REGIONS` and the `detectRegion` heuristic (`lib/cctv-utils.ts`), and `REGION_COLORS` in `DashboardClient.tsx`.
- `next.config.js` only allowlists `lh3.googleusercontent.com` and `shinobi.bulelengkab.go.id` for `next/image` remote patterns. Add new hosts there before using `<Image>` against them.
- TypeScript `target` is `es5` and `strict: true` — avoid syntax that requires downlevel helpers in shared utilities.
