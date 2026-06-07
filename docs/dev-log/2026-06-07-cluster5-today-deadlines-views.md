# Cluster 5 — today / deadlines main views

Pixel-exact recreation of the canonical Pencil frames for the two main
work surfaces (`duedatehq_work.pen`):

- `VJbaH` /today — Production recreation KW
- `vP3mz` /today — 2400-wide max-width-content responsive variant
- `Y12Dht` /deadlines list/detail split
- `HuYeb` /deadlines — Production recreation KW

The existing /today (`routes/dashboard.tsx` + `features/dashboard/*`)
and /deadlines (`routes/obligations.tsx`) surfaces are already deep
into prior Pencil rounds (VmcdD etc.) — header family, alerts hero
cards, actions table, lifecycle strip all match the design. This pass
adds the one genuinely net-new surface the recreations introduce that
had no code analog yet: the **AT A GLANCE tile row**.

## Shipped

- **`GlanceTile`** (`features/dashboard/glance-tile.tsx`): new reusable
  tile primitive matching Pencil nodes `tc2ug`/`OXSao`/`ztKLk`/`fu4sj`
  (/today) and `Mi5CE`/`H0GSr`/`Y1IdZj` (/deadlines). Circular 28px
  tone-tinted icon chip + body (uppercase caps label / headline value /
  quiet sub). `emphasis` variant renders the money headline at 24/700;
  default renders sentence headlines at 14/600. Tones map onto the
  existing token system (`state-warning-*`, `state-accent-*`,
  `background-subtle`) — the Verdant canvas colors are NOT ported.
  Renders as a drill-in `<Link>` when `href` is set, else a static div.
  Skeleton in the value slot during load.
- **`DashboardAtAGlance`** (`features/dashboard/at-a-glance-section.tsx`):
  the 4-tile row from node `bAULB`. Tiles: **At risk** (penalty
  exposure money headline + "N ready · N need inputs"), **Today** (due-
  today count), **Morning sweep** (active Pulse alert count), **Needs
  you** (review-queue count + evidence-gap sub). All figures come from
  the existing `dashboard.load` summary fields
  (`totalAccruedPenaltyCents`, `accruedPenaltyReadyCount`,
  `accruedPenaltyNeedsInputCount`, `needsReviewCount`,
  `evidenceGapCount`) — these were defined in the contract but had no UI
  consumer before. The alert count reuses the shared alerts-list React
  Query cache (`TODAY_ALERTS_LIMIT = 50`), so no extra round-trip.
  Responsive: 1-col phone → 2-col tablet → 4-col at `xl`.
- **Route wiring** (`routes/dashboard.tsx`): mounted between the daily
  brief and the Alerts hero row (matching the design's section order).
  `dueTodayCount` derived from `topRows` via the existing
  `daysUntilDueFromAsOf` helper, excluding terminal statuses
  (done/completed/paid/not_applicable).

## Drill-in destinations

- At risk → `/deadlines?status=blocked` (blocked is the at-risk proxy,
  same convention as `ClientSummaryStrip`).
- Today → `/deadlines` (the queue defaults to internal-due ascending,
  so today's items sit at the top; the obligations route does not accept
  a `due=today` param — only `due=overdue`).
- Morning sweep → `/alerts`.
- Needs you → `/deadlines?status=review`.

## Not changed / why

- /today header, daily brief, alerts cards, actions table, lifecycle
  strip — already match the recreations from prior rounds.
- /deadlines status tabs, filter chips, grouped table — already present
  in `obligations.tsx`; the recreations restate the existing structure.
- `DeadlineHorizon` "14-day forecast" bar (node `U7ARi`) and the
  /deadlines AtAGlance 3-tile row were left for a follow-up: the
  forecast needs busiest-day / N-day-window aggregates the current
  `obligations.list` output does not expose, and adding the 3-tile row
  to the 13.5k-line obligations route is a larger restructure than this
  cluster's clean additive win. See report TODO(data).
