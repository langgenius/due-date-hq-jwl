# 2026-06-05 — Restore HEAD's commits after the origin/main merge dropped them

## Why

The origin/main merge that landed in 30604895 took _theirs_ on
`obligations.tsx`, `pulse-alert-chrome.ts`, and the cascade of files
that consumed `impactBadgeFromAlert`. Yuqi's direction afterward —
"应该尽量以我的commit为主" / "did you lose anything? Any of my work is
not there?" — was explicit: prioritize HEAD's commits, then layer
main's necessary additions on top.

Concretely lost in the merge:

- `apps/app/src/routes/obligations.tsx`: the 13,536-line HEAD
  version (rounds 70-85 deadlines polish, infinite scroll, urgency
  band, materialsChecklistReference, latestDeadlineInputRequest,
  the full inline queue rendering) was replaced by main's
  3,362-line queue-extraction route. That **directly broke
  /deadlines** at runtime — the route was rendering the extracted
  shell without HEAD's polish layer expected by the rest of the
  branch.
- `apps/app/src/features/alerts/components/pulse-alert-chrome.ts`:
  HEAD's `severityFromConfidence` (round 58 X3j4nt amber palette
  - round 47 / 68 HIGH-only gate) was replaced by main's
    `impactBadgeFromAlert` (count-based, destructive-red palette).
    Three downstream surfaces (`AlertDetailDrawer.tsx`,
    `PulseAlertRow.tsx`, `needs-attention-card.tsx`) had their
    severity helper swapped accordingly — silently demoting the
    X3j4nt amber to destructive red.
- `apps/app/src/features/dashboard/actions-list.test.tsx`: my
  `it.skip` placeholder for the removed expand-on-focus assertion
  was replaced by main's new "renders each obligation as a
  focusable non-button row" test. Main's test is the correct
  _next_ assertion against the table-sweep markup, but
  prioritizing HEAD means re-applying the test additions as
  follow-up rather than dropping HEAD's placeholder unilaterally.

## What changed

### `apps/app/src/routes/obligations.tsx`

Restored HEAD's full 13,536-line version (commit b80fa9d3).
/deadlines route loads cleanly again. Main's `queue/`
subdirectory still exists (it was added by main as new files,
not as a conflict against HEAD) but obligations.tsx no longer
imports from it — the inline structure HEAD's polish targets is
what's running.

### `apps/app/src/routes/obligations.test.ts`

Restored HEAD's pre-merge version. The `urgencyBandOf` /
`URGENCY_BAND_ORDER` helpers are still importable from
`./obligations` (HEAD's route file exports them directly), so the
`describe.skip` workaround and the throwing stubs the merge
introduced are no longer needed. The defaultDetailSearchState
seed reverts to `sort: 'due_asc'`, `group: 'urgency'`,
`hide: ['smartPriority', 'clientCounty', 'dueDateExact',
'daysUntilDue', 'evidenceCount']` — matching HEAD's queue
defaults.

### `apps/app/src/features/alerts/components/pulse-alert-chrome.ts`

Restored HEAD's `severityFromConfidence` (X3j4nt amber colors,
confidence-based tier ladder, HIGH-only gate). Added
`impactBadgeFromAlert` back as a **co-existing** export on top of
HEAD's version, with thresholds (`>= 25 high`, `>= 5 medium`)
derived from main's contract — so `AlertCard.tsx` and
`PulseFormRevisedCard.tsx` (which main wired to the count-based
variant) still typecheck without forcing the rounds 70-85
surfaces off the X3j4nt palette they shipped with. A comment at
the new export explains both helpers stay until the user picks a
winner.

### `apps/app/src/features/alerts/AlertDetailDrawer.tsx`,

`apps/app/src/features/alerts/components/PulseAlertRow.tsx`,
`apps/app/src/features/dashboard/needs-attention-card.tsx`

All three reverted to the HEAD version:

- Import `severityFromConfidence` (not `impactBadgeFromAlert`)
- Call `severityFromConfidence(alert.confidence)` (not
  `impactBadgeFromAlert(alert)`)
- Render the X3j4nt amber palette HIGH-only

### `apps/app/src/features/dashboard/actions-list.test.tsx`

Restored HEAD's `it.skip` placeholder for the obsolete
expand-on-focus assertion. Main's new
"renders each obligation as a focusable non-button row" test is
worth re-applying as a follow-up but doesn't belong in this
restoration commit.

## Verification

- `pnpm -F @duedatehq/app exec tsc --noEmit` → exit 0
- `pnpm -F @duedatehq/app test` → 69 test files, 480 tests
  passed, 1 skipped (the actions-list.test.tsx `it.skip`)
- `pnpm -F @duedatehq/app build` → exit 0
- Dev server boots; `/deadlines` returns 200 with HEAD's route
  shell (the runtime crash from main's queue extraction is gone).

## Follow-ups (not in this commit)

- Re-apply main's `actions-list.test.tsx` `renders each obligation
as a focusable non-button row` assertion as a small follow-up
  PR. Main's test is the right shape against the current markup;
  it just got dropped during the priority-HEAD restoration.
- Decide which severity helper wins long-term:
  `severityFromConfidence` (X3j4nt amber, confidence-derived) or
  `impactBadgeFromAlert` (count-derived, destructive-red palette).
  Both live in pulse-alert-chrome.ts right now to unblock the
  branch; consolidate when there's a clear design call.
- Main's `apps/app/src/features/obligations/queue/` extraction
  files are unused now that obligations.tsx is back to monolithic.
  Leaving the files in tree (they came from main's commits, not
  ours; deleting them would expand the PR's removal diff). Cleanup
  candidate for a focused refactor pass.
