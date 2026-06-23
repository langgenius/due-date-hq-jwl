# Marketing — ScrollRail upgraded to an editorial section index

**Date:** 2026-06-22
**Scope:** `apps/marketing/src/components/home/ScrollRail.astro`

Owner reference: a deck-style vertical scroll rail (mono uppercase labels on a
continuous spine, a glowing active dot, an "NN / TT" counter). Rebuilt our left
scroll-spy rail to that treatment:

- a continuous spine line with a dot per section (was standalone dots);
- mono, uppercase, letter-spaced labels (was sentence-case sans);
- the active stop is a glowing filled accent dot (scale + halo) with a bright
  label; the rest are quiet gray dots on the line;
- an `NN / 07` progress counter, updated by the existing scroll handler;
- on the dark villain band it flips to a white spine + white glow;
- zh: drops uppercase + swaps to the sans face (mono lacks CJK glyphs);
- reduced-motion guard kept (no scale, color-only active).

Build clean (76 pages). Verified at 1680px: spine + 7 mono labels, "THE LOOP"
lit with a navy halo, counter "03 / 07".
