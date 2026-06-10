# Rule Library Reviewed KPI Copy

## Change

- Replaced the Total rules sub-metric copy from `+N this month` to
  `N reviewed in 30d`.
- Aligned the metric to the copy: it now counts rules whose `reviewedAt` falls
  in the trailing 30-day window, instead of counting recent version-1 rules.

## Validation

- `pnpm --filter @duedatehq/app test -- src/routes/rules.library.test.tsx`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `git diff --check` scoped to the touched route, catalog, and dev-log files.
