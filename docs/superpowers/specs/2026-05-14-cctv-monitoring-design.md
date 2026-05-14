# Design Specification: CCTV Monitoring Grid (ATCS Bali)

## 1. Overview
The CCTV Monitoring page is a critical component of the ATCS Bali Command Center, providing operators with a high-density, real-time visual grid of traffic feeds. This specification focuses on transforming the existing grid into an informative "Tactical HUD" interface, emphasizing metadata visibility (coordinates) and space efficiency (compact sidebar).

## 2. Design Philosophy
Following the **"Kinetic Observatory"** theme:
- **Tonal Depth:** Deep charcoal backgrounds to minimize eye strain.
- **Glassmorphism:** HUD elements use semi-transparent backgrounds with backdrop blur to maintain visibility of the feed behind the UI.
- **Luminous Accents:** Cyan (`primary`) accents for active states and technical readouts.
- **Instrumental Precision:** Use of **Space Grotesk** for headings and **Monospace** fonts for technical data like GPS coordinates.

## 3. Component Specifications

### 3.1 CCTVSidebar (Compact Tactical List)
- **Component:** `Accordion` (from shadcn/ui).
- **Grouping:** Grouped by `CCTVRegion` (e.g., Denpasar, Badung Selatan).
- **Header:** Displays Region Name + Count Badge (e.g., "Denpasar [12]").
- **Item Styling:**
    - Height: `32px` (compact).
    - Typography: Inter (UI), Space Grotesk Mono (Coordinates).
    - **Normal State:** Shows camera name only.
    - **Hover/Selected State:** Reveals GPS coordinates in a subtle, smaller font below the name.
    - **Selection Indicator:** A pulsing cyan dot or vertical bar on the left for cameras currently active in the grid.
- **Search:** Top-mounted search input for global filtering across all regions.

### 3.2 CCTVGridView & CCTVGridItem (Tactical HUD)
- **Layouts:** Supports various grid configurations (1x1, 2x2, 3x3, 4x4).
- **HUD Overlays (Per Slot):**
    - **Top-Left Badge:** Camera Name (Space Grotesk Bold).
    - **Bottom-Left HUD:** GPS coordinates (e.g., `GPS [ -8.6732, 115.2155 ]`) in monospace font.
    - **Top-Right Status:** "LIVE" indicator with a pulsing green dot.
    - **Interactive Layer:** "Remove" button appears on hover in the center or top-right.
- **Styling:** All overlays use the `glass-panel` utility with `backdrop-blur`.

## 4. Interaction Flow
1. **Discovery:** Operator navigates the Regional Accordion or uses the Search bar.
2. **Selection:** Operator clicks a camera name (Multi-select). The system adds the camera to the first available slot in the grid.
3. **Observation:** Feed loads with HUD overlays providing instant geospatial context (coordinates).
4. **Management:** Operator hovers over a grid slot to reveal management controls (Remove).

## 5. Technical Considerations
- **Data Model:** Utilizes `CCTVChannel` type with `lat`, `lng`, and `region`.
- **Next.js:** Server-side data fetching passed to `CCTVPageClient`.
- **Player Types:** Handles both `iframe` (standard streams) and `video` (.mp4) player types.
- **Performance:** Ensure efficient rendering of multiple simultaneous video feeds; limit grid density to a maximum of 16 (4x4) to maintain browser stability.

## 6. Design System Tokens (Custom Preset)
- `background`: `#0c0e12`
- `primary`: `#81ecff` (Cyan Luminous)
- `surface_container`: `#171a1f`
- `glass-panel`: Custom utility with `bg-surface-bright/5` and `backdrop-blur-md`.
