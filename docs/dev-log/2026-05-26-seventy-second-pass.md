# Seventy-second pass — Rule library "product feel" sweep

**Date:** 2026-05-26
**Branch:** `design/filed-strip-dedup`
**Scope:** Pull /rules/library the rest of the way into the
product family. The seventy-first pass landed the canonical title
chip; this pass closes the two remaining gaps I'd flagged:
StatsBar's scoreboard chrome and the standalone active-filter
banner.

## What was off

The library had a stack of chrome above its table that no other
list page carried:

1. A 28px-tall green/amber progress bar showing
   `active vs needs-review` split
2. A 3-tile scoreboard: `Total | Missing | Watched`
3. A search input
4. An entity-filter chip row
5. A standalone "Filtering: ENTITY · N rules · Clear" banner when
   a chip was active

Five surfaces of header before the table even started. /deadlines
and /alerts both have just two (search/filters + chip row). The
library felt like a different product because it WAS shaped like
one — a dashboard widget instead of a list view.

## What changed

### StatsBar — dropped the scoreboard

Retired:

- The progress bar (active/needs-review split)
- The 3-tile `StatTile` grid (Total / Missing / Watched)
- `StatTile` and `StatTileSkeleton` components (kept in git
  history if a future surface wants them back)

The information they carried didn't disappear; it moved to
canonical spots:

- **Total rules** → the page-header title chip (`N rules`) from
  the seventy-first pass.
- **Pending review count** → the "Start review" header CTA
  already carries it as an inset chip.
- **Watched (Sources)** → promoted from a clickable StatTile to
  a dedicated `<Sources>` button in the header action cluster
  (with the `RadioTowerIcon` glyph). Discoverable, follows the
  same outline-button shape as `Export`.
- **Missing / gaps** → already surfaced inline in the
  `EntityChipRow`: each chip shows its own gap count as a small
  destructive-tone badge when N > 0. Per-entity gap visibility
  is more useful than the bare aggregate anyway.

StatsBar now hosts ONLY the search input and entity chip row.
Two rows of header, matches /deadlines + /alerts.

### Active-filter banner — retired

The standalone "Filtering: ENTITY · N rules apply · Clear" banner
was a third surface saying what the EntityChipRow already
communicated:

- The active chip is rendered in filled-dark state — visibly
  selected
- The EntityChipRow header has its own inline `Clear` link when
  any chip is active

The banner was duplicate signal. Dropped. /deadlines and /alerts
both drive filter state from inline chip toggles without a
separate banner; Rule library now matches.

### Export icon — convention alignment

`DownloadIcon` (arrow down to disk) → `ArrowUpRightIcon` (arrow
up + out — data LEAVING the app). Matches the /deadlines export
button from the seventieth pass.

### Header actions — promoted "New rule" to primary

Previously both `Export coverage` and `New rule` were outline
buttons. `New rule` is the primary CTA on this page (the page is
the catalog editor); promoted to filled-default button. Same
shape as the "+ New client" split-button on /clients.

Final header action cluster (right to left in rendered order):

```
[ Start review (N) ]  [ + New rule ]  [ ↗ Export coverage ]  [ ⌖ Sources ]
   primary, only         primary           outline                 outline
   when reviews
   pending
```

## What didn't change (deliberate)

- **Table** — already aligned to /deadlines in the sixty-ninth
  pass (TableHead default style, bg-subtle header).
- **EntityChipRow** — already does what it should; the chip
  itself communicates filter state.

## Verification

- `pnpm check` — 0 errors, 9 pre-existing warnings (unchanged).

## Result

The library now has the same shape as /deadlines + /alerts:

```
[Page header]   title · count chip · [actions]
[Search bar]
[Entity chip row]
[Table]
```

Where /deadlines has scope tabs + filter chips instead of the
entity row, and /alerts has state filters instead. Same skeleton,
different filter primitives per domain.
