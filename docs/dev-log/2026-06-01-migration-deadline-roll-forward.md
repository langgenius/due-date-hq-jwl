# 2026-06-01 · Migration deadline roll-forward

## What changed

- Added a shared server helper for monitored rule previews so Migration Copilot and Rule Library generation use the same monitoring-start behavior.
- Annual fixed-date and tax-year-relative rules now roll forward up to 5 years when their first due date is before the monitoring start date.
- Period-table rules keep only future source-defined periods; source-defined calendars and rules without a concrete due date still require review instead of synthetic dates.
- Migration dry-run/apply now reports `rolledForwardDeadlines` and writes `rolledForwardDeadlineCount` into the import audit payload.
- Rule Library generation uses the effective rolled tax year for creation and duplicate detection.
- Step 4 copy now separates roll-forwarded past deadlines from historical deadlines that truly could not be created.

## Docs and design

- Updated `docs/product-design/migration-copilot/02-ux-4step-wizard.md` so the Step 4 wireframe and copy table match the new rolled-forward/skipped split.
- Checked `DESIGN.md`; no token or component-system update is needed because this stays inside the existing Step 4 summary pattern.

## Validation

- `pnpm --filter @duedatehq/core test`
- `pnpm --filter @duedatehq/server test src/procedures/migration/_service.test.ts src/procedures/rules/_obligation-generation.test.ts`
- `pnpm --filter @duedatehq/app test src/features/migration/Step4Preview.test.tsx`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm --filter @duedatehq/server test src/procedures/migration/_service.test.ts src/procedures/rules/_obligation-generation.test.ts src/procedures/rules/onboarding-activation.test.ts`
- `pnpm check` passed with 0 errors; it still reports 9 existing warnings in unrelated files.
