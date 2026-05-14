# CCTV Monitoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a high-density CCTV Monitoring page with a tactical HUD interface and a compact regional sidebar.

**Architecture:** 
- **CCTVPageClient:** Main layout orchestrator.
- **CCTVSidebar:** Sidebar with regional grouping using shadcn Accordion.
- **CCTVGridView:** Responsive grid for multiple camera feeds.
- **CCTVGridItem:** Individual camera slot with a "Tactical HUD" overlay for coordinates and metadata.

**Tech Stack:** Next.js 14, Tailwind CSS, shadcn/ui, Lucide React, Space Grotesk font.

---

### Task 1: Setup UI Components

**Files:**
- Create: `components/ui/*.tsx` (via shadcn CLI)

- [ ] **Step 1: Install required shadcn components**

Run: `npx shadcn@latest add accordion badge button scroll-area tabs sheet input`

- [ ] **Step 2: Verify installation**

Check: `components/ui/accordion.tsx`, `components/ui/badge.tsx`, etc.

- [ ] **Step 3: Commit**

```bash
git add components/ui/
git commit -m "chore: add shadcn ui components for cctv monitoring"
```

---

### Task 2: Implement Compact Regional Sidebar

**Files:**
- Create: `components/cctv/CCTVSidebar.tsx`
- Modify: `app/cctv/CCTVPageClient.tsx` (to update imports)

- [ ] **Step 1: Create CCTVSidebar with Accordion grouping**

```tsx
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
// ... implementation details for regional grouping
```

- [ ] **Step 2: Add hover/active states for coordinates in sidebar**
Ensure `lat` and `lng` are displayed subtly on hover.

- [ ] **Step 3: Commit**

```bash
git add components/cctv/CCTVSidebar.tsx
git commit -m "feat: implement compact regional sidebar with accordion"
```

---

### Task 3: Implement Tactical HUD Grid Item

**Files:**
- Create: `components/cctv/CCTVGridItem.tsx`
- Create: `components/cctv/CCTVPlayer.tsx` (simplified player)

- [ ] **Step 1: Create CCTVGridItem with Glassmorphism Overlays**

```tsx
// HUD elements:
// Top-Left: Camera Name
// Bottom-Left: Coordinates [Lat, Lng]
// Top-Right: LIVE status badge
```

- [ ] **Step 2: Add hover management controls (Remove button)**

- [ ] **Step 3: Commit**

```bash
git add components/cctv/CCTVGridItem.tsx components/cctv/CCTVPlayer.tsx
git commit -m "feat: implement tactical HUD grid item with coordinates"
```

---

### Task 4: Finalize Grid View and Page Layout

**Files:**
- Create: `components/cctv/CCTVGridView.tsx`
- Modify: `app/cctv/CCTVPageClient.tsx`

- [ ] **Step 1: Implement CCTVGridView with dynamic layouts (1x1 to 4x4)**

- [ ] **Step 2: Connect CCTVSidebar and CCTVGridView in CCTVPageClient**

- [ ] **Step 3: Add "Tactical Map" view mode using DashboardMap (Dynamic Import)**

- [ ] **Step 4: Verify coordinates visibility in both Grid and Sidebar**

- [ ] **Step 5: Commit**

```bash
git add components/cctv/ app/cctv/CCTVPageClient.tsx
git commit -m "feat: finalize cctv monitoring page with grid and map views"
```
