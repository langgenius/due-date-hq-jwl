# 2026-05-21 · Migration Export Adapters

## Summary

Implemented the first Migration Copilot export-adapter slice from the competitor client export research:
Step 1 now accepts more real-world export shapes, records source detection metadata, and preserves
primary contact fields through import apply.

## Shipped

- Added a browser-side intake adapter for CSV / TSV / TXT / JSON / XLSX / ZIP / QuickBooks IIF.
- Added source detection and `sourceManifest` persistence for TaxDome, Karbon, QuickBooks, File In
  Time, and generic tabular files.
- Added targeted guidance for proprietary/non-tabular uploads such as `.qbb`, `.qbw`, `.qbm`,
  `.cab`, `.fbk`, `.xls`, and `.pdf`.
- Added TaxDome ZIP account/contact merge into primary contact name/email columns.
- Added QuickBooks Desktop IIF customer conversion to TSV.
- Added migration mapping targets and apply plumbing for `client.primary_contact_name` and
  `client.primary_contact_email`.
- Updated Lingui catalogs and the Step 1 UX design note to match the new upload surface.
- Kept compact `/migration/new` Step 1 layout vertical so upload sits under paste rows instead of
  in a separate right-hand column.

## Validation

- `pnpm --filter @duedatehq/app test --run src/features/migration/Step1Intake.test.ts src/features/migration/mapping-target-labels.test.ts`
- `pnpm --filter @duedatehq/server test --run src/procedures/migration/_service.test.ts`
- `pnpm --filter @duedatehq/contracts test --run src/contracts.test.ts`
- `pnpm --filter @duedatehq/db test --run src/repo/migration.test.ts`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm check` passes with existing repository warnings.

## Design / Docs Alignment

- No root `DESIGN.md` exists in this workspace.
- Updated `docs/product-design/migration-copilot/02-ux-4step-wizard.md` for accepted file types,
  max upload size, source detection status, and adapter behavior.
