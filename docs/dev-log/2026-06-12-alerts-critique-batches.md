# 2026-06-12 — /alerts critique batches: row pass, toolbar cohesion, sticky bands, sidebar-aligned padding

Yuqi's /alerts feedback round (items #1–#10), executed as three batches.

## Batch A — PulseAlertRow pass

- **#5 ACTION chip de-heated:** every row carries a suggestion chip, so the
  warning-amber pair saturated the list and nothing read urgent. Now neutral:
  `bg-background-subtle`, label `text-text-tertiary`, text `text-text-secondary`.
  Heat stays with URGENT/HIGH pills + the date-diff.
- **#6 redundant date dropped:** day-grouped lists' rows showed "May 20" under a
  "WED · MAY 20, 2026" band. New `showRailDate` prop on PulseAlertRow (default
  true); `PulseAlertList` threads `showRailDate={!grouped}`. Grouped rows show a
  64px wall-clock-only rail (full date + relative age on hover); flat lists
  (impact sort, map rail) keep the 90px date+time rail.
- **#1 frame border hidden:** the list frame drops `border-divider-regular`;
  rounded-12 encapsulation survives via the clipped gray day bands.
  `overflow-hidden` → `overflow-clip` (clip doesn't create a scroll container,
  which sticky needs).

## Batch B — toolbar cohesion

- **#2 active segmented in accent:** `--components-segmented-text-active` →
  `var(--text-accent)` (semantic-light.css). Selection = accent app-wide
  (Review/Active, My work/Everyone, List/Map). Dark theme untouched per the
  no-colored-text-on-dark rule.
- **#4 Clear filters hidden at rest:** renders only when `filtersActive`; sits at
  the end of the narrowing cluster so its appearance doesn't shift siblings.
- **#10 header buttons ghost:** Alert history + morning-sweep coffee go
  outline → ghost. The old "ghost vanishes on gray" rationale died when list
  pages went white.

## Batch C — sticky bands + sidebar-aligned padding

- **#7 sticky day band:** the day-group band is `sticky top-12 z-10` — pins
  below the sticky toolbar while its day's rows scroll under. Enabled by the
  frame's overflow-clip.
- **#9 padding aligns to the sidebar:** page `pt-8` centers the page title on
  the sidebar's firm avatar (title center 50px = avatar center 50px — measured);
  shell `pb-5` ≈ the sidebar's 18px bottom inset. Applied to RulesPageShell
  (/alerts + /rules), /today, /deadlines, /rules/library; /clients was already
  pt-8.

## Verify

tsgo clean. Measured live at 1512: action chip rgb(242,244,247) bg / gray text;
rail date gone in grouped mode; frame border 0px + overflow clip; band
position:sticky top:48px; segmented active rgb(21,90,239); Clear filters absent
at rest; title center == avatar center == 50px.

Note: docs/Design/DueDateHQ-DESIGN.md needs the segmented-accent + pt-8 canon
recorded — deferred because the file is mid-edit in the concurrent session.
