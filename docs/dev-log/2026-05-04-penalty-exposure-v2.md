---
title: 'Deadline Readiness v2'
date: 2026-05-04
author: 'Codex'
---

# Deadline Readiness v2

## Context

The previous penalty surface used one stored exposure amount for both risk ranking and implied
already-accrued penalties. That blurred two different product jobs: ranking future workload risk and
showing what may already have been incurred as of a specific date.

## Change

- Rebuilt `packages/core/src/penalty` around the legacy penalty amount helper and
  `estimateAccruedPenalty`, with `penalty-v2-2026q2` as the stored legacy formula version.
- Kept `estimatedExposureCents`, `exposureStatus`, and stored breakdowns as 90-day legacy penalty estimate.
- Added runtime accrued penalty fields to obligation, Obligations, and Dashboard contracts without
  adding DB columns.
- Corrected federal tax-due penalty math for failure-to-file / failure-to-pay same-month offset and
  the 60-day minimum.
- Limited ready federal formulas to 1065, 1120S, and 1120; estimated-tax underpayment and state tax
  types now return `unsupported` until source-backed metadata exists.
- Added a firm maintenance endpoint to backfill stored legacy penalty estimate for existing obligations.
- Updated Dashboard, Obligations, Smart Priority, and Migration Live Genesis wording so the main risk
  amount is explicitly 90-day legacy penalty estimate, while accrued penalty is shown separately.

## Data Contract

Accrued penalty is intentionally derived from `asOfDate` and `currentDueDate` at read time. This
avoids creating stale daily data and keeps sorting on the stored projected amount. Coordinator
dollar hiding masks both projected and accrued amounts and their breakdowns.

## Documentation

Updated the data model, frontend architecture, design, and Live Genesis notes to keep the
projected-risk/accrued-penalty split aligned with the implementation.

## Validation

- `pnpm --filter @duedatehq/core test -- penalty`
- `pnpm --filter @duedatehq/contracts test -- contracts`
- `pnpm --filter @duedatehq/db test -- repo/dashboard repo/obligations repo/migration`
- `pnpm --filter @duedatehq/server test -- src/procedures/_penalty-exposure`
- `pnpm --filter @duedatehq/server test -- src/procedures/obligations src/procedures/dashboard src/procedures/obligations src/procedures/migration src/procedures/firms`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm check`
