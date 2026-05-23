---
title: 'Migration Step 1 Layout and Preset Chips'
date: 2026-05-23
area: migration
---

# Migration Step 1 Layout and Preset Chips

Browser review on `/migration/new?source=onboarding` flagged two UI issues in Step 1:

- The route wizard stretched the Step 1 body to the bottom of the viewport, leaving a large empty
  content area below the intake controls.
- The import-template chips were split into general sources and tax software exports, even though
  the decision point is one source-template choice.

Changes:

- Let the migration entry surface scroll at the page level and stop forcing the route wizard frame to
  consume all remaining viewport height.
- Merged the general and tax-software preset chips into one list under "I'm coming from...".
- Replaced the compact placeholder marks with local logo assets for each preset chip, matching the
  tax software logos from the StanfordTax reference and using direct brand assets where available.
- Added selected-source export guidance below the preset chips, with file formats, export paths, and
  backup-file warnings sourced from the CPA SaaS and tax-software export research reports.
- Removed the stale "Workbench" breadcrumb from the migration wizard header.
- Kept the onboarding rule-review notice informational by hiding the "Review rules" jump CTA when
  the route is opened from `source=onboarding`.
- Refreshed Lingui catalogs after removing the now-unused "Tax software exports" label.

Validation:

- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm check` passed with 0 errors and 5 pre-existing warnings.
- Playwright local validation at `http://localhost:5173/migration/new?source=onboarding&ruleReview=15&ruleReviewJur=FED%2CND%2CNV` after demo login confirmed the Step 1 body height is content-sized and the merged preset chips render with marks.
