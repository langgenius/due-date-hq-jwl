# Deadlines internal due copy

**Date:** 2026-06-06
**Surface:** `/deadlines`

## Change

Removed `Filed` from terminal-row lateness copy in the Internal due date column.

- Changed terminal row copy from `Filed # days late` / `Filed # days early` to
  `# days late` / `# days early`.
- Applied the same copy to the route-local `DueDaysPill` and the shared
  obligations queue primitive so both queue implementations use the same
  internal-due-date metric language.
- Updated nearby comments to keep the column framed as an internal due date
  comparison, not an authority filing outcome.

## Docs Alignment

No `DESIGN.md` update is needed. This is a column-copy clarification inside the
existing deadlines table.

## Validation

- `pnpm exec vp check apps/app/src/routes/obligations.tsx apps/app/src/features/obligations/queue/components/primitives.tsx docs/dev-log/2026-06-06-deadlines-internal-due-copy.md`
  passed with 0 errors. Existing unsafe assertion warnings remain in
  `apps/app/src/routes/obligations.tsx`.
- `pnpm --filter @duedatehq/app test -- src/routes/obligations.test.ts` passed
  with 54 tests.
- `git diff --check -- apps/app/src/routes/obligations.tsx apps/app/src/features/obligations/queue/components/primitives.tsx docs/dev-log/2026-06-06-deadlines-internal-due-copy.md`
  passed.
- Browser verified `http://localhost:5173/deadlines?group=urgency`: the legacy
  group param falls back to `Group by Due date`, and Internal due date cells now
  render `25 days late` / `4 days late` without `Filed ... late` copy.
- `pnpm --filter @duedatehq/app i18n:extract` was attempted, but
  `pnpm --filter @duedatehq/app i18n:compile` is still blocked by the existing
  zh-CN catalog state (96 missing translations). The generated catalog churn was
  not kept in this scoped change.
