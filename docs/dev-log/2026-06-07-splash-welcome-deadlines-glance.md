# /splash welcome screen + /deadlines AT A GLANCE row

Pixel-exact build of the net-new post-login welcome screen and the one
remaining deferred gap on the /deadlines list, against the canonical
Pencil frames (`duedatehq_work.pen`):

- `QGZta` /splash — post-login welcome (NET-NEW)
- `u3nNA` (`Mi5CE` / `H0GSr` / `Y1IdZj`) — /deadlines AT A GLANCE row

## Shipped

### /splash — post-login welcome (net-new)

- **`routes/splash.tsx`** (`SplashRoute`): a centered, single-column
  "you just signed in" surface recreating Pencil `QGZta`. Brand lockup
  (dark rounded mark + wordmark) → big "Welcome back, {name}" greeting +
  date → a "While you were away" recap card (success eyebrow + four
  check-marked recap lines) → an amber "N deadlines due this week"
  warning strip → primary "Open your dashboard" CTA → quiet ghost links
  → a footer last-sign-in stamp. 720px max content column; responsive
  padding down to phone. All strings via Lingui.
- **Token mapping**: the Pencil "Verdant" canvas hexes are mapped onto
  the existing semantic tokens — `bg-background-section` page, card on
  `bg-background-default` + `border-divider-regular`, success tones via
  `text-text-success` / `bg-state-success-solid`, the warning strip via
  `bg-state-warning-hover` / `text-text-warning`, and the canonical
  primary `<Button>` for the CTA. No new theme colors.
- **Route wiring** (`router.tsx` + `route-summary.ts`): registered at
  `/splash` as a top-level route guarded by the shared `protectedLoader`
  (auth required) but rendered STANDALONE — it owns the full viewport
  with its own centered layout and is intentionally NOT a child of
  `RootLayout`, so no sidebar / shell chrome appears (matching the
  design). Added a `splash` route-summary entry for the document title.

### /deadlines AT A GLANCE row

- **`features/obligations/deadlines-at-a-glance.tsx`**
  (`DeadlinesAtAGlance`): the three narrative tiles from Pencil `u3nNA`.
  Unlike the /today numeric tiles, these name the single most-pressing
  item per bucket: **Today** (most-overdue open row by `daysUntilDue`),
  **This week** (rows due in 0–7 days; up to three client names + count),
  **Needs you** (rows in `review`; first client + count). All content is
  derived from the already-loaded queue `rows` + the `review` facet count
  — no extra round-trip, no contract change. Each tile is a button that
  drills into the matching filtered scope (`due=overdue` /
  `daysMax=7` / `status=review`). Tones map onto destructive / warning /
  accent tokens. Skeleton while the list is loading; empty-bucket
  fallbacks for all three tiles.
- **Route wiring** (`routes/obligations.tsx`): mounted between the
  `PageHeader` and the queue section, hidden while a detail panel is open
  (matches Pencil `Y12Dht`, which omits the row in the split state).

## TODO(data)

- /deadlines tiles: the design's sub-lines carry figures the queue row
  contract does NOT expose — `$1,840 penalty exposure`
  (`estimatedExposureCents` is explicitly omitted from
  `ObligationQueueRow`) and `est. 1h 40m focus` (no effort estimate in
  the contract). Those exact numbers are left out of the derived
  sub-lines; we surface the counts + due dates we DO have. Restore the
  richer copy once exposure + effort land on the row.
- /splash recap figures (synced count, new-alert count, reminders sent,
  migration imports), the greeting first name, the date, and the
  last-sign-in stamp are all static fallbacks. They need a "since last
  visit" aggregate keyed off a `lastDashboardVisitAt` on the user model,
  which does not exist yet.

## TODO(wire)

- Nothing redirects to `/splash` yet. Making it the real
  first-of-the-day landing surface needs the same "since last visit"
  server signal as above, plus a decision on when to interpose it before
  `/today`. The post-login redirect in `router.tsx` still targets `/`.
  The route is reachable + bookmarkable today for review.

## Not changed / why

- /today (`routes/dashboard.tsx` + `features/dashboard/*`): already
  pixel-matched from prior rounds (header family, daily brief, AtAGlance
  tile row, alerts hero cards, actions table, lifecycle strip). Audited
  against `VJbaH` / `vP3mz` / `WDQea`; no gaps to close.
- /deadlines header, status scope tabs, filter chips, grouped table:
  already present + matched in `obligations.tsx` from prior rounds.
- The `DeadlineHorizon` "14-day forecast" bar (node `U7ARi`) remains
  deferred: it needs busiest-day / N-day-window aggregates the current
  `obligations.list` output does not expose.
- `features/obligations/queue/*` is owned by another agent — untouched.
