# Multi-select alert filters — Change type + Tax area (img-125)

**Date:** 2026-06-21
**Surface:** `/alerts` Filters popover (`AlertsListPage` `AlertFiltersPopover`),
`features/alerts/lib/alert-filters.ts`

The Change type and Tax area facets inside the consolidated Filters popover were
single-select `ToggleChip` rows (`FilterPillSection`) — pick exactly one bucket.
A CPA narrowing to, say, both Deadlines _and_ Source updates had to re-open the
popover and lose the first pick. Upgraded both facets to MULTI-select checkbox
sections.

## State / logic (lib)

- New array types alongside the kept single-select ones (the unit test + any
  future single-pick caller still import the originals):
  - `AlertChangeKindSelection = readonly AlertChangeKindFilterGroup[]`
  - `AlertTaxAreaSelection = readonly TaxArea[]`
- New selectable option arrays (the option set minus the `'all'` pseudo-option):
  `CHANGE_KIND_FILTER_SELECTABLE`, `TAX_AREA_FILTER_SELECTABLE`.
- New matchers `matchesChangeKindSelection` / `matchesTaxAreaSelection`: an
  **empty array = "all"** (no narrowing — preserves the prior default), a
  non-empty array keeps the alert when it matches ANY selected group/area
  (OR within a facet, the rules-library faceted convention).
- `AlertsListPage` state went from `useState<AlertChangeKindFilter>('all')` to
  `useState<AlertChangeKindSelection>([])` (same for tax area); the
  `filteredAlerts` predicate, `resetFilters`, and `filtersActive` were updated to
  the array shape.

## UI (`FilterCheckboxSection`)

- Replaces `FilterPillSection` for these two facets only (Time + Impact stay
  single-select pills). Renders a tri-state **"Select all"** Checkbox row
  (`indeterminate` when a strict subset is chosen) over one Checkbox row per
  option — the canonical `Checkbox` primitive, which already swaps its glyph
  Check → Minus for the indeterminate state.
- "Select all" reads checked when the array is empty (the canonical all); clicking
  it always lands back on `[]`. Unchecking one option from the all-state seeds the
  array with every _other_ option; re-checking the last missing option folds back
  to `[]` so the trigger badge clears.
- **Per-facet count** ("2 selected") rides next to the section label via the
  existing `{count, plural, …}` message — the shared Filters trigger still
  collapses all facets to one number, so the in-section count is where a CPA sees
  how many buckets are live.

## Canon / i18n

- Reused existing catalog strings only ("All change types", "All tax areas",
  `{count, plural, one {# selected} other {# selected}}` — all already translated
  in zh-CN), so **no `i18n:extract`** was run (avoids pulling a parallel
  session's untranslated WIP).
- Jurisdiction/form chips untouched (neutral); no new colour/shadow/radius.

## Verification

`tsgo --noEmit` clean (rc 0). `alert-filters.test.ts` extended with 6 multi-select
cases (empty = all, OR-within-facet, uncategorized-hidden-once-narrowed); full
`alert-filters` + `AlertsListPage` suites pass (26 passed / 1 skipped).
