---
title: 'Migration Copilot Tax Software Presets'
date: '2026-05-22'
area: migration
---

# Migration Copilot Tax Software Presets

## Context

The CPA tax software export/import summary identified six tax software sources that Migration
Copilot did not expose as source options or preset mappings: CCH Axcess, CCH ProSystem fx, Lacerte,
ProSeries, UltraTax CS, and ProConnect Tax.

## Changes

- Added Step 1 tax software preset options and source detection for the six products.
- Added preset fallback mappings, source manifest product values, and fixture golden tests.
- Added client import fields for external client ID, address line 1, city, postal code, primary
  phone, and source status, including D1 migration and client public contract exposure.
- Upgraded mapper usage to `mapper@v2` with an explicit rule not to map SSN, ITIN, or masked
  taxpayer ID values.
- Added tax software CSV fixtures and updated Migration Copilot UX / AI prompt / fixture docs.

## Validation

- `pnpm --filter @duedatehq/server test --run src/procedures/migration/_service.test.ts src/procedures/clients/index.test.ts src/procedures/rules/_obligation-generation.test.ts src/procedures/obligations/_tax-year-profile.test.ts src/procedures/obligations/_annual-rollover.test.ts`
- `pnpm --filter @duedatehq/app test --run src/features/migration/Step1Intake.test.ts src/features/migration/state.test.ts src/features/migration/mapping-target-labels.test.ts src/features/clients/client-readiness.test.ts src/features/clients/client-detail-model.test.ts src/features/rules/generation-preview-tab.test.tsx`
- `pnpm --filter @duedatehq/contracts test --run src/contracts.test.ts`
- `pnpm --filter @duedatehq/core test --run src/normalize-dict/index.test.ts`
- `pnpm --filter @duedatehq/db test --run src/repo/clients.test.ts src/repo/migration.test.ts`
- `pnpm --filter @duedatehq/ai test --run`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm ready`

`pnpm ready` completed successfully with existing warnings: five lint/type warnings outside this
change, app build chunk-size warnings, Astro alias deprecation warnings, and the local Wrangler
EPERM log-file warning during dry-run.
