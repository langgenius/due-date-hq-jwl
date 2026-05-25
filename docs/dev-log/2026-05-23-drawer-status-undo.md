---
title: 'Drawer status toast gets Undo — parity with the queue'
date: 2026-05-23
author: 'Yuqi pairing with Claude'
area: ux
---

# Closes the queue/drawer Undo asymmetry

Yuqi's audit caught it: the **queue page** has an Undo button on the
"Status changed" toast (commit `5d8e8c…`, task #20), but the **drawer**
showed the same success message without Undo. Same RPC, same backend
allowance, just never retrofitted.

Both the status pill in the drawer header and the forward-action
buttons in the active-stage card flowed through
`changeStatusMutation.mutate(...)` directly. The mutation's
`onSuccess` fired a toast based only on `vars.status` (the new value)
— react-query doesn't surface the value the row was at before the
mutation, so there was no way for the base callback to offer Undo.

## Pattern

Followed the queue's `updateStatus` callback shape verbatim:

1. Move the success toast OUT of the mutation's `onSuccess`. The base
   `mutationOptions` now only handles cache invalidation and the
   error toast.
2. Add a per-call `changeStatus(id, nextStatus, previousStatus)`
   callback that calls `.mutate(input, { onSuccess: ... })` with a
   closure-based success handler. The handler closes over
   `previousStatus`, so it can fire a reverse-mutation when the user
   taps Undo.
3. No-op clicks (`previousStatus === nextStatus`) skip the Undo
   affordance since there's nothing to reverse.

```ts
toast.success(t`Status changed to ${statusLabels[nextStatus]}`, {
  description: t`Audit ${result.auditId.slice(0, 8)}`,
  action: canUndo
    ? {
        label: t`Undo`,
        onClick: () => changeStatusMutation.mutate({ id, status: previousStatus }),
      }
    : undefined,
})
```

## Backend allowance — already there

No backend change. The transition matrix in
`packages/core/src/obligation-workflow/index.ts` already allows
reverse moves for every open status pair:

- `pending ↔ in_progress` ✓
- `in_progress ↔ waiting_on_client` ✓
- `waiting_on_client ↔ review` ✓
- `review ↔ blocked` ✓
- `done ↔ review` (rejection unwind) ✓
- `done → completed` (acceptance) — Undo can reverse it ✓

The one Undo that won't work is `completed → anything` — `completed`
is the v2 terminal with no outbound transitions (`OBLIGATION_TRANSITIONS.completed = []`).
Per the workflow comment: "Admin reset from completed → pending is
intentionally NOT exposed in the manual dropdown — must be an explicit
override path." If the CPA fires a forward move that lands on
`completed`, the Undo button will hit the BAD_REQUEST gate on the
server. We'd want to either suppress the Undo affordance for moves
that land on a terminal state, or surface the error gracefully. (Out
of scope for this commit — flagged here for follow-up.)

## Call sites updated

- **Status pill in drawer header** (line ~3781):
  `onChange={(id, status) => changeStatus(id, status, row.status)}`
- **ActiveStageDetailCard.onChangeStatus** (line ~3897):
  `(nextStatus) => changeStatus(row.id, nextStatus, row.status)`

Both capture `row.status` at the click moment, before the mutation
invalidates the cache.

## Files touched

- `apps/app/src/routes/obligations.tsx` — moved toast out of mutation
  onSuccess, added `changeStatus` per-call wrapper, updated both call
  sites to pass previous status

## Verified

- `pnpm exec tsc --noEmit` — clean
- `pnpm exec vp check --fix` — clean
- `pnpm exec vp run @duedatehq/app#test` — 47 files / 290 tests passing

## Out of scope (flagged for follow-up)

- Suppressing/handling Undo when the next status lands on `completed`
  (terminal — Undo would hit BAD_REQUEST). Today the Undo button
  still renders; clicking it shows a "Couldn't change status" error
  toast since the server rejects the reverse. Not catastrophic, just
  not graceful.
- Bulk status undo (`bulkUpdateStatus`) — the queue's bulk operation
  doesn't have Undo either. Separate ask.
