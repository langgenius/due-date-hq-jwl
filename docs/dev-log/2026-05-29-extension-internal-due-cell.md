# 2026-05-29 · Extension Internal Due Cell

## Summary

Fixed the Deadlines queue `Internal due date` cell so a deadline with a saved Extension tab target
does not collapse to `—`.

## Shipped

- Matched the queue cell to the drawer deadline strip rule: use `extensionInternalTargetDate` first,
  then fall back to `currentDueDate`.
- Removed `extended` from the queue due-date suppression set. `not_applicable` still renders `—`,
  while filed/completed rows keep their quiet filed-early/late quality stat behavior.
- Updated the hidden exact date column to show the same effective internal target as the visible
  relative due-date column.
- Added focused route-model coverage for extension-active rows and effective internal due-date
  calculation.

## Validation

- `pnpm --filter @duedatehq/app test -- src/routes/obligations.test.ts`
- `pnpm --filter @duedatehq/app build`
- Playwright smoke on local `/deadlines/<e2e-row>/extension`: after saving an extension target,
  the queue `Internal due date` cell rendered `80 days late` instead of `—`.
