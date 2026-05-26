# Add deadline prior tax year

**Date:** 2026-05-26
**Branch:** `main`
**Scope:** Client detail `+ Add deadline` dialog tax year picker

Yuqi flagged that the Tax year picker only started at the current calendar year, but CPA filing
work commonly happens this year for last year's tax return.

## What changed

`apps/app/src/features/obligations/CreateObligationDialog.tsx`:

- Default Tax year now resolves to the prior calendar year.
- Tax year options now start at the prior year, then include the current year and future years.
- The existing current-year label remains on the current calendar year option; the prior year is
  shown plainly as the default value, avoiding a new i18n string for this small control.

`apps/app/src/features/obligations/CreateObligationDialog.test.ts`:

- Added focused coverage for the prior-year default and option list.

## Verification

- `pnpm --filter @duedatehq/app test -- src/features/obligations/CreateObligationDialog.test.ts`
  — 2 tests passed
- `pnpm --dir apps/app exec tsc -p tsconfig.json --noEmit` — clean
- `pnpm --filter @duedatehq/app i18n:extract` — ran, then reverted broad unrelated catalog churn
  because this final source change adds no new translatable string
- `pnpm --filter @duedatehq/app i18n:compile` — still blocked by pre-existing zh-CN missing
  translations
- Browser QA on `http://localhost:5173/clients/hanxujiang` — Add deadline opens with Tax year
  defaulted to `2025`; dropdown shows `2025`, `2026 (current year)`, and `2027`–`2030`
