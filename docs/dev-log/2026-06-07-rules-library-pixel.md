# Rules library pixel pass — jurisdiction rail + KPI strip (Pencil O0pyRO)

Date: 2026-06-07

First pixel pass on the Rules library (Pencil cluster H).

## Shipped

- `apps/app/src/features/rules/states-rail.tsx` — rail restyled to the Pencil
  `PH-SecondarySidebar`: "RULE LIBRARY" eyebrow + "Jurisdictions" title, search
  pill, icon-led nav rows (layout-dashboard / landmark / map-pin + mono counts),
  FEDERAL / STATES section labels, accent active-Overview vs quiet selected-state,
  "Showing N of M states" footer. Props/behavior unchanged.
- `apps/app/src/features/rules/jurisdiction-rule-table.tsx` + `rules.library.tsx`
  — new `JurisdictionKpiStrip` (Total / Effective / Pending / Deprecated) above
  the per-jurisdiction table, counts from the existing status breakdown.

Canvas hexes mapped onto tokens (no new theme colors).

## Deferred to a follow-up (tracked)

The Overview right pane (ActionHero + status-coverage + recent-changes cards),
the Sources view (`bf6Ni`), and the rule detail drawer (`DvLC9`) are large
fully-wired surfaces — restyled in a dedicated follow-up pass that preserves
their behavior.

## Verify

- tsgo 0; rules tests 23/23; `vp check` 0 errors
