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

## Duplicate extract follow-up

- Refreshed firm alerts when a queued source snapshot is classified as a duplicate of an existing
  approved Pulse. The snapshot still ends as `duplicate`, but the approved Pulse now re-runs the
  firm-wide alert fan-out so newly enabled firm-wide visibility is backfilled during resend tests.
- Kept duplicate snapshots that point to non-approved or missing Pulse rows side-effect-free; they
  report `alertCount=0` in the extract metric.

## Active/history refresh follow-up

- Split active alert list semantics from alert history semantics. `/rules/pulse` now reads the same
  active-alert query as the page-title count, while `/rules/pulse/history` reads handled alerts.
- Defined history as CPA-handled alerts: `dismissed`, `snoozed`, `partially_applied`, `applied`,
  `reverted`, and `reviewed`. Unhandled `matched` alerts stay out of history.
- Restored the sidebar Alerts badge to the active queue count so handled history rows do not inflate
  the needs-attention count.
