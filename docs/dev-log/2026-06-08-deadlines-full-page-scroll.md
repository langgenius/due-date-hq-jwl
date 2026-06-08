# 2026-06-08 — /deadlines: full-page scroll (was inner-table scroll)

## Feedback

"should be scroll the full page, it is a table scroll and the top card row
collapses." The queue scrolled _inside the table_ while the at-a-glance +
toolbar stayed fixed. Yuqi wants the whole page to scroll as one, with the
top card row collapsing as it goes.

## Why it was an inner-table scroll

At xl+ the page container was `xl:h-screen xl:overflow-hidden` and the table
sat in its own `overflow-y-auto` column — a deliberate "page-flip" layout
that exists for the **detail-panel split** (the panel needs a full-height
side rail). So the inner scroll is load-bearing _only_ in the panel-open
state.

## Change — full-page scroll when the panel is closed, split preserved when open

All gated on `panelOpenIntent`:

- Outer page container: `xl:h-screen xl:overflow-hidden xl:pb-0` → panel-open
  only. Closed, the page flows to natural height and the app-shell `<main>`
  scrolls the whole thing (like /today + /alerts).
- Split row + queue column: `xl:min-h-0 xl:flex-1` and `xl:overflow-hidden`
  → panel-open only. An `overflow:hidden` ancestor scopes `position: sticky`
  to itself, which was stopping the filter toolbar from pinning to the page;
  removing it (closed) lets the sticky toolbar pin to `<main>`. The
  horizontal clip switched `overflow-x-hidden` → `overflow-x-clip` so it
  can't force `overflow-y` back to `auto` (which would re-create a vertical
  scroll container).
- Table inner scroll (`overflow-y-auto flex-1 min-h-0`): panel-open only.
- Column header `sticky top-0`: panel-open only — full-page mode lets it
  scroll away so it never collides with the sticky filter toolbar.
- Infinite-scroll IntersectionObserver root: `panelOpenIntent ?
scrollContainerRef.current : null` (viewport in full-page mode).
- At-a-glance collapse: moved back into the component, listening to its
  nearest scroll ancestor (now `<main>`, found by overflow-y alone so mount
  timing doesn't matter). Removed the route-level `onScroll`/`collapsed`
  prop. `computeResponsivePageSize` is already clamped to 40, so full-page
  mode doesn't over-fetch.

## Follow-up — "the filters and selections are sticky on top"

On full-page scroll the status filter bar AND the table column header (the
select-all checkbox + sort/filter controls) must both pin to the top,
stacked. Changes:

- The sticky filter bar gets a live height measurement (`ResizeObserver` →
  `filterBarHeight`) — it wraps responsively, so the offset can't be
  hard-coded — and an opaque `bg-background-default` (full-page only) so rows
  scrolling behind it don't show through. Bumped to `z-20`.
- The `<TableHeader>` is sticky again: `top-0` inside the panel-open split,
  but `style={{ top: filterBarHeight }}` in full-page mode so it pins right
  below the filter bar (`z-10`, under the bar's `z-20`).
- **Key fix:** the table-card wrapper's `overflow-hidden` was scoping the
  sticky header to the card (so it scrolled away). Made the whole card chrome
  (`min-h-0 flex-1 overflow-hidden rounded-xl border`) panel-open-only — in
  full-page mode the table flows borderless and the header pins to the page.
  Result (scrolled): filter bar at `top:0`, header at `top:37` directly below
  it, rows scrolling under. Secondary quick-filter chips scroll away.

## Verify

- Panel **closed**: `<main>` scrolls the whole page; the filter toolbar pins
  at top with the column header stacked right below it; the at-a-glance
  collapses past 40px and re-expands under 8px; no horizontal scroll; queue
  column `overflow-y: visible` (not an inner scroller).
- Panel **open**: the constrained split is back (full-height detail rail,
  ~808px); the queue scrolls in its own container; observer re-roots.
- `tsgo` app typecheck clean; scoped `vp lint` 0 errors (1 pre-existing
  `columnOrder` assertion warning in the route, untouched).
