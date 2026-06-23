# Filter-dropdown cohesion sweep

**Date:** 2026-06-22
**Owner:** Yuqi
**Status:** Authoritative. Codified into `DueDateHQ-DESIGN.md` §4.11 (the
enforceable primitive index). This doc is the audit + rationale behind that
index change.

## Why

A cross-surface audit of every filter / sort / scope dropdown (`/deadlines`,
`/alerts`, `/clients`, `/sources`, `/rules` library + sources, `/audit`) found
the core vocabulary was sound (`FilterTrigger`, `TableHeaderMultiFilter`,
`Segmented` are real primitives and most surfaces used them) but cohesion broke
at the edges — the same job was solved a different way on nearly every surface,
and `/audit` spoke a different control language entirely (native `<Select>` form
boxes next to pills).

## The canonical vocabulary (after the sweep)

| Job                             | Primitive                               | Trigger reads as                                       |
| ------------------------------- | --------------------------------------- | ------------------------------------------------------ |
| One-value filter                | `SingleSelectFilter`                    | `Label │ Value ⌄` pill                                 |
| Sort picker                     | `SingleSelectFilter` (`active={false}`) | `Sort by │ Newest ⌄` pill                              |
| Multi-select facet (standalone) | `TableHeaderMultiFilter`                | `Label [count] ⌄` pill                                 |
| Consolidated "Filters" bundle   | `FilterTrigger` + popover, `count` prop | `⚙ Filters │ [N] ⌄` pill                               |
| Scope / view toggle (≤3–4)      | `Segmented`                             | inline segments                                        |
| Clear all                       | `Button variant="ghost"`                | "Clear filters" (always rendered, disabled when empty) |

Rules:

1. **One label, one model.** The consolidated bundle is always labelled
   **"Filters"** (plural), always `SlidersHorizontalIcon` + the accent-solid
   `count` badge + chevron. No per-caller `border` / `font-weight` / `text-base`
   overrides.
2. **Active = bg, not border.** A filter reads "on" via the FilterTrigger's
   accent-hover background. Never a per-caller accent border, text-color shift,
   or weight bump.
3. **Sort is a peer pill** (`SingleSelectFilter`) on roomy toolbars. On a
   space-constrained table toolbar it may fold into the Filters dropdown as a
   radio group (`/rules`) — a documented compact exception. `/deadlines`
   column-header click-to-sort is a separate in-column affordance (the
   `SortableHeader` primitive), not a competing toolbar control; the toolbar
   "Sort by" pill is the _grouping/clustering_ axis.
4. **No native `<Select>` for toolbar filters.** Form selects belong in forms,
   not the filter bar. (`/audit` Category + Range converted.)
5. **Narrow rails use `size="sm"`** on the primitive, not a hand-rolled h-7
   button or className override.

## live-vs-apply (documented exception, not drift)

Small popovers apply **live** (`/alerts`, `/rules`, `/audit` refine facets).
Only the `/deadlines` 560px multi-facet **sheet** (tabs + saved views) keeps a
staged **Apply / Reset** footer — committing 5 facets at once warrants an
explicit commit. This is intentional and scoped to that one heavy editor.

## What changed (P0–P3)

- **P0 — `/audit` toolbar → pills.** Category + Range: native `<Select>` →
  `SingleSelectFilter`. Filters trigger: dropped `text-base`, uses `count`.
  Clear: outline+`FilterIcon` → canonical ghost. (The Action/Actor/Entity
  selects _inside_ the Filters popover stay native `<Select>` — popover internals
  are not toolbar pills, and a native select inside a popover avoids
  dropdown-in-popover focus traps.)
- **P1 — Filters bundle.** `/deadlines` "Filter" → "Filters"; removed
  border-override + `font-semibold` + `hideChevron` + manual count Badge → uses
  `count`. `/alerts` + `/rules` → `count` prop; `/rules` gained the shared slider
  icon. `/audit` dropped `text-base`.
- **P1 — Sort.** `/alerts` + `/deadlines` toolbar Sort → `SingleSelectFilter`
  (erases the `text-base` drift on `/alerts`).
- **P2 — active-state + heights.** Active overrides removed (see P1); the h-10
  native selects on `/audit` are gone; rail compact height is now a first-class
  `size="sm"` variant.
- **P3 — hand-rolled chips.** `/alerts` Morning-sweep token aligned to the pill
  spec (rounded-full, 13px, divider border, accent bg — a removable span+×, not a
  `FilterTrigger`, since it dismisses rather than opens). `/deadlines` rail Sort →
  `SingleSelectFilter size="sm"`; rail Status hand-rolled `<button>` →
  `FilterTrigger size="sm"` (icon-collapses at rest via empty children).

## New / changed primitives

- **`SingleSelectFilter`** (`patterns/single-select-filter`) — new. The
  `FilterTrigger` pill + `DropdownMenuRadioGroup` body, extracted.
- **`FilterTrigger`** (`patterns/filter-trigger`) — added `count` (consolidated
  count badge) and `size` (`default` | `sm`).
- Specimens for both live in the `/preview` gallery → Table patterns section.

## Open follow-up (not done — IA call for Yuqi)

`/alerts` renders a List/Map `Segmented` in **both** the PageHeader (labelled,
default size) and the list toolbar (icon-only, `size="lg"`), bound to the same
`viewMode`. Two toggles, two heights. Left as-is pending a decision on whether to
drop one (needs a live look at whether they co-occur).
