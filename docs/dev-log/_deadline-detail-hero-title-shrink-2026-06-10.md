# Deadline detail — hero title shrink + Qn4nX date-card WIP (2026-06-10)

Checkpoint commit on `ObligationQueueDetailDrawer.tsx` to preserve in-flight
detail-page work before a focused Qn4nX styling pass.

## Hero collapse: title now shrinks (fixed)

On scroll-collapse the hero `<h2>` kept rendering at 22px even though the
collapsed class set `text-[16px]`. Cause: a `transition-all duration-200` on the
element was animating `font-size`, and `line-clamp-1` flipping the display box
left it stuck at the pre-collapse size. Dropped `transition-all` from the title
(other hero transitions unaffected). Verified live: 22px expanded → 16px
collapsed.

## Included WIP

Carries the in-flight Qn4nX date-card work (`DeadlineDateCard`: icon + pretty
date + "weekday · relative" subline + overdue tint) so it isn't lost ahead of
the Qn4nX styling pass.
