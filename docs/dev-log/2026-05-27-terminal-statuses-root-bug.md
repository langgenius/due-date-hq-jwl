# 2026-05-27 — TERMINAL_STATUSES root bug: `'done'` (UI "Filed") is not terminal

## What you showed me

Screenshot of Lakeview Medical Partners → Form 1065. Right panel says "71 DAYS
OVERDUE" but the client header says "next due Nov 15" + "At risk: 0". The
overdue signal was hidden 4 clicks deep.

## Root cause

Three client-side surfaces (`ClientSummaryStrip`, `ClientDetailDrawer`,
`ClientPeekHoverCard`) had a `TERMINAL_STATUSES` set that included `'done'`.
Per the canonical lifecycle v2 (`features/obligations/status-control.tsx:50-57`):

```
pending          → "Not started"
waiting_on_client → "Waiting"
blocked          → "Blocked"
review           → "In review"
done             → "Filed"          ← filing event done, PAYMENT MAY STILL BE OUTSTANDING
completed        → "Completed"      ← everything done
```

`done` is the second-to-last lifecycle state. The filing event has shipped,
but the row hasn't transitioned to `completed` because the payment cycle
isn't confirmed. The legacy 8-state model conflates `'done'` with "settled"
(the dashboard / queue helpers still do this — see Wave-4 candidates below).

By treating `'done'` as terminal, the client tile:

- excluded the row from `openCount` (under-counts Open filings)
- excluded the row from `isAtRisk` (mis-renders At risk: 0)
- excluded the row from `nextDue` (header surfaces a future deadline and hides the overdue one)

Same logic in `ClientDetailDrawer` propagates to the peek-from-list drawer.
Same in `ClientPeekHoverCard` propagates to the hover preview.

The set also contained the literal `'filed'` — DEAD CODE. `'filed'` is NOT
in the `ObligationStatus` union (TS would reject `row.status === 'filed'`).
It was a leftover from a prior planned migration that never landed.

## Fix

1. **Tightened TERMINAL_STATUSES** in 3 files to `['paid', 'completed', 'not_applicable']`:
   - `apps/app/src/features/clients/ClientSummaryStrip.tsx`
   - `apps/app/src/features/clients/ClientDetailDrawer.tsx`
   - `apps/app/src/features/clients/ClientPeekHoverCard.tsx`

   `'paid'` stays in the set because it means "filing + payment both done"
   (legacy "settled" — still terminal in lifecycle v2). `'done'` leaves.
   Dead `'filed'` literal also removed.

2. **`isAtRisk` now also checks payment-due-overdue.** When the filing is
   `'done'` but `paymentDueDate < today`, the row counts as at-risk:

   ```ts
   if (o.paymentDueDate && !TERMINAL_STATUSES.has(o.status)) {
     const payDue = Date.parse(o.paymentDueDate)
     if (!Number.isNaN(payDue) && payDue < today) return true
   }
   ```

3. **`ObligationDetailPanel` pill tone math** in `routes/obligations.tsx`:
   split the "satisfied" check by milestone — `filingSatisfied` (done/paid/completed/not_applicable)
   vs `paymentSatisfied` (paid/completed/not_applicable). The FILING tile
   now goes green-tone the moment the row is `'done'`, even if the date is
   past. The PAYMENT tile goes red-tone if payment date is past AND not
   `paymentSatisfied`. This isolates the "filed but payment overdue"
   visual: filing tile calm, payment tile red.

## What this directly fixes

For the screenshot's Form 1065 (status=`'done'`, paymentDueDate=2026-03-16,
today=2026-05-27):

| Surface | Before | After |
|---|---|---|
| Client header "Next due" | "Nov 15" (next non-done row) | shows the overdue Mar 16 item (filtered through `nextDue`) |
| "At risk" tile | 0 | 1 (catches payment-overdue) |
| "Open filing" tile | 1 (only counted the non-done row) | 2 (correctly counts the done-but-payment-due row) |
| ObligationDetailPanel FILING DEADLINE pill | red border + red value | green tone (filing satisfied) |
| ObligationDetailPanel PAYMENT DUE pill | neutral | red tone (payment overdue) |

## What this does NOT fix (Wave-4 candidates)

`actions-list.tsx:DASHBOARD_TERMINAL_STATUSES` and
`obligations.tsx:DUE_DAYS_TERMINAL_STATUSES` both still include `'done'`.
They use the legacy "settled" semantic to render "Filed N days late" as a
muted quality stat. For lifecycle v2 correctness:

- The DASHBOARD's "Needs attention" should surface payment-overdue rows
  alongside true-overdue rows.
- The QUEUE row's badge should distinguish "Filed (X days late)" — a
  quality stat — from "Filed but payment overdue NN days" — a live signal.

These are journey-level fixes that need broader thinking about the queue +
dashboard surfaces. Deferred to φ journey-audit.

## What this reveals about audit methodology

The five visible symptoms (header next-due, At risk tile, Open filing tile,
right-panel pill tone, ObligationDetailPanel) all reduced to ONE root bug
(over-broad terminal set + per-milestone tone math missing). Surface-by-surface
audits (Step 6 first / cont, Step 9) caught label drift and missing tooltips
but never sat down with a CPA scenario like "I filed but haven't paid yet,
what does my product look like?" That's a JOURNEY audit, and it's queued
for φ once ρ + σ merge.

## Files touched

- `apps/app/src/features/clients/ClientSummaryStrip.tsx`
- `apps/app/src/features/clients/ClientDetailDrawer.tsx`
- `apps/app/src/features/clients/ClientPeekHoverCard.tsx`
- `apps/app/src/routes/obligations.tsx` (DeadlinesStrip tone math only)

## Verification

- `cd apps/app && pnpm exec tsc --noEmit` — clean
- `pnpm test --run src/features/clients src/routes/obligations.test` — 70/70 pass
- Browser verification pending (preview server already running on 5189)
