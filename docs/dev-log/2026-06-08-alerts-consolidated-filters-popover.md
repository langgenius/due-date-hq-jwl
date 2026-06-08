# /alerts — consolidate Severity / Change type / Tax area into one Filters popover

Date: 2026-06-08

Feedback: *"i am thinking to put severity, changes types, tax areas into
filters. to clean up the space."*

## Change (`AlertsListPage.tsx`)

- Replaced the three separate filter dropdowns (Severity, Change types, Tax
  area) with a single **Filters** popover (`AlertFiltersPopover`). The
  trigger reuses the canonical `FilterTrigger` (sliders icon) and shows a
  count of how many of the three facets are active.
- Inside, each facet renders as a labeled **pill section**
  (`FilterPillSection`) — an uppercase label over a wrap of single-select
  pills (active pill takes the accent wash). Reuses the existing option
  arrays + humanized label helpers (`impactFilterLabel` /
  `changeKindFilterLabel` / `taxAreaFilterLabel`), so nothing about the
  underlying filter logic changed.
- A "Clear these filters" link resets all three at once (only shown when
  any are active).
- The filter row now reads **Search · List/Map · Filters · State · Sort**
  (plus the history-only Status dropdown, which stays separate). Time range
  ("All time") and State were left as their own controls — the feedback
  named only the three facets.
- Dropped the now-unused `isAlertImpactFilter` / `isChangeKindFilter` /
  `isTaxAreaFilter` imports (the pill `onSelect` calls are already typed, so
  the runtime guards aren't needed).

Typecheck + lint clean.

## Preview note

Could not visually verify: the shared `:5177` dev server's HMR is wedged on
an unrelated syntax error in the `ddhq-deadlines-parity` worktree
(`deadlines-at-a-glance.tsx:207 Unexpected token`), so it's still serving a
pre-change build. Verified by typecheck + lint + source review instead.
Once that file is fixed (or the server restarted from this worktree), the
consolidated Filters control will render.
