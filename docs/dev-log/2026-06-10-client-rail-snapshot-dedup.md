# Client detail — cut the redundant rail Snapshot (one-purpose-per-panel)

**Date:** 2026-06-10

The persistent right rail on `/clients/[id]` had a `SNAPSHOT` card whose only
live stat was `openCount` ("N Open deadlines"). At xl+ that number sat right
beside the full-width `ClientSummaryStrip`'s "Open filing" slot — the **same
number, shown twice** — and the strip carries it richer ("· N payment overdue").

Per the one-purpose-per-panel rule, removed the Snapshot card from
`ClientDetailRail`. The summary strip now solely owns the at-a-glance counts; the
rail's job is Contacts at rest + swapping to the obligation detail on a filing-row
click. Dropped the now-unused `openCount` prop.

(The Snapshot's other stats — Filed-YTD / outstanding-tasks / last-filed — and the
Engagement card were already removed earlier as unbacked-by-contract.)

tsgo clean; verified live (`/clients/meridian…`): SNAPSHOT gone, CONTACTS kept,
"OPEN FILING 3" remains the single source.
