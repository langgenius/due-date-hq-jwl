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
- Simplified Step 3 normalization provenance chips so AI rows show only "AI" and do not expose model
  names or confidence scores to end users.
- Corrected the Drake export guide to use the official `Tools > File Maintenance > Export Client/EF
Data` path, with Report Manager called out only as a custom-report alternative and Backup/Restore
  explicitly excluded.
- Clarified that ProSystem fx `Office Manager > Backup Client Data` is a tax-software conversion
  backup path, while DueDateHQ should receive the `Create client list for Portal` CSV/XLS/XLSX
  export.
- Clarified that Lacerte `Client > Backup` is not the client-list path; DueDateHQ should receive the
  `Client > Export > Export to File` comma-delimited CSV export.
- Clarified that ProSeries `File > Client File Maintenance > Copy/Backup` is a return-file backup
  path; DueDateHQ should receive `HomeBase > Export Contacts` / `Contacts.csv`.
- Rechecked CCH Axcess, UltraTax CS, and ProConnect Tax against official vendor help:
  - CCH Axcess now leads with `Create client list for Portal` as the CSV/XLS/XLSX client-list path,
    with Return Manager `Export Grid` only as an alternative.
  - UltraTax CS already matched the official `Utilities > Client Listing Reports` flow, so no copy
    change was needed.
  - ProConnect Tax now leads with the `Clients` list download-to-Excel path, while
    `Reporting > Download return data` is described as supplemental return-data CSV coverage.
- Rechecked TaxDome, Karbon, QuickBooks, and File In Time against official help:
  - TaxDome keeps accounts and contacts as the primary customer export, and now mentions optional
    `Workflow > Jobs` export for TaxDome due dates/internal deadlines.
  - Karbon now mirrors the official cloud-icon contact spreadsheet export and separately points
    Work exports to the Work page cloud icon.
  - QuickBooks now separates QuickBooks Online customer Excel exports from QuickBooks Desktop
    Customer Center Excel and IIF list exports, avoiding unsupported Desktop CSV wording.
  - File In Time no longer asserts an unverified `Tools > Export Client Information` menu; it points
    to the client export/report screen and the official `Tools > Display Task View in Excel` flow.
- Shortened the onboarding rule-review notice so it summarizes the pending rule count without
  listing every selected jurisdiction.
- Fixed demo `pulse_source_signal` seed IDs to use UUIDs so `pulse.listSourceSignals` satisfies the
  public contract instead of failing ORPC output validation.
- Refreshed Lingui catalogs after removing the now-unused "Tax software exports" label.

Validation:

- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm exec tsc --noEmit --project apps/app/tsconfig.json`
- `pnpm check` passed with 0 errors and 5 pre-existing warnings.
- Playwright local validation at `http://localhost:5173/migration/new?source=onboarding&ruleReview=15&ruleReviewJur=FED%2CND%2CNV` after demo login confirmed the Step 1 body height is content-sized and the merged preset chips render with marks.
- Playwright local validation also confirmed the selected CCH Axcess, UltraTax CS, and ProConnect
  Tax export guide cards render the corrected instructions.
- Playwright local validation confirmed the selected TaxDome, Karbon, QuickBooks, and File In Time
  export guide cards render the rechecked instructions.
- Playwright local validation confirmed `/rules/sources` no longer receives a 500 from
  `pulse.listSourceSignals` after migrating the local demo signal IDs.
