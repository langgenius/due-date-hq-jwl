# 2026-05-29 · Pulse firm-wide alert visibility

## What changed

- Changed approved `due_date_overlay` Pulse fan-out to create a `pulse_firm_alert` row for every
  active firm, not only firms with matching open deadlines.
- Added API-level `firmImpact` derived from the existing action mode and firm counts:
  `matched`, `needs_review`, `no_current_match`, or `review_only`.
- Kept `no_current_match` rows visible in `/rules/pulse` while hiding Apply, deadline selection,
  reviewed-set Apply, and proactive client email draft actions.
- Kept outbound Pulse digest email and in-app notification writes limited to firms where
  `matchedCount + needsReviewCount > 0`.
- Added labels for the currently configured email subscription sources so alert rows show a concrete
  state/source name instead of raw source ids.

## Boundaries

- No database enum, field, or migration was added. Firm impact is derived at the API boundary.
- `no_current_match` is still an active review alert until the CPA marks reviewed, dismisses, or
  snoozes it, but it does not trigger proactive email/in-app notification.
- Source-level `actionMode` remains whatever extraction produced; a firm's lack of open deadline
  matches does not downgrade the source Pulse to global `review_only`.
