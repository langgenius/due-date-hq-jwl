# Alert urgency — Layer 2 wiring (row pill reads effectiveTier)

_2026-06-14_

Phase 2 of the urgency model
([eng brief](./_eng-brief-2026-06-14-alert-urgency-model.md) ·
[Layer 1 lib](./2026-06-14-alert-urgency-layer1-lib.md)).

## What

`PulseAlertRow` now sources its leading tier pill from the urgency lib instead
of solely the priority queue:

- **Layer 2 (smart priority)** still wins when present — `priority.level` via
  `effectiveTier`.
- **Layer 1 (deadline proximity)** is the ungated fallback: when the firm has no
  priority-queue data, an alert whose own `actionDeadline` is imminent/overdue
  (urgent) or soon (high) now lights up.
- We still never paint a misleading **NORMAL** pill on baseline rows — a
  baseline tier only renders for urgent/high. A smart-priority NORMAL is kept
  (deliberate queue placement).

## Verified live (1465px, demo firm)

The demo firm has **no** priority-queue permission, so before this change the
list showed **zero** urgency pills. After: the Active tab's `deadline_shift`
alert (due Jun 16, 2 days out) renders a red **URGENT** pill; the three sibling
rows with `actionDeadline: null` stay quiet (no NORMAL noise). Screenshot in the
session.

## Open question for Phase 3 (time tag)

The urgent deadline_shift row already carries the date-diff badge
("N days later"). Adding a `Nd left` time tag would be a third time cue on one
row — bumps against red-restraint. Decide placement/color (or suppress the tag
when the date-diff row is present) before wiring Phase 3.

## Not done

- Phase 3 — `proximityTimeTag` in the meta strip (pending the above decision).
- Phase 4 — threshold tuning against real `actionDeadline` distribution.
