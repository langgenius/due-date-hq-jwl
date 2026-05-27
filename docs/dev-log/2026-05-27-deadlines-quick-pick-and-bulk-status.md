# 2026-05-27 - Deadlines: Bulk Status Survives Terminal Rows

## Context

Bulk "Set status" on `/deadlines` threw `Illegal status transition for
deadline <id>: completed → waiting_on_client.` and reverted the entire batch
whenever the selection included a terminal row (e.g. one `completed` row in
a multi-row "Waiting on client" pick). The server's own comment said the
brief's contract was "<N> rows skipped — illegal status transition", but the
implementation threw on the first illegal source row, poisoning the whole
batch. Preparers mid-tax-week lost the click.

(The sibling `AssigneeQuickPicker` `MenuGroupContext` bug was diagnosed
separately on this branch — bb12a8f4 / 86d037be — and fixed by removing the
empty-state `DropdownMenuItem` and the `DropdownMenuLabel` from inside the
`DropdownMenuRadioGroup`. This commit doesn't touch the picker.)

## Changes

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
