# 2026-06-14 — Alert detail: one scroll container (fix the header dead-zone)

Yuqi: "the scroll interaction… there is no background for the header, user
might scroll on there and no actions happens."

The hero (SheetHeader) was a fixed sibling ABOVE the body's scroll container,
so a wheel over the header scrolled nothing — a dead zone. Now the panel is
ONE scroll container wrapping the hero + the document body:

- New `overflow-y-auto` wrapper holds the SheetHeader hero AND the content
  column; only the top bar + footer stay fixed. A wheel anywhere below the top
  bar scrolls.
- The collapse-on-scroll behaviour (`headerCollapsed`) is REMOVED — the hero
  simply scrolls away. Context is retained by the top-bar breadcrumb (carries
  the title) and the sticky section nav.
- Section nav: `sticky top-0` (was `-top-4` against the old inner-scroll
  padding) — pins flush under the top bar when the hero scrolls past.
- The former inner-scroll div is now a plain content column (no overflow / no
  flex-1); the wrapper owns the scroll height. `pb-24` still buffers the
  sticky footer.

## Verify
tsgo clean; live on 5173: the scroll container wraps the hero
(scrollerWrapsHeader true); scrolling moves the hero up out of view
(headerTop -248) and the section nav sticks at 52px (under the top bar);
resting layout unchanged.
