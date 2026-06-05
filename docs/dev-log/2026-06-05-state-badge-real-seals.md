# 2026-06-05 — `StateBadge`: real official seals replace the stylized flag motifs

> The jurisdiction marks on the alert cards (and everywhere `StateBadge`
> renders) were hand-designed flag/abstract motifs, not the actual state
> seals. Replaced all 52 with the real official seals, full color, sourced
> to match what each Wikipedia "Seal of …" article shows. Triggered by
> Hanxu ("那个是错的，换成每个州正确的 seal，按照 wiki").

## Background

`state-badge.tsx` shipped as a vendored design-system export of hand-drawn
SVG "flag motifs" (viewBox `0 0 200 200`) — e.g. California was a tan disc +
red star + brown blobs. They were tuned to read at 20px, but they are not
the real seals. The ask: show the correct official seal for each state, in
full color, like the Great Seal of California on its Wikipedia page.

## What changed

### `apps/app/src/components/primitives/state-badge.tsx`

- Renders an `<img>` of the real seal (256–330px PNG) instead of an inline
  `Badge_XX` SVG component. ~950 lines of motif SVGs + the `DESIGNED_BADGES`
  / `SIMPLE_BADGES` registries are gone.
- Kept the public API (`code` / `size` / `title`), `getJurisdictionName`,
  the `NAMES` table, and the navy-monogram fallback for unknown codes.
- Dropped the `variant` prop (`auto`/`detailed`/`simple`) and the
  simple-vs-detailed switch — real seals are a single rendition, and no call
  site passed `variant`. This also retires the prior log's deferred
  `SIMPLE_BADGES` item (see `2026-06-04-alert-card-redesign-…`).
- `<img>` is `loading="lazy" decoding="async"`, `object-fit: contain`,
  `alt="" aria-hidden` (the wrapping span already carries `aria-label` /
  title).
- FED and IRS are now distinct marks (US Great Seal obverse / IRS seal);
  they previously shared one motif.

### `apps/app/src/components/primitives/state-seals/` (new — 52 PNGs, 5.6 MB)

One `<CODE>.png` per jurisdiction, imported with the existing `?url`
convention and mapped in `SEAL_URLS`.

## How the seals were sourced

Each is the lead image of the state's Wikipedia `Seal of <State>` article
(via the MediaWiki `pageimages` API), so the asset tracks what the wiki
shows — including full color and current redesigns. Exceptions handled:

- **GA** → the U.S. state arch ("Seal of Georgia (U.S. state)"), not the
  country.
- **MD** → the official reverse (`Seal of Maryland (reverse)`).
- **OH** → the color version (`File:Seal of Ohio.svg`; the article lead was
  B&W).
- Current redesigns picked up automatically: **MN** (2024 loon), **MS**
  (2014 "In God We Trust"), **RI** (2021).
- **IL, VA, ID, NH, NJ, PA** — their `Seal of <State>` article is a combined
  "Flag and seal of …" / "Coat of arms …" page whose lead image is the flag
  or arms; re-fetched the seal from the specific `File:Seal of <State>.svg`.
- **FED** → "Great Seal of the United States" (obverse); **IRS** →
  `Seal of the United States Internal Revenue Service.svg`.

## Why this way

- **Real images, not a redrawn SVG set** — the seals are detailed engravings
  (Minerva, grizzly, ships, "EUREKA" …) that can't be faithfully hand-traced;
  Hanxu chose "real seals, full color" over a stylized redraw.
- **PNG @ ~256px, not the source SVGs** — Commons seal SVGs are 0.4–8 MB
  each (traced detail); vendoring 52 would be tens of MB. The badge maxes at
  88px, so a 256px PNG is crisp everywhere and ~10× lighter.
- **20px tradeoff (accepted)** — in the alert pill (`AlertCard.tsx:285`,
  `size="xs"`) the seal reads as a small full-color disc and the adjacent
  code identifies the state; engraving detail shows at lg/xl. This is the
  legibility the old motifs optimized for, knowingly traded for accuracy.

## Verification

- Compiled through the real Vite dev server: transformed `state-badge.tsx`
  serves 200 with **52/52** seal imports resolved (`?import&url`), every
  asset 200, `AlertCard.tsx` compiles.
- Live `/preview` gallery driven via Playwright/Chromium against the dev
  server: seal `<img>`s load (natural 330×330) at xs/sm/md/lg with **0
  console / page errors**.
- Visual spot-check of all 52 (contact sheet) + the 15 highest-risk seals
  (CA/GA/OH/MN/MS/MD/RI/NJ/PA/VA/IL/NY/UT/FED/IRS) — all correct.
- Worktree has no `node_modules`; ran the dev server in-tree by symlinking
  main's deps + `vp dev` directly. Full `vp check` / `vp fmt` not run here —
  run from the main checkout before relying on CI.

## Follow-up / open

- 52 PNGs = 5.6 MB. `pngquant` would cut ~60–70% with no visible loss at
  these sizes if repo weight matters.
- **UT** resolved to the classic beehive seal (the article lead), not the
  2024 redesign — revisit if the wiki updates or the 2024 mark is wanted.
- To refresh or add a jurisdiction: drop `<CODE>.png` in `state-seals/` and
  add the import + `SEAL_URLS` entry (documented in the file header).
