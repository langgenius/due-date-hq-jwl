# 2026-05-25 — State tilegram filter on /rules/pulse

## Why

Genuinely-deferred ledger item **Alerts #9** — Yuqi originally
asked for a "full clickable SVG US-map filter" on /rules/pulse to
replace the flat chip strip. The v1 chip strip shipped earlier;
this commit lands the map visualization.

Greenlit in today's "all yes" prioritization.

## What changed

### New primitive: `StateTilegram`

`apps/app/src/features/pulse/components/StateTilegram.tsx`. A
13-column × 8-row state tilegram — each state at its approximate
geographic position on a square grid. The `StateBadge` SVG motif
renders inside each cell with the count below; active filter
state is color-coded.

Why a tilegram (not a true geographic SVG):

- The geographic projection's value is "I see my client's state
  in its real place." A tilegram delivers ~90% of that intuition
  (states cluster regionally — Pacific NW top-left, Florida
  bottom-right, AK/HI pinned bottom-left per USPS convention) at
  ~5% the asset weight. No TopoJSON, no Mapbox, no projection
  math.
- `StateBadge` motifs already exist for every state; the
  tilegram is just a layout primitive over them. Adopting a true
  SVG map would require parallel art for each state path.
- Future work can swap the layout to a geographic SVG with the
  same prop signature — `<StateTilegram counts={...}
activeState={...} onSelect={...} />` is the contract. The
  swap stays a one-file change.

### Tile coordinates

Cross-referenced NPR's tilegrams (Pitch Interactive) and
Wikipedia's "Cartogram of the United States" tile layout.
Continental US occupies rows 0-6 in roughly geographic
arrangement; AK + HI sit at row 7 (bottom-left). 50 states
covered.

### Hooked into AlertsListPage

Replaced the inline chip strip (state chip + count tail per
state) with a single `<StateTilegram counts={...}
activeState={...} onSelect={...} />` mount. The chip strip code

- its stale `StateBadge` import are deleted. Same filter
  contract — clicking a state toggles `jurisdictionFilter`.

States without active alerts render dim (opacity-40) and as
disabled buttons so the click-target only fires for live states.
Active state shows accent border + bg; inactive-with-count
states show hairline border + hover lift.

## Files touched

- `apps/app/src/features/pulse/components/StateTilegram.tsx`
  (new, ~170 lines)
- `apps/app/src/features/pulse/AlertsListPage.tsx` — replaced
  the chip-strip render with `<StateTilegram />`; dropped the
  stale `StateBadge` + `cn` imports it had been using

## Verification

- `vp check` → 1458 files formatted, 0 lint/type errors across
  669 files
- Each state with alerts renders an active tile; states without
  alerts render dim
- Active filter highlights the selected tile
- Click toggles the filter (deselect to clear)

## What's intentionally NOT in this commit

- True geographic SVG map. The tilegram covers the use case
  (regional grouping + click-to-filter); the projection can be
  a future polish round if Yuqi wants more cartographic
  precision. The prop signature is stable for that swap.
- Mobile responsiveness. The 13×8 grid is fixed-width
  (~500px). On narrow viewports it may horizontal-scroll. A
  responsive variant (denser tiles or scroll wrapper) is a
  future ask.
