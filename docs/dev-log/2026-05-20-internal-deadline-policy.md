# Internal Deadline Policy

## Summary

DueDateHQ now treats `currentDueDate` as the practice internal deadline shown in the primary UI.
It is derived from the statutory/base rule date by subtracting the practice's configured internal
deadline offset.

## Changes

- Added `firm_profile.internal_deadline_offset_days` with a default of 14 days.
- Added onboarding, Add practice, and Practice profile controls for the internal deadline offset.
- Updated obligation generation, migration commit, annual rollover, manual create, and firm update
  paths so `currentDueDate = baseDueDate - internalDeadlineOffsetDays`.
- Updated Obligations, Dashboard, client detail, evidence, and audit labels to present the primary
  visible date as `Internal deadline`.
- Added an obligation detail statutory date panel showing internal deadline, Filing Deadline, and
  Payment Deadline.
- Follow-up: relabeled the split statutory fields to Filing Deadline / Payment Deadline and
  fall back to the tax authority source-backed rule date for legacy rows where split dates were not
  stored.
- Follow-up: removed the base statutory data-model field from the drawer because it is not a
  user-facing deadline.
- Follow-up: added first-class obligation tax period fields and detail drawer `Tax period` display
  so fiscal-year and short-year return deadlines are based on the CPA-facing return period, not a
  calendar-year product default.
- Follow-up: updated rule generation and annual rollover so fiscal S corporation returns use the
  return period end for the official Filing Deadline / Payment Deadline and enter review when the
  period comes from unconfirmed client defaults.
- Kept Pulse/statutory overlay matching on statutory due dates, while main read models convert
  active overlay dates back into internal deadlines for UI display.
- Kept penalty timing on statutory payment/filing/base dates so internal deadlines do not make
  penalties appear to accrue early.

## Validation

- `pnpm --filter @duedatehq/core test`
- `pnpm --filter @duedatehq/contracts test`
- `pnpm --filter @duedatehq/db test`
- `pnpm --filter @duedatehq/server test`
- `pnpm --filter @duedatehq/core test -- --run src/tax-periods/index.test.ts src/rules/index.test.ts`
- `pnpm --filter @duedatehq/server test -- --run src/procedures/rules/_obligation-generation.test.ts src/procedures/obligations/_annual-rollover.test.ts src/procedures/obligations/_service.test.ts`
- `pnpm --filter @duedatehq/db test -- --run src/repo/obligation-queue.test.ts src/repo/tenant-scope.test.ts`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm --filter @duedatehq/app test -- src/routes/onboarding-firm-flow.test.ts src/features/audit/audit-log-model.test.ts src/features/billing/model.test.ts src/features/members/members-page.test.tsx src/features/pulse/AlertsListPage.test.tsx`
- `pnpm check`

Latest Lingui note: `pnpm --filter @duedatehq/app i18n:compile` now passes with strict catalogs
after extracting the obligation detail tax-period label.
