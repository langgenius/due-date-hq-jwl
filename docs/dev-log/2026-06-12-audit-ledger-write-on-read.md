# 2026-06-12 — Audit ledger: viewing the Materials tab no longer mints audit events

From the full-app UX critique (P0 #1): opening a deadline's Materials tab
fired `readiness.generateChecklist` — a **mutation** — on every fresh mount,
and the handler wrote a `readiness.checklist.regenerated` audit row
unconditionally. One read-only review session left six identical
user-attributed "Updated materials checklist" entries on the hudson 1040's
Audit tab (badge climbed 1→2→4→5→6 from navigation alone). For a product
whose footer promises "Every decision captured to audit ledger," a
page render must never be able to write the ledger.

## Change

Two layers, both defended:

1. **Server is idempotent + audits only real changes.**
   - `packages/ports/src/readiness.ts` + `packages/db/src/repo/readiness.ts`:
     `reconcileDocumentChecklistItems` now returns
     `{ rows, inserted, updated }` instead of bare rows — the reconcile plan
     already knew the counts; now callers can tell a rebuild from a no-op.
   - `apps/server/src/procedures/readiness/index.ts` — `generateChecklist`
     handler writes the audit row **only when `inserted + updated > 0`**, and
     the `after` payload now records `{ itemCount, inserted, updated }` so a
     real rebuild is distinguishable in the ledger.
     (`loadReadinessRequestEmailDraft` unwraps `.rows`; it never audited.)

2. **Client stops auto-firing when a checklist already exists.**
   `shouldAutoGenerateChecklist` now requires `storedChecklist.length === 0`
   in both live copies of the drawer:
   - `apps/app/src/features/obligations/queue/ObligationQueueDetailDrawer.tsx`
   - `apps/app/src/routes/obligations.tsx`

   Lazy materialization on FIRST view (empty checklist) is kept — that's the
   intended "no button press" UX and now writes exactly one audit event, for
   the one real change. The manual "Regenerate" button still works and is a
   no-op (no audit row) when the template output is unchanged.

Test mocks updated for the new return shape:
`apps/server/src/procedures/readiness/index.test.ts`,
`apps/server/src/procedures/obligations/index.test.ts`,
`apps/server/src/procedures/rules/_obligation-generation.test.ts`.

## Verify

- `apps/server` vitest: 54 files / 546 tests pass. `packages/db`: 20/181 pass.
- Live (port 5177): opened `/deadlines/000000000003`, clicked Materials,
  hard-reloaded directly on `/readiness` — Audit tab badge stays at 8 across
  repeated fresh mounts (previously +1 per visit).

## Not fixed here

The six phantom "Updated materials checklist" rows already in the local demo
DB are data, not code — they wash out on the next `seed:demo` (tracked in the
Phase 1e seed-truthing pass).
