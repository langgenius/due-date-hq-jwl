---
title: 'Drawer timeline alignment + tab placement (items 2, 4)'
date: 2026-05-23
author: 'Yuqi pairing with Claude'
area: ux
---

# Stage columns line up + tabs belong to what they control

## #2 — PathToFilingSummary stage columns now aligned

The six-stage milestone strip rendered each column at its own
height: active / done / expected-Filed columns extended downward
with date + state word + (sometimes) sub-status; pure-upcoming
columns ended at the stage label. Result: a ragged bottom edge
across the six columns, and (worse) the active-column extras read
as "not aligned to the other states."

Fix: always render the inner status block (date + state slot) for
every column. Empty positions use a ` ` (nbsp) inside the
date span so the column reserves the same vertical space as
populated columns. State word + sub-status remain conditional —
they only render where they have meaning — but they no longer leave
empty columns visually shorter.

Net: all six column baselines now line up. Active column can still
extend by one line when there's a sub-status (e.g. "Awaiting
acceptance"), but the date-row position is consistent across all
columns so the eye reads the strip as a level timeline, not a stair
step.

## #4 — Tab list moves out of the sticky snapshot

Before:

```
[sticky snapshot block]
  PathToFilingSummary
  ActiveStageDetailCard
  StatutoryDatesPanel
  TabsList         ← lives INSIDE the snapshot's sticky container
[scroll body]
  TabsContent (Readiness / Extension / Evidence)
```

The TabsList visually grouped with the milestones/dates above. But
the tabs control the body BELOW. Critique was direct: "shouldn't
the tab belong to the following information, not the top part
information?"

After:

```
[sticky snapshot block]
  PathToFilingSummary
  ActiveStageDetailCard
  StatutoryDatesPanel
[non-sticky]
  TabsList         ← visually grouped with TabsContent now
  TabsContent
```

Added a thin `border-t border-divider-regular` above the new
TabsList container so the seam between snapshot and tabs reads
cleanly. The snapshot still pins to the top while scrolling, but
the TabsList scrolls with the content. Tradeoff: tabs are no
longer always-visible while scrolling. Acceptable: the CPA rarely
switches tabs mid-scroll on the same obligation; visual clarity
about what the tabs control wins.

## Files touched

- `apps/app/src/routes/obligations.tsx`:
  - `PathToFilingSummary` — inner status block renders for every
    column with ` ` placeholders where there's no date, so
    upcoming columns reserve the same vertical space as
    done/active columns.
  - `ObligationQueueDetailDrawer` body — TabsList pulled out of
    the sticky snapshot container into a sibling div directly above
    TabsContent.
