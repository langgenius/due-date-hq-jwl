# Deadline navigator rails → alert-rail parity (deadlines polish)

_2026-06-16_

Yuqi: "the detail page's alert list / deadline list should match on the text
size at least — users need familiarity." Investigated and found the deadline
detail uses **two** navigator rails, and one of them was a real size mismatch:

- `components/ObligationListRail.tsx` — the `/deadlines` panel rail. Already
  size-matched the alert rail (title `text-base`, date `text-sm`); aligned its
  **structure**.
- `detail/DeadlineNavigatorRail.tsx` — the `/deadlines/:ref` page rail
  (`routes/deadline-detail.tsx`). The **offender**: title `text-nav` (15px) +
  date `text-base` (14px), i.e. one step larger than the alert rail everywhere.

Aligned both to `AlertListRail` (the canonical):

| Element      | Alert rail                                           | Was (DeadlineNavigatorRail)           | Now                      |
| ------------ | ---------------------------------------------------- | ------------------------------------- | ------------------------ |
| Title        | `text-base` / medium                                 | `text-nav` / semibold-when-active     | `text-base` / medium     |
| Date         | `text-sm`                                            | `text-base`                           | `text-sm`                |
| Relative-due | `text-caption-xs`                                    | `text-xs`                             | `text-caption-xs`        |
| Selection    | light `bg-state-base-hover`, no bar                  | left accent bar + `bg-default-subtle` | light fill, no bar       |
| Unselected   | dimmed `opacity-55` (date + badges), title→secondary | not dimmed                            | dimmed + title→secondary |
| Row padding  | `py-4`, `gap-3`, time col `w-64`                     | `py-3.5`, `gap-2.5`, `w-60`           | `py-4`, `gap-3`, `w-64`  |

So both deadline rails now read with the same type scale + selection language as
the alert rail — switching between the two detail pages feels familiar.

## Verify

- tsgo: my two rail files clean (the one whole-app error is the parallel
  session's uncommitted `ClientSummaryStrip.tsx`, not mine). vp check: clean.
- Live screenshot blocked — the shared preview tab is being driven to other
  routes by the parallel session; the changes are faithful class-swaps of the
  already-verified `AlertListRail`, so risk is low. Will eyeball once the preview
  frees up.

## Follow-ups noted

- The two deadline rails (`ObligationListRail` + `DeadlineNavigatorRail`) are
  near-duplicate navigators — a consolidation candidate.
- `DeadlineNavigatorRail`'s relative-due tone is still hand-rolled
  (`relative.tone`); could route through the shared `dueCountdownTone`.
