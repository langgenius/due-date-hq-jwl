# Fiscal-Year Client Tax Period

## Summary

Aligned fiscal-year client handling with CPA import and maintenance reality:

- Unmarked clients default to calendar year for deadline generation.
- Explicit fiscal-year clients require a valid fiscal year end client fact.
- Valid fiscal year end directly determines Tax Period, Filing Deadline, Payment Deadline, and
  Internal deadline without Tax Period review.
- Explicit fiscal clients missing fiscal year end show `Needs fiscal year end` and do not create
  placeholder obligations.

## Changes

- Added `client.tax_year_type` and `client.fiscal_year_end` Migration Copilot mapping targets.
- Added `clients.updateTaxYearProfile` contract/procedure/repo support with audit event
  `client.tax_year_profile.updated`.
- Updated core tax-period and rule preview models to return `missingClientFacts:
['fiscalYearEnd']` for explicit fiscal clients without a valid year end.
- Updated rules generation, migration commit, annual rollover preview serialization, Client detail
  readiness, Fact readiness, and Rules preview grouping for the missing-client-fact path.
- Follow-up UI cleanup: Tax year profile opens directly into the editable controls, and Fiscal year
  end is one date-picker field that stores only the selected month/day.
- Updated DESIGN, user manual, data model docs, and Lingui catalogs.

## Validation

- `pnpm --filter @duedatehq/core test -- --run src/tax-periods/index.test.ts src/rules/index.test.ts`
- `pnpm --filter @duedatehq/contracts test -- --run src/contracts.test.ts`
- `pnpm --filter @duedatehq/server test -- --run src/procedures/rules/_obligation-generation.test.ts src/procedures/migration/_service.test.ts src/procedures/clients/index.test.ts`
- `pnpm --filter @duedatehq/db test -- --run src/repo/clients.test.ts`
- `pnpm --filter @duedatehq/app test -- --run src/features/clients/client-readiness.test.ts src/features/rules/rules-console-model.test.ts src/features/rules/generation-preview-tab.test.tsx src/features/migration/mapping-target-labels.test.ts`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm check`
