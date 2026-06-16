# Detail-pane batch — part 2: crumb parity + the filter switch-back bug

_2026-06-16_

Continues [part 1](2026-06-16-hierarchy-separation-batch.md).

## #5 — Deadline crumb wasn't consistent with the alert crumb (Yuqi "这里不统一")

`DeadlineCrumbBar.tsx` + the page-mode call site in `ObligationQueueDetailDrawer`.
The alert top bar reveals `Alerts / {title}` once the hero scrolls out of view;
the deadline crumb just showed "Deadlines" forever, used `gap-2` (vs the alert's
`gap-3`), and put a `text-text-tertiary` override on the close. Brought to exact
parity: the crumb is now a `<nav>` that reveals `Deadlines / {title}` on scroll
(`title` + `heroScrolled` props, fed `heroCollapsed` and the same
`{label} — {description}` expression the hero `<h2>` renders), right cluster
`gap-3`, close override dropped. Verified live: on scroll the crumb reads
"Deadlines / Form 1040 — Individual income tax return".

## #4 — Status filter lost on the detail page (Yuqi "无法切换回去 — 有bug")

Entering a deadline from a status-filtered `/deadlines` worked
(`openQueueDetail` already threads `search`), but ON the detail page the rail
hops and prev/next paging built their hrefs **without** `search`
(`DeadlineNavigatorRail` row Link + `goToRow` in `deadline-detail.tsx`). So one
hop dropped `?status`, the rail re-queried to all rows, and Close returned to the
unfiltered list. Fix: thread the page `location.search` through `goToRow` and a
new `routeSearch` prop on the rail (named to avoid the rail's own `search`-box
state), into each row's `deadlineDetailHref`. `cleanDeadlineDetailSearch` only
strips `drawer/id/row/tab`, so `status` survives. Verified live: every rail link
now carries `?status=in_review`; Close returns to the filtered list.

Also cleared a pre-existing `no-unnecessary-type-conversion` warning
(`Boolean(hasNextPage)` → `hasNextPage`) in the file.

## Still open (deliberately): collapse the status-pill strip

Yuqi also said the `/deadlines` status pills are "too long / usually collapsed."
That's a toolbar redesign in `routes/obligations.tsx` (the parallel session's
file) — folding the 7-pill strip into the existing Filter control — not part of
this bug fix. Spawned as a separate task to avoid racing that file.

tsgo + vp clean on all four files.
