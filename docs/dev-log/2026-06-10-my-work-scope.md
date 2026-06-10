# Dev log — "My work / Everyone" page scope on Today (2026-06-10)

One Segmented toggle in the /today header now scopes the WHOLE page — the AI Daily Brief
and Priority Actions (rows, Smart Priority ranks, counts, facets) switch together.

## Semantics

- **My work** (default) = rows whose _effective assignee_ is the viewer, **plus unassigned
  rows**. Effective assignee = `COALESCE(obligation.assignee_id, client.assignee_id)` — the
  same precedence the deadlines queue and reminder dispatch use. Unassigned stays visible to
  every member so an unclaimed deadline never disappears from everyone's Today (reminder
  parity: unowned work falls back to owners). A name-only import assignment with no bound
  user id counts as unassigned (over-show is the safe failure mode).
- **Everyone** = the previous firm-wide view.
- For a firm with no assignments, My work ≡ Everyone, so the new default changes nothing
  until the practice starts assigning.
- Choice persists per browser (`ddhq:dashboard:scope` in localStorage) and in the URL
  (`?scope=`), replacing the old brief-only `?brief=` param.

## Backend

- `dashboard.load` input: `briefScope`/`briefUserId` → unified `scope`/`scopeUserId`
  (contracts + ports + repo). The server resolves the user id from the session.
- `composeDashboardLoad` filters rows by scope BEFORE summary/rank/facet computation, so
  every number on the page agrees with the visible rows; ranks re-rank within scope.
- `summary.firmOpenObligationCount` (new, always unscoped) powers the empty-state split.
- `DashboardTopRow` now carries effective `assigneeId`/`assigneeName` (repo resolves
  obligation-level override names via a batched user lookup, queue parity).
- Personal briefs have no cron: `dashboard.load` self-heals by enqueueing a `'me'` brief
  (reason `scope_view`) when the viewer's brief is missing/stale. Cost-bounded by the
  enqueue debounce + the consumer's input-hash dedupe (≈1 personal generation per user per
  day, only for My-work viewers). The brief consumer now passes scope into its snapshot
  load, so a personal brief narrates the member's own queue, not the firm's.

## Frontend

- Page-level `Segmented` ("My work / Everyone") in the PageHeader actions cluster; the
  brief card's prop-only scope toggle remnants are removed.
- Actions table: the per-row **status pill column is replaced by the owner avatar**
  (`AssigneeAvatar`, id-based `isMine` via new `useCurrentUserId`). Status lives in the
  group headers, which now render even for a single-status table. `ExtensionChip` stays
  beside the avatar (extended folds into the "Not started" group).
- My-work empty state distinguishes "you're caught up — the practice still has N open
  deadlines → Show everyone's work (one-click scope switch)" from the true firm-wide
  all-clear/no-clients states.
- At scope=me with no brief yet, the card renders its generating state and the query polls
  until the enqueued personal brief lands.
