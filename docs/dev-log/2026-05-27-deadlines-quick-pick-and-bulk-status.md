# 2026-05-27 - Deadlines: Quick-Pick Real Fix + Bulk Status Survives Terminal Rows

## Context

Two `/deadlines` bugs drained in this pass.

**1. `AssigneeQuickPicker` MenuGroupContext crash (real root cause).** The
prior fix on this branch (bb12a8f4 / 86d037be) diagnosed the
`Base UI: MenuGroupContext is missing` crash as the empty-state
`DropdownMenuItem` being nested inside the `DropdownMenuRadioGroup`, and
moved that Item out. That part of Base UI tolerates either placement — the
real consumer of `useMenuGroupRootContext()` (verified against
`@base-ui/react/menu`) is `MenuPrimitive.GroupLabel`, which our
`DropdownMenuLabel` renders. The Label was a direct child of
`DropdownMenuContent`, with no `Menu.Group` / `Menu.RadioGroup` ancestor,
so it kept throwing. Placing the Label INSIDE the `DropdownMenuRadioGroup`
gives it the context it needs and preserves the "Assign owner" header.

**2. Bulk "Set status" threw on terminal rows.** Selecting a mixed batch
(open + completed) and picking, say, "Waiting on client" returned
`Illegal status transition for deadline <id>: completed → waiting_on_client.`
and reverted the entire batch. The server's own comment said the brief's
contract was "<N> rows skipped — illegal status transition", but the
implementation threw on the first illegal source row.

## Changes

- `apps/app/src/routes/obligations.tsx` (`AssigneeQuickPicker`): moved the
  `DropdownMenuLabel` "Assign owner" header from a direct child of
  `DropdownMenuContent` to INSIDE the `DropdownMenuRadioGroup`. Kept the
  bb12a8f4 comment explaining the empty-state move, which is still a valid
  structural cleanup even though it wasn't the trigger of this crash.
- `apps/server/src/procedures/obligations/_service.ts`
  (`bulkUpdateObligationStatus`): partition candidates into legal vs. illegal
  via `isLegalObligationTransition`, skip the illegal ones, count them, return
  `skippedCount` alongside `updatedCount`. Single-row `updateObligationStatus`
  still throws on an explicit illegal pick — only the bulk path skips.
- `packages/contracts/src/obligations.ts`
  (`ObligationBulkStatusUpdateOutputSchema`): added required
  `skippedCount: z.number().int().min(0)`.
- `apps/app/src/routes/obligations.tsx` and
  `apps/app/src/features/clients/ClientFactsWorkspace.tsx`: bulk-status toast
  description now appends `· M skipped (already closed)` when the server
  skipped anything. The `/deadlines` toast title keeps the
  `Status changed to <label>` pattern introduced in this branch's prior pass.
- Added `_service.test.ts` tests covering (a) partial skip — open + completed
  → waiting_on_client returns `updatedCount=1, skippedCount=1`, and (b) all
  rows skipped — `updatedCount=0, skippedCount=N, auditIds=[]`.
- Updated `contracts.test.ts` to assert `skippedCount` on the parsed output.

## Validation

- `pnpm --filter @duedatehq/server test -- src/procedures/obligations/_service.test.ts` — 27/27.
- `pnpm --filter @duedatehq/contracts test -- src/contracts.test.ts` — 30/30.
- `pnpm --filter @duedatehq/app exec tsc --noEmit` — clean.
- `pnpm --filter @duedatehq/server exec tsc --noEmit` — clean.
- Live bulk-status round-trip not verified in browser because the local
  wrangler dev on :8787 is owned by a separate worktree and runs stale
  server code; the schema change would only round-trip cleanly against a
  rebuilt server. Service-layer test covers the exact reported scenario.
