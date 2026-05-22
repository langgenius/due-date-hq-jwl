# 2026-05-22 Readiness Template Catalog

## Context

Obligation detail readiness checklists were generated from short 3-5 item lists. That left core tax
organizer gaps for individual, partnership, corporate, and S corporation returns, and previously
generated checklists were returned as-is instead of being reconciled with newer templates.

## Changes

- Added a versioned `@duedatehq/core/readiness-documents` template catalog with stable
  `templateKey` and `templateVersion` metadata.
- Expanded templates to 12-16 items across 1040, 1065, 1120, 1120-S, 1041, payroll/941, 1099,
  FBAR/foreign, 990, sales/use tax, estimated tax, and generic fallback.
- Preserved matching priority: estimated tax before income-return matches, 1120-S before 1120, and
  unknown tax types through the generic fallback.
- Added `template_key` / `template_version` columns to checklist rows and
  `obligation_readiness_template_item_suppression` for CPA-deleted template items.
- Changed `generateChecklist` to reconcile existing rows before returning: matched template rows
  keep CPA status, note, received metadata, and edited copy; missing unsuppressed catalog items are
  appended; template rows sort by catalog order and custom rows remain after template rows.
- Adjusted template-item deletion to write a suppression row before deleting; custom item deletion
  remains a hard delete.
- Raised readiness portal checklist limits from 8 to 30 items and removed the server-side first-8
  truncation.
- Obligation detail now calls the idempotent reconciliation path when opened, so old short
  checklists are topped up without introducing a separate Tax Organizer module.

## Validation

- Core tests freeze exact template keys and matching priority.
- DB reconciliation planner tests cover legacy checklist backfill, CPA-edited/custom item
  preservation, and suppression.
- Server helper tests cover full portal list mapping and versioned reconciliation input.
- Contract tests cover the 30-item readiness request/public payload limit.
