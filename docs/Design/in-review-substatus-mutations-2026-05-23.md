# In Review sub-status mutations (`prepStage` + `reviewStage`)

**Status**: Superseded by the 2026-05-26 compact workflow. The mutation
endpoints remain, but the deadline drawer now exposes three CPA-facing
steps — Preparing return, Reviewing return, Ready to file — instead of the
six internal prep/review flags described below.

**Authors**: Yuqi + Claude
**Date**: 2026-05-23

---

## Problem

The In Review stage card has a 6-step pipeline strip showing where the row
sits in the prep ↔ review flow:

```
○──○──○──○──○──○
Ready to draft → Preparer drafting → Draft complete → Ready for reviewer
                                                    → Reviewer checking
                                                    → Reviewer approved
```

The strip looks like a checklist of progress, but **nothing is wired**. The
CPA can't click anything to advance the row through it. Sub-state columns
(`prep_stage`, `review_stage`) only get set by the demo seed or future
auto-derivation. The three manual reminders below the strip ("Mark drafting
complete and hand off to reviewer", etc.) read as buttons but do nothing.

The cleanest answer is to wire mutations so each pipeline step is a real
clickable action that updates the row, writes an audit event, and supports
undo + backward transitions.

## Interaction model: the slider

Each step in the strip is **a position on a slider**, not a checkbox. The
row sits at exactly one step at a time (the "current" step). Clicking any
step moves the slider there — forward, backward, or to a non-adjacent step.

| Action                           | Mutation                                                         |
| -------------------------------- | ---------------------------------------------------------------- |
| Click step 1: Ready to draft     | `updatePrepStage({ prepStage: 'ready_for_prep' })`               |
| Click step 2: Preparer drafting  | `updatePrepStage({ prepStage: 'in_prep' })`                      |
| Click step 3: Draft complete     | `updatePrepStage({ prepStage: 'prepared' })`                     |
| Click step 4: Ready for reviewer | `updateReviewStage({ reviewStage: 'ready_for_review' })`         |
| Click step 5: Reviewer checking  | `updateReviewStage({ reviewStage: 'in_review' })`                |
| Click step 6: Reviewer approved  | `updateReviewStage({ reviewStage: 'approved' })`                 |
| Click "Leave note"               | `updateReviewStage({ reviewStage: 'notes_open' })`               |
| Click "Notes addressed"          | `updateReviewStage({ reviewStage: 'in_review' })`                |
| Click "Mark return submitted…"   | `updateStatus({ status: 'done' })` (stage transition — existing) |
| Click Undo in toast              | Reverse mutation back to the previous value                      |

### Why slider, not checklist

The pipeline visualization renders past steps as ✓ (green check), current as
●, future as ○. Today this is **inferred from current position** by
`pipelineStateOf` — the function looks at the current step's index in the
linear sequence; everything before is "done", everything after is "upcoming".

With a slider model, this stays true: clicking step 3 just moves the slider
to step 3, and the visual auto-updates (steps 1–2 = done, step 3 = current,
steps 4–6 = upcoming). No new columns or audit-derivation needed for the
visual.

A checklist model (each step gets its own real completion timestamp) would
require new columns and trickier semantics for backward transitions ("does
un-marking step 5 also un-mark step 4?"). Not worth the complexity for
visual fidelity to "history" when the slider's "where are we now" is what
the CPA actually scans for.

## State machine

### Legal transitions

**All transitions between any two values are legal**, both forward and
backward. The row can jump from `prepared` back to `ready_for_prep`, or
from `approved` straight back to `in_prep`, or set `prepStage` while
`reviewStage` is also set, etc. No guards.

Reasoning: the CPA's real workflow has loops (reviewer kicks back to prep,
scope changes mid-review, etc.). Guarding transitions creates more friction
than it prevents.

### Schema clarification

The DB schema's enums are wider than the 6-step pipeline shows. From
`packages/db/src/schema/obligations.ts`:

```ts
OBLIGATION_PREP_STAGES = [
  'not_started',
  'waiting_on_client', // surfaces on Waiting stage, not In Review
  'waiting_on_third_party', // surfaces on Waiting stage, not In Review
  'bookkeeping_cleanup', // surfaces on Waiting stage, not In Review
  'ready_for_prep', // step 1 of the In Review pipeline
  'in_prep', // step 2
  'prepared', // step 3
]

OBLIGATION_REVIEW_STAGES = [
  'not_required',
  'ready_for_review', // step 4 of the In Review pipeline
  'in_review', // step 5
  'notes_open', // FLAG, not step (renders on step 5)
  'approved', // step 6
  'overridden',
]
```

The In Review pipeline only walks 6 of these — the prep-stage values that
fit Waiting are intentionally omitted (they belong to a different stage).
`not_started`, `not_required`, and `overridden` are also outside the
slider; they represent special states (row hasn't entered In Review at all,
or has bypassed review entirely).

### The `notes_open` exception

`notes_open` is a **flag, not a step**. When the reviewer wants to bounce
the return back with notes:

- Their action sets `reviewStage = 'notes_open'`
- The pipeline strip still shows the row at step 5 ("Reviewer checking")
  but with a "Notes open" annotation appended
- The preparer addresses the notes, then clicks "Notes addressed" which
  sets `reviewStage = 'in_review'`

So `notes_open` doesn't get its own slider position; it overlays step 5.
Two distinct affordances:

- **"Leave note"** — small secondary button on step 5 when current.
  Sets `reviewStage = 'notes_open'`.
- **"Notes addressed"** — replaces "Leave note" when `notes_open` is
  active. Sets `reviewStage = 'in_review'`.

## Undo affordance

Every mutation surfaces an **Undo toast** for 5 seconds after the action.

```
[ Marked: Reviewer checking the return.  Undo ]
```

Undo calls the reverse mutation: stores the previous `prepStage` /
`reviewStage` before the click; if the user clicks Undo, fires another
mutation back to that value. Both mutations write audit rows, so the trail
captures "user did X, then undid X" — not just "current = previous".

5s is the standard undo window. Toast dismisses automatically when the next
click happens (in case the CPA wants to keep clicking through the
pipeline).

## RPC contract

### `obligations.updatePrepStage`

```ts
// Input
{ id: string, prepStage: ObligationPrepStage }

// Output
{ row: ObligationQueueRow, auditId: string }
```

### `obligations.updateReviewStage`

```ts
// Input
{ id: string, reviewStage: ObligationReviewStage }

// Output
{ row: ObligationQueueRow, auditId: string }
```

### Audit shape

Each mutation writes one `audit_event` row:

```
action:      'prep_stage_changed' | 'review_stage_changed'
firmId:      <current firm>
actorUserId: <current user>
subjectType: 'obligation_instance'
subjectId:   <obligation id>
beforeJson:  { prepStage: <old> } | { reviewStage: <old> }
afterJson:   { prepStage: <new> } | { reviewStage: <new> }
createdAt:   <now>
```

Mirrors the existing `status_changed` audit shape used by `updateStatus`
and `markFiledRejected`, just with the sub-status column name in
before/after JSON.

This is what `pastEntries` + the `CompletedKeyDates` derivation already use
— so the past-stages collapsible + key-dates summary "just work" with the
new audit rows.

### Role check

Reuse `OBLIGATION_STATUS_WRITE_ROLES` (the role list `updateStatus` uses).
Anyone who can flip status can also flip sub-stage — same workflow
authority. If we later want a tighter role guard (e.g., only the assigned
reviewer can flip `reviewStage`), that's a follow-up; out of scope here.

## Frontend wiring

### Mutations

Two new `useMutation` hooks in `ObligationQueueDetailDrawer`, alongside
`changeStatusMutation` + `markFiledRejectedMutation`:

```ts
const updatePrepStageMutation = useMutation(
  orpc.obligations.updatePrepStage.mutationOptions({ ... })
)
const updateReviewStageMutation = useMutation(
  orpc.obligations.updateReviewStage.mutationOptions({ ... })
)
```

`onSuccess` invalidates `getDetail` + `list` (same pattern as the others).
`onError` surfaces a toast with `rpcErrorMessage`.

### Pipeline strip becomes the action surface

The strip's 6 steps become real `<button>`s. Click any step → calls the
matching mutation. Visual:

- **Past steps** (✓): subtle hover, click moves slider backward
- **Current step** (●): no-op on click, or a small "you're here" tooltip
- **Upcoming steps** (○): hover surfaces "Move to: {label}" tooltip, click
  advances

The big primary button stays "Mark return submitted to authority" — that's
the stage-level forward action, separate from the slider.

### Drop the manual reminders

The three current `manual` flavor tasks on the In Review stage —
"Mark drafting complete and hand off to reviewer", "Get reviewer
sign-off", "Address reviewer's notes" — get **removed**. The strip itself
is the action surface now; the reminders would be redundant.

The "Pre-stage 8879 packet for client" routing task stays (it's not a
sub-state mutation; it routes to Evidence).

### `notes_open` affordances

Two secondary actions that appear inline with step 5 ("Reviewer checking
the return") when relevant:

- When current step is `in_review` AND `notes_open` is NOT set →
  small ghost button "Leave note" appears under the step label
- When `notes_open` IS set → strip shows step 5 with "· Notes open"
  annotation, ghost button changes to "Notes addressed"

### Undo toast

`toast.success(message, { action: { label: 'Undo', onClick: ... } })`.
Sonner supports this natively. The previous-value capture happens in the
mutation `onMutate` (optimistic snapshot pattern).

## Out of scope

- **Sub-state-driven primary button.** Today the In Review primary is
  always "Mark return submitted to authority". A future enhancement could
  make the primary context-aware (e.g., "Mark prep complete" when current
  is `in_prep`). Not in this round — keeps the change focused.
- **Role-specific guards** (only reviewer can flip `reviewStage`). Punt to
  a follow-up.
- **Auto-derivation from concrete signals** (e.g., editing the return →
  auto-set `prepStage='in_prep'`). Punt.
- **Multi-step bulk advance** (e.g., "Skip to approved"). The slider
  already lets the CPA click any step directly; no separate UI needed.

## Open questions for hanxujiang

1. Any work already in flight for sub-status mutations or audit shape?
2. Comfort with the audit `action` strings (`prep_stage_changed` /
   `review_stage_changed`)? Naming convention check.
3. Does `enqueueDashboardBriefRefresh` need to fire on sub-status changes,
   or skip (sub-status doesn't affect the dashboard summary tiles)?

## Implementation order

Once design doc is acked:

1. **Backend commit**: contracts + procedures + service helpers + tests.
   Single coherent change; coordinate with hanxujiang before pushing.
2. **Frontend commit**: mutations + pipeline-step buttons + undo toast +
   drop manual reminders + `notes_open` affordances.

No mid-implementation rebases against hanxujiang's work if both touches
land in the same commit pair.
