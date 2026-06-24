# /deadlines — remove the card view, keep the row (table) view

**Date:** 2026-06-24 · **Surface:** `apps/app/src/routes/obligations.tsx`

Yuqi: "remove the card view from deadlines page. just keep the row view." The
queue had a card ⇄ table Segmented toggle (card = the signature urgency-lane
grid, the default; table = the registry rows). Now /deadlines is the **table
only**.

## Removed

- The card/table view-mode `Segmented` toggle (icon-only, in the toolbar's right
  cluster — the "View 7/11" **column**-visibility control next to it is unrelated
  and stays).
- The `deadlinesViewMode` state + setter + the `readStoredDeadlinesView` /
  `DEADLINES_VIEW_STORAGE_KEY` localStorage persistence + the `DeadlinesViewMode`
  type.
- The `deadlinesViewMode === 'cards' ? <DeadlineCardGrid…> :` branch — the render
  now goes straight from the error/Alert state to the table card.
- The toggle-only crossfade class on the table card (its purpose was the card⇄
  table fade; no toggle now).
- Dead imports: `DeadlineCardGrid`, `Segmented`, `LayoutGridIcon`, `ListIcon`.

## Kept (reversible)

`features/obligations/queue/DeadlineCardGrid.tsx` stays in the tree, unused, so
the card view can be restored. A comment at each former touch-point notes the
removal date + that the component is preserved.

## Verify

`tsgo` app clean; `vp run @duedatehq/app#build` clean; no leftover
`deadlinesViewMode` refs. Verified live on /deadlines: table renders directly,
no view toggle, urgency-lane grouping + status + lateness intact.
