# Alert detail — delicacy batch (Yuqi page feedback ×12 + docking footer)

_2026-06-15_

A polish/delicacy pass on the alert-detail content. Reused existing
components/tokens throughout — no new primitives.

## Hero
- **Removed the Flag icon** from the "Needs your decision" eyebrow (#2).
- **Middot separator** between the jurisdiction and change-kind so the identity
  reads as a paused phrase ("Federal · Protective claim window") (#3).
- **Refined the "Act by" key-fact chip** (#6, "好粗糙") — the date now reads as
  quiet secondary context; only the countdown carries the red, at medium weight
  (the design system bans the red+bold double-highlight). Roomier, single line.
- **Removed the top hairline** above the lifecycle strip (#7).

## Change section
- **Evidence items → bullet dots** instead of file icons (#1) — they're items
  to gather, not documents on file.
- **"Parsed fields" header sits closer to the grid** (gap-3 → gap-2) (#10).

## Source section
- **Normal-text quotes** around the excerpt instead of the big off-centre serif
  pull-quote glyph (#8 alignment + #9).

## Activity section
- **Slimmer timeline** — 13/500 step titles (was 14/600), caption-size meta +
  timestamps, tighter step spacing (#12, "更delicate").

## Cross-cutting
- **Source links hover to accent blue** + underline (was a gray darken) — one
  shared `AlertSourceLink`, so row / rail / detail all get it (#4).
- **Section headers vertically centered** (`items-baseline` → `items-center`) in
  the flat `DetailSectionCard` (#8 / #11).
- **Confidence flag collapsed to one label** — "Low confidence" only; dropped
  the "Very low confidence" tier in both the row and the rail (#5).

## Docking footer (prior ask)
- Added a 40px bottom spacer after the sticky decision bar so, on scroll to the
  end, it lifts off the viewport edge and settles into the document with space
  beneath it — reading as the closing region, not a bar jammed to the edge.

## Verified
Live on alert 3020 (top + scrolled): all items render; docked footer has 40px
below it. tsgo + vp check clean; lingui --strict 0 missing ("Very low
confidence" retired).
