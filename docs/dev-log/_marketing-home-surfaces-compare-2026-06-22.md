# Marketing home — Surfaces + Compare sections ported (migration complete)

**Date:** 2026-06-22 · `apps/marketing/src/components/home/{Surfaces,Compare}.astro`, `index.astro`. The last two depth sections of the production-v2 homepage, rebuilt on the `--m-*` token tier. With these, every v2 section is now live on `/`.

## What changed

- **Compare.astro — "How it compares".** A restrained 4-column matrix (Excel + Outlook · File In Time · TaxDome · DueDateHQ) over four rows (Tracks deadlines / Watches sources for changes / Flags who's affected / Source on every date). Built data-driven from a `products` + `rows` array. The DueDateHQ column carries an `--m-accent-tint` wash and accent checks; competitors get muted checks, em-dash "no", and "manual" on row 1. Strong `--m-ink` top rule, the rest `--m-hairline-2`. Contained to 940px and wrapped in an `overflow-x:auto` scroller (600px min-width) so it scrolls internally on mobile rather than pushing the page. The whole grid is one `role="img"` with a full-sentence aria-label. Sits after Sources.
- **Surfaces.astro — "Everything in one workbench."** Legora-highlights-style 4-card grid: Alerts / Coverage / Worklist / Apply & audit. Each card is an embedded product mini-UI on a graph-paper thumb (dotted grid via `color-mix(--m-accent 6%)`, border + bg for the lift — micro-shadow only, no blur-18 card shadow). The minis **reuse the exact chip vocabulary** already established: URGENT/Blocked = `--m-danger` 9–10% mix, In review = `--m-accent-tint`, Waiting = hairline outline, risk bar `--m-urgent`, the +202d delta = `--m-ok` mix. Coverage mini-map is a 24-tile heat grid (navy / urgent / danger tints off the shared tokens). 12-col 7/5 head, 4→2→1 col grid. Sits between See-it-work and Trust.
- **index.astro** wires both in v2 order: Sources → **Compare** → See-it-work → **Surfaces** → Trust.

## Verification

DOM confirms order (hero→villain→how→notice→sources→compare→work→surfaces→trust→security→faq→close), Compare 25 cells / 5 highlighted, Surfaces 4 cards / 24 tiles (7 colored), no console errors. Screenshotted both at 1600px (isolated to dodge the headless blank-scroll quirk). Responsive verified by computed style: Surfaces 4-col→2-col (≤1000)→1-col (≤540); Compare scrolls internally on mobile (600px inner in a 331px container, ~0 page overflow).

## Home migration status

All 13 production-v2 sections now live on `/` on the `--m-*` tokens. Remaining: the interactions pass (hero filter/apply JS, nav glider + nav-on-dark on the navy band, map click-to-jump) and the 中文 i18n wrapping. Sibling pages (`/pricing`, `/security`, `/state-coverage`) still on the old style — to be brought to the new look in a later pass.
