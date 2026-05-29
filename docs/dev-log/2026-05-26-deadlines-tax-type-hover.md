# Deadlines tax-type hover affordance

**Date:** 2026-05-26
**Scope:** `/deadlines` table tax-type cell and client filing-plan tax-type rows.

Yuqi feedback: the tax-type text in deadline rows and client filing-plan rows
should not turn into a help-hover target. The row is already the primary
interaction surface, so the form name should read as plain row text.

## Change

- Added a `tooltip={false}` option to `TaxCodeLabel`.
- Used it for the `/deadlines` tax-type column and client filing-plan row label,
  so those cells render as plain `<span>` text instead of tooltip triggers with
  `cursor-help`.
- Kept the richer `TaxCodeLabel` tooltip behavior available for drawer headers,
  client peek cards, rules, and other explanatory surfaces.

## Verification

- `pnpm --filter @duedatehq/app exec tsc -p tsconfig.json --noEmit` — clean.
- `git diff --check` — clean.
- Browser check on `/deadlines?row=2bf81cb3-b73d-4d43-ab84-be0705712eb9`:
  both `CA State Individual Income Tax` table cells render as plain `<span>`
  content with no enclosing tooltip button and no `cursor-help`.

## 2026-05-29 drawer header follow-up

- Deadline drawer title tax labels keep their tooltip but override the hover cursor to
  the default arrow. The form name should read like the drawer title, not a help target.
