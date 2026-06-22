# Filter-dropdown cohesion sweep — one pill vocabulary across surfaces

**Date:** 2026-06-22
**Surface:** `patterns/filter-trigger`, new `patterns/single-select-filter`,
`/audit`, `/deadlines` (toolbar + detail rail), `/alerts`, `/rules` jurisdiction
table, `/preview` gallery, DESIGN §4.11 + new `filter-dropdown-cohesion-2026-06-22.md`

A cross-surface audit of every filter / sort / scope dropdown found the core
primitives (`FilterTrigger`, `TableHeaderMultiFilter`, `Segmented`) were sound
but cohesion broke at the edges: the same job was solved differently per surface,
the consolidated "Filters" trigger had a different label + treatment everywhere,
sort had no fixed home, and `/audit` used native `<Select>` form boxes next to
pills. This sweep converges everything onto the pill vocabulary.

## New / changed primitives

- **`SingleSelectFilter`** (new) — the `FilterTrigger` pill +
  `DropdownMenuRadioGroup` body, extracted. Was hand-rolled inline on each
  surface (which let drift creep in — e.g. a stray `text-base` override). Options
  take `icon` + `count` + `triggerLabel` (short value for the pill);
  `size="sm"` for narrow rails; `active` defaults to "value ≠ first option".
- **`FilterTrigger`** — added `count` (renders the canonical accent-solid count
  badge in the value slot — the shared "N filters on" read for consolidated
  Filters triggers) and `size` (`default` h-9 / `sm` h-7, the rail's compact
  form as a first-class variant).

## P0 — `/audit` toolbar → pills

- Category + Time range: native `<Select>` → `SingleSelectFilter` pills
  (`Category │ All ⌄`, `Range │ All time ⌄`). Zero native select triggers remain
  in the toolbar.
- Filters trigger: dropped the `text-base` override, uses `count`.
- Clear: `variant="outline"` + `FilterIcon` → canonical ghost "Clear filters".
- The Action/Actor/Entity selects _inside_ the Filters popover stay native
  `<Select>` (popover internals aren't toolbar pills; native select-in-popover
  avoids dropdown-in-popover focus traps).

## P1 — consolidated Filters bundle + sort

- `/deadlines` "Filter" → "Filters"; removed border-override + `font-semibold` +
  `hideChevron` + manual count Badge → `count` prop. `/alerts` + `/rules` →
  `count`; `/rules` gained the shared `SlidersHorizontalIcon`. `/audit` dropped
  `text-base`. Every Filters pill now reads `⚙ Filters │ [N] ⌄` identically.
- Sort: `/alerts` + `/deadlines` toolbar Sort → `SingleSelectFilter`. `/rules`
  keeps sort folded into Filters (documented compact-toolbar exception);
  `/deadlines` column-header click-sort is the separate `SortableHeader`
  affordance.

## P2 — active-state + heights

- Active reads consistently via accent-hover **bg** (the per-caller border /
  weight / text-color overrides are gone). The h-10 native selects on `/audit`
  are gone. Rail compact height is now `size="sm"`, not a className hack.

## P3 — hand-rolled chips → primitive

- `/alerts` Morning-sweep token: `rounded-xl` + `text-base` + accent border →
  pill spec (`rounded-full`, 13px, `border-divider-regular`, accent bg). Stays a
  span + inner `×` (it dismisses, not opens; a button-in-button would be
  invalid).
- `/deadlines` rail: Sort → `SingleSelectFilter size="sm"`; Status hand-rolled
  `<button>` → `FilterTrigger size="sm"` (collapses to icon-only at rest via
  empty children, names the active status when filtered).

## Verification

- `vp check` clean on all touched files (worktree baseline unchanged).
- `/preview` gallery: new `SingleSelectFilter` + `FilterTrigger count` + `sm`
  specimens render at correct dims (h-36/13px default, h-28/11px sm, count badge).
- `/audit` live: toolbar shows `Category │ All`, `Range │ All time`, `Filters`,
  ghost Clear; **0** native select triggers; Category dropdown opens a radio
  group; selecting a value sets `data-active` + enables Clear + updates the URL.

## Open follow-up (IA call for Yuqi)

`/alerts` renders a List/Map `Segmented` in both the PageHeader (labelled) and
the list toolbar (icon-only, `size="lg"`) bound to the same `viewMode` — two
toggles, two heights. Left as-is pending a decision on whether to drop one.
