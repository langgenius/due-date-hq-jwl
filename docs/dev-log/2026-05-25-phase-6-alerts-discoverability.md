# 2026-05-25 — Phase 6: Alerts cross-surface discoverability (2 of 4)

## Why

Phase 6 of Yuqi's 89-item review — missing features cluster. Four
items originally in this phase; two ship in this commit (low-cost
wins that close real gaps), two deferred with documented rationale.

## Shipped

### Alerts #12 — "View sources" link

The Alerts page H1 had no path from "I'm reviewing alerts" to "I
want to see what sources feed them." Added a small text link in
the header right-side row pointing to `/rules/library` (the
canonical rule-and-source surface). Uses the same hover-rotate
arrow pattern Phase 3 introduced on the Today page.

### Alerts #2 — "View history" shortcut

The status filter dropdown ALREADY contains all the closed states
(applied / dismissed / reverted / snoozed / reviewed), but they
sit five clicks deep inside a dropdown — Yuqi correctly read this
as "there's no path to history". Added a header-row button that
pre-sets the status filter to `applied` (most common closed
state) as a fast entry into the archive. The button hides when
the user is already viewing a closed-state filter so it doesn't
loop.

Not building a new `/alerts/history` route — the existing list

- filter is the right primitive; we just needed to surface it.

## Deferred (with rationale)

### Alerts #9 — US-map filter

> "should be able to select states, and the filter can be a US map…"

Real visualization work — SVG state shapes, click hit-zones,
keyboard accessibility for state selection, mobile fallback. Too
big to bundle with a polish phase. Two earlier passes should land
first:

1. Confirm the state-filter is actually the most-used path
   (current filter has source + status + impact + change-kind +
   source — adding a giant map ahead of state pre-filter would
   be premature).
2. Decide on the map primitive (`react-simple-maps`? d3-geo? a
   custom Tailwind grid of state cells?). The decision affects
   bundle size by ~30 KB minimum.

Tracked as a separate design exploration; this commit does NOT
close #9.

### Deadlines #30 — Summary tab in obligation drawer

> "add a tab of summary. and put the above progress bar (milestone)
> in there."

Real new tab + content surface in `obligations.tsx`. The drawer
has 4-5 existing tabs and a milestone strip ABOVE the tabs (not
inside one). Moving the milestone into a new "Summary" tab means:

1. New tab key in `ObligationQueueDetailTab` union
2. New content panel that wraps the milestone + maybe other
   summary-y things (key dates, status timeline, etc.)
3. Tab order + default selection logic update

Belongs in Phase 8 (Deadlines redesign) where we're working in
the obligations file at scale, not as a one-off here.

## Verification

- `pnpm exec tsc --noEmit` clean
- `vp lint apps/app/src/features/pulse` 0/0 (29 files)

## Closes Yuqi review items

- Alerts: **#2, #12** (2 of 4 items)
- Deferred: **#9, Deadlines #30** (documented above)

Combined with Phases 1-5 (36 items), the review is at **38 / 89**
(2 closed + 2 documented follow-ups).
