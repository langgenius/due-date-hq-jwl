---
title: 'Rule library: suppress not-applicable missing gaps'
date: '2026-05-23'
---

# Rule library: suppress not-applicable missing gaps

The Rule Library V3 table was showing `Missing rules` rows for entity/jurisdiction pairs that
the source coverage matrix already classifies as `not_applicable`. The visible example was Alaska
showing `Individual` and `Trust` gaps with `Add rule`, even though Alaska has no state individual
income tax or state fiduciary income tax return in the current matrix scope.

## Fix

- `apps/app/src/routes/rules.library.tsx`
  - Carries `entitySourceCoverage` into the grouped jurisdiction model.
  - Only treats `entityCoverage === 'none'` as an add-rule gap when the matching source coverage
    is not `not_applicable`.
  - Renders not-applicable entity summary cells as muted dashes instead of destructive no-rule
    markers.
- `apps/app/src/routes/rules.library.test.tsx`
  - Adds regression coverage that not-applicable gaps do not render `Missing rules`, `No rule
defined`, or `Add rule`.
  - Keeps a positive test that applicable missing coverage still renders the add-rule workflow.

## Audit

Catalog audit before the UI fix found 18 current Library missing rows, all not-applicable:

- `AK:individual`, `AK:trust`
- `FL:individual`, `FL:trust`
- `NV:individual`, `NV:trust`
- `NH:individual`, `NH:trust`
- `SD:individual`, `SD:trust`
- `TN:individual`, `TN:trust`
- `TX:individual`, `TX:trust`
- `WA:individual`, `WA:trust`
- `WY:individual`, `WY:trust`

After applying the same not-applicable exclusion used by the source coverage matrix, the effective
Library missing count is 0.

## Validation

- `pnpm --filter @duedatehq/app test -- --run src/routes/rules.library.test.tsx`
- `pnpm exec tsx -e <catalog audit>` confirmed `previousMissingRows: 18` and `fixedMissingRows: 0`.
