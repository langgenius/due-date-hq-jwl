# Marketing landing — 33-point feedback pass (2026-06-23)

A full-landing polish pass against a 33-item feedback batch (the Agentation
page-feedback widget), worked component by component. All changes land on the
`apps/marketing` `--m-*` token tier; EN + zh-CN kept in parity.

## Nav (TopNav.astro)
- Collapsed pill **holds total header height at 70px** end-to-end: the float-gap
  `padding-top` (0→14px) and the inner `height` (70→56px) now share the same
  0.45s timing, so 14+56 stays 70 through the whole morph — no bulge, no shift.
- Collapsed inner inset evened to `8px` all round; nav-link padding `8px 14px`.
- The CTA becomes a **ghost button** when collapsed (transparent fill, accent
  border/text; white-outline variant over the dark villain band).

## Hero (Hero.astro)
- Lede rewritten in a CPA's register ("monitors the IRS, all 50 states, and FEMA
  disaster postponements… the official notice behind it").
- Four bullet icons now **meaning-matched** (eye=watch · users=clients ·
  link=source · gift=free beta) instead of four identical checks.
- Primary CTA → pill radius, slightly shorter; secondary CTA gains an open-book
  icon and points at the real `/how-it-works` page.

## Villain (Villain.astro) + How-it-works merge
- The dark band is now a **problem→answer pivot**: left states the dread
  (stronger tagline, the three pains condensed into one line); right turns it
  with the three capabilities (import · monitor · match) + a link to the
  how-it-works page. This **absorbs the standalone HowItWorks section**, which is
  removed from both home routes (the component file is now orphaned).

## Spyrail (ScrollRail.astro)
- Dash-collapse pattern: inactive items show only a short dash; the active item
  shows its label; hovering the rail reveals every label (inactive in gray).
  Smooth dash-grow + label-open transitions. Labels now echo the real on-page
  section names; the dead "The loop" (→ removed #how) entry is gone.

## Surfaces (Surfaces.astro) — now interactive
- **Spotlight tour**: auto-advances through the four panels (others recede),
  syncing the caption rail, then hands control to hover/focus — making "four
  surfaces, one workbench" tangible. Pauses on interaction; off under reduced-motion.
- **Jurisdiction tabs** (Federal/Texas/CA/FL) are real controls that swap the
  lead alert; variants are stacked in one cell so the panel height is constant
  (verified 384px across all four) — no jump.

## Notice (Notice.astro)
- Dropped the excessive "See another example" cue; tabs are now discrete
  **bordered pill buttons** (accent-tinted when active). "Posted · source" moved
  beneath the org name. Fields top-align (beam stays centered); tighter padding.

## Sources (Sources.astro)
- The map now reads as **watched live**: a faint cyan scan-pulse sweeps the
  country diagonally (staggered by row+col), matching the "around the clock"
  caption. Bolder tile hover (lift) + selection spotlight (others recede). Map
  column **stretches to fill** the feed's height. The random agency-chip list is
  removed (the lead + live feed already prove coverage).

## Compare (Compare.astro)
- Removed the H2 that repeated the lead; the lead is now a serif **deck**. Cut a
  redundant matrix row; removed all "by design" framing — DueDateHQ's
  practice-management cells are honest dashes, not a preachy pill.

## FAQ (Faq.astro)
- Full-width **editorial split**: title left, accordion right (was capped 760px).

## Close (Close.astro)
- Stronger, grammatical finale headline ("…you'll *know exactly who*", bookending
  the hero). Fixed the awkward "finding out from your client" line → "Never the
  last to know." The audit **receipt moved into the navy card's right side**,
  redesigned as a white paper receipt (perforated tear edge).

## Global motion (ScrollMotion.astro + marketing.css)
- New opt-in `[data-reveal-stagger]`: a container's direct children rise in with
  a stagger (villain capabilities, Surfaces caption rail). Fail-safe — children
  stay visible without JS / under reduced-motion; the on-load sweep covers
  in-view containers.

## Verification
- Build clean (200). Every point DOM-verified (nav height invariance, hero
  icons/radius, villain answer, spyrail dash, notice bordered tabs + posted
  placement, sources scan + stretch + no chips, compare deck + 0 narrow marks,
  FAQ 12-col, close 2-col card + receipt). Surfaces interactions tested live:
  jurisdiction tab swaps the alert (no jump), spotlight follows. Screenshot tool
  was unreliable this session; DOM measurement used as source of truth.
