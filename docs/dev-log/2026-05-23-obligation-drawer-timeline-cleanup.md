---
title: 'Obligation drawer cleanup — drop YearStripTimeline, regroup stage status (items 15, 16)'
date: 2026-05-23
author: 'Yuqi pairing with Claude'
area: ux
---

# Two timelines became one + readable stage cards

## #15 — Drop the YearStripTimeline from the dates panel

`StatutoryDatesPanel` (rendered inside the obligation drawer's
"Dates" tab) had two things stacked:

1. `YearStripTimeline` — a horizontal strip plotting every relevant
   date on the row (created / due / filed / today / etc.) with
   markers on a continuous time axis.
2. `FlatDateList` — the explicit definition list of every date
   field on the row.

The drawer ALSO renders `PathToFilingSummary` at the top of every
view (the six-stage milestone visualization with circles + connecting
lines). So the drawer had two timeline visualizations competing for
attention, and the dates panel itself had timeline + list of the
same dates. Critique was direct: "can remove the timeline for dates
first."

`StatutoryDatesPanel` now renders only `FlatDateList`. The
`YearStripTimeline` function (~165 lines) and its `clamp01` helper
are removed outright — git history has them if we ever need to bring
the visualization back for multi-year cycles (which is where it
actually adds signal that the per-row Path summary doesn't).

## #16 — Bigger gap between stage label and its status detail

In `PathToFilingSummary` each column showed:

```
●────●────●
  Filed
  May 17
  OVERDUE
  Awaiting acceptance
```

Critique: "you should make clear the status (Filed) is a thing,
and the date+Overdue/completed is another thing. So bigger gap in
between."

Right call. The four text lines were direct flex children with no
internal grouping — the eye couldn't parse "stage name" vs "status
detail" as separate units.

After: the stage label keeps its `mt-0.5` from the circle row; the
date + state + sub-status now live inside a nested flex column with
`mt-2` separating them from the label above and `gap-0.5` between
themselves. Two visual units, clearly:

```
●────●────●
  Filed         ← unit 1: stage name
                 ← bigger gap (`mt-2`)
  May 17        ← unit 2: status detail
  OVERDUE
  Awaiting acceptance
```

No layout change to the connector row (still horizontally aligned
across all 6 columns). Only restructures the per-column text block.

## Files touched

- `apps/app/src/routes/obligations.tsx`:
  - `StatutoryDatesPanel` simplified to `FlatDateList` only;
    `YearStripTimeline` + `clamp01` deleted (~180 LOC).
  - `PathToFilingSummary` per-column status detail wrapped in a
    nested flex column with `mt-2` gap from the stage label.
- `apps/app/src/i18n/locales/{en,zh-CN}/messages.po` — 4 obsolete
  strings cleaned by extraction (`Internal due` / `Statutory` /
  etc. timeline marker labels).
