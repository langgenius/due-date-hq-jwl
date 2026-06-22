# /deadlines summary cells → interactive triage filters

_2026-06-22_

Feedback #1 ("design this summary card better"), deeper pass: the StatBand cells
were read-only. Each is now a one-click triage filter on the table below, via the
StatBand's existing per-cell `onClick` (which already renders the interactive hover
wash + focus ring), wired to `setObligationQueueQuery`:

- **Total tracked** → clears every filter (`setObligationQueueQuery(null)`).
- **Overdue** → `{ due: 'overdue' }` (the real DUE_FILTERS literal).
- **Due this week** → `{ dueWithin: 7 }`.
- **In review** → `{ status: LIFECYCLE_V2_STATUS_SETS.review }`.
- **Filed** → `{ status: LIFECYCLE_V2_STATUS_SETS.done }`.

Each clears the other two dimensions so the filters don't stack confusingly; other
active filters (client/assignee/…) persist. Verified live: clicking Overdue sets
`?due=overdue` and filters the queue. Each cell carries an aria-label.

## Verification
tsgo 0 · i18n compile --strict 0 (5 new aria strings, zh-CN translated) · build
green · app tests 550/2.

## Still open (feedback #4 — table "more deadline")
Three directions confirmed (countdown emphasis · time-horizon banding · urgency
heat) with the constraint that /deadlines stay distinct from /alerts (time-forward
vs change/decision-forward). Next pass.
