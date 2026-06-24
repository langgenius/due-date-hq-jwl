# Marketing home — Notice diagram alignment + serif "Creed" pause (2026-06-24)

Two home design fixes from Yuqi's screenshot feedback + the audit's second design
finding (visual monotony).

## Notice diagram — fix the stranded connector
`Notice.astro` `.extract` grid was `align-items: start`, so the (shorter) document
clip top-aligned while the 3-field extract stack ran tall — the centered connector
beam ended up floating in the empty space below the clip, pointing at the gap
between fields, with dead space beneath the document. Changed to
`align-items: center` so the clip, the beam, and the extract column share one
vertical centre: the arrow now runs clip-middle → extract-middle. Verified live
(clip/beam/extract mids all equal, deltas 0).

## Creed — a serif pause to break the white-card monotony
The audit's biggest remaining design point: outside the two navy bands, the page is
a long run of white hairline cards. Added `components/home/Creed.astro` — a
full-bleed, faintly navy-tinted band (no card, hairline rules) with ONE large
display-serif positioning line:

> Not a deadline list you maintain. *A monitor that tells you the moment one moves.*

Placed between Surfaces and Notice (breaks the back-to-back white run; lands as a
thesis right after the product intro, and ties to the Compare positioning later).
The italic second clause echoes the hero's display-serif italic. EN + zh, in the
home + zh-CN home. `data-reveal` like every section.

Build clean (73 pages), `astro check` 0/0/0, no console errors. Verified live: the
band renders between Surfaces and Notice as an editorial pause.

Still open (optional): a 2nd non-card moment if more rhythm-breaking is wanted; the
Security section's three stacked container treatments could also be unified.
