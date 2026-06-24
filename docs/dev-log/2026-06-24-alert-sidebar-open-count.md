# Alert sidebar count excludes history

Date: 2026-06-24

## Root cause

The sidebar Alerts badge used `pulse.activeCount`, but the backend open-count WHERE
still included `partially_applied`. Alert History also treats `partially_applied`
as a handled Applied-history state, so those rows inflated the sidebar badge beyond
the visible Review + Active work-queue counts.

## Fix

- Added `PULSE_OPEN_ALERT_STATUSES = ['matched']` as the shared DB open-alert status set.
- Updated `listAlerts`, `countActiveAlerts`, `listAlertsForRule`, and the priority queue
  query to use that open status set.
- Left History semantics unchanged: `partially_applied` remains handled history and still
  appears under the Applied history bucket.
- Updated app/API comments and the frontend architecture dev-file so future sidebar work
  reads the badge as Review + Active, not Alert History.

## Verify

- `pnpm --filter @duedatehq/db test -- pulse`
