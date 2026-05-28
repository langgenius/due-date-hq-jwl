# Today Alerts — Restore Horizontal Grid + Drop "View all alerts"

## Context

Two sequential Yuqi reviews on the Today Alerts section:

1. The earlier full-width vertical stack (commit `0b5173be`) left a
   lot of empty pink section background to the right of each alert
   card and made the section read as a cramped mini-inbox stacked
   below the page title.
2. The trailing "View all alerts" link sat parallel to the [+N more]
   overflow tile, but both navigate to `/rules/pulse`. Two
   affordances for one destination on a high-priority section.

## Change

- `apps/app/src/features/dashboard/needs-attention-section.tsx`:
  - Restored the side-by-side grid: `grid-cols-2` when two alerts
    fit, `grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px]` when an
    overflow column is needed.
  - Removed the `<Link to="/rules/pulse">View all alerts</Link>`
    trailing link from the section header. Header `<div>` no longer
    needs `justify-between` since the h2 is the only child.
- `apps/app/src/features/dashboard/needs-attention-card.tsx`:
  - Reverted `NeedsAttentionOverflowCard` back to the column-shaped
    tile (`h-full flex-col items-center justify-center`) so it
    occupies its 160px grid column alongside the two alert cards
    instead of sitting as a flat inline button below them.
- `docs/Design/dashboard-actions-design-brief.md`: ASCII mock-up
  updated — the "View all alerts ↗" line under the alert row is
  gone, with a follow-up note explaining the [+N] tile is now the
  single navigation path.

## Validation

- Local preview at `http://localhost:5183/`. Today page rendered
  with two alert cards (IRS, CA FTB) side-by-side plus a `+ 2 more`
  tile in the right column. No console errors after the reload.
