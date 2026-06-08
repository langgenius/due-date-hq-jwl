# /alerts — header + filter-row page-feedback pass

Date: 2026-06-08

Four inline page-feedback items on the live `/alerts` list, all chrome-level.

## Header (`routes/alerts.tsx`)

- **Morning sweep → coffee icon** (#1): the labelled "My morning sweep"
  pill collapses to an icon-only `CoffeeIcon` button (`size="icon-sm"`),
  wrapped in a Tooltip carrying the label. Keeps the action cluster compact;
  the active (digest-open) state still flips to the filled `secondary`
  treatment. Label preserved in tooltip + `aria-label` for discoverability
  and a11y.

## Filter row (`AlertsListPage.tsx`)

- **Sort joins the filter cluster** (#2): removed the greedy `flex-1`
  spacer that sat between the View toggle and the dropdowns. In a
  `flex-wrap` row a growing spacer fills the rest of line 1, which pushed
  the whole Time / Severity / Change types / Tax area / State / **Sort**
  cluster onto a second line — and on narrower viewports bumped Sort onto a
  third line by itself. Without the spacer the controls flow left-to-right
  and Sort stays adjacent to its sibling filters, wrapping as one group.
- **Responsive search width** (#3): the search field steps `w-[180px]` →
  `sm:w-[220px]` → `lg:w-[260px]` instead of a fixed 260px, giving the
  filter cluster more room to stay on one line on smaller screens.

## Day-group header (`components/PulseAlertRow.tsx`)

- **Dispatch count is quieter** (#4): the per-day count drops the
  bold/uppercase/tracking eyebrow treatment for `font-normal` normal-case
  muted gray — reads as quiet supporting context ("1 dispatch") next to the
  date, not a competing heading.

Note: the per-row hover **Review** button the same feedback round asked for
already exists on `/alerts` rows (PulseAlertRow hover cluster) — the new
hover-Review work landed on the `/today` Actions table, which lacked it
(see `2026-06-08-today-page-feedback-pass.md`).

## Follow-up round

- **No alternating row colours** (`components/PulseAlertRow.tsx`): rows are
  now a flat uniform `bg-background-default`. The round-83 rule tinted
  impacted rows (`impacted > 0` → `bg-background-section`) and left no-match
  rows white, which read as arbitrary zebra striping down the list. Client
  impact is already carried by the "Affects N clients" meta + the High-impact
  pill, so the receding fill was redundant. Active row still wins the accent
  wash; hover still steps to base-hover.
- **Gap between filter clusters** (`AlertsListPage.tsx`): a fixed
  (non-growing) vertical hairline divider now separates the left cluster
  (Search + List/Map toggle) from the dropdown cluster. Restores the visual
  "space between" the earlier `flex-1` spacer provided — but because it
  doesn't grow to fill the line, it doesn't force the filters to wrap onto a
  new row (the problem that removing the greedy spacer fixed).
