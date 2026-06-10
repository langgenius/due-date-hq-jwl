# Active workflow stage card — per-state spec

**Date:** 2026-06-09
**Pencil reference:** `MWhnh` (Waiting on client variant + agents building 5 other state variants)
**Backend audit companion:** `docs/product-design/deadlines/eng-brief-2026-06-09-status-bus-and-integrations.md` + `reference_data_consistency_contract`

## Card shell (constant across all 6 states)

```
┌─────────────────────────────────────────────────────────────┐
│ LEFT COLUMN                       │ RIGHT COLUMN (bg-subtle) │
│ padding [22,24]                   │ width 200 · padding [22,20]│
│                                   │                          │
│ Eyebrow row: Stage Pill + · +     │ OWNER block              │
│ Stage N of 6                      │ (eyebrow + avatar + name) │
│                                   │                          │
│ Headline (Geist 20/600/-0.4)      │ ─── divider              │
│ Sub meta (Geist 12/500/tertiary)  │                          │
│                                   │ ActionStack (vertical)   │
│ BigNumber (Mono 36/700 + Geist 13)│ - PRIMARY CTA (accent)   │
│ SegBar (height 4, success-solid)  │ - Ghost #1               │
│ Chip row (received/outstanding/   │ - Ghost #2               │
│   waived/total)                   │                          │
│                                   │ SystemMeta (10pt bot icon)│
└─────────────────────────────────────────────────────────────┘
```

Removed across all states: **no projected/ETA chips, no fictional forecasts.** User explicit direction 2026-06-09: "do not have projected time."

## Per-state content matrix

### Stage 1 — Not started (`pending`)

| Slot        | Content                                                                                  | Backend source                                     |
| ----------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Stage pill  | `Not started` + circle-dashed icon                                                       | warning palette · `status === 'pending'`           |
| Headline    | `Ready to start preparing.`                                                              | static stage copy                                  |
| Sub         | `Filing deadline {date} · {N} days from internal target.`                                | `obligation.filingDeadline` + `internalTargetDate` |
| BigNumber   | `0` of `{N} materials requested`                                                         | `readinessChecklist.length` (0 received)           |
| SegBar      | empty track                                                                              | derives                                            |
| Chips       | `0 received` `0 outstanding` `0 waived` muted                                            | derives                                            |
| Primary CTA | `Start preparing` → `updateStatus(in_progress)` → naturally lands on `waiting_on_client` | REAL mutation `obligations.updateStatus`           |
| Ghost #1    | `Request docs from client` → `readiness.sendRequest`                                     | REAL                                               |
| Ghost #2    | `Open Materials`                                                                         | navigation                                         |
| SystemMeta  | `auto-prompts when materials request sent`                                               | event behavior                                     |

### Stage 2 — Waiting on client (`waiting_on_client`) — **current MWhnh**

