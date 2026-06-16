# Alert urgency — Layer 1 lib (deadline proximity)

_2026-06-14_

Phase 1 of the urgency model specced in
[\_eng-brief-2026-06-14-alert-urgency-model.md](./_eng-brief-2026-06-14-alert-urgency-model.md).
Pure logic only — no UI wired yet, so this is safe to land alone.

## What

New `apps/app/src/features/alerts/lib/urgency.ts`:

- `deadlineProximity(actionDeadlineIso, nowMs)` → `{ proximity, days }`,
  bucketing the alert's existing `actionDeadline` into
  `overdue / imminent (≤3d) / soon (≤14d) / scheduled / none`. `nowMs` is
  injected (never `Date.now()` inside) so it's testable and matches the
  horizon filter in `AlertsListPage`.
- `proximityToTier(proximity)` → maps onto the shared `PulsePriorityLevel`
  vocabulary (`urgent / high / normal`) so a Layer-1 row can render the same
  `LEVEL_PILL` as a Layer-2 (smart-priority) row.
- `effectiveTier(alert, nowMs, smartLevel)` → smart-priority level wins when
  present; deadline proximity is the ungated fallback. No firm sees a flat list.
- `proximityTimeTag(result)` → short mono tag (`3d left` / `Due today` /
  `2d overdue`); `null` for `scheduled`/`none` (silence is the signal). Caller
  owns color so pill + tag stay one cue (red-restraint).

18 unit tests in `urgency.test.ts`, all green. `tsgo` clean.

## Why this shape

`actionDeadline` is already on every `PulseAlertPublic` row and the smart
scorer already exists — the only gap was an ungated baseline so firms without
the priority-queue permission still get a time signal. This lib is that
baseline as a pure, dependency-free function; wiring it into the row
(Phase 2/3) is a separate change.

## Not done (next phases)

- Phase 2 — swap the row's pill selection to `effectiveTier`.
- Phase 3 — render `proximityTimeTag` in the meta strip.
- Phase 4 — tune thresholds against real deadline distribution.
