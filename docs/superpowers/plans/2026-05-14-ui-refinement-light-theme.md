# UI Refinement (Light Theme) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine Dashboard and Analytics UI by unifying HUD elements into the sidebar and switching to a Light Theme aesthetic.

**Architecture:** 
- **Global Theming:** Update `globals.css` and `tailwind.config.js` to support a cohesive Light Mode.
- **Sidebar-First HUD:** Refactor `DashboardClient` and `AnalyticsClient` to move floating overlays into the sidebar.
- **Tactical Map:** Update `CCTVMap` and `DashboardMap` to use real `react-leaflet` with light-themed tactical markers.

**Tech Stack:** Next.js 14, Tailwind CSS, react-leaflet, Leaflet, shadcn/ui.

---

### Task 1: Light Theme Foundation

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update globals.css with Light Theme OKLCH variables**

```css
@layer base {
  :root {
    --background: oklch(0.985 0 0);
    --foreground: oklch(0.141 0.005 285.823);
    --card: oklch(1 0 0);
    --card-foreground: oklch(0.141 0.005 285.823);
    --popover: oklch(1 0 0);
    --popover-foreground: oklch(0.141 0.005 285.823);
    --primary: oklch(0.488 0.243 264.376); /* Tactical Blue */
    --primary-foreground: oklch(0.985 0 0);
    --secondary: oklch(0.627 0.265 149.213); /* Tactical Green */
    --secondary-foreground: oklch(0.985 0 0);
    --muted: oklch(0.967 0.001 286.375);
    --muted-foreground: oklch(0.552 0.016 285.938);
    --accent: oklch(0.967 0.001 286.375);
    --accent-foreground: oklch(0.21 0.006 285.885);
    --destructive: oklch(0.577 0.245 27.325);
    --border: oklch(0.92 0.004 286.32);
    --input: oklch(0.92 0.004 286.32);
    --ring: oklch(0.488 0.243 264.376);
    --radius: 0.625rem;
  }
}
```

- [ ] **Step 2: Remove 'dark' class from Root Layout**

```tsx
// app/layout.tsx
// Change:
<html lang="id" className={cn("dark", ...)}>
// To:
<html lang="id" className={cn("light", ...)}>
```

- [ ] **Step 3: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "style: initialize light theme foundation"
```

---

### Task 2: Refactor Dashboard Sidebar HUD

**Files:**
- Modify: `app/DashboardClient.tsx`
- Modify: `components/layout/AppShell.tsx`

- [ ] **Step 1: Update AppShell colors for Light Mode**
Update header background from `black/40` to `white/70` and text colors.

- [ ] **Step 2: Move Dashboard Map HUD into Sidebar Header**
Remove floating overlays from `DashboardClient` and integrate "Tactical Map v4.2" and "OPERATIONAL" status into the sidebar.

- [ ] **Step 3: Commit**

```bash
git add app/DashboardClient.tsx components/layout/AppShell.tsx
git commit -m "refactor: unify dashboard hud into sidebar"
```

---

### Task 3: Real Leaflet Integration (Light Mode)

**Files:**
- Modify: `components/cctv/CCTVMap.tsx`
- Modify: `components/dashboard/DashboardMap.tsx`

- [ ] **Step 1: Install react-leaflet dependencies (if missing)**
Run: `npm install react-leaflet leaflet`

- [ ] **Step 2: Implement Real Leaflet Map with CartoDB Positron (Light)**
Use a light-themed tile layer and tactical pulsing markers.

- [ ] **Step 3: Commit**

```bash
git add components/cctv/CCTVMap.tsx components/dashboard/DashboardMap.tsx
git commit -m "feat: implement tactical leaflet map with light theme"
```

---

### Task 4: Refactor Analytics and Final Polish

**Files:**
- Modify: `app/analytics/AnalyticsClient.tsx`

- [ ] **Step 1: Unify Analytics HUD into Sidebar**
Consolidate "Coverage GPS" and "Tipe Stream" into the sidebar cards.

- [ ] **Step 2: Final visual audit for Light Mode contrast**

- [ ] **Step 3: Commit**

```bash
git add app/analytics/AnalyticsClient.tsx
git commit -m "refactor: finalize analytics layout and light theme polish"
```
