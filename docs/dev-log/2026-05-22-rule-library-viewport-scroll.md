# Rule Library viewport scroll

**Date:** 2026-05-22

## Change

Rule Library now locks its route shell to the viewport and lets the coverage
table own the remaining-height scroll region. The page-level summary strips stay
fixed in the work surface, while the table scrolls internally instead of
stretching the outer Rule Library page beyond the screen.

## Implementation Notes

- `RulesPageShell` accepts an opt-in `lockViewport` mode for route surfaces that
  should not create a second page scroll.
- `CoverageTab` accepts `fitViewport`; Rule Library uses it so the coverage map
  frame becomes a flex child with `overflow-auto`.
- The default CoverageTab behavior is unchanged for callers that still want
  page scrolling.

## Docs Alignment

This aligns with the existing workbench-table guidance in `DESIGN.md`: one
viewport, dense table scanning, and internal table scrolling without adding new
navigation or content semantics.

## Validation

- `pnpm --filter @duedatehq/app test -- --run src/features/rules/coverage-tab.test.tsx`
