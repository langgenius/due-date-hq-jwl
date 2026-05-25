---
title: 'P1 status journey — In Review pipeline strip + Completed key dates'
date: 2026-05-23
author: 'Yuqi pairing with Claude'
area: ux
---

# Two more stages get the visual treatment they deserve

P1 from the status-journey design doc. Lands the two stages where
the panel was previously surfacing a single sub-status word and
nothing else.

## In Review: prep ↔ review pipeline strip

Before: the In Review stage card just showed `· Ready for review`
(or `· In review` / `· Notes open` / etc.) as a single text line.
CPA had no idea what step that was in the broader prep → review →
file journey, nor what was ahead. The Filed stage had a 6-step
strip for its e-file pipeline; In Review had nothing.

After: same 6-step strip treatment, walking the canonical In Review
flow:

```
○──○──○──○──○──○
Ready for prep · Preparer in progress · Prepared — handing off ·
Ready for review · In review · Approved — ready to file
```

Current step gets the accent-dot treatment + bold label + the
stage's primary action button indented underneath. Past steps
collapse to green checks; upcoming steps render as quiet empty
circles. Identical to the e-file strip on Filed.

### `notes_open` as an annotation

`reviewStage` has six values, but `notes_open` is a flag, not a
step — when a reviewer leaves notes, the row is still "in review";
the notes flag just says "go fix these." Treating it as its own
column would double-count it.

Instead, when `reviewStage === 'notes_open'`, the strip surfaces
`In review` as the current step (same as `in_review`), with a
small `· Notes open` warning annotation appended to the step
label.

### Step derivation logic

`reviewPipelineCurrent(row)` walks the row's prepStage +
reviewStage columns:

- Any `reviewStage` set → use the corresponding review step
  (`approved` / `in_review` / `ready_for_review`).
- Else use `prepStage` (`prepared` / `in_prep` / `ready_for_prep`).
- Else default to `ready_for_prep` (the row IS in `review` status,
  even if no sub-state is set — the strip should reflect that
  by showing the first step as current rather than every step as
  upcoming).

## Completed: inline key-dates summary

Before: the Completed stage card showed just a stage label, entered
date, and "Archive workpapers" reminder. CPA landing on a closed
obligation had to switch to the Dates panel to answer "when did
this close and how long did it take" — common questions for
year-end review + client communication.

After: a small `KEY DATES` card on the stage:

```
KEY DATES
Opened         Jan 4, 2026
Filed          Mar 17, 2026
Completed      Apr 5, 2026
Cycle time     91 days
```

Dates derived from audit events:

- **Opened**: `row.createdAt` (always available).
- **Filed**: first audit event where `status_changed → done`.
- **Completed**: first audit event where `status_changed →
completed`.
- **Cycle time**: `createdAt → completed` in days.

Filed + Completed rows only render when we have audit evidence for
them; rows that skipped `done` (e.g., manually marked `completed`
via the status picker) just show Opened + Completed.

## Files touched

- `apps/app/src/routes/obligations.tsx`:
  - New `REVIEW_PIPELINE_KEYS` constant + `reviewPipelineCurrent()`
    helper.
  - `reviewPipelineLabels` lookup, `reviewCurrent` derivation,
    `notesOpen` flag in `ActiveStageDetailCard`.
  - New `showReviewPipeline` render branch — same shape as the
    e-file/payment strips, with `notes_open` surfaced as an
    annotation on the `in_review` step.
  - New `CompletedKeyDates` component rendered on the Completed
    stage.
- `apps/app/src/i18n/locales/{en,zh-CN}/messages.po` — 4 new
  strings.

## Where the design doc stands now

All four gaps from
`docs/Design/deadline-status-meaning-and-journey-2026-05-23.md`
have shipped:

- ✅ P0 — Blocked: inline blocker context card (Commit M)
- ✅ P0 — Waiting: outstanding docs inline (Commit M)
- ✅ P1 — In Review: pipeline visualization (this commit)
- ✅ P1 — Completed: key dates summary (this commit)

Open followups (P2/P3):

- Sub-status mutation RPCs (`updateEfileState`, `updatePaymentState`,
  `updateReviewStage`, `updatePrepStage`) — backend.
- `efile_rejection_reason` field on rejected returns.
- "Assign preparer" → member picker on the Not started stage.
- Auto-unblock detection when the blocker row reaches Completed.

## i18n

4 new strings + zh-CN translations:

- `Key dates`
- `Opened`
- `Cycle time`
- `{turnaroundDays, plural, one {# day} other {# days}}`

Review pipeline labels (`Ready for prep`, `Preparer in progress`,
`Prepared — handing off`, `Ready for review`, `In review`,
`Approved — ready to file`) all reuse existing strings that
appeared on the sub-status text line already.
