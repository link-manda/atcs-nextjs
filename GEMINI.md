# BALI COMMAND CENTER (ATCS Next)

## Project Overview
Modern command center and Area Traffic Control System (ATCS) dashboard for the Bali Province. This application provides real-time geospatial visualization of CCTV cameras, traffic monitoring grids, and analytical reports to assist in provincial traffic management.

### Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Shadcn UI + Radix UI
- **Mapping:** Leaflet (`react-leaflet`)
- **Icons:** Lucide React + Material Symbols
- **Data Fetching:** Native `fetch` with Next.js caching/revalidation

## Architecture & Data Flow
- **Geospatial Dashboard:** Located in the root `/` route. Uses `DashboardClient.tsx` to render an interactive Leaflet map.
- **CCTV Monitoring:** `/cctv` route provides a grid view of live camera feeds.
- **Analytics:** `/analytics` route contains traffic report visualizations.
- **Data Source:** CCTV data is fetched from the official Bali Satu Data API (`balisatudata.baliprov.go.id`).
- **Region Detection:** Logic in `lib/cctv-utils.ts` automatically categorizes cameras into regions (Badung, Denpasar, Buleleng, etc.) based on channel names and coordinates.

## Building and Running
### Development
```bash
npm install
npm run dev
```
Starts the development server at `http://localhost:3000`.

### Production
```bash
npm run build
npm run start
```

### Environment Variables
- `CCTV_API_URL`: (Optional) Override the default Bali Satu Data API endpoint.

### Linting
```bash
npm run lint
```

## Design Philosophy: "The Kinetic Observatory"
The project follows a "High-End Editorial" design system (detailed in `stitch/vector_terminal/DESIGN.md`) that treats traffic data as a living organism.

- **No-Line Rule:** Strictly avoid 1px solid borders for sectioning. Use background color shifts (`surface_container` tiers) to define boundaries.
- **Tonal Depth:** UI is built as a series of physical layers using a dark charcoal-to-slate palette.
- **Glassmorphism:** HUD overlays and floating panels must use semi-transparent backgrounds with backdrop-blur.
- **Typography:** Pairs **Space Grotesk** (Headlines/Status) with **Inter** (Body/Data).
- **Luminous Accents:** Use subtle gradients and soft outer glows for active data and primary CTAs to simulate light emission.

## Development Conventions
- **App Router:** All pages must reside in the `app/` directory.
- **Client/Server Components:** Data fetching should be performed in Server Components (e.g., `app/page.tsx`) and passed to Client Components (`'use client'`) for interactivity.
- **Map Components:** Leaflet-related components MUST be dynamically imported with `ssr: false` to avoid window-reference errors during build/hydration.
- **UI Implementation:** Follow the Design Philosophy rules. Use the `glass-panel` utility for overlays. Avoid hard borders; use `outline-variant/15` (Ghost Border) only if strictly necessary for accessibility.
- **Data Safety:** Logic in `data/cctv-api.ts` uses `server-only` to prevent API endpoints or internal logic from leaking to the client.

## Key Directories
- `app/`: Routing and page components.
- `components/`: Reusable UI components (buttons, cards, map layers).
- `data/`: API integration and data transformation logic.
- `lib/`: Shared utility functions (formatting, detection logic).
- `types/`: Global TypeScript definitions.
- `stitch/`: Design assets and exported templates from the Stitch/Figma design system.
