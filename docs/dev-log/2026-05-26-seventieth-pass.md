# Seventieth pass — 19-item /deadlines round

**Date:** 2026-05-26
**Branch:** `design/filed-strip-dedup`
**Scope:** Yuqi's 19-item round across the obligation drawer and
the /deadlines page. Honest accounting at the bottom of what's
deferred.

## Panel animation (#1)

Row-switch was running a 200ms slide + fade (`x: 6 → 0` plus
opacity). Yuqi: "only big animation on expand/collapse; switching
between rows should be smooth, small animation."

- Dropped the x-translation entirely.
- Tightened durations: enter 120ms, exit 80ms.
- Pure crossfade now. The big width + paper-rise animations on
  open/close are untouched.

## Deadline strip (#2, #3, #4, #14)

Rebuilt `PrimaryDeadlineStrip` from "hero + 2-tile grid" into a
unified `grid grid-cols-3` of equal tiles (item #14). All three
deadlines (Filing / Internal / Payment) now share the same shape;
Filing sits first as the primary anchor.

- **#2 text size**: filing date dropped from `text-2xl` → `text-base
font-semibold`. The hero's `text-2xl` was the biggest text in the
  entire panel; it overshadowed the H1 form name above.
- **#3 too much red**: hero's filled-red destructive surface
  retired. The missed-state tile now wears a bordered red tone
  (destructive border + tinted bg + red value) — strong enough to
  signal "this is late" without a wall of red.
- **#4 relationship to header "70 days overdue"**: the inner
  `<Badge>MISSED</Badge>` is gone. The header pill alone carries
  the textual lateness count; the strip's tone is the visual cue.
  Two surfaces saying "MISSED" + "70 DAYS OVERDUE" was the
  ambiguity Yuqi flagged.
- New helper component `DeadlineTile` so the three columns share
  one source of truth — surface tone + value tone are independent
  knobs, so non-missed rows can still flag a single past tile in
  red without painting the whole surface red.

## Summary tab icon (#5)

Dropped the leading `Info` glyph from the Summary tab trigger. The
word alone reads as "this is the summary"; the icon implied "info
about the summary." Other tabs (Materials, Extension, Evidence)
keep their icons because they distinguish by purpose
(paperclip / calendar / file).

`Info` import removed from the file.

## Materials tab hierarchy (#6, #7, #9, #10)

- **#6 title hierarchy**: "Materials checklist" promoted from
  `text-sm font-medium` (small h3) → `text-base font-semibold`
  (real section title). "Outstanding" / "Received" subsections
  stepped down from `text-sm font-semibold` h3 → `text-caption-xs
font-medium uppercase tracking-wider` kicker h4 — same pattern
  the Rule library's "NEEDS REVIEW" sub-headers use, which Yuqi
  pointed at as the reference.
- **#7 number in a frame**: count chips (parent count + sub-section
  counts) now sit in a small rounded `bg-background-subtle` frame
  instead of as raw mono digits. Matches the convention Yuqi
  called out as "common way of representing number."
- **#9 smaller gap**: section inner gap `gap-2 → gap-1.5`; checklist
  row grid `gap-2 → gap-1.5`. Tighter density without cramping.
- **#10 remove top border**: drawer sticky footer dropped
  `border-t-2 border-divider-regular`. The body's natural pb-24
  spacing plus the white footer bg is enough delimiter — the heavy
  rule above the "Last updated" line read as a wall.

## /deadlines page (#16, #17, #18, #19)

- **#16 number-first title**: PageHeader now reads `17 Deadlines`
  instead of `Deadlines 17`. English-math order — the count is the
  quantifier, the noun follows. Linear / GitHub / Notion all use
  this for list headers ("12 Issues", "3 PRs").
- **#17 Export arrow direction**: `DownloadIcon` (arrow down to
  disk) → `ArrowUpRightIcon` (arrow up + out — data LEAVING the
  app). Matches the convention used in Linear / Notion / Figma.
- **#18 pagination not pinned to bottom**: `sticky bottom-0` →
  `sticky bottom-[60px]`. The footer lifts 60px off the viewport
  floor — gives the eye room and a clear "table ends here" cue.
- **#18 cont. drop top border**: pagination footer's `border-t
border-divider-subtle` dropped. With the 60px lift, the
  hairline above looked like a floating rule disconnected from
  the table content.

## Deferred — honest list

Three items I did NOT fully close this round:

1. **#8 ReadinessOverview overlap** — I didn't get to investigate
   what specifically overlaps with the following content. Need to
   spot which two elements are colliding before I can fix it.
2. **#11 "what is this for"** — pointing at something in the
   Summary tab content. Without knowing which specific element you
   meant, I can't safely cut or relabel it.
3. **#12 "Send to client" on sticky action bar** — a real
   structural move. The button currently sits inline below the
   checklist; lifting it to a sticky bottom action bar means
   adding/coordinating a per-tab floating bar with the existing
   Materials multi-select bar. Wanted to scope it carefully rather
   than rush a half-fix.
4. **#13 deadline strip collapse on scroll** — needs a scroll
   observer + a collapsed/compact variant of the new 3-tile grid.
   Bigger structural change; parking until the strip's new shape
   is approved.
5. **#15 responsive page size** — the queue already uses
   `useResponsivePageSize` (a ResizeObserver-driven hook from an
   earlier pass). If rows aren't filling the table on your
   viewport, it's likely a math bug in the row-height estimate.
   Need to verify against a screenshot at your specific viewport
   before tuning.
6. **#19 sidebar icon stable position** — the "absolute position
   of the icon of collapsed or expanded, should not change."
   Sidebar mechanism is mid-rework; want to land this with the
   sidebar restructuring rather than as a one-off tweak.
7. **Prelude question** — "why is `sticky bottom-0 z-10 mt-auto
flex …` not part of table-container?" Reasonable question;
   table-container would let pagination ride with the table's
   scroll boundary. Need to think through the implication for the
   sticky-bottom-60px behavior first.

## Verification

- `pnpm check` — 0 errors, 9 pre-existing warnings (unchanged).
