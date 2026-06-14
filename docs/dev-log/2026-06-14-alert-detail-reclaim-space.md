# 2026-06-14 — Alert detail: reclaim wasted space

Yuqi: "too much waste of spacing."

The biggest waste was HORIZONTAL: content capped at 760px inside a ~1050px
panel left ~145px of empty gutter on each side (~28% of the panel). The 760
(72ch) cap suited the full-page LIST feed, but in the already-narrower detail
panel it just wasted the pane.

- Content measure 760 → **880px** (hero + body + footer + spy nav). Gutters
  drop from ~145px to ~85px each side; the grid, the "What this means" bullets,
  and the affected-clients table all get usable width. Still capped (not full-
  bleed) so prose stays ~84ch on very wide panels.
- Vertical rhythm: inter-section gap 32 → **24px**; hero padding pt-8/pb-6 →
  **pt-6/pb-5**. Tighter without cramping; the ranked section headers carry the
  separation.

Net: the Affected-clients table now sits above the fold, and the panel reads
as a filled document instead of a narrow column floating in empty gutters.

Verify: tsgo clean; live on 5173 — content 880 in a 1050 panel, sections gap
24px, hero pad-top 24px.
