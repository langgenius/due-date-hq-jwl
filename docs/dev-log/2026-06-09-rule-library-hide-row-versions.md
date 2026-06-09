# 2026-06-09 — Rule library hides visible row versions

## Change

- Removed the visible `v1` / `v2` suffix from Rule Library rule-row metadata.
- Removed the same visible version chip from the bulk-review selected-rules summary.
- Removed the user-facing `Version` column from the Rule Library CSV export.
- Kept internal rule versions in selection keys and review API inputs so optimistic review and
  conflict checks still use the current template version.

## Verification

- Added a route-level regression assertion that a selected jurisdiction table can render a v2 rule
  without showing `v2` in the visible table row.
- `pnpm --filter @duedatehq/app test -- rules.library.test.tsx -t "keeps the selected jurisdiction table"`
- `pnpm exec vp fmt --check apps/app/src/features/rules/jurisdiction-rule-table.tsx apps/app/src/features/rules/coverage-tab.tsx apps/app/src/routes/rules.library.tsx apps/app/src/routes/rules.library.test.tsx docs/dev-log/2026-06-09-rule-library-hide-row-versions.md`
- `pnpm exec tsc --noEmit -p apps/app/tsconfig.json`
- `git diff --check`
- Browser verification on `/rules/library?jurisdiction=AL` showed rule rows as
  `Tax · Applicability review` with no trailing `v1` / `v2`.
