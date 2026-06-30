# /clients table — NEXT DUE showed raw ISO dates (date-canon defect)

**Date:** 2026-06-29
**Files:** `apps/app/src/features/clients/ClientFactsWorkspace.tsx`

## Why

Inspecting the `/clients` **list (table)** view: the NEXT DUE column's exact-date line rendered raw ISO
(`2026-05-12`, `2026-06-22`) while the card view showed prose (`May 12`). The date-formatting canon is
explicit — prose dates, never raw ISO. A code comment even _claimed_ it was using a prose format, but
`formatDate()` returns ISO (`value.slice(0,10)`); the intent and the function disagreed.

## What changed

Switched the cell from `formatDate(summary.nextDueDate)` → `formatDatePretty(...)` (the same prose
formatter the card view + the rest of the product use), and corrected the misleading comment. NEXT DUE
now reads `May 12` / `Jun 22`, matching the card.

## Verification

Live-verified (table view): all exact dates are prose, no ISO. `tsgo` clean.
