---
title: 'Migration Source Chip Order'
date: 2026-05-25
area: migration
---

# Migration Source Chip Order

Browser review on `/migration/new?source=onboarding&ruleReview=9&ruleReviewJur=FED%2CWA%2CAK`
flagged the "I'm coming from..." software chips as hard to scan because the order mixed the
original demo presets with added tax-software templates.

Changes:

- Sorted the merged source chip list by displayed provider name:
  CCH Axcess, CCH ProSystem fx, Drake, File In Time, Karbon, Lacerte, ProConnect Tax, ProSeries,
  QuickBooks, TaxDome, UltraTax CS.
- Kept the underlying preset groups and source mappings unchanged.
- Updated the migration design docs so they no longer describe the old two-group or fixed File In
  Time fifth-position ordering.

Validation:

- `pnpm --filter @duedatehq/app test -- src/features/migration/Step1Intake.test.ts`
- Chrome local validation at
  `http://localhost:5173/migration/new?source=onboarding&ruleReview=9&ruleReviewJur=FED%2CWA%2CAK`
  confirmed the visible chip order is CCH Axcess, CCH ProSystem fx, Drake, File In Time, Karbon,
  Lacerte, ProConnect Tax, ProSeries, QuickBooks, TaxDome, UltraTax CS.
