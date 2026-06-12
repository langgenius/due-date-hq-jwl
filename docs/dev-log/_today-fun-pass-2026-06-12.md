# /today fun pass — masthead greeting, all-clear coffee, Review overlap fix (2026-06-12, round 7)

Yuqi: "you can even break the current layout slightly, to bring more FUN and
CREATIVE aspects" + bug report: the right-railed DUE "overlaps with Review
button on hover."

## Fixes

1. **Review/DUE hover overlap** (`merged-brief-card.tsx`): the old absolute
   overlay + gradient mask covered the due date — the exact column being
   scanned. The Review CTA now lives in the SPACER cell between the identity
   and ownership clusters (the genuine dead space), no mask. Gotcha hit on
   the way: in-flow content inside the `w-full` spacer column gave it real
   min-content width and broke the table's width math (DUE clipped past the
   frame). The button is absolutely positioned inside the relative spacer
   cell so it contributes ZERO layout width. Measured: no overflow, DUE
   right edge 21px inside the frame (the canonical gutter), button right
   edge 106px clear of DUE.

2. **App-boot fix that wasn't ours**: the parallel session's router.tsx
   refactor (eager 404) referenced `NotFoundRoute` without importing it —
   the WHOLE app rendered a blank #root for 80+ minutes (silent: `void
   startApp()` swallows the createAppRouter throw). Added the one-line
   import in the working tree; NOT committed here — it rides with their
   refactor commit. (Boot failure mode noted: a throw in createAppRouter
   = silent blank page.)

## Fun (all real data, glyph-level play)

3. **Masthead dateline greeting** (`dashboard.tsx`): PageHeader's empty
   eyebrow slot now carries "GOOD MORNING/AFTERNOON/EVENING, {firstName}"
   (local clock + firm member's first name) in the tracked-caps eyebrow
   register — a newspaper dateline over the TODAY masthead, pairing with
   the Daily Brief's morning-paper tab.

4. **All-clear coffee moment** (`merged-brief-card.tsx`): `totalActive === 0`
   now renders Coffee-in-accent-disc + "All clear — nothing due, nothing
   late." + one sub-line, mirroring the Alerts empty-state anatomy (the two
   sections celebrate the same way). The all-zero bucket selector hides
   (three zeros is chrome with no decision in it) and the lede suppresses
   (saying it twice deflates the moment).

Verified live at 1512 (greeting, newspaper tab + all-quiet fold line,
insight lede, dimmed zero chip, DUE on the right rail unclipped). All-clear
state was verified live earlier while the demo DB was empty. zh-CN: filled
28 missing strings (5 mine, rest the parallel session's WIP); strict
compile green.
