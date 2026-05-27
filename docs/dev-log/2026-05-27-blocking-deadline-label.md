# 2026-05-27 - Blocking Deadline Label

## Context

The `/deadlines` queue showed a red `Blocked` status followed by an inline link that only
said `by Arbor & Vale LLC · Form 1065`. The link represented the deadline that was blocking
the current row, but the visible label did not explain that relationship.

## Changes

- Renamed the visible blocked-row dependency link to `Blocked by: {client} · {form}`.
- Updated the link tooltip and accessible label to explain that clicking opens the deadline
  blocking the current row.
- Added a focused component test for the visible label, tooltip, accessible label, and open
  callback.

## Validation

- `pnpm --filter @duedatehq/app test -- blocked-by-chip.test.tsx`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm check` (passes with existing warnings in migration/readiness/workload/notifications/rules
  files)
- Browser and clean Playwright validation on `/deadlines?sort=due_desc`: the blocked dependency
  now renders as `Blocked by: Arbor & Vale LLC · Form 1065`, the old bare `by Arbor...` label is
  gone, and clicking the link opens the Arbor & Vale Form 1065 deadline.
