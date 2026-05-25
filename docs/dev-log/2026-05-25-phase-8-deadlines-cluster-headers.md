# 2026-05-25 — Phase 8: Deadlines #6 — multi-deadline cluster headers

## Why

Yuqi #6: when a single client has many deadlines (e.g. 5-10
state filings in a quarter), the queue scrolls into a wall of
same-name rows. The existing "left rail" treatment already welds
adjacent same-client rows into a visual block, but doesn't tell
the eye what the block IS.

Adds a section-header row above each multi-row client cluster
that names the client, counts the deadlines, and surfaces the
earliest internal due date — so a CPA can scan "Bright Studio
Holdings · 5 deadlines · earliest Apr 15" without reading each
leaf.

## Shipped

`apps/app/src/routes/obligations.tsx`

### `groupHeadersByFirstRowId` Map

New `useMemo` keyed off the unfiltered `rows` array. Single
linear scan groups runs of adjacent same-clientId rows. Singleton
groups (one row per client) are excluded — they don't need a
header. Multi-row groups key the FIRST row's id with metadata:

- `clientId`, `clientName`
- `count` (number of obligations in the cluster)
- `earliestDueDate` (min `currentDueDate` across the cluster's
  rows — answers the CPA's "what's the most urgent here?")

Same pattern (and `rows` dependency) as the existing
`continuationRowIds` / `withinGroupRowIds` Sets above. The
cluster math doesn't depend on pagination — the count reflects
all matching rows, not just the current page.

### Section header row in TableBody

`tableRows.map((tableRow) => ...)` rewrapped from an arrow-
expression body into a block-bodied arrow that returns a
`Fragment` containing:

- An optional `<TableRow aria-hidden="true">` section header
  when the current row is the first in a multi-row cluster
- The existing leaf `<TableRow>` (unchanged structurally)

Header row visual:

- `colSpan={visibleColumnCount}` so it spans the full table
- Inline content: `<client name>` (semibold) · `N deadlines` ·
  `earliest YYYY-MM-DD` — all in `text-xs text-text-tertiary` so
  it reads as a quiet label, not another data row
- `border-l-2 border-l-divider-regular` so the existing cluster
  rail extends THROUGH the header for continuity with the
  welded body rows below
- `border-b-0` so the header sits flush with the first leaf row
- `aria-hidden` — the leaf rows already carry the client-name
  semantics; the header is a visual scan aid, not new info

### What's NOT changed

- Selection model: header has no checkbox. Selection still
  happens on leaves. v2 could add a "select all in cluster"
  checkbox; deferred to keep this commit focused.
- Sort: no reordering. Clusters only appear when the current
  sort happens to put same-client rows adjacent (typically true
  for client-name sort, smartPriority sometimes, etc.). Same
  premise as the existing rail.
- Pagination edge case: if a cluster straddles a page boundary,
  page 2 starts mid-cluster without a header. Acceptable for v1
  (the cluster count + earliest still reflect the full result
  set when displayed on page 1). A "page-aware header" pass can
  add a continuation banner later if it matters.
- Collapse / expand: header is read-only. Adding a "fold this
  cluster" affordance is a TanStack-Grouped-Rows-level change —
  out of scope.

## Verification

- `pnpm exec tsc --noEmit` (apps/app) clean
- `vp lint` 0/0 on the route file

## Closes Yuqi review items

- Deadlines: **#6** (multi-deadline grouping — shipped as
  cluster headers v1)

Yuqi review: **78 / 89** closed. Remaining = 11 items that are
either feature builds that came in late (none right now) or
items that landed in older critique batches and were
re-categorized as wontfix/designed-as-is along the way. The
89-item-review queue is fully resolved at the action level.
