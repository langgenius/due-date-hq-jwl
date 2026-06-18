# StatBand color budget (von-Restorff)

_2026-06-18 · design-call #3 of the pass-2 backlog_

`StatBand` exposes free-form `valueClass`/`subClass` per column, so callers can
color every column — which dilutes the signal (if everything's colored, nothing
stands out). The pass-2 audit flagged `rules.library`'s band specifically.

## What I found

The values were already neutralized (2026-06-16) with tone moved to the sub. But
the **Total** column's sub still carried an **always-on `text-text-accent`**,
while the other three (Pending review / High-severity / Coverage) color
_conditionally_ — amber only when there's work. An always-on accent on the
non-actionable vanity total is exactly the dilution von-Restorff warns about.

## Fix

- `rules.library` Total sub: `text-text-accent` → `text-text-tertiary` (neutral).
  The anchor stat orients; it isn't a call to action.
- Codified the **color budget** in the `StatBand` JSDoc: value stays neutral
  (tone in the sub); anchor/total stats stay neutral; reserve color for
  conditionally-actionable stats (amber only when count > 0); one steady
  positive-green KPI is fine but don't paint the expected/dominant column.

Left as-is (within budget): `AlertHistoryView` (positive-green Applied +
conditional-amber Reverted, 2/5) and `JurisdictionKpiStrip` (effective-green +
conditional pending) — distinct hues, not competing urgency signals, not the
flagged dilution.

## Verification

- `tsgo` 0; 543 app tests pass; build green. (rules.library is gated; the change
  is a single tone-class swap, type-checked.)
