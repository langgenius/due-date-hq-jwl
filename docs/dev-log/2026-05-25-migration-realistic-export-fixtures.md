# 2026-05-25 · Migration realistic export fixtures

## Context

Step 1 `/migration/new` needs realistic CPA client export files for the currently visible source
chips, not just simplified demo CSVs. The goal is upload validation, source recognition, mapping
prep, and unsupported-file guidance.

## Changes

- Added deterministic fixture generation in
  `scripts/generate-migration-realistic-fixtures.mjs`.
- Added structure/PII validation in `scripts/validate-migration-realistic-fixtures.mjs`.
- Added `docs/product-design/migration-copilot/06-fixtures/realistic-exports/` with 11 primary
  upload fixtures and 3 important variant/negative fixtures.
- Documented each source export shape, headers, expected preset/product/role, and research links in
  the new fixture README, with a parent README pointer.
- Added Drake as a detected source product and covered it in the upload adapter test.
- Tightened detection for two realistic exports:
  - CCH ProSystem fx `PortalSaaSClient_*.csv` is checked before the more general CCH Axcess grid
    rule.
  - Lacerte `EXPORT.CSV` is detected from `Client Number` + `Taxpayer E-mail Address`.

## Validation

- Passed: `node scripts/validate-migration-realistic-fixtures.mjs`
- Passed: `pnpm --filter @duedatehq/app test -- src/features/migration/Step1Intake.test.ts`
- Passed: `pnpm --filter @duedatehq/contracts test -- src/contracts.test.ts -t "freezes migration.listErrors stages"`
- Passed: `pnpm exec vp check apps/app/src/features/migration/Step1Intake.tsx apps/app/src/features/migration/intake-files.ts apps/app/src/features/migration/Step1Intake.test.ts packages/contracts/src/migration.ts packages/contracts/src/contracts.test.ts scripts/generate-migration-realistic-fixtures.mjs scripts/validate-migration-realistic-fixtures.mjs docs/product-design/migration-copilot/06-fixtures/README.md docs/product-design/migration-copilot/06-fixtures/realistic-exports/README.md docs/dev-log/2026-05-25-migration-realistic-export-fixtures.md`
- Passed browser spot check on
  `/migration/new?source=onboarding&ruleReview=9&ruleReviewJur=FED%2CWA%2CAK`:
  - TaxDome ZIP accepted with 24 rows.
  - QuickBooks Online XLSX accepted with 24 rows.
  - QuickBooks Desktop IIF accepted with 24 rows.
  - File In Time TXT accepted with 24 rows.
  - UltraTax DIF rejected with the dedicated DIF guidance.

## Known Unrelated Failure

- Full `pnpm --filter @duedatehq/contracts test -- src/contracts.test.ts` currently fails in the
  Pulse demo backend contract fixture because `PulseAlertPublicSchema` now requires
  `jurisdiction`. The migration-specific contract test passes.
