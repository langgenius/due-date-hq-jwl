# Seventy-ninth pass — sidebar transition smoothness

**Date:** 2026-05-26
**Branch:** `design/filed-strip-dedup`
**Scope:** Fix the sidebar collapse/expand transition so the
firm-switcher row never overflows the painted sidebar boundary.
The previous fix (adding `flex-1` to SidebarHeader) addressed the
static layout but didn't prevent the mid-transition overflow that
made the `SidebarCollapseToggle` visibly leak into the page content
area during the expand animation.

## Diagnosis

Two competing transition timings:

- **Sidebar WIDTH** animates 56→220px over 300ms via
  `transition-[width] duration-300`.
- **`data-collapsed` data-attribute** flips between `'true'` and
  `'false'` INSTANTLY when the user toggles.

`data-collapsed` drives a stack of CSS group selectors that change
layout direction (row vs column), padding, item visibility, etc.
When the user expands a collapsed sidebar:

1. `t=0ms`: `data-collapsed` flips to `false`. The firm-switcher
   row immediately changes from `flex-col` (toggle below avatar)
   to `flex` (horizontal: avatar + name + chevrons + toggle).
2. `t=0–300ms`: sidebar width is still animating 56→220px.
3. The horizontal row's content (40px avatar + 4px gap + name
   - chevrons + 32px toggle ≈ 76px+) is wider than the current
     sidebar footprint, so the toggle visibly **spills into the
     page content area** to the right of the sidebar.
4. `t=300ms`: sidebar reaches 220px. Toggle finally fits inside.

## Fix — two changes

### 1. `overflow-hidden` on the inner overlay (belt)

`packages/ui/src/components/ui/sidebar.tsx` — added
`overflow-hidden` to the inner overlay div that paints the
sidebar's visible chrome:

```diff
- className="absolute inset-y-0 left-0 z-30 flex flex-col border-r ..."
+ className="absolute inset-y-0 left-0 z-30 flex flex-col overflow-hidden border-r ..."
```

Any content that overflows the painted area mid-transition now
clips inside the sidebar instead of spilling into page content.
This is the belt-and-suspenders guarantee that no matter what the
inside-row layout does, the visual boundary is inviolable.

### 2. Asymmetric `data-collapsed` timing (suspenders)

The clip prevents the visual bug, but the layout is still
juddering during the transition (toggle appears, then gets clipped
as content reflows). To make the transition actually SMOOTH, the
layout flip needs to coordinate with the width animation:

- **COLLAPSE (expanded → collapsed)**: flip layout to vertical
  IMMEDIATELY → content gets narrow → width animates 220→56.
  The narrow vertical layout fits within the shrinking footprint
  at every frame.
- **EXPAND (collapsed → expanded)**: hold the collapsed layout
  while width animates 56→220 → flip layout to horizontal AT
  THE END. The horizontal layout never paints inside a too-
  narrow footprint.

Implementation:

```tsx
const targetCollapsed = collapsed && !hovered

// `renderedCollapsed` follows targetCollapsed asymmetrically:
//   • immediate on collapse (true)
//   • delayed 300ms on expand (false)
const [renderedCollapsed, setRenderedCollapsed] = React.useState(targetCollapsed)
React.useEffect(() => {
  if (targetCollapsed) {
    setRenderedCollapsed(true)
    return
  }
  const timer = window.setTimeout(() => setRenderedCollapsed(false), 300)
  return () => window.clearTimeout(timer)
}, [targetCollapsed])
```

Two consumers of the state get different timing:

- **`data-collapsed`** (layout-driving CSS) → uses
  `renderedCollapsed` (delayed on expand)
- **Inner overlay `style.width`** (visual width animation) →
  uses `targetCollapsed` (immediate, so hover-expand is snappy)

This decoupling preserves the snappy hover-expand width animation
while making the LAYOUT flip wait for the painted area to be wide
enough.

## Trade-off considered

A simpler "just hide the toggle in collapsed mode" approach was
considered but rejected — when collapsed, the toggle is the user's
primary affordance to re-expand. Hiding it forces them to hover-
expand first, then click, which is more steps for a common action.

The asymmetric-timing approach keeps the toggle's collapsed-mode
position (stacked below the avatar) untouched while making
expansion smoother.

## Verification

- `pnpm check` — 0 errors, 9 pre-existing warnings (unchanged).

## Result

Collapse: vertical layout snaps in immediately → width shrinks
smoothly. Expand: width grows smoothly → horizontal layout flips
in at the end (now safely inside the wider footprint). The
`overflow-hidden` clip is a defensive backstop if the timer ever
drifts (HMR reload, RAF scheduling, etc.) — the toggle can never
visually leak outside the sidebar.
