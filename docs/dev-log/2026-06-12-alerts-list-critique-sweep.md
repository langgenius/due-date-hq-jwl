# 2026-06-12 — /alerts list: Stripe filter pills, toolbar regroup, readable measure, queue logic

The full /alerts-list critique sweep (Yuqi owns Today in a parallel session;
this session owns the Alert page end-to-end).

## Stripe two-tone FilterTrigger (component-level)

`components/patterns/filter-trigger.tsx` — Yuqi's Stripe reference
("Date range │ All time ⌄") applied to the canonical trigger, so every page
using FilterTrigger (/alerts, /rules, /deadlines) inherits it:

- The pill is now `rounded-full` (the 999 step of the radius scale).
- `valueLabel` renders behind a hairline vertical divider in the ACCENT tone —
  gray label = what this filters; accent value = what's applied.
- The chevron follows the value: accent when applied, quiet tertiary at rest.

Call sites converted to the value slot: Sort ("Sort by │ Newest" — fixed-width
hack removed), State ("State │ CA · 4 alerts"), Filters (count). The Filters
trigger's gray `saved` resting fill is DROPPED (Yuqi #8: it read as a different
color to State) — all triggers share one at-rest chrome; emphasis now comes
from the accent value, not a heavier fill.

## Toolbar regroup (Yuqi #3)

READING controls left — [Review/Active] [Suggested action] — they decide what
the rows are; FINDING controls clustered right — [Search] [Filters] [State]
[Clear] [Sort] [view icons].

## Queue logic

- ACTIVE pill removed from list rows AND rail items (Yuqi: "a pill to show
  Active in the Active tab is not reasonable") — the tab states the queue; the
  queues differ structurally (date-diff + clients vs "No client impact").
- Opening an alert SYNCS the Review/Active toggle to that alert's queue
  (render-time setState with sync-key) — deep links land on the right tab.
- The rail scrolls the selected item to the TOP on first paint (arrivals from
  /today / shared URLs); later activations use 'nearest' so in-rail clicks
  never teleport.

## Readable measure (Yuqi "too wide — alerts hard to read": attack)

Row titles measured ~140ch at full width (readable ceiling ≈75ch). Capped at
`max-w-[72ch]` — long titles wrap to two lines, rows get distinct silhouettes.

Verify: tsgo clean; preview (narrow viewport — the Today session owns the tab):
accent Review tab, checkbox beside toggle, clustered finding controls, two-tone
Sort/Filters/State pills, neutral ACTION chips, wrapped titles, time-only rails.
