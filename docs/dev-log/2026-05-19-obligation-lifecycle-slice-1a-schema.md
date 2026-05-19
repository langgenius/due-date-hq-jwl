---
title: 'Obligation lifecycle v2: slice 1a — schema additions (blocked, completed)'
date: 2026-05-19
author: 'Claude'
area: obligations
---

# Obligation lifecycle v2: slice 1a — schema additions (blocked, completed)

## Context

First implementation slice of the lifecycle v2 migration shaped in
[2026-05-19-obligation-lifecycle-design-brief.md](2026-05-19-obligation-lifecycle-design-brief.md).
The brief identified that `blocked` and `completed` have no
schema-level representation today, so any meaningful preview behind a
flag has to start with non-breaking enum additions.

## Change

Added `blocked` and `completed` as enum values to every authoritative
`ObligationStatus` definition in the workspace. Existing 8 values
remain valid — this is purely additive.

### Type definitions touched

| File                                                                                                         | What                                                                                       |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| [packages/contracts/src/shared/enums.ts:60-72](../../packages/contracts/src/shared/enums.ts)                 | `ObligationStatusSchema` (Zod) gains two values                                            |
| [packages/db/src/schema/obligations.ts:161-176](../../packages/db/src/schema/obligations.ts)                 | Drizzle column `text('status', { enum: [...] })`                                           |
| [packages/db/src/schema/obligations.ts:374-386](../../packages/db/src/schema/obligations.ts)                 | `OBLIGATION_STATUSES` exported constant                                                    |
| [packages/core/src/obligation-workflow/index.ts:1-13](../../packages/core/src/obligation-workflow/index.ts)  | `OBLIGATION_STATUSES` constant + `ObligationStatus` type                                   |
| [packages/core/src/obligation-workflow/index.ts:21-39](../../packages/core/src/obligation-workflow/index.ts) | `OPEN_OBLIGATION_STATUSES` gains `blocked`; `CLOSED_OBLIGATION_STATUSES` gains `completed` |
| [packages/core/src/obligation-workflow/index.ts:42-65](../../packages/core/src/obligation-workflow/index.ts) | `ObligationStatusDisplayKey` + `OBLIGATION_STATUS_DISPLAY_KEYS` map cover the new values   |
| [packages/core/src/priority/index.ts:36-47](../../packages/core/src/priority/index.ts)                       | `SmartPriorityStatus` mirror updated                                                       |
| [packages/ports/src/shared.ts:30-42](../../packages/ports/src/shared.ts)                                     | `ObligationStatus` literal-union mirror updated                                            |

### Open/closed classification

- `blocked` joins the **open** set — it's open work waiting on an upstream obligation to clear.
- `completed` joins the **closed** set — terminal, acceptance landed. (Note: today's `done` already counts as closed and is labeled "Filed" in the UI; the v2 split between `filed`-as-`done` and `completed` happens in later slices.)

### Default readiness for the new states

`defaultReadinessForStatus` already routes through `isClosedObligationStatus`. The new behaviour, exercised by the updated test:

- `blocked` → falls through to `currentReadiness ?? 'ready'` (so a row with `currentReadiness='needs_review'` returns `'needs_review'`).
- `completed` → `'ready'` via the closed-status branch.

### UI status-control adopts the new values

[apps/app/src/features/obligations/status-control.tsx](../../apps/app/src/features/obligations/status-control.tsx) gains:

- `ALL_STATUSES` includes `blocked` + `completed`.
- New `LIFECYCLE_V2_STATUSES = ['pending', 'waiting_on_client', 'blocked', 'review', 'done', 'completed']` — the six values the v2 dropdown surfaces; ordered for the keyboard 1-6 shortcut promised in the brief.
- `STATUS_VARIANT[blocked]='destructive'`, `STATUS_VARIANT[completed]='success'`.
- `STATUS_DOT[blocked]='error'`, `STATUS_DOT[completed]='success'`.
- `useStatusLabels` gains entries: `Blocked`, `Completed`.
- New `useLifecycleV2StatusLabels` — same shape, but renames `review` to "In review" and is the label set the v2 surface will use.

### Feature flag

New hook [apps/app/src/features/obligations/use-lifecycle-v2.ts](../../apps/app/src/features/obligations/use-lifecycle-v2.ts) reads `?lifecycle=v2` from the URL via `useSyncExternalStore`. Lets two browser tabs preview old vs new side by side without a rebuild. Defaults `false` on the server.

## Verification

- `pnpm check` — pass (lint + typecheck, 579 files clean).
- `pnpm -F @duedatehq/contracts -F @duedatehq/db -F @duedatehq/core -F @duedatehq/app test --run` — 444/444 pass.
- Two tests updated to expect the new values in the canonical enums (no behaviour change).

## Not in this slice

- Status column on the Obligations queue (next).
- Timeline tab in the obligation detail drawer (next).
- Transition validation matrix (slice 2).
- Auto-transitions, `blocked_by` pointer, rejection unwind (slice 2/3).
- Data migration script (slice 3).
