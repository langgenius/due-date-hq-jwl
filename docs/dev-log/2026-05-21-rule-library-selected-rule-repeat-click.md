# Rule Library Selected Rule Repeat Click

## Context

The Rules Library query state uses `rule=<ruleId>` to open the right-side rule
detail panel. Clicking an already-selected rule row was clearing the query param,
which returned the workspace to the entity coverage table instead of keeping the
selected rule detail in place.

## Change

- Made rule row selection idempotent: selecting the currently-open rule now
  leaves the `rule` query state unchanged.
- Added a focused CoverageTab regression test that clicks an already-selected
  rule row and asserts the query-state setter is not called.

## Verification

- `pnpm --filter @duedatehq/app test -- src/features/rules/coverage-tab.test.tsx`
- `pnpm exec vp check apps/app/src/features/rules/coverage-tab.tsx apps/app/src/features/rules/coverage-tab.test.tsx`
