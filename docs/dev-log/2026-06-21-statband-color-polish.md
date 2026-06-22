# Polish: StatBand "due this week" → neutral (one red on the band)

_2026-06-21 · visual QA pass on this session's new work_

Live QA of the new /deadlines StatBand caught two near-red cells side by side:
OVERDUE used `text-text-destructive` (rgb 217,45,32) AND "Due this week" used
`text-text-warning` — which in this theme renders as a near-red coral (rgb
200,61,47), not amber. Two reds on one calm summary band over-signals.

Fix: "Due this week" sub is now neutral (drops the warning class), so OVERDUE owns
the band's only color — the genuine risk reads at a glance, due-this-week is
upcoming workload (neutral, like In review / Filed). Color-only-serves-risk +
calm-on-dense canon. Verified live: "next 7 days" now rgb(103,111,131) gray,
"needs action" stays rgb(217,45,32) red.

Also confirmed live this pass: the active sidebar route renders as the solid accent
pill (collapsed rail shows the filled accent tile + white glyph).
