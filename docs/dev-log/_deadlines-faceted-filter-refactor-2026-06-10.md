# Deadlines filter UX → faceted Filter sheet + inline active chips

**Date:** 2026-06-10

## Problem

The /deadlines "Quick filters" dropdown (`routes/obligations.tsx`,
`ObligationFiltersPopover`) dumped EVERY facet value as a flat wall of toggle
chips — every form code under FILING (~18), every client under CLIENT, every
state under STATE. It didn't scale: a practice with 50 forms / 200 clients
faced an unbrowsable chip wall, and Assignee / County dimensions weren't
surfaced at all even though the facets RPC already returns them with counts.

## Canonical design

Matched the Pencil "B · Minimal" toolbar (`a7BILH`) and its Filter SHEET
(`MdCKL`): a single Filter button + active chips inline in the toolbar, with
the sheet structured as **header · tab strip · searchable body · Reset/Apply
footer**. Saved-view presets live INSIDE the sheet's tab strip, never noisy in
the toolbar.

## What changed (only `routes/obligations.tsx`)

1. **Toolbar Filter button** — `ObligationFiltersPopover` now renders a single
   `FilterTrigger` ("Filter" + `SlidersHorizontal` icon + active-count badge,
   chevron suppressed). The flat-chip popover body is gone.

2. **Faceted Filter sheet** — opens from the button as a 560px popover shell
   (`p-0 gap-0`, `rounded-xl`, blur-24 `shadow-overlay` — the design's allowed
   floating-popover lift). Four bands matching `MdCKL`:
   - **Header**: "Filters" title + staged-count pill + an Esc affordance.
   - **Tab strip**: one tab per facet dimension — Form / Client / State /
     Assignee / County — plus a **Condition** lens (Due window + triage
     toggles) and a **Saved views** tab. Active tab carries the 2px bottom
     rule + count badge (`xrMoD`).
   - **Body**: each facet tab is a `ObligationFacetSearchList` — a **cmdk
     `Command` typeahead** that narrows checkbox rows (leading checkbox +
     label + trailing per-value count), so each dimension scales past a chip
     wall. Condition renders single-select Due-window pills + orthogonal
     Needs-evidence / Awaiting-signature toggles. Saved views renders preset
     shortcut rows.
   - **Footer** (`bg-background-section`): staged summary + Reset on the left,
     Cancel / Apply on the right.

3. **Staged → Apply commit model**: selections are staged in local state
   (re-seeded from the URL each time the sheet opens) and only written to the
   URL on **Apply** as a single `setObligationQueueQuery` patch. **Reset**
   clears the stage; **Cancel** / close discards it.

4. **Inline active-filter chips** — new `ObligationActiveFilterChips` row under
   the toolbar (`AzLvC`). One removable chip per applied value
   ("Form · 1040 ✕", "Client · Arbor & Vale ✕"), each emitting the canonical
   `[] → null` clear patch, plus a trailing "Clear all". Reads from the same
   URL params the sheet writes, so chips and sheet stay in lock-step.

## What was reused

- **`SearchableCombobox`'s underlying cmdk `Command` primitive** (`Command`,
  `CommandInput`, `CommandList`, `CommandItem`, `CommandEmpty`) for the
  per-facet typeahead — no hand-rolled typeahead. (The combobox itself is
  single-select; the facet lists are multi-select, so the shared primitive is
  the right reuse layer.)
- **`FilterTrigger`** pattern primitive (same trigger chrome as
  AlertsListPage), **`Popover*`**, **`Button`**, **`TextLink`**.
- **Existing facet data sources**: `taxTypeOptions` / `clientOptions` /
  `stateOptions` already in the route; added `assigneeOptions` /
  `countyOptions` derived from the same `obligations.facets` RPC
  (`assigneeNames` / `counties`, both with real counts) via the existing
  `facetOptionToFilterOption` adapter.
- **Param contract unchanged** — Apply writes the same params the old controls
  used (`taxType` / `client` / `state` / `assignees` / `county` arrays,
  `due` / `daysMax` for the Due window, `evidence` / `awaitingSignature` for
  triage). No parser changes; all 55 `obligations.test.ts` cases pass.

## No fiction

Every facet value + count traces to the real facets RPC. Saved-view presets
are thin shortcuts over those same real params (Past due / Due this week /
Needs evidence / Awaiting signature) — no projected ETAs, no invented values.

## Notes / not matched

- The Pencil mock's right-hand "Presets" column sits beside the facet list in a
  two-column body; the live build puts presets in their own **Saved views tab**
  instead (cleaner at the 560px width and keeps each tab single-purpose).
- "Save current view" remains the existing toast stub in the View menu — saved
  views are surfaced (presets) but persistence is still out of scope.

## Verify

- `tsgo --noEmit` reports zero errors in `obligations.tsx` (one pre-existing
  `dashboard.tsx` error on `main` is unrelated).
- `pnpm test src/routes/obligations.test.ts` → 55 passed.
