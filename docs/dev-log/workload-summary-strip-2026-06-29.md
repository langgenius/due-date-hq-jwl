# /workload summary → compact strip; StatSummaryStrip drops zero segments

**Date:** 2026-06-29
**Files:**

- `apps/app/src/features/workload/workload-page.tsx` (top page-summary band → strip)
- `apps/app/src/components/patterns/stat-band.tsx` (`StatSummaryStrip` now drops numeric-zero cells)

## Why

The last genuinely-clean StatBand-to-strip candidate (its sub-captions were tone-only filler, not
information). Yuqi asked to convert it.

## What changed

- **Top "Team workload summary" band → `StatSummaryStrip`.** The two tone cells (overdue → destructive,
  unassigned → warning) move their tone from the dropped sub onto the value via `valueClass`. The
  **in-card "Manager triage metrics" band is left as a `StatBand`** — its border-y hairlines give
  structure inside the Owner-workload Card, where a bare strip would read worse.
- **`StatSummaryStrip` now drops numeric-zero segments by default** (and renders nothing when that
  leaves it empty). A "0 Due soon" / "0 Unassigned" chunk is just noise in a one-line summary — its
  absence already says zero. So workload reads `15 Open · 12 Overdue · 1 Waiting · 3 Review` instead of
  a six-piece line with two zeros. Centralises the zero-drop that /deadlines + /clients did at their
  call sites (their pre-filters are now harmlessly redundant; no visible change there).

## Verification

Live-verified: workload strip drops the zeros ("Overdue" red); /deadlines + /clients unchanged
(`12 Overdue · 10 In review · 6 Filed`, `19 Active deadlines · 8 At risk`). `tsgo` clean.
