```markdown
# Design System Specification: The High-Tech Command Center

## 1. Overview & Creative North Star
**Creative North Star: "The Kinetic Observatory"**
This design system is engineered to transform a standard Area Traffic Control System (ATCS) into a sophisticated, high-performance instrument. Moving away from the cluttered, "boxy" look of legacy industrial software, this system adopts an editorial approach to data density. It treats traffic patterns as living organisms and UI controls as precision tools. 

We achieve a "High-End Editorial" feel through **intentional asymmetry**, where critical telemetry occupies dominant, expansive zones while secondary controls are tucked into high-contrast, nested modules. By utilizing extreme tonal depth and luminous accents, we create a hierarchy that directs the eye to anomalies—congestion, delays, and emergencies—with absolute clarity.

---

## 2. Colors
The palette is rooted in a "Deep Dark" philosophy, utilizing a charcoal-to-slate foundation that minimizes eye fatigue during long shifts while allowing high-contrast data to vibrate with importance.

### The "No-Line" Rule
To achieve a premium, seamless aesthetic, **1px solid borders are strictly prohibited for sectioning.** Boundaries must be defined through background color shifts or tonal transitions. 
- Use `surface_container_low` (`#111318`) for the primary canvas.
- Use `surface_container` (`#171a1f`) for distinct functional modules.
- Use `surface_container_high` (`#1d2025`) for active or focused content.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. A `surface_container_highest` (`#23262c`) card should never sit directly on the `background` (`#0c0e12`); it must follow a natural progression through the container tiers to create a "nested" depth that feels structurally sound.

### The "Glass & Gradient" Rule
Floating panels and HUD overlays must utilize **Glassmorphism**. Apply a semi-transparent `surface_bright` (`#292c33`) with a 20px backdrop-blur. 
- **Main CTAs:** Use a subtle linear gradient from `primary` (`#81ecff`) to `primary_dim` (`#00d4ec`) to provide a "luminous" quality that flat fills lack.
- **Traffic Status:** Flowing traffic utilizes `secondary` (`#00fc40`), slow traffic uses `tertiary` (`#ffbd5c`), and congestion utilizes `error` (`#ff716c`). These should have a soft outer glow (`4px-8px`) to simulate light emission.

---

## 3. Typography
This design system pairs the utilitarian precision of **Inter** with the architectural character of **Space Grotesk**.

- **Display & Headlines (Space Grotesk):** Reserved for high-level system status and terminal identifiers. The geometric nature of Space Grotesk conveys a futuristic, authoritative tone.
- **Body & Labels (Inter):** Used for all data readouts and interactive elements. Inter’s tall x-height ensures legibility at small scales (e.g., `label-sm` at `0.6875rem`).
- **Data Weight:** Use `headline-sm` for primary metrics (e.g., Average Speed) and `label-md` for metadata (e.g., Unit of Measure). High contrast between `on_surface` (`#f6f6fc`) and `on_surface_variant` (`#aaabb0`) is key to quick scanning.

---

## 4. Elevation & Depth
In a high-tech command center, depth is a functional tool used to separate "the map" from "the controls."

- **Tonal Layering:** Achieve elevation by "stacking" surface-container tiers. A `surface_container_lowest` (`#000000`) element on a `surface_container` (`#171a1f`) base creates a "sunken" appearance—perfect for input fields or data logs.
- **Ambient Shadows:** Shadows must be felt, not seen. Use `4%` opacity of the `on_surface` color with a `32px` blur for floating glass panels. This mimics a natural ambient occlusion rather than a harsh drop shadow.
- **The "Ghost Border" Fallback:** If a layout requires a hard edge for accessibility, use the "Ghost Border"—the `outline_variant` (`#46484d`) token at `15%` opacity. This provides a structural hint without breaking the "No-Line" rule.
- **Glassmorphism:** Use `surface_tint` at `5%` opacity combined with a backdrop-blur for HUD-style tooltips. This ensures the traffic map remains visible beneath the UI.

---

## 5. Components

### Buttons
- **Primary:** Gradient fill (`primary` to `primary_dim`). White (`on_primary`) text. No border. `rounded-md` (`0.375rem`).
- **Secondary:** Transparent background with a `Ghost Border`. Text in `primary`.
- **States:** On hover, primary buttons should increase their outer glow (bloom effect) rather than changing color significantly.

### Traffic Chips
- **Flow State:** Use `secondary_container` (`#006e16`) for the background and `on_secondary_container` (`#e6ffdc`) for the text. 
- **Shape:** Use `rounded-full` (`9999px`) for a pill-shaped, biological feel that contrasts with the rigid grid.

### Cards & Modules
- **Rule:** Forbid divider lines. Use `vertical-space-6` (`1.3rem`) to separate content blocks.
- **Header:** Use a `surface_bright` background for the top `2.75rem` (Space 12) of a card to create a clear "handle" for the eye.

### Input Fields
- **Styling:** Use `surface_container_lowest` with a `Ghost Border`. 
- **Focus:** The border should transition to `primary` (`#81ecff`) with a subtle `2px` outer glow.

### Specialized Component: The Traffic Pulse
A custom visualization component for the ATCS. A thin vertical bar using `primary` for the base, with a "pulse" of `secondary` or `error` that travels upwards based on real-time throughput.

---

## 6. Do's and Don'ts

### Do
- **Do** use `0.3rem` (Space 1.5) increments to align telemetry data in a "tabular-but-airy" format.
- **Do** use `on_surface_variant` for all non-critical labels to keep the UI from feeling "noisy."
- **Do** allow map elements to bleed to the edges of the screen, placing UI modules on top using glassmorphism.

### Don't
- **Don't** use pure white (`#ffffff`) for text; always use `on_surface` (`#f6f6fc`) to prevent "halation" effects on dark backgrounds.
- **Don't** use standard 1px borders to separate table rows; use alternating `surface_container_low` and `surface_container` fills (zebra striping) at very low contrast.
- **Don't** use rounded corners larger than `xl` (`0.75rem`) for main containers; keep the system feeling "instrumental" and "precise" rather than "friendly."

---
*End of Design System Document*```