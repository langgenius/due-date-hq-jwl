# 2026-05-29 — Practice monitoring start date

## Summary

- Added a practice-level `monitoring_start_date` field to keep first-time imports from creating
  already-past statutory deadlines as active overdue work.
- New practices set the date during onboarding; Practice profile shows it read-only because changing
  it later would require historical delete/regenerate audit semantics.
- Automatic generation paths now filter by statutory/base due date on or after the monitoring start
  date. Manual Add deadline remains unrestricted for explicit historical backfill.

## Product notes

- Migration Step 4 passively explains historical deadlines skipped before the monitoring start date.
- Rule activation, Rule accept/bulk accept, migration import, annual rollover, and generation preview
  counts use the same cutoff basis where feasible.
- The cutoff compares date-only ISO strings against rule preview `dueDate`, not internal due dates.

## Validation

- `pnpm --filter @duedatehq/server test --run src/procedures/firms/index.test.ts src/procedures/rules/_obligation-generation.test.ts src/procedures/rules/onboarding-activation.test.ts src/procedures/migration/_service.test.ts src/middleware/tenant.test.ts src/organization-hooks.test.ts`
- `pnpm --filter @duedatehq/app test --run src/routes/onboarding-firm-flow.test.ts src/features/migration/Step4Preview.test.tsx src/features/migration/Wizard.test.tsx src/features/billing/model.test.ts src/features/members/members-page.test.tsx`
- `pnpm --filter @duedatehq/contracts test --run src/contracts.test.ts`
- `pnpm --filter @duedatehq/db test --run src/firm.test.ts src/repo/firms.test.ts`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm check`
- `pnpm db:migrate:local`
- Playwright smoke checked `/onboarding`, `/migration/new?source=onboarding`, `/practice`,
  `/deadlines`, and a seeded client filing plan route on `localhost:5173`.
