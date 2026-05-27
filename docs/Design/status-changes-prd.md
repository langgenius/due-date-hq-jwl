# Obligation Status Changes — Product Requirements (v2)

**Owner:** Design (Yuqi)  · **Engineering:** workflow team  · **Last updated:** 2026-05-27

This is the canonical product spec for the obligation lifecycle on
DueDateHQ. It defines what each status means, what data the row carries
in that status, who can move it, how it gets there, what side effects
fire, what the UI shows, and how the system handles edge cases and
failures.

This doc supersedes the previous shorter status note. It is the source
of truth for:

- The Status pill + scope tabs on `/deadlines`
- The Active Stage card + milestone timeline in the obligation drawer
- The audit-trail `obligation.status.updated` event semantics
- The lifecycle-v2 migration matrix
- Cross-surface state in Dashboard, Pulse, Workload, and Calendar

Companion docs:
- [obligation-lifecycle-design-brief.md](./obligation-lifecycle-design-brief.md) — why v2 exists
- [deadline-status-meaning-and-journey-2026-05-23.md](./deadline-status-meaning-and-journey-2026-05-23.md) — copy & journey
- [milestone-audit.md](./milestone-audit.md) — audit-event coverage
- [journey-audit.md](./journey-audit.md) — cross-route journey expectations

**Each item below is tagged with implementation status:** ✅ shipped ·
⚠️ partial · 🟡 spec-only. The §0 audit matrix is the index; section
bodies repeat the tag inline.

---

## 0. Implementation audit (as of 2026-05-27)

Code references in this section are anchored to current paths:
`packages/core/src/obligation-workflow/index.ts`,
`packages/core/src/permissions/index.ts`,
`apps/server/src/procedures/obligations/_service.ts`,
`apps/app/src/routes/obligations.tsx`.

### 0.1 Shipped (✅)

| Capability                                          | Source of truth                                 |
| --------------------------------------------------- | ----------------------------------------------- |
| Six canonical states + legacy→v2 display mapping    | `OBLIGATION_STATUS_DISPLAY_KEYS`                |
| Transition legality + matrix                        | `OBLIGATION_TRANSITIONS`, `isLegalObligationTransition` |
| Status-write permission gate (owner/partner/manager/preparer; coordinator denied) | `FIRM_PERMISSION_ROLES['obligation.status.update']`, server `requirePermission` |
| Stage card actions per status + sub-state branches  | `apps/app/src/routes/obligations.tsx` (StageActions task table) |
| `obligation.status.updated` audit event w/ before/after JSON + reason | `_service.ts:updateStatus` |
| Parent → child auto-unblock cascade on `→ completed` | `_service.ts` lines 369–388, `unblockChildrenOf` |
| `obligation.status.auto_unblocked` audit row per unblocked child | same |
| `obligation.efile.rejected` audit event (separate action) | `_service.ts:markFiledRejected` |
| `obligation.prep_stage.updated`, `obligation.review_stage.updated`, `obligation.extension.decided` audit events | `_service.ts` |
| Status-change toast with **Undo** (reverse mutation), per-row + bulk | `routes/obligations.tsx` lines 1750–1773 |
| BlockerContextCard inline in `blocked` stage card  | `apps/app/src/features/obligations/BlockerContextCard.tsx` |
| Past-deadline banner inside Active Stage card       | `routes/obligations.tsx` (showOverdueBanner)    |
| Payment-overdue chip in compact + expanded modes    | `paymentOverdueDays` + Status column            |
| Accepted pill collapsed into Completed card header  | `ActiveStageDetailCard` header                  |
| Standalone Accepted pill suppressed on Completed queue rows | Status cell render                       |
| Bulk status mutation w/ partial-failure aware toast | `bulkUpdateStatus` + `bulkStatusMutation`       |

### 0.1.1 Shipped in this PRD's amendment pass (2026-05-27 evening)

| Capability                                          | Source of truth                                 |
| --------------------------------------------------- | ----------------------------------------------- |
| Cycle detection in `updateObligationBlockedBy` (depth-bounded chain walk) | `_service.ts:510-540`                |
| Auto-unblock context banner on `not_started` rows  | `ActiveStageDetailCard` in `routes/obligations.tsx` |
| Confirmation toast on Skip ahead to drafting       | `handleTaskClick` case 'start'                  |
| Coordinator read-only status dropdown w/ banner    | `ObligationQueueStatusControl` + `readOnly` prop |
| Drawer header status pill (icon + text)            | Compact terminal strip uses `ObligationStatusReadBadge` |
| `readiness.materials_received` audit companion event on `waiting_on_client → review` | `_service.ts:updateObligationStatus` after the primary audit write |

### 0.2 Partial (⚠️)

| Capability                                          | What's missing                                  |
| --------------------------------------------------- | ----------------------------------------------- |
| E-file rejection unwind                             | User-initiated via `markFiledRejected` dialog only — no e-file watcher / no automatic system-actor path. The auto-unwind described in §5.4 / §5.5 is **only the user dialog flow today**. |
| Sub-state pipelines on `done` (e-file, payment)     | `updateEfileState` and `updatePaymentState` RPCs not shipped. Most `efileState` values surface as MANUAL reminders, not buttons. |
| Auto-unblock target state                           | **Children flip to `pending` (Not started), NOT `waiting_on_client`** as a clean-slate. Audit row reads `before.status=blocked, after.status=pending`. |
| Bulk transition UX polish                           | Server returns partial-failure map; toast surfaces it but per-row error attribution is terse. |
| 8879 / authorization sub-pipeline                   | No mutation surface; manual reminders only.     |

### 0.3 Deferred — needs dedicated slice (🟡)

Each item below was scoped during the PRD audit and confirmed to need
its own PR (not polish-session scope). Effort estimates assume one
engineer-day units.

