# 2026-05-23 · Migration Copilot integration records removal

## Summary

- Removed the Migration Copilot provider integration-record intake path, including staging rows, external references, provider-specific sources, and provider JSON fixture coverage.
- Preserved Paste / Upload intake, including copied table text, CSV/TSV/XLSX upload, tax-software presets, and generic JSON-to-tabular paste normalization.
- Added a DB migration that converts legacy `integration_*` migration batches to `csv` and drops the now-unused provider staging/reference tables without deleting imported clients or obligations.
- Removed the remaining single-option `Paste / Upload` source-mode button so Step 1 opens directly on paste/upload controls.

## Validation

- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm --filter @duedatehq/app test --run src/features/migration/Step1Intake.test.ts src/features/migration/state.test.ts`
- `pnpm --filter @duedatehq/contracts test --run src/contracts.test.ts`
- `pnpm --filter @duedatehq/server test --run src/procedures/migration/_service.test.ts`
- `pnpm --filter @duedatehq/db test --run src/repo/migration.test.ts src/db.test.ts`
- `pnpm ready`
- `pnpm check`
