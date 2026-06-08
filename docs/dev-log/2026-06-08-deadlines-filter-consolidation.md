# /deadlines — filter consolidation (status tabs + one Filters popover)

Date: 2026-06-08

Yuqi: "the double filters … are too much." Per a /critique pass (filter area
scored Consistency 1/4, Minimalist 1/4, cognitive load CRITICAL — ~30 control
targets in 5 bands; STATUS filterable two conflicting ways), consolidated to the
/alerts pattern: status tabs + ONE Filters popover.

## Changes (routes/obligations.tsx)

- **Removed the density toggle** (Comfortable/Compact Segmented); cell padding is
  hardcoded compact. ("leave only compact view")
- **New `ObligationFiltersPopover`** mirroring `AlertFiltersPopover` — one
  Filters trigger (SlidersHorizontal + active-count badge) with pill sections:
  Due (Any / Past due / Due this week, single-select) · Needs evidence ·
  Awaiting signature · Filing (taxType) · Client · State. All wired to the same
  URL params via `setObligationQueueQuery`; reuses the existing facet option
  lists.
- **Removed the quick-chip row** (Past due / Due this week / Needs evidence /
  Awaiting signature) — now in the popover.
- **Removed the per-column header filter dropdowns** (Filing / Client / State /
  STATUS) — STATUS was redundant + conflicting with the top tabs; Filing/Client/
  State moved into the popover. Headers are plain labels now.
- **Toolbar**: one clean line `Group by · Filters(n) · Columns`. Softened the bar
  border to `border-divider-subtle` + `pb-2` so the search field no longer
  doubles against the toolbar hairline.

## Verify

tsgo clean; `/deadlines` — toolbar shows tabs + search + Group by/Filters/Columns
(no chips, no density). Opening Filters → Past due wrote `?due=overdue`, the
trigger badged "(1)", table filtered to 12 overdue rows. At 1512×861.
