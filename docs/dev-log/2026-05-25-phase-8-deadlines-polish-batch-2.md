# 2026-05-25 — Phase 8 (batch 2): table chrome + drawer alignment + timeline polish

## Why

Continuation of Phase 8 — Deadlines polish. Batch 2 picks up six
more items that were deferred from batch 1 because they needed a
slightly bigger scope than CSS class swaps.

## Shipped (6 items)

### Deadlines #3, #4, #5 — Table chrome + density

The obligations queue Table picked up framing + readable type:

- **#3**: outer `Table` className gains `rounded-md border
border-divider-regular overflow-hidden` so the table reads as a
  framed surface (was edge-to-edge with no boundary). The
  `overflow-hidden` clips the rounded corners against the body
  rows below the header.
- **#4**: TableBody cell override bumped from `py-2` → `py-2.5`.
  Rows breathe by 4px without becoming a sparse list.
- **#5**: TableBody cell text override bumped from `text-xs` (12px)
  → `text-sm` (14px). Client + deadline content was sub-readable
  at 12px; 14px matches the body-tier mapped in Phase 4's
  role-to-token doc addendum.

These are scoped to the obligations queue's `<Table>` call site
only — not the primitive. Other tables in the app stay at their
existing scale until the design system pass lands.

### Deadlines #17 — Drawer header py-4 → py-3

The drawer header had `py-4` (16px) — the form-code title sat
~24px from the top edge, which felt like wasted real estate
above the most important text on the surface. Tightened to `py-3`
(12px) so the h2 reads right at the top edge.

### Deadlines #22 — PathToFilingSummary stage label scale

Stage label was `text-caption` (11px) while the date below it was
`text-caption-xs` (10px) — the two read at different scales and
the column felt unbalanced. Promoted the date's scale: stage
label now `text-caption-xs` (10px) matching the date. Active
state keeps `font-medium` for weight contrast.

### Deadlines #26 — PathToFilingSummary gap

The block of `date + state pill` had `mt-1.5` (6px) gap from the
stage label above — read as too loose, making the date feel
unrelated to the stage. Tightened to `mt-1` (4px) so stage label

- date + state pill read as one unit per column.

## Still deferred

Same list as batch 1 — #2 (search button), #6/#7/#8/#10/#11
(status visual cluster), #9/#12/#13 (scrollbar + sticky filter),
#16 (drawer top alignment — needs viewport inspection), #23/#24
(PathToFilingSummary skipped-stage rendering — already designed
for; Yuqi's question is the doc gap, not a bug), #25 (date
already at min size), #27/#28/#29 (already in Phase 4), #30
(Summary tab — separate commit).

## Verification

- `pnpm exec tsc --noEmit` clean
- `vp lint apps/app/src/routes/obligations.tsx` 0/0

## Closes Yuqi review items

- Deadlines: **#3, #4, #5, #17, #22, #26** (6 items)

Combined with Phases 1-7 + batch 1 (49 items), the review is at
**55 / 89**.
