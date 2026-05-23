---
title: 'V2 obligation panel wires its own stage actions'
date: 2026-05-23
author: 'Yuqi pairing with Claude'
area: ux
---

# V2 panel can stand on its own now

The V2 obligation panel (`?panel=v2`) was originally shipped as a
read-only comparison prototype. Its `ActiveStageCard` had
placeholder copy on every stage pointing back at V1:

> "Nothing started yet. Move into work via the original panel for
> now."
> "Blocked. Inline blocker editor lands when we promote V2 — for
> now, use the original panel."
> "In review. Approve or send back via the original panel."
> etc.

That fallback worked while V1 owned all the mutations. Earlier in
this commit pass V1's `ObligationDrawerStatusActions` block was
removed (Commit G), which retired the "original panel" the V2 copy
was pointing at. V2 needed to start carrying its own primary
forward affordances.

## Mutations now live in V2

`ObligationPanelV2` gained two `useMutation` hooks mirroring what
V1 used to wire on the drawer:

- `orpc.obligations.updateStatus` — generic forward transitions
  (`pending → review`, `waiting_on_client → review`, `blocked →
review`, `review → done`, `done|paid → completed`, etc.). Toast
  copy reads the destination label so the CPA sees what they
  advanced to.
- `orpc.obligations.markFiledRejected` — dedicated mutation for
  authority-rejection semantics (different RPC, bespoke audit row,
  unwinds `done → review` with an `efile_rejected_at` stamp). Used
  on the `done` stage's secondary recovery action.

Both invalidate `orpc.obligations.getDetail.key()` +
`orpc.obligations.list.key()` on success so the panel reflects the
new status without a manual close/reopen.

## Stage-dispatched action surfaces

`ActiveStageBody` now returns a small contextual card per status
instead of a placeholder paragraph:

| Stage                           | Headline                                 | Primary                                  | Secondary                          |
| ------------------------------- | ---------------------------------------- | ---------------------------------------- | ---------------------------------- |
| pending                         | "No work has started on this return…"    | Start preparation → review               | —                                  |
| waiting_on_client               | "Waiting on these documents:" + list     | Mark docs received → review              | —                                  |
| blocked                         | "An external blocker is holding this…"   | Mark unblocked → review                  | —                                  |
| review / in_progress / extended | "Preparation in progress…"               | Mark filed → done                        | —                                  |
| done                            | "Filed — awaiting authority acceptance." | Confirm authority acceptance → completed | Record authority rejection (ghost) |
| paid                            | "Payment processed…"                     | Mark obligation complete → completed     | —                                  |
| completed                       | "Closed out — no further action."        | —                                        | —                                  |
| (other)                         | "No outstanding work for this status."   | —                                        | —                                  |

Every primary button now reflects the canonical next status
transition for the stage; the rejection path on `done` mirrors the
recovery affordance V1's removed actions row carried.

## What V2 still doesn't do

The deep e-file / payment sub-status pipelines that V1's
`ActiveStageDetailCard` exposes (8879 requested → signed →
submitted → accepted, or estimate → approval → scheduled →
confirmed) are NOT in V2 yet. V2's `done` and `paid` stages collapse
to the high-level acceptance/completion actions. Those sub-flows
need their own RPC procedures (`updateEfileState`,
`updatePaymentState`, etc.) anyway — same place V1 stops being
able to mutate.

## i18n

6 new strings across the stage bodies + zh-CN translations.

## Files touched

- `apps/app/src/features/obligations/ObligationPanelV2.tsx`:
  - Added `useMutation`/`useQueryClient` + `changeStatusMutation` +
    `markFiledRejectedMutation`.
  - Replaced placeholder `ActiveStageBody` with stage-dispatched
    real action surfaces.
  - Imported `AlertTriangleIcon`, `useLingui`, `rpcErrorMessage`.
- `apps/app/src/i18n/locales/{en,zh-CN}/messages.po` — 6 new
  strings + Chinese translations.