| Capability                                       | Notes                                              |
| ------------------------------------------------ | -------------------------------------------------- |
| Item | Why deferred | Estimated slice |
| ---- | ------------ | --------------- |
| `409 STALE_WRITE` concurrency guard | Adds `updatedAt` precondition to every mutation's RPC schema + server handler (compare-and-swap) + every client mutation site (handle 409). Touches the whole obligation-status surface. | 1–2 engineer-days |
| Optimistic update + rollback on error | UI refactor across all status mutation callsites, swapping `invalidate-on-success` for `mutate-with-rollback`. Risk: regressions in the queue / drawer / bulk paths if any callsite is missed. | 0.5–1 engineer-day |
| Sub-state preconditions on `→ completed` server-side | Requires per-`obligationType` rules (filing wants `efileState ∈ {accepted, paper_filed, final_package_delivered}`; payment wants `paymentState='confirmed'`). Today's demo seeds rely on the permissive path; would break tests without seed updates. | 0.5 engineer-day |
| Sub-state pipeline RPCs (`updateEfileState`, `updatePaymentState`) | New server procedures + audit-event coverage + UI wiring on the `done`-state stage card to convert MANUAL reminders into one-click buttons. | 1–2 engineer-days |
| `firm.autoUnblockChildren` opt-out flag | DB migration adding a column to `firms`; settings UI; cascade gate. Currently no firm has asked for this opt-out. | 0.5 engineer-day |
| Restore-from-Completed admin path | UI affordance gated by `owner` role + confirmation dialog + audit reason capture. Matrix already allows `completed → pending`. | 0.5 engineer-day |
| PostHog / analytics events | `posthog-js` is in package.json but has zero callsites — no provider, no capture pattern wired. Needs infra setup before any per-event emits. | 0.5 engineer-day (infra) + per-event |
| E-file watcher (auto-rejection unwind) | Requires an external e-file vendor API integration. None wired today; the user-initiated `markFiledRejected` dialog covers the manual path. | Blocked on vendor selection |
| `relatedObligationId` link surfaced in UI | Schema concept only — no column exists in `obligation_instance`. Migration + RPC + UI display needed. | 0.5–1 engineer-day |
| Bulk transition error attribution | Per-row error map exists on server; UI toast prints terse `id: error`. Should map to client/form names + group by failure reason. | 1–2 hours |
| `obligation.completed` distinct audit event | Decided NOT to add — `WHERE after.status='completed'` query is sufficient. PRD §7 amended accordingly. | n/a (cancelled) |
| Confirmation toast on `waiting → review` w/ empty checklist | Already implemented — see `handleTaskClick` case 'received' (info toast routes user to Readiness tab when outstanding > 0). PRD §0.3 outdated. | ✅ done |
| "Quality.self_review" flag for same-prep-and-review | Requires `assigneeId` vs. `reviewerId` distinction in schema. Not modeled today. | 0.5 engineer-day |

### 0.4 Reading guide

In §5 (state definitions), §6 (transition matrix), §7 (side effects),
§11 (validation), and §12 (dependencies), each table row or claim is
suffixed with its tag. Sections without a tag describe agreed product
intent that maps cleanly to shipped code.

---

## 1. Background

### 1.1 Why a v2 lifecycle

The legacy schema stored ten status values (`pending`, `in_progress`,
`done`, `extended`, `paid`, `waiting_on_client`, `review`,
`not_applicable`, `blocked`, `completed`). Three values overloaded the
same idea:

- `done` was used for "filed with the authority" AND "work is over."
  Audit-defense workflows need to distinguish "filed but awaiting
  acceptance" from "accepted and closed."
- `extended` was used as a status when it is properly a deadline
  mutation (the row keeps moving forward; the *date* changes).
- `paid` was used both for "payment cleared" and as a synonym for
  closed payment-only obligations.

A CPA can't tell at a glance whether a `done` row is still on the firm's
plate or not. PRD anti-pattern #3 ("Filed ≠ Done") drives the
collapse into six canonical states.

### 1.2 Migration approach

The database keeps all ten values for back-compat (no destructive
migration). The v2 UI maps legacy values to six display states. The
status dropdown, scope tabs, and audit copy speak in v2 vocabulary.
Existing audit history reads naturally because v2 labels are a
strict re-grouping, not a rename.

Mapping (see `OBLIGATION_STATUS_DISPLAY_KEYS` in
`packages/core/src/obligation-workflow/index.ts`):

| Stored value | v2 display      |
| ------------ | --------------- |
| `pending`           | Not started        |
| `in_progress`       | In progress (legacy; surfaced only on legacy rows) |
| `waiting_on_client` | Waiting on client  |
| `blocked`           | Blocked            |
| `review`            | In review          |
| `done`              | Filed              |
| `extended`          | Extended (legacy)  |
| `paid`              | Paid (legacy; collapses into Completed) |
| `not_applicable`    | Not applicable (legacy) |
| `completed`         | Completed          |

V2 surfaces the six canonical states. The legacy values are kept
addressable for audit history + admin tooling but are not introduced
into the dropdown for v2 rows.

---

## 2. Goals & non-goals

### 2.1 Goals

1. A single source of truth for the row's lifecycle position that every
   surface (queue, drawer, dashboard, calendar, pulse) reads from.
2. Each transition is intentional, attributable, reversible (with the
   one exception documented below), and recorded in the audit trail.
3. The CPA always has a single primary action in the active stage card
   that moves the row forward; secondary actions are the legitimate
   escape hatches.
4. No silent state changes — automated transitions exist only for
   the two cases below (rejection, parent-K-1 unblock) and they emit
   audit events with `actorType=system`.
5. Server is the authority for legality and permissions; the client
   reflects but never relaxes.

### 2.2 Non-goals

- **No "Reopen" from Completed.** If something changes after acceptance
  (amended return, authority notice), the right pattern is a new
  obligation row linked via `relatedObligationId`. Reopening would
  corrupt the audit-defense story.
- **No SLA timers driving auto-transitions.** A row past its deadline
  stays in whatever status it's in. The UI surfaces the lateness via
  pills + banners; only the CPA moves the status.
- **No portal-event auto-advance.** Client portal acks update the
  per-item checklist (`status: received | needs_correction`) but
  never advance the obligation status. The CPA must click "Mark
  materials received."
- **No partial-status mixing.** A row is in exactly one of the six
  states at any time. Multi-leg states (payment leg overdue while
  filing leg is filed) are modelled via sub-state fields
  (`paymentState`, `efileState`), not by splitting the status.

---

## 3. Personas (firm roles)

Defined in `packages/core/src/permissions/index.ts`.

