# Alerts work-queue — Review leads (Yuqi feedback)

**Date:** 2026-06-10

Feedback: "review is more important than active." The Active/Review work-queue
toggle previously led with Active (and defaulted to it, per the 2026-06-10
"Active leads" change). Reversed:

- `AlertsListPage.tsx` + `components/AlertListRail.tsx`: the `Segmented` options
  now order **Review, then Active**.
- Default queue (`workQueue` initial state) → **`'review'`**, so the page lands
  on the review queue.
- Test `defaults to Review first and switches to Active alerts on request`
  updated accordingly (was "defaults to Active first").

Verified live: the toggle reads **Review 3 · Active 2** with Review selected.
`tsgo` clean; test passes.
