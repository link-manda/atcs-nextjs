# UI Refinement Design: Unified Tactical Interface

**Status:** Approved
**Date:** 2026-05-14
**Goal:** Resolve overlapping UI components on Dashboard and Analytics pages by unifying HUD elements into the sidebar and maximizing map visibility.

## 1. Problem Statement
Current Dashboard and Analytics pages have multiple floating overlays (Legends, System Status, GPS HUD) that overlap with each other and obscure the map nodes. This reduces the "Command Center" effectiveness and creates a cluttered user experience.

## 2. Proposed Solution: Sidebar-First HUD
Physical separation of metadata and geospatial observation. The sidebar will act as the "Intelligence Panel" while the map remains a "Pure Observation Canvas".

### 2.1 Component Refinements
- **Dashboard Sidebar**: 
    - Integrate "Tactical Map Overlay v4.2" and "OPERATIONAL" status into the header.
    - Consolidate "Active Nodes" and "GPS Coverage" stats into the primary stat grid.
    - Embed the "Regional Legend" directly into the "Distribusi Per Wilayah" section.
- **Analytics Sidebar**:
    - Similar header unification as Dashboard.
    - Move floating map overlays into the sidebar's detailed breakdown sections.
- **Tactical Map (Leaflet Integration)**:
    - Replace pseudo-interface with real `react-leaflet`.
    - Markers: Tactical pulsing dots themed by region color.
    - Popups: Glassmorphic minimal popups showing Camera Name and Coordinates.
    - Full-bleed canvas without blocking floating panels.

## 3. Architecture & Data Flow
- **Data Source**: Remains Bali Satu Data API via `getCCTVChannels`.
- **State Management**: Sidebar and Map communicate via props. Selection on Map highlights item in Sidebar (and vice versa).
- **Libraries**: `react-leaflet`, `leaflet`, `lucide-react`.

## 4. Design Specs
- **Colors**: Preservation of Kinetic aliases (`primary.fixed`, `secondary.fixed`).
- **Typography**: Space Grotesk for HUD headers, Inter for data, Monospace for GPS coordinates.
- **Layout**: 
    - Sidebar: Fixed 320px-380px width on desktop.
    - Map: `flex-1` relative canvas.

## 5. Verification Plan
- **Spatial Audit**: Ensure no overlapping <div> elements in any responsive view (Desktop/Mobile).
- **Functional Check**: Verify Leaflet map loads correctly with all ~92 nodes as markers.
- **Visual Check**: Glassmorphism consistency across Sidebar cards and Map popups.
