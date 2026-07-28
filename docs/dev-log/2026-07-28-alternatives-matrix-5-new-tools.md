# duedatehq: competitor-page matrix — 5 new [tool]-alternatives pages

2026-07-28

## Why

GSC (28d) proves the competitor cluster is the highest-intent demand: 313 impressions across 17
queries (taxdome vs jetpack 44, taxdome competitors 39, karbon hq alternatives 35 …), all ranking
~pos 40. Only 3 alternatives pages existed (taxdome / karbon / file-in-time). Owner directive:
build out the piggyback matrix, honestly.

## What

5 new `alternativeRoundupSpecs` entries — canopy, jetpack-workflow, financial-cents, keeper,
aero-workflow — each with EN+zh routes (10 new pages, sitemap 211→221), reusing the existing
data-driven `[guide].astro` renderer, the "{Tool} alternatives & competitors (2026)" title
pattern, and per-page CTA hrefs to the matching `/compare/[tool]-deadline-operations` page.
New `ALT_NOTES.keeper` + `ALT_NOTES.fileInTime` building blocks. Positioning stays
complement-not-replace (DDHQ = monitoring layer, not a practice-management substitute).

Verified: build OK, 24/24 marketing tests, all 10 routes render with correct titles, llms.txt
picks them up.

## Ship

Production deploy is manual — Yuqi confirmed she can deploy. IndexNow the 10 new URLs after.
