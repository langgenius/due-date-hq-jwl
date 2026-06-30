# Marketing mobile polish — menu button, compare table, hero copy

**Date:** 2026-06-30.

A mobile-experience pass on the Astro marketing site (`apps/marketing`). The site was
already strongly responsive (hamburger sheet, `clamp()` type, grid fallbacks, 44px
targets); this pass fixed the one real defect and tightened two rough edges.

## Menu button vs. logo (`TopNav.astro`)

The brand mark is four stacked bars, so the standard three-bar hamburger across the bar
read as its twin. The menu button now de-conflicts on four axes while staying an obvious
"menu":

- **Container:** filled round pill (the logo sits bare on the canvas)
- **Color:** accent-tint fill + accent-navy glyph `#22488c` (the logo is brand-ink `#1F315C`)
- **Glyph:** tapered, right-aligned bars `18 → 13 → 9px` instead of even full-width ones;
  morphs to an `✕` on open (bars re-equalise to 18px and cross)
- Dark-band (`.nav--on-dark`) variant uses a translucent white fill

Also shrank the brand lockup on phones (`≤560px`): wordmark `--m-text-xl → --m-text-lg`,
mark `27×21 → 23×18`, badge `10 → 9px`, lockup gap `10 → 8px`. Lockup width `251 → 227px`
on a 375px screen. Desktop/tablet untouched.

## Compare table on mobile (`Compare.astro`)

The matrix is `min-width: 720px` with `overflow-x: auto`. On a phone the `2fr` feature
column ate the viewport and pushed all four product columns — including the DueDateHQ
punchline column — off-screen, with no pinned labels and no scroll cue. Scoped to
`≤640px`:

- **Sticky feature column** (`position: sticky; left: 0`) so row labels stay pinned while
  the product columns scroll; group labels pinned via a sticky inner `.cmp__glabel`.
- Tightened the matrix (`min-width 720 → 512`, feature column to a fixed `140px`) so two
  product columns show at rest.
- **Right-edge fade hint** (`.cmp-hint`) that signals more-to-scroll and clears at the end
  via a small `astro:page-load`-scoped script, so it never veils the final column.

## Hero copy trim (`Hero.astro`, EN + zh-CN)

Tightened the subhead and reassure line (fewer words, same meaning); the reassure
connector is now a `·` separator. No layout changes.

## Verify

- `pnpm -F @duedatehq/marketing dev` → 375px viewport: logo vs. menu read distinctly;
  Compare feature column pins while product columns scroll and the DueDateHQ column is
  reachable; hero copy renders cleanly in EN and `/zh-CN/`.
- `≥641px`: Compare table unchanged (mobile treatment scoped to `≤640px`).

Note: the hero proof-list entrance animation (`heroTickIn`, commit `cdf59d33`) lives on
`main` but not on this branch — committed here on `claude/polish-wave-3` so the eventual
merge to main 3-way-merges it back rather than a direct copy clobbering it.