| Role         | Status write? | Typical actions                             |
| ------------ | ------------- | ------------------------------------------- |
| `owner`      | yes           | All transitions; admin recovery flows       |
| `partner`    | yes           | All transitions; reviewer approval          |
| `manager`    | yes           | All transitions; reviewer approval          |
| `preparer`   | yes           | All transitions on assigned rows + claim    |
| `coordinator`| **no**        | Read-only on status; can manage Materials   |

Coordinator can open the status dropdown (so the row still reads
intentional), but every option is disabled with a tooltip
"Coordinators can't change deadline status — ask a preparer/manager."
The server enforces `obligation.status.update` independently
(`requirePermission`); UI gating is convenience.

---

## 4. Glossary

| Term            | Definition                                                      |
| --------------- | --------------------------------------------------------------- |
| Obligation      | A single tax filing/payment row tied to a client + due date     |
| Status          | One of the six canonical lifecycle states                       |
| Sub-state       | `prepStage`, `reviewStage`, `efileState`, `paymentState`, `readiness` |
| Stage card      | The drawer's active-status card with title + actions            |
| Milestone strip | The six-step horizontal indicator above the stage card          |
| Audit event     | A row in `audit_event` capturing one transition                 |
| Active row      | Open (not Completed/Extended/Paid/NotApplicable)                |
| Terminal row    | Closed — `completed`, `done`, `paid`, `extended`, `not_applicable` |

---

## 5. State definitions

For each canonical state we specify: **meaning**, **entry preconditions**,
**invariants while in this state**, **exit transitions and their
preconditions**, **side effects on entry/exit**, **UI affordances** (queue +
drawer), **automation policy**, **error/edge cases**.

### 5.1 `not_started` — Not started

**Meaning.** The obligation row exists. Nothing else has happened.

**Entry conditions.**
- Default state for new rows created by rules engine or `obligation.create`
  mutation.
- Reachable from `not_applicable` (admin reset) and `waiting_on_client`
  (CPA explicitly reverses an unintended advance).

**Invariants.**
- `prepStage = 'not_started'`
- `reviewStage = 'not_required'`
- `efileState = 'not_applicable'`
- `paymentState = 'not_applicable'` (or schema-default for payment types)
- `readiness = 'ready'` (no materials request in flight)
- `assigneeId` may be null (no preparer claimed yet)

**Exit transitions.**

| To                  | Trigger                            | Preconditions             |
| ------------------- | ---------------------------------- | ------------------------- |
| `waiting_on_client` | Primary `Request documents from client` | Permission OK; assignee not required (auto-claim allowed) |
| `review`            | Secondary `Skip ahead to drafting` | Permission OK; requires confirmation toast (no docs collected) |
| `blocked`           | Dropdown                           | `blockedByObligationInstanceId` set |
| `not_applicable`    | Dropdown                           | Admin/owner confirms; emits audit reason |

**Side effects.**
- On `→ waiting_on_client` via the primary CTA: switches the drawer tab
  to Materials and opens the request composer.
- On `→ review`: pre-populates the readiness checklist with a "All
  materials in hand (offline)" marker so audit shows we didn't skip
  silently.

**UI.**
- Queue pill: gray "Not started" + spinner-loader icon.
- Stage card title: "Not started".
- Overdue banner: shows when `currentDueDate < today`. Copy: "Filing was
  due {date} — {N} days past deadline. Submit the return now, or file
  an extension if eligible."
- Actions cluster: primary "Request documents from client", secondary
  "Skip ahead to drafting (docs already in hand)", plus manual reminders
  for engagement letter + preparer assignment.

**Automation policy.** No automatic exits.

**Edge cases.**
- Past-deadline `not_started` rows surface on Dashboard "Needs attention"
  with the overdue context.
- If `blockedByObligationInstanceId` is set but `status = 'not_started'`,
  the queue still pills as Not started (status is the truth; the chip
  shows the blocker separately). User must explicitly flip to `blocked`.

---

### 5.2 `waiting_on_client` — Waiting on client

**Meaning.** A materials request is the active gating step. The CPA is
holding for the client (or a third party) to provide documents.

**Entry conditions.**
- From `not_started`: `Request documents from client` primary action.
- From `review` / `blocked`: dropdown.
- From `done` (rejection cleanup): dropdown — re-collect missing
  pieces.

**Invariants.**
- `prepStage` is one of `waiting_on_client | waiting_on_third_party |
  bookkeeping_cleanup | ready_for_prep`.
- `readiness ∈ {waiting, needs_review}`.
- A materials checklist (`readinessChecklist`) exists; may be empty if
  the CPA hasn't generated/added items yet.
- A `MaterialsRequest` record may or may not be in flight; the chip
  "Client response due {date}" appears when one is.

**Exit transitions.**

| To                  | Trigger                            | Preconditions             |
| ------------------- | ---------------------------------- | ------------------------- |
| `review`            | Primary `Mark materials received` | All checklist items received OR CPA confirms remainders are offline; opens prep stage = `preparing_return` |
| `blocked`           | Secondary `Mark blocked`          | `blockedByObligationInstanceId` set in the same mutation |
| `not_started`       | Dropdown                           | Confirmation toast: "Reset progress?" |
| `not_applicable`    | Dropdown                           | Admin confirmation |

**Sub-state branches** (alter the visible actions):

- **`prepStage = 'waiting_on_client'`** (default)
  Primary: `Mark materials received`. Secondary: `Mark blocked`. No
  manual reminders.

- **`prepStage = 'waiting_on_third_party'`**
  Adds manual reminder: "Confirm ETA with the third party." Same
  primary + secondary.

- **`prepStage = 'bookkeeping_cleanup'`**
  Primary becomes `Resume drafting the return` (because cleanup is
  intra-firm, not an external wait). Manual reminder: "Finish cleaning
  up the client's books." Secondary still `Mark blocked`.

**Side effects.**
- On `→ review`: clears any open materials request (`MaterialsRequest`
  set to `responded` if still outstanding) and emits a
  `readiness.materials_received` audit event in addition to the status
  event.
- On entry from `not_started` via the primary CTA: also flips
  `prepStage` to `waiting_on_client` and opens the request composer.

