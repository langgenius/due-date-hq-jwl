---
title: 'Commit 1: breadcrumb back-link bug + ISO→prose dates on client surfaces'
date: 2026-05-22
author: 'Yuqi pairing with Claude'
area: ux
---

# Clients — D-1 breadcrumb link + X-2 prose dates

First commit from `docs/Design/clients-list-and-detail-critique-2026-05-22.md`'s
sequencing list. Two small but high-impact items batched because they
share the same surfaces.

## D-1 — Breadcrumb "Clients" parent crumb is clickable

### Why

On `/clients/[id]`, the parent `Clients ▾` crumb only triggered the
client-switcher popover. Clicking the text "Clients" — the natural
"go back" affordance — did nothing on its own. To get back to the
list users had to open the popover then click "Back to client list",
a 2-click path for what every other app makes 1.

### What changed

`ClientBreadcrumbSwitcher` now renders **two adjacent hit targets**
that visually read as one crumb:

- The word **"Clients"** is a `<Link to="/clients">` — primary nav
- The adjacent **`▾` chevron** is a button that triggers the
  switcher popover

Same wrapper styling so they look like a single eyebrow unit; two
distinct semantics so the common case (back to list) is 1 click and
the power-user case (switch to another client) stays a popover.

The popover keeps its `Back to client list` item as a safety net for
users who opened the switcher by mistake.

## X-2 — ISO `2026-05-06` → prose `May 6, 2026` on client surfaces

### Why

Dates rendered as ISO across the detail page are one of the two
biggest "this was made by engineers" tells (the other is
`Obligation`, tracked separately as X-1). CPAs read prose dates
when talking to clients; the daily-driver page should match.

The list-page Next-due cell was rendering ISO too, so this commit
also touches that one — keeping format consistent across the
clients surface family.

### What changed

Added `formatDatePretty(value, { alwaysShowYear? })` to
`apps/app/src/lib/utils.ts`. Returns:

- `May 6` for same-year dates (default — cuts year-tag noise on the
  daily list)
- `May 6, 2026` when the date is in a different year, or when the
  caller passes `alwaysShowYear: true` (filing-plan rows do this
  because they're year-grouped and the year is the disambiguator)

Tests cover 4 cases (same-year, prior, future, alwaysShowYear,
unparseable input fallback).

Touched `ClientFactsWorkspace.tsx` at 5 call sites:

| Location                      | Before             | After                   |
| ----------------------------- | ------------------ | ----------------------- |
| identity sub-line `next due`  | `2026-05-06`       | `May 6`                 |
| list-page next-due column     | `2026-05-06`       | `May 6`                 |
| obligation row aria-label     | ISO                | prose w/ year           |
| filing-plan row cell          | ISO + tabular-nums | prose + no tabular-nums |
| suggested-forms "default due" | ISO                | prose                   |

Left intact:

- `buildClientWorkPlanSummary(..., formatDate(today))` — internal
  comparison control string, not user-facing
- `formatDateTimeWithTimezone` call sites — those render audit-log
  timestamps and AI-summary generation times; ISO + zone is the
  right format for those (machine-readable, exact)
- `ClientCompliancePosturePanel.formatClientSince` — already
  returns prose (`Mar 2023`) via its own Intl format

### Verification

- `npx tsc --noEmit -p apps/app/tsconfig.json` → clean
- `pnpm --filter @duedatehq/app test -- run src/lib/utils.test.ts` →
  10/10 passing (4 new, 6 existing)
- Manual: open any client, confirm header sub-line reads
  `next due May 6`, filing-plan rows read `due May 8, 2026` with the
  year because they sit inside a `2026 [CURRENT TAX YEAR]` group
  header

## Files

- M `apps/app/src/features/clients/ClientBreadcrumbSwitcher.tsx` —
  split single trigger into Link + Popover button pair
- M `apps/app/src/lib/utils.ts` — new `formatDatePretty()` helper
- M `apps/app/src/lib/utils.test.ts` — 4 new tests
- M `apps/app/src/features/clients/ClientFactsWorkspace.tsx` —
  5 date renderings converted to prose
- A `docs/dev-log/2026-05-22-clients-breadcrumb-link-and-prose-dates.md`

## What's next

Commit 2 from the sequencing doc: list header trim (L-1 split
button + L-7 STATES merge + L-8 summary card → strip).
