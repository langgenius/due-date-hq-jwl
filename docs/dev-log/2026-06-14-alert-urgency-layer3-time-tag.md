# Alert urgency — Layer 3 (deadline time tag)

_2026-06-14_

Phase 3 of the urgency model
([eng brief](./_eng-brief-2026-06-14-alert-urgency-model.md) ·
[L1 lib](./2026-06-14-alert-urgency-layer1-lib.md) ·
[L2 pill](./2026-06-14-alert-urgency-layer2-row-pill.md)).

## What

`PulseAlertRow` now renders `proximityTimeTag(proximity)` — `2d left` /
`Due today` / `2d overdue` — in the head-row right cluster (before the source
link). It explains WHY the tier pill is urgent without adding a second red.

## The red-restraint decision

Per Yuqi (2026-06-14): **neutral tag, red pill only.** The URGENT/HIGH pill
owns the row's single red cue; the time tag is quiet mono `text-text-tertiary`.
The pre-existing date-diff badge ("N days later") is a separate fact (shift
magnitude, not time-to-act) and unchanged.

## Verified live (1465px, demo firm, Active tab)

Top `deadline_shift` row (due Jun 16): red **URGENT** pill + neutral mono
**`2d left`** (Geist Mono, `rgb(103 111 131)`). No tag on `actionDeadline`-null
rows. Screenshot in session.

## Not done

- Phase 4 — tune the 3 / 14-day thresholds against the real `actionDeadline`
  distribution once there's production data.
- Canonical `docs/Design/DueDateHQ-DESIGN.md` entry for the list urgency
  treatment — deferred until thresholds settle (Phase 4).
