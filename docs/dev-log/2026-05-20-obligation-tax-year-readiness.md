# Obligation Tax Year Readiness

## Summary

Moved CPA-facing tax year profile handling from Client facts to each obligation's Readiness surface.
This lets one client have both calendar-year and fiscal-year obligations without forcing a single
client-level fiscal profile.

## Changes

- Added obligation-level `tax_year_type`, `fiscal_year_end_month`, and `fiscal_year_end_day` fields,
  plus a D1 migration that backfills existing obligations from legacy client profile or existing tax
  period data.
- Added `obligations.updateTaxYearProfile` contract/procedure/repo support with audit event
  `obligation.tax_year_profile.updated`.
- Recomputed tax period, statutory due date, internal due date, exposure, dashboard brief, deadline
  tip, and audit data when a CPA changes an obligation's tax year profile.
- Required tax year profile edits to resolve a statutory due date from the obligation's own tax
  period, then updated internal, filing, and payment deadlines together.
- Backfilled demo/legacy obligation tax periods so Statutory Dates no longer show Needs review for
  rows that have a derivable tax period.
- Allowed tax year profile saves on legacy demo rows without stored `rule_id` by matching the
  verified rule from tax type and jurisdiction.
- Replaced the fiscal year end date picker with a month/day input so the UI no longer exposes an
  arbitrary picker year for yearless fiscal year-end settings.
- Moved the UI editor into the Obligations detail Readiness tab and removed fiscal year end from
  client readiness/missing facts.
- Gated the Readiness tax year editor to tax-year-driven or legacy fiscal obligations; fixed-date and
  period-table obligations keep a read-only tax year summary only.
- Stopped accepted-rule and annual-rollover generation from inheriting client fiscal profile unless
  a prior obligation period is being rolled forward.

## Validation

- `pnpm --filter @duedatehq/contracts test -- --run src/contracts.test.ts`
- `pnpm --filter @duedatehq/core test -- --run src/rules/index.test.ts`
- `pnpm --filter @duedatehq/db test -- --run src/repo/obligation-queue.test.ts`
- `pnpm --filter @duedatehq/db test -- --run src/repo/migration.test.ts src/repo/clients.test.ts`
- `pnpm --filter @duedatehq/server test -- --run src/procedures/obligations/_service.test.ts src/procedures/obligations/_annual-rollover.test.ts src/procedures/rules/_obligation-generation.test.ts src/procedures/_penalty-exposure.test.ts src/procedures/migration/_service.test.ts`
- `pnpm --filter @duedatehq/server test -- --run src/procedures/obligations/_tax-year-profile.test.ts`
- `pnpm db:migrate:local`
- `pnpm --filter @duedatehq/app test -- --run src/features/clients/client-readiness.test.ts src/features/clients/client-detail-model.test.ts`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm exec vp check --no-fmt`

## Follow-up Note

- A later `pnpm exec vp check --no-fmt` rerun is currently blocked by unrelated Rules Console
  coverage type errors in the dirty worktree; the tax-year deadline server tests above pass.
