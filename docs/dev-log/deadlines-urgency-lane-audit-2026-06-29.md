# /deadlines urgency lanes — status-aware banding + one shared grouping function (audit P0/P1/P2)

**Date:** 2026-06-29
**Files:**

- `apps/app/src/features/obligations/queue/helpers.ts` (new canonical `urgencyBandOf` + `UrgencyBand` + `URGENCY_BAND_ORDER`)
- `apps/app/src/routes/obligations.tsx` (re-exports the helper; lane-header count cleanup; OFFICIAL DUE demotion)
- `apps/app/src/features/obligations/queue/DeadlineCardGrid.tsx` (uses the shared helper; deleted its drifted copy)
- `apps/app/src/routes/obligations.test.ts` (settled→filed coverage + fixture `status`)

## Why

Yuqi's critique of the /deadlines table: _"why does some row have the left border and some not, tho
they belong to OVERDUE?"_ and _"is it achieving its purpose?"_

Root cause — **two definitions of "overdue" fought each other**. The per-row urgency stripe was
status-aware (suppressed for terminal status via `isDueDaysSuppressedForStatus`), but the LANE
grouping (`urgencyBandOf`) was **date-only**. So a return _filed_ 48d late landed in OVERDUE with no
stripe → the lane looked inconsistent. The OVERDUE lane held **19 rows but only 12 were actionable**
(the other 7 were filed/completed-late, already done), and "19 deadlines" disagreed with the "12
needs action" stat tile.

## What changed

- **P0 — settled work leaves the urgency lanes.** `urgencyBandOf` now routes any terminal-status row
  (done/paid/completed/not_applicable) to a new **`filed` band** at the bottom, regardless of date.
  OVERDUE = only actionable late rows, so every row in it is striped (consistent). Lane **19 → 12**.
  Demo layout: Overdue 12 · Upcoming 8 · Filed 8. The redundant "· N late" suffix is suppressed when
  `lateCount === count`. (Considered + rejected a destructive row background — it would triple-encode
  with the stripe + red text; emphasis came from removing the settled rows, not adding red.)
- **P1 — one grouping function.** `urgencyBandOf`/`UrgencyBand`/`URGENCY_BAND_ORDER` moved to
  `queue/helpers.ts` as the single source of truth; `obligations.tsx` re-exports them (keeps the
  colocated test + `./obligations` importers resolving). `DeadlineCardGrid` now imports them and its
  duplicate `laneOf`/`SETTLED_STATUSES` are deleted — they had drifted (omitted `not_applicable`,
  ignored extension target dates). The card's hero-tone "settled" check also moved to
  `isDueDaysSuppressedForStatus`. Card + table can no longer diverge.
- **P2 — OFFICIAL DUE demoted when redundant.** When the statutory date equals the effective internal
  due date (no firm buffer), the cell renders muted (`text-tertiary`); a real divergence stays
  full-strength. **Retracted** from the audit after closer reading: the `$` payment-overdue coin IS
  labeled (title + `aria-label`) and the REJECTED chip carries state the "In review" pill doesn't —
  both kept.

## Verification

Live-verified the table: Overdue 12 (all striped) · Upcoming 8 · Filed 8; OFFICIAL DUE muted on
no-buffer rows. `tsgo` clean. **All 56 obligations tests pass** (incl. new
`routes settled work to the Filed band regardless of date` test).
