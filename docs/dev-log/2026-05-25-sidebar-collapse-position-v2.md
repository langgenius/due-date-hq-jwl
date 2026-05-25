# 2026-05-25 — Sidebar collapse v2: position + icons

## Why

Yuqi flagged the collapse toggle as "weird position" with a
screenshot: the chevron was rendering as a lonely full-width
centered button orphaned between the footer-nav divider and the
user row. Visually it read as adrift — no other affordance in
that vertical slot, no anchor on either side, and the
hand-rolled SVG chevron didn't carry the "this toggles the
panel" semantic that the lucide `PanelLeft` / `PanelRight`
icons do.

Two fixes:

1. **Move the toggle to the top header row** (next to the firm
   switcher + bell). This matches the VSCode / Notion / Linear
   convention — the user finds the toggle where they look first
   when opening the sidebar, and when collapsed it stays at the
   top of the narrow rail (still easy to find).
2. **Swap the inline-SVG chevron for lucide
   `PanelLeftIcon` / `PanelRightIcon`** so the icon carries the
   "left panel" metaphor instead of a generic chevron that's
   indistinguishable from a back arrow.

## Shipped

### `packages/ui/src/components/ui/sidebar.tsx`

- Added `PanelLeftIcon` + `PanelRightIcon` imports from
  `lucide-react`.
- `SidebarCollapseToggle` reshaped from a full-width `h-8 w-full`
  row to a compact `size-6` square icon button — same hit area
  conventions as the other icon controls in the header row.
- Icon switches by state:
  - Expanded → `PanelLeftIcon` (the left panel is highlighted →
    click to push it back).
  - Collapsed → `PanelRightIcon` (the right side is full →
    click to bring the left panel back).
- JSDoc rewritten to describe the new placement + icon semantic.

### `apps/app/src/components/patterns/app-shell.tsx`

- Top firm-switcher row now ends with `<SidebarCollapseToggle>`
  after `<PulseNotificationsBell>`. When the sidebar collapses
  (data-collapsed=true), the existing `flex-col` cascade stacks
  switcher → bell → toggle vertically inside the 56px rail. The
  toggle gets `group-data-[collapsed=true]/sidebar:mx-auto` so
  it horizontally centers in collapsed mode.
- The dedicated `flex flex-col gap-1 border-t … px-2 py-2`
  wrapper that previously housed the toggle above the user
  menu is gone. The `border-t` rib stays (separates user from
  the nav above) but the inner layout is just the
  `UserMenuTrigger` now.

## Files touched

- `packages/ui/src/components/ui/sidebar.tsx`
- `apps/app/src/components/patterns/app-shell.tsx`

## Verification

- `vp check` → 0 lint/type errors across 674 files
- Visual: top header row reads switcher | bell | toggle when
  expanded; stacks vertically when collapsed.
