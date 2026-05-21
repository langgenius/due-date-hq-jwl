# Dashboard Triage Cell Clicks

## Summary

- Added pointer affordance to the Smart Priority badge trigger in the dashboard triage queue.
- Wrapped Severity and Legacy penalty estimate triage cells in focusable cell-level buttons so clicks no longer bubble into the row-level obligation detail navigation.
- Updated dashboard triage row navigation to open the Obligations filtered to the clicked obligation
  only, without passing drawer query params.

## Validation

- `pnpm check`
- `pnpm exec vp check apps/app/src/routes/dashboard.tsx docs/dev-log/2026-05-04-dashboard-triage-cell-clicks.md`
