# /rules/library overview — de-clutter pass (light + bold)

**Date:** 2026-06-29
**Files:** `apps/app/src/routes/rules.library.tsx`

## Why

Yuqi: the overview "looks messy" — the over-correction after an earlier "looks flat and plain — use
colour/caps/groupings" pass. Goal: land it in the middle (calmer, but not flat). Follows the
`be4e50a1` "drop the duplicated Pending stat" commit.

## What changed

**Light:**

- **Dropped the "Total rules" stat** — the rail already shows the catalog total ("Overview 479") and
  its footer the jurisdiction count ("52 jurisdictions"). (Removed the orphaned `jurisdictionCount`.)
- **"Nd waiting" now shows only on the longest-waiting tier** in "Where to start" — the high-severity
  tier leads with the HIGH chip (that's its reason for ordering), so the wait there was just card noise.

**Bold:**

- **The metric band → the compact `StatSummaryStrip`.** After the two drops it was a 2-stat band
  spanning full width with a half-empty right side. Collapsed it to a one-line
  `7 High-severity · 100% Coverage` (~24px, the app-wide strip pattern), tone moved onto the values
  (high-severity amber when > 0; coverage amber only when there's a gap). High-severity keeps its
  click-to-review-all action. Coverage stays (its only home); the rest now lives in the rail +
  "Where to start".

Net: upper zone is prompt → one-line metrics → "Where to start". The parallel session's "Where to
start" tiering + rail flags are kept (colour/structure intact — not flattened).

## Verification

Live-verified at each step; `vp check` clean (format + lint + types).
