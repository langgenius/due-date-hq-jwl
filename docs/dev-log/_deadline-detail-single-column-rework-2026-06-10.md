# Deadline detail — single-column rework to canonical Qn4nX (2026-06-10)

Yuqi showed the live page vs the canonical and said "the actual design is like
this. please rework." Pulled the exact Qn4nX body (`hMaQD`) structure: it is a
**single column** of three white cards —

1. **WorkflowMilestoneCard** (`CorQi`) — stepper + active stage + blocking, all
   in ONE white card.
2. **Recent activity** (`sbuW8`).
3. **Penalty exposure** (`wU2Sp`).

No right-hand Ownership/Linked-from rail.

## Changes (`ObligationQueueDetailDrawer.tsx`, Status tab, page mode)

- **Two-column → single column.** The `lg:flex-row` split is gone; cards stack
  full-width.
- **Stepper + active stage re-boxed into ONE card.** This supersedes last turn's
  #5 (unbox stepper) and #6 (separate bold box for the active card): the canonical
  puts both inside one `WorkflowMilestoneCard`
  (`rounded-[12px] border border-divider-subtle bg-background-default px-5 py-4`).
  The single card still honors #5 (the stepper isn't separately boxed; its stage
  circles are filled/inverted via `PathToFilingSummary`) and #6 (the active stage
  is the bold focus of the primary card).
- **Ownership + Linked-from** fold from the right rail to a full-width 2-up footer
  row (`grid sm:grid-cols-2`) below the cards, so the assignee-change + client
  links aren't lost while the body reads single-column.

## No-fiction carve-out (unchanged)

The canonical mock shows "First-Time Abatement ELIGIBLE" + "Risk score 62/100".
These stay **omitted/relabeled** (honest Priority score from real
`smartPriority`) per Yuqi's explicit "keep the honest Priority-score version" +
the no-fiction-on-canvas rule.

## Verified

`tsgo --noEmit` clean. Live (`/deadlines/000000000003`): single column;
WorkflowMilestoneCard shows the stepper at top + active stage ("In review · Stage
4 of 6" → Approve return) in one card; gray content wash behind.
