---
title: 'In Review pipeline steps become clickable + undo toast'
date: 2026-05-23
author: 'Yuqi pairing with Claude'
area: ux
---

# Each step in the strip is now a real mutation

Frontend half of the In Review sub-status work (paired with backend
commit `7206f2e0`). The 6-step pipeline strip on the In Review stage
card used to render past steps as ✓, current as ●, future as ○ — purely
visual. Now every step is a real `<button>` that flips `prepStage` or
`reviewStage` to that step.

## Interaction

**Slider model.** One step is current; clicking any other step moves
the row to that step (forward, backward, or non-adjacent). No guards.
Hover tooltip says "Move to: {label}" so the action is unambiguous
before the click lands.

- Steps 1-3 (`ready_for_prep` / `in_prep` / `prepared`) →
  `updatePrepStage`
- Steps 4-6 (`ready_for_review` / `in_review` / `approved`) →
  `updateReviewStage`
- Current step is `disabled` (no-op click). Tooltip reads
  "You're on this step".

## Undo toast

Every successful click surfaces a sonner toast with an **Undo** action.
Click Undo within ~5s (sonner default) and the toast fires the reverse
mutation back to the previous value. Previous value is captured in a
ref on the drawer just before each click — refs survive the mutation
lifecycle without forcing a re-render.

Implementation note: the success handler clears the ref after reading
it so consecutive clicks don't replay an older snapshot. If the user
catches the misclick on the 3rd of 4 forwards, only the last "Undo"
chain is offered.

## `notes_open` affordances

`notes_open` is a flag, not a step — same value space as
`reviewStage='in_review'` with an extra "Notes open" annotation. When
the row sits at step 5 (Reviewer checking the return):

- If `reviewStage='in_review'` → small ghost **Leave note for preparer**
  button under the step label. Flips `reviewStage='notes_open'`.
- If `reviewStage='notes_open'` → button changes to **Mark notes
  addressed**, plus the step picks up a "· Notes open" annotation in
  warning tone. Click flips back to `in_review`.

So the in_review ↔ notes_open round-trip is a separate affordance from
the slider's "click to move forward/backward". The reviewer can leave a
note without re-positioning the slider.

## Dropped: the three manual reminders

The In Review stage card used to render up to 3 `manual`-flavor reminder
rows:

- "Mark drafting complete and hand off to reviewer" (when prepStage is
  ready_for_prep / in_prep)
- "Get reviewer sign-off on the return" (when reviewStage is
  ready_for_review / in_review)
- "Address reviewer's notes on the return" (when notes_open)

All three are now redundant — clicking the matching pipeline step does
the same thing as a real mutation. Kept:

- **Pre-stage 8879 packet for client** (routing → Evidence tab) — not a
  sub-status mutation; opens a different surface
- **Mark return submitted to authority** (primary mutation `Mark filed`
  / status='done') — the stage-level forward, separate from the slider

## Files touched

- `packages/contracts/src/index.ts` — re-export `ObligationPrepStage` +
  `ObligationReviewStage` types and their schemas from the barrel so
  the app can type the mutation inputs
- `apps/app/src/routes/obligations.tsx`
  - 2 new mutations: `updatePrepStageMutation` /
    `updateReviewStageMutation`, modeled after `changeStatusMutation`
  - 2 new refs (`prepStagePreviousRef` / `reviewStagePreviousRef`)
    capturing the previous value for the Undo toast
  - 2 new handlers (`onChangePrepStage` / `onChangeReviewStage`) passed
    to `ActiveStageDetailCard`
  - Review pipeline strip: each `<li>` becomes a `<button>` with click
    handler + tooltip + disabled state for current
  - `notes_open` affordances rendered inline with step 5
  - Dropped 3 manual reminder branches in the review-stage tasks memo
  - Removed `row.reviewStage` from the tasks-memo deps (no longer read)
- `apps/app/src/i18n/locales/{en,zh-CN}/messages.po` — 6 new strings,
  3 retired strings cleaned up

## Verified

- `pnpm exec tsc --noEmit` — clean across app + contracts + server
- `pnpm exec vp check --fix` — clean (1 exhaustive-deps fix)
- `pnpm --filter=@duedatehq/app i18n:extract` — 0 missing translations
- `pnpm exec vp run @duedatehq/app#test` — 47 files / 290 tests passing

## What's still off the slider

- **Status forward** (review → done) stays a separate primary CTA
  ("Mark return submitted to authority") — the slider is sub-status
  only; the stage transition is its own thing.
- **prepStage='not_started'** isn't a step in the In Review strip
  (it's the Not started stage's territory). Same for the waiting
  variants (`waiting_on_client` / `waiting_on_third_party` /
  `bookkeeping_cleanup`) — those belong to the Waiting stage.
- **reviewStage='not_required'** + **`overridden`** are out-of-pipeline
  edge cases; not reachable via slider clicks.