| Slot        | Content                                                                                             | Backend source                                     |
| ----------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Stage pill  | `Waiting on client` + hourglass                                                                     | warning palette · `status === 'waiting_on_client'` |
| Headline    | `{N} materials still outstanding.`                                                                  | derived from count                                 |
| Sub         | `{daysWaiting} days waiting · last reminded {date} · client portal opened {relativeTime}`           | (#4 audit log) + (#10 audit log) + `firstOpenedAt` |
| BigNumber   | `{received}` of `{total} materials`                                                                 | `readinessChecklist`                               |
| SegBar      | proportional fill at received/total                                                                 | derives                                            |
| Chips       | `{received} received` (success) · `{outstanding} outstanding` (warning) · `{waived} waived` (muted) | derives                                            |
| Primary CTA | `Send reminder` → `readiness.sendRequest`                                                           | REAL                                               |
| Ghost #1    | `Mark received` → ⚠️ requires **net-new** bulk `markAllReceivedForObligation()` mutation            | NET-NEW (in eng brief)                             |
| Ghost #2    | `Open Materials`                                                                                    | navigation                                         |
| SystemMeta  | `last reminded {date} via client portal`                                                            | REAL audit log                                     |

### Stage 3 — Blocked (`blocked`)

| Slot           | Content                                                                                                                           | Backend source                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Stage pill     | `Blocked` + x-circle icon                                                                                                         | destructive palette · `status === 'blocked'`                           |
| Headline       | `Dependency on parent {parentObligation}.`                                                                                        | `obligation.blockedBy.parentObligationId` (REAL via `updateBlockedBy`) |
| Sub            | `Parent obligation must complete before this filing can advance.`                                                                 | static                                                                 |
| BigNumber slot | **Replace** with `BLOCKED BY` block: clickable parent name                                                                        | parent obligation lookup                                               |
| SegBar         | hidden (Blocked isn't about materials progress)                                                                                   | conditional render                                                     |
| Chips          | `parent status: {parentStatus}` + `auto-unblocks when parent completes`                                                           | parent status query                                                    |
| Primary CTA    | `Resolve blocker` (destructive bg) → `updateBlockedBy(null)` (lands status in `pending` per [[project_auto_unblock_destination]]) | REAL                                                                   |
| Ghost #1       | `Open parent {parentForm}`                                                                                                        | navigation                                                             |
| Ghost #2       | `Mark waived` → would need a `markWaived` mutation if not yet present                                                             | verify                                                                 |
| SystemMeta     | `auto-unblocks when parent reaches Completed`                                                                                     | event behavior                                                         |

### Stage 4 — In review (`review`)

| Slot        | Content                                                                                                 | Backend source                         |
| ----------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Stage pill  | `In review` + eye icon                                                                                  | accent palette · `status === 'review'` |
| Headline    | `Awaiting partner sign-off on return + 8879.`                                                           | derived from `reviewStage` field       |
| Sub         | `All materials received. {reviewer} flagged {N} items for clarification.`                               | requires review-stage data             |
| BigNumber   | `14` of `14 materials received` (full)                                                                  | derives                                |
| SegBar      | 100% success-filled                                                                                     | derives                                |
| Chips       | `14 received` · `0 outstanding` · `0 waived` (all subtle, just status)                                  | derives                                |
| Below chips | Reviewer row: avatar + `{reviewer name, role}` + `reviewing {N}d`                                       | review-stage data                      |
| Primary CTA | `Approve & file` → fires TWO mutations: `updateReviewStage('approved')` THEN `updateStatus('done')`     | REAL but composite                     |
| Ghost #1    | `Send to client for signature` → triggers 8879 e-sign flow (requires e-signature integration — NET-NEW) | NET-NEW                                |
| Ghost #2    | `Request changes` (open clarification thread)                                                           | needs feature                          |
| SystemMeta  | `auto-routes signed 8879 → e-file when received`                                                        | event behavior                         |

### Stage 5 — Filed (`done`)

| Slot           | Content                                                                                                               | Backend source                                                                                                              |
| -------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Stage pill     | `Filed` + send icon (success-soft palette, muted)                                                                     | `status === 'done'`                                                                                                         |
| Headline       | `Submitted to IRS · awaiting acknowledgment.`                                                                         | static                                                                                                                      |
| Sub            | `E-file ID {efileSubmissionId} · typical ACK window 24h.`                                                             | `obligation.efileSubmissionId` (NET-NEW — no submission ID field, only timestamps `efileSubmittedAt/AcceptedAt/RejectedAt`) |
| BigNumber slot | **Replace** with the file date: `Apr 15` Mono 36 + `{time} ET`                                                        | `efileSubmittedAt`                                                                                                          |
| SegBar         | hidden (filing is done; materials are stale signal)                                                                   | conditional                                                                                                                 |
| Chips          | `Form 8879 signed {date}` + `IRS MeF accepted submission` + `penalty frozen at filing day`                            | mix of REAL + NET-NEW                                                                                                       |
| Primary CTA    | `Mark complete on ACK` (disabled, lock icon) sub: `awaits IRS acknowledgment` — **manual button until webhook ships** | REAL manual; webhook is NET-NEW                                                                                             |
| Ghost #1       | `View e-file receipt` (download submission receipt PDF)                                                               | NET-NEW (file storage required)                                                                                             |
| Ghost #2       | `Mark rejected (manual)` → `markFiledRejected`                                                                        | REAL                                                                                                                        |
| SystemMeta     | `auto-completes when IRS acknowledgment webhook fires` (acknowledged-as-net-new in copy)                              | NET-NEW                                                                                                                     |

### Stage 6 — Completed (`completed`)

| Slot        | Content                                                            | Backend source                               |
| ----------- | ------------------------------------------------------------------ | -------------------------------------------- |
| Stage pill  | `Completed` + check icon (success-solid full)                      | `status === 'completed'`                     |
| Headline    | `Filed and acknowledged · sealed for audit.`                       | static                                       |
| Sub         | `IRS accepted {date} · final · ${penaltyAmount} penalty owed.`     | `efileAcceptedAt` + penalty engine (NET-NEW) |
| BigNumber   | `$0` (or final penalty if non-zero)                                | NET-NEW penalty engine                       |
| SegBar      | hidden                                                             | terminal                                     |
| Chips       | `IRS-{ackId} accepted {date}` + `audit bundle sealed (SHA-256)`    | NET-NEW ackId + REAL audit-bundle pipeline   |
| Primary CTA | `Open record →` (ghost styled, no destructive action)              | navigation                                   |
| Ghost #1    | `Download sealed audit bundle` → triggers compliance bundle export | REAL pipeline exists                         |
| Ghost #2    | `Open next year ({yearN+1} 1040)`                                  | navigation                                   |
| SystemMeta  | `terminal state · immutable · sealed {date}`                       | derives                                      |

## Truth-vs-fiction reality check

Per backend audit on the **Waiting on client** state (most-developed variant), 8 of 11 datums are wired today. The same breakdown applies state-by-state with shifted bottlenecks:

| State                     | REAL today                                                                                             | NET-NEW required                                           | FICTION (dropped)                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------ |
| Not started               | Stage pill, stage count, sub deadline copy, owner, `Start preparing` CTA, materials baseline (all 0)   | None major                                                 | n/a                                        |
| Waiting on client (MWhnh) | 8 of 11 fields                                                                                         | Bulk `markAllReceivedForObligation()` mutation             | Top-blocker query, auto-reminder scheduler |
| Blocked                   | Stage pill, parent reference (`blockedBy`), `Resolve blocker` (REAL via `updateBlockedBy`), navigation | `markWaived` mutation if absent                            | Auto-unblock event UI not yet built        |
| In review                 | Stage pill, `updateReviewStage`, `Approve & file` composite                                            | E-signature integration, review-stage clarification thread | Reviewer flagging UX                       |
| Filed                     | Stage pill, `efileSubmittedAt`, `markFiledRejected`, `Mark complete on ACK` manual                     | IRS submission ID field, ACK webhook, e-file receipt PDF   | Auto-complete on ACK                       |
| Completed                 | Stage pill, audit bundle export (REAL pipeline), navigation                                            | Penalty engine for final-amount display                    | Auto-archive next year                     |

## Action verb table (for each state's primary CTA)

| State             | Primary verb           | Mutation fired                                              | Source confidence |
| ----------------- | ---------------------- | ----------------------------------------------------------- | ----------------- |
| Not started       | `Start preparing`      | `updateStatus('in_progress')` then `waiting_on_client`      | REAL              |
| Waiting on client | `Send reminder`        | `readiness.sendRequest`                                     | REAL              |
| Blocked           | `Resolve blocker`      | `updateBlockedBy(null)` → lands in `pending`                | REAL              |
| In review         | `Approve & file`       | `updateReviewStage('approved')` THEN `updateStatus('done')` | REAL composite    |
| Filed             | `Mark complete on ACK` | `updateStatus('completed')` — manual until webhook          | REAL manual       |
| Completed         | `Open record →`        | navigation only                                             | REAL              |

## What's missing that we'd build before shipping

In priority order (referenced in eng brief):

1. **Bulk `markAllReceivedForObligation(obligationId)`** — needed by Waiting on client `Mark received` ghost
2. **Top-blocker query** — adds `daysOutstanding` field + helper to surface `readinessChecklist.where(missing).orderBy(daysOutstanding).first()`. Lets Waiting on client headline be specific (e.g. "K-1 from Lakeside is the holdout").
3. **Auto-reminder scheduler** — recurring cadence system for client-portal nudges. Without this, SystemMeta can't honestly say "auto-reminds every Nd."
4. **IRS submission ID field** — extend `obligation` schema with `efileSubmissionId: string | null` populated by e-file submission webhook. Needed by Filed sub copy.
5. **IRS ACK webhook** — enables auto-`completed` transition on acknowledgment receipt. Without it, Filed → Completed is permanent manual.
6. **Penalty engine** — computes final-amount for Completed state's BigNumber.
7. **E-signature integration** — enables In review `Send to client for signature` ghost. Separate vendor workstream.
8. **File storage primitive** — enables Filed `View e-file receipt` ghost (need a place to store the receipt PDF). Covered in `reference_record_tab_storage_gap`.

## Pencil references

- `MWhnh` — Waiting on client (current, honest)
- Agents in flight building: Not started · Blocked · In review · Filed · Completed variants
- Compare side-by-side after all 6 build to verify the same shell handles every state with appropriate content substitutions.

## Related memories + docs

- `feedback_status_is_observed_not_chosen` — status as monitored event, not picker
- `reference_workflow_state_cascade` — per-stage cascade with action verbs
- `reference_data_consistency_contract` — source-of-truth registry
- `reference_record_tab_storage_gap` — what's blocked on file storage
- `docs/product-design/deadlines/eng-brief-2026-06-09-status-bus-and-integrations.md` — propagation contract
- `docs/product-design/deadlines/position-2026-06-09-milestone-strip.md` — strip-vs-panel position
