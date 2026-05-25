---
title: 'Remove Dollar Projection Product Surface'
date: '2026-05-21'
area: product
---

# Remove Dollar Projection Product Surface

## Context

The product should no longer expose the legacy dollar projection concept in current workflows.
Database columns and old migrations remain for compatibility, but the product surface, public
queue/dashboard contracts, Smart Priority weighting, exports, and migration import UI no longer
present it as a current capability.

## Changes

- Removed the dollar projection column, filters, sorts, saved-view fields, and CSV/PDF export fields
  from Obligations.
- Removed dashboard projection filters, facets, summary totals, and triage-tab totals.
- Upgraded Smart Priority profiles to v2 by dropping the dollar factor and migrating old v1 profiles
  by moving that weight into urgency.
- Removed import readiness and Live Genesis dollar projection UI.
- Updated concept help and current docs to use deadline urgency, readiness, payment, evidence, and
  accrued penalty language instead.

## Validation

- `pnpm check`
