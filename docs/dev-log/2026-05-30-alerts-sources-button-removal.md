# Alerts Sources Button Removal

## Context

The Alerts page header had a `Sources` action that sent users to the general
Rules source catalog. There is not yet an alert-specific sources page, so the
button implied a narrower workflow than the destination could satisfy.

## Change

- Removed the `/rules/pulse` header `Sources` button.
- Removed the non-embedded Alerts header `View sources` fallback action.
- Kept `Alert history` as the only Alerts header navigation action.

## Validation

- `pnpm --filter @duedatehq/app test -- AlertsListPage`
- Playwright smoke via `/api/e2e/demo-login?role=manager&redirectTo=/rules/pulse` confirmed
  the authenticated Alerts header has no `Sources` / `View sources` action and still shows
  `Alert history`.
