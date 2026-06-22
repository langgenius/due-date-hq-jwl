# Rule library: "Where to start" cards + header button-size standardization (2026-06-22)

Three Yuqi feedback items on /rules/library.

## 1. "Where to start" → card grid (was rows)
`OverviewReviewBreakdown` rendered the ranked review backlog as a bordered
hairline row list. Reworked into a responsive **card grid**
(`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`). Each card is its own click target
into that jurisdiction's review queue: seal + label header, the
high-severity · days-waiting differentiators, and a footer row with the pending
count (warning) + a "Review →" affordance (accent, hover-nudge). Whole-card
button, hover/focus states.

## 2 + 3. Header button size = default, matching Deadlines
Yuqi: the rule-library header buttons are the right size; other pages should
match, and the page should follow the Deadlines page's details. Confirmed both
the rule-library AND Deadlines headers use the **default** Button size (no `size`
prop, h-9). Standardized the outliers to default:
- `/alerts` (`AlertsListPage`): Sources + History header buttons were `size="sm"`.
- `/clients`: `ClientsCreateSplitButton` (New client + chevron) and the Remove-
  sample-data + Import-history header buttons were `size="sm"`.
- `/today`: header is an icon-only refresh + Segmented (no labeled action
  buttons) — left as-is.

`tsgo` clean across all touched files. (Local dev server was stale this session —
verify visually after a refresh.)
