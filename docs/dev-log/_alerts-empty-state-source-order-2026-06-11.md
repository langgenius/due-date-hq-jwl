# Alerts empty-state source order

**Date:** 2026-06-11
**Surface:** `/alerts` empty state — `apps/app/src/features/alerts/AlertsListPage.tsx`

## Change

Updated the no-alerts empty-state copy so IRS appears before CA FTB:

- `When IRS, CA FTB, or another monitored source publishes a change, it will land here.`
- The `Last check: ...` variant uses the same source order.

The preview route and alerts product-design exact-copy spec were updated to match the implemented
copy.
