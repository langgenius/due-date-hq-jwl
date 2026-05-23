---
title: 'In Review sub-status mutations — updatePrepStage + updateReviewStage RPCs'
date: 2026-05-23
author: 'Yuqi pairing with Claude'
area: backend
---

# Wires the In Review pipeline strip to real mutations

Yuqi's pushback on the half-built pipeline: "otherwise it is for no use?".
Right — the In Review stage card shows a 6-step strip (Ready to draft →
Preparer drafting → Draft complete → Ready for reviewer → Reviewer
checking → Reviewer approved), but until now nothing mutated the row.
Sub-state columns (`prep_stage`, `review_stage`) only got set by the demo
seed.

This commit lands the backend half: two new RPCs the frontend can call to
flip the slider position.

## RPCs

### `obligations.updatePrepStage`

```ts
input:  { id: EntityId, prepStage: ObligationPrepStage, reason?: string }
output: ObligationStatusUpdateOutput  // { obligation, auditId }
```

### `obligations.updateReviewStage`

```ts
input:  { id: EntityId, reviewStage: ObligationReviewStage, reason?: string }
output: ObligationStatusUpdateOutput
```

Both wear the same role gate as `updateStatus`
(`OBLIGATION_STATUS_WRITE_ROLES`) and follow the same find → mutate →
re-read → audit shape used by the rest of the obligations service.

## State machine

**All transitions are legal**, forward and backward. The CPA can jump from
`prepared` back to `ready_for_prep`, or from `approved` straight back to
`in_prep`. No guards. Reasoning lives in the companion design doc
(`docs/Design/in-review-substatus-mutations-2026-05-23.md`) — the short
version is that the CPA's real workflow loops (reviewer kicks back to
prep, scope changes mid-review) and guarding creates more friction than it
prevents.

`notes_open` is a flag, not a step — it overlays `in_review` in the
visualization. The same RPC handles it; the frontend will surface separate
"Leave note" / "Notes addressed" affordances.

## Audit shape

Mirrors `obligation.status.updated`:

```
action:      'obligation.prep_stage.updated' | 'obligation.review_stage.updated'
subjectType: 'obligation_instance'
subjectId:   <obligation id>
beforeJson:  { prepStage: <old>, reason?: <optional> }
afterJson:   { prepStage: <new>, reason?: <optional> }
```

This lets the existing `pastEntries` derivation and `CompletedKeyDates`
summary pick up sub-status transitions without any extra plumbing.

## No-op short-circuit

If `before.prepStage === input.prepStage`, the service returns the existing
row with a zero-uuid `auditId` and skips both the write and the audit.
Same pattern as `updateBlockedBy` — keeps the audit trail clean when the
frontend optimistically fires the same value back.

## What's missing

- **`enqueueDashboardBriefRefresh`** — skipped. Sub-status doesn't affect
  the dashboard summary tiles (those key off stage, not pipeline position).
- **Role-specific guards** (only reviewer can flip `reviewStage`) — punt
  to a follow-up; reusing the existing role list keeps this round focused.
- **Auto-derivation from concrete signals** (editing the return →
  auto-set `prepStage='in_prep'`) — punt. The slider is the action
  surface for now.

## Tests

8 new tests in `apps/server/src/procedures/obligations/_service.test.ts`:

**`updateObligationPrepStage`**

- updates + writes audit
- allows backward (`prepared` → `ready_for_prep`)
- no-op when value matches (zero-uuid auditId, no setter call)
- throws NOT_FOUND when row missing
- omits reason from audit when not provided

**`updateObligationReviewStage`**

- updates + writes audit
- handles `notes_open` ↔ `in_review` round-trip
- no-op when value matches
- throws NOT_FOUND when row missing

Mock repo factories in both `obligations/_service.test.ts` and
`migration/_service.test.ts` get the new `setPrepStage` / `setReviewStage`
stubs to satisfy the widened `ObligationsRepo` port interface.

Full server suite: 40 files, 253 tests, all green.

## Files touched

- `docs/Design/in-review-substatus-mutations-2026-05-23.md` — design doc
- `packages/contracts/src/obligations.ts` — input schemas + contract entries
- `packages/contracts/src/index.ts` — barrel exports
- `packages/ports/src/obligations.ts` — port interface widening
- `packages/db/src/repo/obligations.ts` — drizzle setter implementations
- `apps/server/src/procedures/obligations/_service.ts` —
  `updateObligationPrepStage` + `updateObligationReviewStage`
- `apps/server/src/procedures/obligations/index.ts` — handler registration
- `apps/server/src/procedures/index.ts` — router shape
- `apps/server/src/procedures/obligations/_service.test.ts` — 8 new tests
- `apps/server/src/procedures/migration/_service.test.ts` — port stubs

## Frontend wiring

Lands in the next commit: pipeline-step buttons, undo toast (sonner),
`notes_open` affordances, drop the manual reminders.
