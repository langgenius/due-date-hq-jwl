---
title: 'Tax-code display unification: centralized formatter + tooltip'
date: 2026-05-20
author: 'Claude'
area: ui
---

# Tax-code display unification

## Context

Across nine CPA-facing surfaces, the canonical tax-code field
(`federal_1120s`, `ca_568`, `ny_ct3s`, `tx_franchise_report`, etc.) was
being rendered as the raw snake_case identifier instead of a
human-readable form name. Some surfaces had a partial fix: a
dashboard-scoped `formatTaxType` map covered the dashboard table and
one obligations format-string. The rest leaked.

The audit log called this out as one of three top "polish" items still
hanging from the larger UX evaluation pass. This change closes that
item across the app and adds the tooltip pattern the audit asked for.

## What changed

### Centralized lib

- New `apps/app/src/lib/tax-codes.ts` is the single source of truth for
  human-readable display of tax codes:
  - `formatTaxCode(code)` returns the form name (`"Form 1120-S"`).
  - `describeTaxCode(code)` returns `{ label, code, jurisdiction,
description }` for tooltip bodies.
  - Both functions fall back to a prettified version of the snake_case
    if a code isn't in the table — never expose the raw string.
- The old `apps/app/src/features/dashboard/format-tax-type.ts` becomes a
  thin shim re-exporting the new lib. Existing imports keep working.

### Tooltip component

- New `apps/app/src/components/primitives/tax-code-label.tsx` exports
  two variants:
  - `<TaxCodeLabel>` — inline text with a hover tooltip exposing the
    raw code + jurisdiction + plain-English description. Use in
    text-heavy spots (drawer subtitles, table cells, alt-line under a
    client name).
  - `<TaxCodeBadge>` — bordered chip variant for dense rows where the
    tax code is the primary read for a column.

The tooltip lets us keep auditability — the raw code is still
discoverable for CPAs who recognize it — without surfacing it as the
primary read.

### Migrated surfaces

Replaced raw `{row.taxType}` / `${row.taxType}` displays with either
`<TaxCodeLabel>` (for visible UI) or `formatTaxCode()` (for label
strings, aria-labels, key fragments that need plain text):

- Obligations: filter dropdown, tax-type column cell, drawer
  description, evidence labels, hotkey aria-label, penalty dialog
  description.
- Dashboard: filter dropdown, tax-type column cell, evidence label,
  aria-label.
- Rule detail drawer: applicability tax-type row (was raw font-mono).
- Pulse affected-clients table: tax-type column.
- Client facts workspace: obligations table + extension band +
  pulse-match badge labels.
- Reminders page: upcoming sends + recent sends tax-type sub-lines.
- Practice rank preview: tax-type sub-line.
- Migration step 4 preview: exposure row labels.
- Rules generation preview: tax-type column.
- Readiness public portal: subheader (uses `formatTaxCode()`, not the
  tooltip — client-facing surface shouldn't expose the raw code).

### What's NOT changed

- The diagnostic line `{row.matchedTaxType} → {row.taxType}` in the
  rules generation preview stays raw. It's audit info showing the
  rule's matchedTaxType pattern matching the obligation's taxType —
  both sides need to be the raw code for the mapping to be meaningful.
- Seed-data content like the readiness checklist template body that
  hardcodes `federal_1120s` in its description text. This is a content
  fix in the seed, not a display-layer fix. Filed as a follow-up.
- The rule.id raw display in rule library / rule detail drawer
  audit-header line. These are technical identifiers, properly
  subordinate to the title, and serve traceability. Leaving as-is.

## Why a tooltip, not just a format function

The tooltip preserves the auditable footprint. CPAs reviewing rule
behavior or filing source notifications sometimes need to know the
canonical code for cross-reference with the rules engine. Hiding it
entirely would force them to dig through the rule editor or audit log
every time. Surfacing it on hover trades zero pixels for one
keystroke of recall.

## Verification

- `tsc --noEmit` from `apps/app` passes.
- Smoke-tested on the running dev server:
  - Obligations table tax-type column shows "Form 1120-S", "CA Form
    568", "NY CT-3S", "TX Franchise Report", "FL Corporate Income",
    "CA LLC Tax".
  - Hovering a cell opens a tooltip with `federal_1120s` /
    `Federal` / `S-corporation income tax return`.
  - Obligation drawer description reads "Form 1120-S · 2026-03-16"
    instead of "federal_1120s - 2026-03-16".
