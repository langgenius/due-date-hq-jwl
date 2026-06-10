# Alerts Map Width Balance

## Change

- Increased the `/alerts` Map view right-hand active-alert rail from `420px` to `460px`.
- This slightly narrows the left map panel and gives the alert rows more room in the navigator rail.

## Validation

- Browser verification target: `/alerts` with Map view active.
- In the 1978px-wide in-app browser viewport, the map panel measured 892px and
  the active-alert rail measured 460px, separated by the existing 24px gap.
- `pnpm --filter @duedatehq/app test -- src/features/alerts/AlertsListPage.test.tsx`
- `git diff --check` scoped to the touched alert page and dev-log files.
- No catalog update required; no user-facing copy changed.
