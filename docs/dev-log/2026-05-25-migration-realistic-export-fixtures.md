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

## Follow-up: Preset Source Tracking

- Added `presetSource` to Step 1 intake state so preset choices are tracked as either `manual` or
  `detected`.
- Upload detection now auto-applies the detected preset only when no preset exists or when the
  current preset was also auto-detected from a previous upload.
- If the user manually selected a different preset, upload detection keeps the manual choice and
  shows an inline switch prompt instead of silently overriding it.
- Passed: `pnpm --filter @duedatehq/app test -- src/features/migration/Step1Intake.test.ts src/features/migration/state.test.ts`
- Passed: `pnpm exec vp check apps/app/src/features/migration/Step1Intake.tsx apps/app/src/features/migration/Step1Intake.test.ts apps/app/src/features/migration/Wizard.tsx apps/app/src/features/migration/state.ts apps/app/src/features/migration/state.test.ts apps/app/src/i18n/locales/en/messages.po apps/app/src/i18n/locales/en/messages.ts apps/app/src/i18n/locales/zh-CN/messages.po`
- Ran: `pnpm --filter @duedatehq/app i18n:extract`
- Ran: `pnpm --filter @duedatehq/app exec lingui compile`
- Still blocked: `pnpm --filter @duedatehq/app i18n:compile` fails because zh-CN has 92 existing
  missing translations after extraction. The new preset-mismatch messages are translated.
- Passed browser spot check: manually selected TaxDome, uploaded QuickBooks Online XLSX, saw the
  preset mismatch prompt, confirmed TaxDome remained selected, clicked Switch preset, and confirmed
  QuickBooks became selected.

## Follow-up: D1 Commit Chunking

- Fixed `migration.apply` failures where D1 rejected `client` insert chunks with `too many SQL
variables`.
- Root cause: `commitImport` assumed migration client rows bound 25 params, but Drizzle emits
  nullable/default `client` columns too, so 4-row inserts bound 132 params and crossed D1's local
  100-param ceiling.
- Updated migration commit client chunks to 2 rows and added repo coverage that locks the
  `5 clients -> [2, 2, 1]` split.

## Follow-up: SSN/EIN Mapping Copy

- Clarified the Step 1 SSN-like column warning: blocked columns are not sent to AI, but a flagged
  column that is actually an EIN can be manually selected as EIN in Mapping.
- Kept the safety boundary server-side: AI and preset output still force SSN/ITIN-like columns to
  `IGNORE`; only a user-overridden `client.ein` mapping is allowed through, and imported values are
  still validated by the strict EIN shape check.
