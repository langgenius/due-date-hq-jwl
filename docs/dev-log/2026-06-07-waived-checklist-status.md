# Waived readiness-checklist status + Waive action

Date: 2026-06-07

Backend data pass, item 3. The Materials-tab "Waived" sub-section (Pencil
AYpfU > BGLC4) was a static empty state; CPAs can now actually waive an
outstanding document that doesn't apply this filing year.

## What shipped (NO DB migration)

The `status` column is `text({ enum })` with no SQL CHECK, so adding a value is
a TS-only change.

- `packages/contracts/src/readiness.ts` + `packages/db/src/schema/readiness.ts`
  - `packages/ports/src/readiness.ts` — `'waived'` added to the checklist-item
    status enum/union. The existing `readiness.updateChecklistItem({ itemId,
status })` mutation accepts it — no new procedure.
- `packages/db/src/repo/readiness-derived.ts` +
  `apps/app/.../helpers.ts` + `apps/app/src/routes/obligations.tsx`
  (`willReadinessChecklistBeFullyReceived`) — waived items count as **satisfied**
  alongside received when deriving readiness ("all received-or-waived → ready").
  The repo update path already nulls `receivedAt` for non-received statuses.

## UI (Pencil AYpfU)

- `apps/app/src/features/obligations/ChecklistItemRow.tsx` — overflow menu gains
  "Waive — doesn't apply" / "Un-waive"; a secondary "Waived" status chip.
- `ObligationQueueDetailDrawer.tsx` — the Waived sub-section renders the real
  waived rows (empty-state fallback when none); outstanding/selectable/progress
  counts exclude waived so waived items don't read as to-dos or get swept into
  the "mark received" batch.

## Verify

- tsgo (app + server + db + contracts + ports) → 0
- server readiness 21/21, db readiness+queue 18/18, app obligations 34/34
- `vp check` → 0 errors
