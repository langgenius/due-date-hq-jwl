# Eightieth pass — /deadlines table-card refactor

**Date:** 2026-05-26
**Branch:** `design/filed-strip-dedup`
**Scope:** Refactor the /deadlines table structure so the table +
pagination form a single bordered card that owns its own height
contract, and the responsive page-size hook measures THAT card
instead of the surrounding queue column. Addresses Yuqi: "you
might need to refactor the page structure or the table
structure/pagination framing."

## Why the patch was insufficient

Before this refactor the structure was:

```
<queue-column ref={queueScrollRef} overflow-y-hidden>
  <filter-scope-tabs />
  <filter-chips />
  <Table />          ← rounded-t-md, border, border-b-0
  <Pagination />     ← rounded-b-md, border (separate sibling)
</queue-column>
```

`useResponsivePageSize` measured `queueScrollRef.clientHeight`,
then subtracted `INSIDE_CHROME_PX` (a magic number trying to
approximate filter bars + TableHeader + pagination).

Two problems:

1. **Magic-number drift.** The "chrome" varied with filter-bar
   wrap: at narrow widths the filters wrapped to two lines and the
   actual chrome was ~250px, but the constant was 180 → page size
   picked one row too many → 1px of overflow → phantom scrollbar.
2. **Visual frame was glued together with matching borders.** The
   Table and pagination shared a `border-divider-subtle` color and
   complementary corner radii, but they were JSX siblings. Any
   layout change to one risked desyncing the visual seam.

The earlier patch (bumping the chrome budget to 240 + switching
`overflow-y-auto` → `overflow-y-hidden`) papered over the magic-
number drift but left the structural fragility in place. Yuqi's
follow-up: "you might need to refactor the page structure or the
table structure/pagination framing."

## What landed

A real **table-card** wrapper that owns the bordered frame, the
rounded corners, AND the height contract that page-size measures.

```
<queue-column overflow-hidden>           ← no ref, no scroll
  <filter-scope-tabs />
  <filter-chips />
  <table-card ref={tableCardRef}         ← measured for page size
    flex-1 min-h-0
    flex flex-col
    rounded-md border border-divider-subtle
    overflow-hidden
  >
    <Table border-0 rounded-none />      ← frame moved to wrapper
    <Pagination border-t />              ← only the separator
  </table-card>
</queue-column>
```

### Concrete changes

- **`tableCardRef`** replaces `queueScrollRef`. Declared next to
  `useResponsivePageSize` and attached to the new wrapper.
- **`INSIDE_CHROME_PX`** dropped from 240 → 96. The chrome being
  subtracted is now just TableHeader + Pagination + borders
  (stable, doesn't vary with filter-bar wrap). Smaller and more
  reliable budget.
- **Queue column** no longer carries the scroll ref. Its only
  responsibility is layout (filter bars stacked vertically). It
  gets `xl:min-h-0 xl:overflow-hidden` so the table-card slot
  can `flex-1 min-h-0` correctly.
- **Table** drops `rounded-t-md rounded-b-none border border-b-0`
  (frame moved to wrapper). Now `rounded-none border-0`.
- **Pagination** drops `rounded-b-md border border-divider-subtle`
  (frame moved to wrapper). Keeps `border-t` for the
  separator hairline above the strip.
- **Wrapper** owns `overflow-hidden` — safe because no descendant
  uses `position: sticky` any more. The pagination is a plain
  block at the bottom of the card, naturally hitting the
  rounded-b corner via the wrapper's clip.

## Why measuring the card (not the column) is correct

`useResponsivePageSize` needs to answer: "how many rows fit in the
slot where rows go?" That slot is the table-card minus its own
chrome (header + pagination). It's NOT the queue column minus
header + pagination + filter bars + the gap-3 between filter bars

- borders.

By moving the measurement to the table-card:

- The chrome math is stable (filter bars don't affect it).
- The math is small enough that small per-machine differences
  (sub-pixel line heights, scrollbar gutter, browser zoom) don't
  push the result off by a row.
- Filter bars can grow/wrap freely without breaking page-size.

## What still needs Yuqi's signoff

The sort PRD (`docs/PRD/deadlines-sort-by.md`) is still
unanswered:

1. Sort-by-Client: section headers, or just the existing 2px-rail
   clustering?
2. Status order: `not_started → blocked → …` (recommended) or
   `blocked` first?
3. Scope: Option A (client-side, MVP) vs Option B (server-side,
   future)?

Once those three are confirmed I can land the sort fix as a
follow-up pass.

## Verification

- `pnpm check` — 0 errors, 9 pre-existing warnings (unchanged).
- Browser verification deferred — Yuqi is iterating with her own
  screenshots. The refactor should be visible immediately on
  `/deadlines` after HMR picks up the change: the table+pagination
  read as one rounded-bordered card, page flips between pages
  without any scrollbar, and the count of rows on each page
  matches the height of the card slot.

## Result

The /deadlines table is now a real card with a real height
contract. The page-size hook measures the slot where rows go —
not "queue column minus a guess." The pagination is the card's
footer, sharing the rounded-b corner via the wrapper's clip. No
scrollbar, no phantom horizontal scroll, no sticky positioning
games. Filter bars can grow/wrap without breaking the math.
