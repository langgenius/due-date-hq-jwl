---
title: 'Stage action audit — every status has a wired primary affordance'
date: 2026-05-23
author: 'Yuqi pairing with Claude'
area: ux
---

# Every canonical status now has wired logic + suitable info

Yuqi asked: "ensure the status Not started, waiting, blocked, in
review, filed, completed — they all have corresponding logic and UX
wired up. The actions for each status on the obligation panel, how
they connect when clicked, suitable information shown in the
section."

I audited `ActiveStageDetailCard` task by task and split every
button into one of three categories:

- **Wired mutation** — clicks `onChangeStatus` / `onConfirmAcceptance`
  / `onRecordRejection`, hits a real RPC procedure, updates the
  panel.
- **Routing** — switches tab or opens another drawer.
- **Manual reminder** — text only. Click does nothing. Used for
  offline-only steps the system can't perform (sub-status mutations
  that need backend RPCs that don't ship yet).

Every stage now has at least one wired button OR a clear set of
manual reminders when no advance is possible without backend.

## Stage-by-stage

| Status          | Primary (wired)                     | Secondary                                                           | Reminders                                                     | Info shown                                      |
| --------------- | ----------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------- |
| **Not started** | `Start preparation` → `review`      | —                                                                   | Confirm engagement letter · Assign preparer                   | Stage label + entered date                      |
| **Waiting**     | `Mark docs received` → `review`     | `Send readiness request` → Readiness tab                            | Chase outstanding documents (variant by `prepStage`)          | Sub-status + entered date                       |
| **Blocked**     | `Mark unblocked` → `review`         | **`Open blocking obligation`** → opens blocker drawer (NEWLY WIRED) | —                                                             | Sub-status `Upstream obligation` + entered date |
| **In review**   | `Mark filed` → `done`               | `Get 8879 signed by client` → Evidence tab                          | Mark prep complete · Reviewer sign-off · Resolve review notes | Sub-status + entered date                       |
| **Filed**       | depends on `efileState` (see below) | depends on sub-status                                               | Sub-status reminders                                          | 6-step e-file pipeline visualization            |
| **Completed**   | —                                   | —                                                                   | Archive workpapers                                            | Stage label + entered date                      |

### Filed sub-status detail

The Filed stage walks one of two pipelines depending on whether
this is an e-file row (`status === 'done'`) or a payment row
(`status === 'paid'`). Sub-status mutations (e.g.
`updateEfileState` / `updatePaymentState`) need their own RPC
procedures that don't ship yet, so the per-sub-state primary is
either a status-level advance that closes the workflow or
reminders.

**E-file path (`row.efileState`):**

| Sub-status                                 | Primary (wired)                                      | Reminders / Routing                                                         |
| ------------------------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------------- |
| `authorization_requested`                  | —                                                    | Remind client · Mark 8879 signed when received · Open Evidence              |
| `authorization_signed` / `ready_to_submit` | —                                                    | Submit return offline · Open Evidence                                       |
| `submitted`                                | `Confirm authority acceptance` → `completed`         | `Record authority rejection` (secondary, wired to `markFiledRejected`)      |
| `accepted`                                 | `Mark obligation complete` → `completed`             | `Send final package to client` (routing) · Mark package delivered when sent |
| `rejected`                                 | `Unwind to In review` (wired to `markFiledRejected`) | Correct return · Resubmit when corrected                                    |
| `corrected_resubmitted`                    | `Confirm acceptance of resubmission` → `completed`   | —                                                                           |
| `paper_filed`                              | `Mark obligation complete` → `completed`             | `Send final package to client` (routing) · Mark package delivered when sent |
| `final_package_delivered`                  | `Mark obligation complete` → `completed`             | —                                                                           |
| _no efileState set_                        | `Confirm authority acceptance` → `completed`         | `Request 8879 authorization from client` (routing)                          |

**Payment path (`row.paymentState`, status = `paid`):**

| Sub-status               | Primary (wired)                          | Reminders                                                         |
| ------------------------ | ---------------------------------------- | ----------------------------------------------------------------- |
| `estimate_needed`        | —                                        | Compute payment estimate · Send estimate to client for approval   |
| `client_approval_needed` | —                                        | Follow up on client approval · Mark client approved when received |
| `scheduled`              | —                                        | Confirm payment cleared with the authority                        |
| `confirmed`              | `Mark obligation complete` → `completed` | —                                                                 |
| _no paymentState set_    | —                                        | Schedule payment with authority · Confirm payment cleared offline |

## Key changes from previous state

### `open-blocker` is now wired (was stub)

Previously clicking "Open blocking obligation" on a blocked row
fired `toast.info("Linking through to the blocking obligation
needs the blocker UI — coming next.")` — a placeholder. Now it
calls `openDrawer(row.blockedByObligationInstanceId)` via the
existing `useObligationDrawer` provider. Same navigation pattern
the queue + client detail page use for opening any obligation.

If the row claims to be blocked but doesn't actually carry a
blocker ID, fall back to an informative toast rather than a no-op.

### 8 stub mutations demoted to manual reminders

Earlier these task IDs were declared as `flavor: 'mutation'` with
`primary: true`, which means they rendered as the big primary
button. Click landed in the default branch of `handleTaskClick` and
showed a "Sub-status mutation pending backend" toast — promised an
advance, delivered nothing.

Demoted to `flavor: 'manual'`:

- `mark-signed`
- `submit`
- `mark-delivered` + `mark-delivered-paper`
- `resubmit`
- `send-estimate`
- `mark-approved`
- `confirm-cleared` (both variants)

They render as small tertiary text reminders now — readable
"things to do offline," not buttons that mislead. When the backend
ships the relevant RPC procedures, flip these back to `mutation`
and add a switch arm in `handleTaskClick`.

### Status-level advances added where they close the workflow

For `accepted` and `paper_filed` sub-states, I added a wired
`Mark obligation complete` primary (→ `onChangeStatus('completed')`).
This skips the unbacked `final_package_delivered` sub-status step,
but `completed` is the canonical workflow terminus regardless, so
the CPA can close the loop without waiting for sub-status backend.

For `rejected`, promoted `Unwind to In review` from a secondary
ghost-link to the wired primary — `markFiledRejected` is the
canonical "the authority bounced this back" action, and that's the
real next step on a rejected row.

### Default toast copy

The fallback toast (for any task ID not in the switch) was:

> "Sub-status mutation pending backend — wires up once the RPC
> procedure ships."

Updated to:

> "This action isn't wired up yet."

Cleaner, and since the sub-status mutations are no longer mutations
(they're manual), the new copy reflects the actual situation: if
this fires, it's a code bug (a real task missing from the switch),
not a "we knew, backend pending."

## i18n

12 new strings + zh-CN translations:

- `Confirm payment cleared offline`
- `Confirm payment cleared with the authority`
- `Mark 8879 signed when received`
- `Mark client approved when received`
- `Mark package delivered when sent`
- `Open evidence`
- `Open the Evidence tab for this row`
- `Resubmit when corrected`
- `Submit return to the tax authority`
- `This action isn't wired up yet.`
- `This row isn't linked to a blocking obligation.`
- `Unwind to In review`

## Files touched

- `apps/app/src/routes/obligations.tsx`:
  - `ActiveStageDetailCard` — pull in `useObligationDrawer` for the
    blocker route, rewrite task definitions for every `done`
    sub-state to demote stubs / surface wired primaries.
  - `handleTaskClick` — wire `open-blocker`, rewrite default toast.
  - `useObligationDrawer` import added.
- `apps/app/src/i18n/locales/{en,zh-CN}/messages.po` — 12 strings.
