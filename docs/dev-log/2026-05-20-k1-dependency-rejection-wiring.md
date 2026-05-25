# 2026-05-20 · K-1 dependency + e-file rejection wiring

## Summary

Closes the two highest-leverage Must items from
[docs/PRD/obligation-row-PRD.md](../PRD/obligation-row-PRD.md) §7.1: the K-1 dependency pointer
(PDF anti-pattern #4 + §6.4) and the e-file rejection sub-flag (PDF anti-pattern #3 — Filed ≠ Done).
Both relied on schema fields that were already in place; this PR wires the missing RPCs, service
functions, and drawer affordances so the visible chips (`BlockedByChip`, `RejectionChip`) actually
have a way to be set from the UI.

## Shipped

### Contracts (`packages/contracts/src/obligations.ts`)

- `ObligationMarkFiledRejectedInputSchema` + `markFiledRejected` RPC
- `ObligationUpdateBlockedByInputSchema` + `updateBlockedBy` RPC

### Ports (`packages/ports/src/obligations.ts`)

- `ObligationsRepo.setEfileRejected(id, { rejectedAt, nextStatus })`
- `ObligationsRepo.setBlockedBy(id, { blockedBy, nextStatus })`

### DB repo (`packages/db/src/repo/obligations.ts`)

- `setEfileRejected` — stamps `efile_rejected_at`, clears `efile_accepted_at`, transitions status
- `setBlockedBy` — sets/clears `blocked_by_obligation_instance_id`, transitions status

### Service (`apps/server/src/procedures/obligations/_service.ts`)

- `markObligationFiledRejected` — guards that row is currently `done`; stamps + transitions to
  `review`; writes `obligation.efile.rejected` audit row with before/after state.
- `updateObligationBlockedBy` — validates parent exists in same firm, isn't self-reference,
  isn't already `completed`; transitions to `blocked` when pointer is set, back to `pending`
  when cleared; writes `obligation.blocked_by.set` or `obligation.blocked_by.cleared` audit
  row. The parent-completion auto-unblock cascade (`unblockChildrenOf`) already wired into
  `updateObligationStatus` continues to fire — children flip `blocked → pending` automatically
  when the parent reaches `completed`.

### Handler registration (`apps/server/src/procedures/obligations/index.ts` + `procedures/index.ts`)

- Both new handlers wired with `OBLIGATION_STATUS_WRITE_ROLES` permission check and a
  `dashboard_brief` refresh enqueue on success.

### Drawer UI (`apps/app/src/routes/obligations.tsx`)

- **Mark e-file rejected** outline button next to **Mark accepted** in the drawer header,
  visible only when row status is `done` / `paid`.
- **Upstream dependency** section in the Readiness tab — renders one of three states:
  - currently blocked: shows the parent label (`Client · TaxType`) + Clear button
  - not blocked, candidates available: Select dropdown of other obligations in the firm
    (filtered to exclude self and `completed` rows)
  - not blocked, no candidates loaded: hint message
- `ObligationQueueDetailDrawer` now accepts `blockerCandidates: ObligationQueueRow[]` prop
  so the picker can list real obligations from the loaded queue page.

### Test stubs (`apps/server/src/procedures/{_penalty-exposure,obligations,migration}/...`)

- All 3 stub `ObligationsRepo` implementations now satisfy the two new methods.
- The full-fidelity `_service.test.ts` stub mutates its map so the new mutations are
  testable end-to-end.

### Demo data (`mock/demo.sql`)

Two `UPDATE` statements at the tail of the seed:

- **K-1 dependency**: Lakeview Medical Partners' `federal_1120s` is marked `blocked`, with
  `blocked_by` pointing at Brightline's `federal_1065`. Demonstrates the cross-client cascade
  pattern (PDF §6.4: source entity obligation → K-1 recipient obligation).
- **Rejection**: Brightline trust's `federal_1041` is unwound to `review` with
  `efile_rejected_at` set. The `Rejected` chip renders on the row automatically once both
  conditions hold.

## Activation

The demo additions only show after a re-seed:

```
pnpm db:seed:demo
```

This affects the shared local D1; check with the parallel session before running.

## What's NOT in this PR

- Per-firm `completed` retention setting (decided "firm-configurable" — needs settings UI)
- Bulk rejection / bulk blocker mutation (no demand)
- Acceptance webhook integration (still manual confirm)
- K-1 dependency graph view (cross-page IA artifact, not row-level)
- Form 8879 e-file authorization (PRD §7.2 Should — separate PR)
