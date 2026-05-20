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
- Added an obligation detail statutory date panel showing internal deadline, statutory filing,
  statutory payment, and base statutory date.
- Kept Pulse/statutory overlay matching on statutory due dates, while main read models convert
  active overlay dates back into internal deadlines for UI display.
- Kept penalty timing on statutory payment/filing/base dates so internal deadlines do not make
  penalties appear to accrue early.

## Validation

- `pnpm --filter @duedatehq/core test`
- `pnpm --filter @duedatehq/contracts test`
- `pnpm --filter @duedatehq/db test`
- `pnpm --filter @duedatehq/server test`
- `pnpm --filter @duedatehq/app test -- src/routes/onboarding-firm-flow.test.ts src/features/audit/audit-log-model.test.ts src/features/billing/model.test.ts src/features/members/members-page.test.tsx src/features/pulse/AlertsListPage.test.tsx`
- `pnpm check`

App test suite note: `pnpm --filter @duedatehq/app test` still has an unrelated pre-existing
`coverage-tab.test.tsx` nuqs adapter failure; 39 of 40 app test files passed.
Lingui note: `pnpm --filter @duedatehq/app i18n:compile` still fails on 130 existing missing
`zh-CN` translations outside this change. The internal-deadline messages added here were translated,
and a non-strict `lingui compile` was run to refresh generated message modules.