**UI.**
- Queue pill: warning-tone "Waiting" + hourglass icon.
- Stage card title: "Waiting on client" with sub-status sentence ("Days
  since entering Waiting").
- Materials tab pill: outstanding-item count (accent-tinted).
- Quick filter chip: "Past due" if applicable.

**Automation policy.** None. The portal updates per-item state only.

**Edge cases.**
- Multiple recipients on a single request: status moves once the CPA
  decides "received," irrespective of which client member responded.
- Request expired (`expiresAt < now`): UI surfaces a "Client response
  due {date}" badge in destructive tone but status is unchanged.
- Re-requesting docs after partial receipt: allowed; doesn't change
  status, just adds a new request row.

---

### 5.3 `blocked` — Blocked

**Meaning.** Progress is paused by an identifiable external blocker —
usually an upstream return whose output we need (parent K-1, related
entity filing) or an IRS notice that must be cleared first.

**Entry conditions.**
- Reachable from any open state via dropdown OR via the `Mark blocked`
  secondary CTA on `waiting_on_client`.
- Requires `blockedByObligationInstanceId` to be set in the same
  mutation (server validates).

**Invariants.**
- `blockedByObligationInstanceId` is non-null and references an
  obligation in the same firm.
- The blocker row may be in any state — even Completed, briefly, until
  the user clears the link.

**Exit transitions.**

| To                  | Trigger                                   | Preconditions             |
| ------------------- | ----------------------------------------- | ------------------------- |
| `waiting_on_client` | Primary `Mark upstream return resolved`   | Clears `blockedByObligationInstanceId` in the same mutation |
| `review`            | Dropdown                                  | If CPA wants to bypass docs |
| `not_started`       | Dropdown                                  | Reset — confirmation toast |

**Automatic unblock (✅ shipped, inline cascade).** When the blocker
obligation transitions to `completed`, the same `updateStatus`
transaction calls `unblockChildrenOf(parentId)`. For each row where
`status = 'blocked' AND blockedByObligationInstanceId = parent.id`:

- Child status flips to `pending` (Not started) — **not**
  `waiting_on_client`. Rationale: starting over from the top of the
  workflow gives the CPA a clean re-decision (request docs again? skip
  ahead?) rather than assuming a request is in flight.
- `blockedByObligationInstanceId` is cleared.
- An `obligation.status.auto_unblocked` audit row is written per
  child (separate action from `obligation.status.updated`) with
  `before.status='blocked'`, `after.status='pending'`, and a reason
  like "Unblocked by {parent client} · {tax type} (parent #abc12345)."

The toast described in earlier drafts ("Unblocked by acceptance of …")
is **🟡 not yet shipped** — the audit row is the only signal today.

**Side effects.**
- Emits an audit event with `entityType = 'obligation_instance'`,
  `action = 'obligation.status.updated'`, `reason` describing the
  blocker (auto-unblock vs. manual).
- Notification fires to the obligation's assignee if the trigger was
  auto-unblock (otherwise the actor IS the assignee in the typical
  case).

**UI.**
- Queue pill: warning-tone "Blocked" + construction icon.
- Drawer stage card embeds `BlockerContextCard` — shows the blocker's
  form, client, due date, and status with a click target that opens
  that row's drawer.
- No secondary actions on this card. The only way forward is to clear
  the blocker.
- Milestone strip uses dashed connectors to reflect "we don't know
  when this will move."

**Automation policy.** ✅ Auto-unblock fires unconditionally on every
parent `→ completed`. 🟡 The per-firm opt-out flag
(`firm.autoUnblockChildren`) is spec-only — not implemented.

**Edge cases.**
- 🟡 Blocker is deleted before child unblocks: no `parent.gone` audit
  event today; child stays `blocked` with a stale FK. The UI does not
  yet surface "link broken."
- ✅ Blocker re-enters a non-completed state (e.g. user reverses an
  accidental completion): auto-unblock is one-shot — the child does
  not re-block automatically. Audit row is permanent.
- 🟡 **Cycle prevention not implemented.** Setting `A.blocker = B`
  while `B.blocker = A` is currently allowed; the server does not
  walk the dependency graph on assignment. Treat as a known gap.

---

### 5.4 `review` — In review

**Meaning.** A draft exists. Internal review is the active step. The
sub-state field `reviewStage` tracks how far review has progressed.

**Entry conditions.**
- From `waiting_on_client`: primary `Mark materials received`.
- From `not_started`: secondary `Skip ahead to drafting`.
- From `done`: server-side automatic on e-file rejection.
- From `blocked`: dropdown.

**Invariants.**
- `prepStage` ∈ `{ready_for_prep, in_prep, prepared}` typically.
- `reviewStage` ∈ `{ready_for_review, in_review, notes_open, approved,
  overridden}`.
- An assignee should exist; server emits a soft warning if missing.

**Sub-states (`reviewStage`).**

| Stage              | Meaning                                | Primary action                           |
| ------------------ | -------------------------------------- | ---------------------------------------- |
| `ready_for_review` | Draft ready; reviewer hasn't started   | "Send to review" — flips to `in_review`  |
| `in_review`        | Reviewer is actively going through it  | "Approve return" (or "Approve corrected return" post-rejection) — flips to `approved` |
| `notes_open`       | Reviewer left notes for preparer       | "Mark notes addressed" — back to `in_review` |
| `approved`         | Ready to file                          | "Mark return submitted to authority" — flips status to `done` |
| `overridden`       | Senior bypassed review                 | Same as `approved`                       |
| `not_required`     | Self-review only                       | Goes straight to "Mark return submitted to authority" |

A secondary `Leave note for preparer` is available in `in_review` and
opens `notes_open` after writing.

**Exit transitions (status-level).**

| To                  | Trigger                                          | Preconditions             |
| ------------------- | ------------------------------------------------ | ------------------------- |
| `done`              | Primary `Mark return submitted to authority`     | `reviewStage ∈ approved | overridden | not_required` |
| `waiting_on_client` | Dropdown                                         | If reviewer flags missing docs |
| `blocked`           | Dropdown                                         | `blockedByObligationInstanceId` set |

**Side effects.**
- On `→ done`: writes `audit.submitted_at` timestamp; resets
  `efileState` to `submitted` if the row is e-file enabled, else
  `paper_filed`.
- On reviewStage transitions: audit event `review.stage_changed` with
  before/after.

**UI.**
- Queue pill: accent-tone "In review" + chat icon.
- Stage card title: "In review · {sub-status sentence}" where the
  sentence names the reviewer step.
- Tab pill: count of unresolved review notes (when `notes_open`).
- Workload page lists the row under the reviewer if assigned.

**Automation policy.**
- No automatic stage advancement.
- ⚠️ Rejection unwind: `markFiledRejected` mutation flips
  `done → review`, sets `efileRejectedAt`, and writes an
  `obligation.efile.rejected` audit event. The trigger is a **CPA-
  initiated dialog** ("Record authority rejection") — not an
  automatic e-file watcher. The PRD's "system-actor on watcher" model
  is 🟡 spec-only; today the actor on the audit row is the user who
  clicked the dialog.

**Edge cases.**
- Same person prepares and reviews: server allows it but emits a
  `quality.self_review` audit flag for compliance reports.
- Re-review after corrections: label flips to "Approve corrected
  return" and the stage card surfaces the prior rejection reason
  inline.

---

### 5.5 `done` — Filed

**Meaning.** The return was submitted to the authority. From the firm's
perspective, the prep + review work is finished. The row is in a
"waiting on the authority + waiting for payment" holding pattern.

**Entry conditions.**
- From `review`: primary `Mark return submitted to authority`.
- From `paid` or `extended`: legacy migration paths.

**Invariants.**
- `audit.submitted_at` set.
- `efileState ∈ {submitted, accepted, rejected, corrected_resubmitted,
  paper_filed, final_package_delivered}`.
- `paymentState` may walk independently.
- `reviewStage` frozen at `approved | overridden | not_required`.

**Sub-states (e-file pipeline, `efileState`).**

| State                      | Meaning                                | UI primary                      |
| -------------------------- | -------------------------------------- | ------------------------------- |
| `authorization_requested`  | 8879 sent to client (manual today)    | Reminder: "Send 8879 to client" |
| `authorization_signed`     | 8879 returned                          | Reminder: "Upload signed 8879"  |
| `ready_to_submit`          | Drafted and ready to e-file           | Reminder: "E-file the return"   |
| `submitted`                | Transmitted to authority              | Reminder: "Watch for acceptance"|
| `accepted`                 | Authority accepted                     | Primary: "Mark deadline complete" → flips to `completed` |
| `rejected`                 | Authority rejected                     | Auto-unwind to `review` (see §5.4) |
| `corrected_resubmitted`    | Re-submitted after correction          | Reminder: "Watch for acceptance"|
| `paper_filed`              | Filed on paper                         | Primary: "Mark deadline complete" |
| `final_package_delivered`  | Final package sent to client           | Primary: "Mark deadline complete" |

Today, only `submitted`, `accepted`, `rejected`, `paper_filed`, and
`final_package_delivered` are wired to mutations. The other sub-states
surface as MANUAL reminders (do this offline). The roadmap unblocks
them when `updateEfileState` RPC ships.

**Sub-states (payment pipeline, `paymentState`).** Same pattern.

**Exit transitions (status-level).**

| To                  | Trigger                                   | Preconditions             |
| ------------------- | ----------------------------------------- | ------------------------- |
| `completed`         | Primary `Mark deadline complete`          | `efileState` is a final-positive value OR `paymentState = confirmed` for payment-only |
| `review`            | Dropdown OR auto-unwind                   | Rejection event           |
| `waiting_on_client` | Dropdown                                  | Rare — re-collect a piece |

**Side effects.**
- On `→ completed`: emits `obligation.completed` audit event with
  acceptance date + payment confirmation date.
- On auto-unwind via rejection: emits `obligation.rejected_unwound`
  with the authority's reject code + reason as `before/after` JSON.

**UI.**
- Queue pill: success-tone "Filed" + file-check icon.
- Status column may also show: `Payment Nd late` icon-chip
  (`CircleDollarSign`, gray) in compact mode; full pill in expanded
  mode.
- Drawer Authority Response card surfaces accept/reject state.
- Milestone strip's Filed step shows the filing date.

**Automation policy.**
- ⚠️ Rejection unwind is user-initiated via `markFiledRejected` (see
  §5.4). The PRD's "automatic system-actor on watcher" is 🟡 spec-
  only.
- ✅ E-file acceptance does NOT auto-complete the row. The CPA must
  click `Mark deadline complete` so terminal closure is intentional
  and audit-attributable to a human actor.
- 🟡 Server does NOT enforce sub-state preconditions on `→ completed`
  today — any `done` row can be marked complete. The acceptance state
  is implied by the CPA's click; UI gates the affordance but the
  server is permissive.

**Edge cases.**
- Filed-but-payment-overdue: row stays `done`, but Dashboard
  "Needs attention" includes it with a `Payment Nd late` chip.
- Paper-filed returns: skip the e-file sub-states; `efileState =
  paper_filed` from day one and the primary is "Mark deadline
  complete" immediately.

---

### 5.6 `completed` — Completed

**Meaning.** Terminal. The authority accepted, the payment cleared (if
applicable), the row is historical record.

**Entry conditions.**
- From `done`: primary `Mark deadline complete`.
- From `paid` (legacy): admin/migration script.

**Invariants.**
- All sub-state fields frozen.
- `audit.completed_at` set.
- `assigneeId` may stay (informational); no further mutations expected.

**Exit transitions.**
- **None in the dropdown.** `completed → pending` is the only legal
  transition in the matrix but is intentionally NOT exposed in the UI.
  Admin-only "Restore obligation" path is a future slice (requires
  documented override reason + escalated permission).

**Side effects.**
- Triggers `parent.resolved` job (see §5.3 auto-unblock).
- Closes any open materials requests as `responded` (defensive).
- Removes the row from Dashboard "Needs attention" and Workload's
  active list.

**UI.**
- Queue pill: solid green "Completed" + circle-check icon.
- The standalone `Accepted` row badge is suppressed (Completed implies
  acceptance) to avoid double-signalling — see merged-pill audit.
- Drawer Active Stage card title becomes "Completed" with the green
  `Accepted` pill in the header right, plus "Entered {date}."
- Materials tab subtitle re-frames to audit-trail copy:
  `13 checklist items weren't individually ticked during filing.`
- Authority response panel is INSIDE the Completed card, not a
  separate banner.

**Automation policy.** Terminal — no exits.

**Edge cases.**
- IRS later issues a notice: create a new obligation row (typically a
  `client_action` or `internal_review` type) linked via
  `relatedObligationId`. Do NOT reopen the completed row.
- Amended return: same — new obligation row, original completed row
  preserved.

---

## 6. Transition matrix (canonical)

Source: `OBLIGATION_TRANSITIONS` in
`packages/core/src/obligation-workflow/index.ts`. Below is the v2 view;
the underlying matrix still includes legacy values for back-compat but
they don't appear in the v2 dropdown.

|         | → Not started | → Waiting | → Blocked | → In review | → Filed | → Completed |
| ------- | :-: | :-: | :-: | :-: | :-: | :-: |
| **Not started** | — | ✅ primary | ✅ | ✅ secondary | — | — |
| **Waiting**     | ✅ admin | — | ✅ secondary | ✅ primary | — | — |
| **Blocked**     | ✅ | ✅ primary | — | ✅ | — | — |
| **In review**   | — | ✅ | ✅ | — | ✅ primary | — |
| **Filed**       | — | ✅ rare | — | ✅ (auto on rejection) | — | ✅ primary |
| **Completed**   | ❌ (admin override only) | — | — | — | — | — |

`✅` = legal & exposed in dropdown.  `❌` = legal in the matrix but not
exposed.  `—` = illegal.

**Auto transitions (cascade triggered by user actions):**
1. ✅ `blocked → pending` for every dependent child when a blocker
   row enters `completed`. Inline cascade inside the parent's
   `updateStatus` transaction. Audit action:
   `obligation.status.auto_unblocked`. **Note:** Children unblock to
   `pending` (Not started), not `waiting_on_client`.
2. ⚠️ `done → review` when a user records an e-file rejection via
   `markFiledRejected`. Treated as user-initiated today; the
   "automatic on watcher signal" version is 🟡 spec-only.

Neither today writes `actorType = 'system'` — the auto-unblock audit
rows use the parent-completing user's `actorId`. A proper `system`
actor channel is 🟡 spec-only.

---

## 7. Side effects per transition

This is the contract between status changes and other parts of the
system. Cross-reference with the audit-event coverage in
[milestone-audit.md](./milestone-audit.md).

| Transition               | Audit event (shipped)               | Notifications                          | Other side effects                       |
| ------------------------ | ------------------------------------ | -------------------------------------- | ---------------------------------------- |
| `not_started → waiting`  | ✅ `obligation.status.updated`       | 🟡 No targeted notification today      | ✅ Opens Materials tab in UI; 🟡 server does not pre-create a request |
| `not_started → review`   | ✅ `obligation.status.updated`       | 🟡 No targeted notification             | 🟡 `reviewStage = preparing_return` is the default for new rows; not actively set by this transition. |
| `waiting → review`       | ✅ `obligation.status.updated`       | 🟡 No targeted notification             | 🟡 The `readiness.materials_received` companion event in older drafts does not exist in code. |
| `* → blocked`            | ✅ `obligation.status.updated`       | 🟡 No targeted notification             | ⚠️ `blockedByObligationInstanceId` should be set in the same payload; server does not currently reject the call if it's null. |
| `blocked → pending`       | ✅ `obligation.status.auto_unblocked` (cascade from parent's completion) | 🟡 No toast on child render today | ✅ Cleared `blockedByObligationInstanceId` |
| `blocked → waiting` (manual) | ✅ `obligation.status.updated`    | 🟡 No targeted notification             | —                                        |
| `review → done`          | ✅ `obligation.status.updated`       | 🟡 No targeted notification             | 🟡 `efileState` is NOT auto-set by this transition today — it stays at whatever value it had. |
| `done → review` (rejection) | ✅ `obligation.efile.rejected` + ✅ `obligation.status.updated` | 🟡 No targeted notification | ✅ Sets `efileRejectedAt`. Trigger is user dialog, not watcher. |
| `done → completed`       | ✅ `obligation.status.updated` (no distinct `obligation.completed` event) | 🟡 No targeted notification | ✅ Triggers `unblockChildrenOf` cascade |

Every audit event is written via `scoped.audit.write` and includes:
- `actorId` (no `system` channel today — user-initiated transitions
  write the user's id; cascade auto-unblock rows write the parent-
  completing user's id).
- `entityType: 'obligation_instance'`
- `entityId` (the row's ID)
- `before` and `after` JSON of the status field (plus `readiness`)
- `reason` (free-form, e.g. "Status changed via drawer" or
  "Unblocked by {client} · {tax type} (parent #abc12345)")

🟡 Email/in-app notification per transition is product backlog — no
side-effect notification ships from `updateStatus` today.

Every audit event is written via `scoped.audit.write` and includes:
- `actorId` (or `system` actor)
- `entityType: 'obligation_instance'`
- `entityId` (the row's ID)
- `before` and `after` JSON of the status field
- `reason` (free-form, e.g. "User clicked Mark deadline complete")

---

## 8. Permission matrix (UI gating)

Server is authoritative; UI mirrors. Source:
`FIRM_PERMISSION_ROLES['obligation.status.update']`.

| Role         | Can change status? | Notes                                       |
| ------------ | :----------------: | ------------------------------------------- |
| `owner`      | ✅                  | All transitions including admin reset       |
| `partner`    | ✅                  | All transitions                             |
| `manager`    | ✅                  | All transitions                             |
| `preparer`   | ✅                  | All transitions; should typically be the assignee |
| `coordinator`| ❌                  | Read-only; dropdown shows all options disabled with tooltip |

A future "assignee-only" tightening (preparer can only change status on
rows assigned to them) is parked — current model trusts firm policy
for that boundary.

---

## 9. Surface contract

Every place a status appears must read from the canonical model. No
surface invents its own labels.

| Surface                               | What it shows                                          |
| ------------------------------------- | ------------------------------------------------------ |
| `/deadlines` Status column            | Pill (icon + label); chips for blocker / rejection / payment-late |
| `/deadlines` scope tabs               | One tab per state with facet count                     |
| Obligation drawer header              | Form title + tax year (no status pill — table is canonical) |
| Obligation drawer Summary tab         | Milestone strip, Active Stage card, Authority Response |
| Obligation drawer Materials tab pill  | Outstanding count if open; check icon if all received  |
| Dashboard "Needs attention"           | `not_started`, `waiting_on_client`, `blocked` rows + Filed-with-payment-overdue |
| Dashboard Today summary               | Past-due totals per state                              |
| Pulse alerts                          | `Blocked` rows surfaced as triage subjects             |
| Calendar                              | All states colored per pill palette                    |
| Workload                              | All open states grouped by assignee                    |
| Audit log                             | Every transition with actor + reason                   |

The v2 label hook is `OBLIGATION_STATUS_DISPLAY_KEYS`; every surface
imports it instead of hardcoding strings.

---

## 10. Date semantics by state

How the row's stored dates are interpreted per state:

| Field             | not_started | waiting | blocked | review | done | completed |
| ----------------- | :---------: | :-----: | :-----: | :----: | :--: | :-------: |
| `currentDueDate`  | active      | active  | active  | active | meta | meta      |
| `internalDueDate` | active      | active  | active  | active | meta | meta      |
| `paymentDueDate`  | active if set | active | active  | active | **still active** | meta |
| `expectedFiledAt` | computed    | computed | computed | computed | actual | actual  |

"Active" means the date drives the overdue UI (red pill + banner).
"Meta" means it shows as historical record only.

**Payment leg is independent of filing leg.** A row that's `done` but
whose `paymentDueDate` slipped is still red on the Payment Due tile +
gets the `Payment Nd late` chip on the queue. This is the only
case where a closed-filing row remains "needs attention."

---

## 11. Validation & error handling

All status mutations go through `obligation.updateStatus` RPC.

### 11.1 Validation order (server)

1. ✅ **Auth.** `requirePermission('obligation.status.update')` —
   denies `coordinator` and unauthenticated callers.
2. ✅ **Tenancy.** Row resolved via `scoped` (the tenant-aware repo),
   so cross-firm access is impossible.
3. ✅ **Legality.** `isLegalObligationTransition(from, to)` must
   return true. The server throws on illegal transitions; the error
   surfaces as `BAD_TRANSITION` via the ORPC error mapping.
4. 🟡 **Sub-state preconditions on `→ completed`.** Not enforced today
   — any `done` row can flip to `completed` regardless of
   `efileState`/`paymentState`. UI gates the affordance but the server
   is permissive.
5. 🟡 **Concurrency check (`409 STALE_WRITE`).** Not implemented.
   Mutations are last-write-wins. The PRD's `updatedAt` precondition
   is spec-only.

### 11.2 Client error handling

| Server response | UI behaviour (current vs spec)                                            |
| --------------- | ------------------------------------------------------------------------- |
| `200 OK`        | ✅ Cache invalidation + toast "Status changed to {X}" with Undo (no time-out today; sonner's default ~4 s applies) |
| `400 BAD_TRANSITION` | ✅ Toast "Couldn't update status" with rpc error message; no optimistic to revert. |
| `400 PRECONDITION_NOT_MET` | 🟡 Not surfaced as a distinct case (preconditions not enforced server-side yet). |
| `403 FORBIDDEN` | ✅ Toast "Couldn't update status" with the error code; coordinator UI also keeps the dropdown items disabled so this is rare. |
| `409 STALE_WRITE` | 🟡 Spec-only. No conflict resolution today.                              |
| `5xx`           | ✅ Generic "Couldn't update status — Check your network and try again."   |

### 11.3 Optimistic update + Undo

⚠️ **No optimistic update.** The mutation calls `onSuccess →
invalidate queries`, so the new status renders after the server
confirms. On error the UI never had to roll back because it never
optimistically advanced.

✅ **Undo is implemented** as a forward action on the success toast.
Clicking it calls `updateStatus` again with the previous status as a
second mutation, writing a second `obligation.status.updated` audit
row — so the trail honestly shows two transitions, not a delete.

The Undo toast's duration follows the host toast library's default
(sonner). If the user navigates away before Undo expires, no auto-
revert fires.

---

## 12. Cross-row dependencies

### 12.1 Parent-K-1 / Related-entity blockers

A child obligation can be `blocked` by a parent obligation
(`blockedByObligationInstanceId`). The dependency is one-directional:
the child waits on the parent, the parent doesn't know about the
child.

✅ When the parent transitions to `completed`, the same transaction
runs `unblockChildrenOf(parentId)` inline (no background job today).
All children with `status='blocked' AND blockedByObligationInstanceId
= parent.id` flip to `pending` (Not started) and their
`blockedByObligationInstanceId` is cleared. Each child gets its own
`obligation.status.auto_unblocked` audit row.

🟡 **Cycle detection is NOT implemented today.** Setting a blocker
that creates a cycle (A blocks B, B blocks A) is allowed by the
server. Treat as a known gap; in practice, the next user to click
Complete on either side triggers the cascade and breaks the loop.

### 12.2 Multi-state filings

Some filings (e.g. composite returns) span states. Each state has its
own row, and the firm models the dependency manually via the blocker
field. The status model doesn't have multi-row joins — each row
tracks its own lifecycle.

### 12.3 Extension flow

`Extended` is a deadline mutation, not a status. When a CPA files an
extension, the `currentDueDate` advances (e.g. April 15 → October 15)
and an `obligation.extension_filed` audit event records the original
date. The row's status doesn't change. The Extension tab in the drawer
tracks the decision (`extensionDecision: applied | rejected |
not_considered`) and the saved state (`extensionDecidedAt`).

Legacy `extended` status values stay legal in the matrix but the v2 UI
doesn't introduce new ones — the new pattern is the deadline + tab.

---

## 13. Telemetry

✅ **Audit event** (durable, queryable): `obligation.status.updated`
with `before`, `after`, `reason`, `actorId`. The `actorType` field
in older drafts is not separately stored — the actor's role can be
joined from `members` if needed for reports.

🟡 **Analytics events** (PostHog or equivalent) are spec-only. The
`obligation_status_changed` event with derived fields
(`time_in_previous_state_ms`, `was_past_due`, etc.) has not been
wired. Today the audit log is the sole source for:
- Stuck-in-stage reports
- Median time-in-stage analyses
- Rejection-rate dashboards

These reports must be derived from `audit_event` queries until the
analytics emit lands.

---

## 14. Accessibility

- ✅ Status dropdown items expose `disabled` on illegal targets with a
  `title` tooltip "Not reachable from {label}." Keyboard nav is via
  the Base UI menu primitive.
- ⚠️ The status pill (`ObligationQueueStatusControl` trigger) carries
  `aria-label` "Change status for {client name}" and includes the
  current label in compact mode. It does not also carry `role="status"`
  — it's a button, not a live region. Consider exposing the current
  label via an off-screen live region if AT users need it on update.
- ✅ Compact-mode icon-only chips (Payment late, Rejected) carry the
  full copy in `aria-label`.
- 🟡 Auto-unblock cascade has no toast today (see §0.3); when added it
  should use `role="status"` or sonner's polite announcer.

---

## 15. Internationalization

- All status labels go through Lingui `t\`...\`` macros. The v2 label
  set must have full zh-CN translation; CI fails on missing keys.
- Date formatters use the firm's timezone (`formatDate` /
  `formatDatePretty`). The status itself is locale-agnostic.
- Tooltip copy explaining illegal transitions uses the v2 label names
  in both languages.

---

## 16. Test scenarios (must-pass)

Each scenario notes whether the current implementation matches.

| Scenario | Expected behaviour | Status |
| -------- | ------------------ | :----: |
| Coordinator opens status dropdown | All items disabled; tooltip explains why | ✅ |
| Preparer moves `not_started → waiting` | Materials tab opens; user composes the request | ✅ (open tab) / 🟡 (pre-fill) |
| Preparer moves `waiting → review` with empty checklist | Confirmation toast before mutate | 🟡 not implemented |
| User clicks `Mark deadline complete` on a `done` row with `efileState=submitted` | Server `PRECONDITION_NOT_MET` toast | 🟡 server permissive today; UI may allow it |
| User records authority rejection via dialog | Row flips `done → review`, `efileRejectedAt` set, `obligation.efile.rejected` audit row | ✅ |
| E-file watcher fires rejection on a `done` row | Row auto-unwinds without user dialog | 🟡 spec-only |
| Parent reaches `completed` with a `blocked` child | Child flips inline to `pending`, `auto_unblocked` audit row written | ✅ |
| User changes status, clicks Undo | Reverse mutation; second `obligation.status.updated` row in audit | ✅ |
| Two users edit the same row simultaneously | Second gets `STALE_WRITE` | 🟡 spec-only — last-write-wins today |
| Status changes while drawer is open | Drawer re-reads via `invalidateQueries`; pills + actions update | ✅ |
| Past-deadline row stays past-deadline through a status change | Overdue banner copy reflects the new stage | ✅ |
| Setting a cyclic blocker (A→B→A) | Server rejects with `400 CYCLE_DETECTED` | 🟡 spec-only |

---

## 17. Open questions / roadmap

Ordered by priority. Items marked 🟡 in the audit (§0.3) are
candidates here.

1. **Concurrency guard.** Wire `updatedAt` precondition + `409
   STALE_WRITE` so simultaneous edits don't silently overwrite.
   Surfaces in bulk operations more than single-row.
2. **Sub-state RPCs.** Ship `updateEfileState` and `updatePaymentState`
   so the manual reminders on `done` become real buttons. Unlocks the
   acceptance/payment sub-state UI fully.
3. **Server-side preconditions on `→ completed`.** Once sub-states are
   real, gate `done → completed` on `efileState ∈ {accepted,
   paper_filed, final_package_delivered}` or `paymentState =
   confirmed`. Today the UI is the only gate.
4. **System-actor channel + e-file watcher.** Move rejection unwind
   from a user dialog to a watcher that fires `markFiledRejected`
   with `actorType = 'system'`. Requires a new actor type in
   `audit_event`.
5. **Cycle detection on blocker assignment.** Walk the dependency
   graph; reject cycles with a `400 CYCLE_DETECTED`.
6. **Notifications on transitions.** Toast on the assignee's next
   render after auto-unblock; email/in-app on `→ blocked` if a
   different user blocks an assigned row.
7. **Completed default-hide.** Add a `Completed (N)` collapsed group
   to the queue; ship behind a per-user preference.
8. **Reopened-after-notice.** Surface `relatedObligationId` links in
   both directions in the drawer so users can navigate parent ↔ child.
9. **Bulk-transition error polish.** Replace `id: error` rows with
   per-row toast/inline annotation; group by failure reason.
10. **Workflow customization.** Per-firm transition matrix overlay
    (e.g. require manager approval for `→ done`). Out of scope for
    v2; capture demand first.

---

## Appendix A — Quick reference cheat sheet

```
              ┌─────────────────────────────────────────────┐
              │  not_started                                │
              │    primary: Request documents from client    │
              │    secondary: Skip ahead to drafting         │
              └─────────────────┬───────────────────────────┘
                                │
                                ▼ (primary)
              ┌─────────────────────────────────────────────┐
              │  waiting_on_client                           │
              │    primary: Mark materials received          │
              │    secondary: Mark blocked                   │
              └─────────────┬───────────────────────────────┘
                            │
              (Mark blocked)│   ┌──────────────────────┐
                            ▼   │  blocked              │
              ┌───────────────┘ │  primary: Mark        │
              │                 │  upstream resolved    │
              │  (resolved)     └─────────┬─────────────┘
              ▼                           │
        ┌─────────────────────────────────▼─────────────┐
        │  review                                        │
        │    sub-states: preparing → reviewing →         │
        │      (notes_open) → approved                   │
        │    primary final: Mark return submitted        │
        └─────────────────┬─────────────────────────────┘
                          │
                          ▼ (Mark submitted)
        ┌──────────────────────────────────────────────┐
        │  done (Filed)                                 │
        │    sub-pipelines: efileState, paymentState    │
        │    primary (when accepted/paper-filed/etc):   │
        │       Mark deadline complete                  │
        │    auto-unwind to review on rejection         │
        └─────────────────┬────────────────────────────┘
                          │
                          ▼ (Mark complete)
        ┌──────────────────────────────────────────────┐
        │  completed (terminal)                         │
        │    no actions; row is historical              │
        └──────────────────────────────────────────────┘
```
