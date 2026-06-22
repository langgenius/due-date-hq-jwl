# Marketing — dedicated /how-it-works page + landing trim

**Date:** 2026-06-22
**Scope:** `apps/marketing` — landing IA / sitemap restructure

## Why

Standing directive: _everything on the landing must earn its place for marketing;
non-essential product depth belongs on its own page._ The landing had grown to 12
sections, with the deep risk-ranked worklist demo (`SeeItWork`) and a standalone
`Trust` block competing with the pitch flow. Owner also green-lit adjusting the
**sitemap + website hierarchy** directly.

## What changed

### Landing trim (10 sections, was 12)

- **Merged `Trust` → `Security`.** One "Why you can trust it" block (`Security.astro`,
  `id="security"`) now carries both the glass-box guarantee stats (100% sourced /
  0 auto-applied / 24h reversible) and the data-security cards + honest boundary.
  `Trust.astro` is now unused (kept in repo).
- **Cut `SeeItWork` from the landing** — re-homed on the new product-tour page.
- `ScrollRail` items reduced to 5: The loop · The document · Sources · Why trust it
  (`#security`) · Questions. Dropped the dead `#work` + merged `#trust`/`#security`.
- New landing order: Hero · Villain · Surfaces · HowItWorks · Notice · Sources ·
  Compare · Security · Faq · Close.

### New core page: `/how-it-works` (+ `/zh-CN/how-it-works`)

The dedicated product tour — the home for product depth that doesn't belong on the
landing. Composition: page-hero ("Product tour") → `HowItWorks` (the loop) →
`SeeItWork` (risk-ranked worklist, `#work`) → `Surfaces` (the four surfaces) →
`Close` CTA. Uses content-page chrome (`TopNav pageMode current="how"`,
`.m-page-hero` kit). EN + zh, byte-mirrored composition.

### Hierarchy wiring

- **Nav "How it works"** now points to `/how-it-works` (a real page) instead of the
  `/#how` in-page anchor — the core spine is now 4 real pages (How-it-works ·
  Pricing · Security · About).
- **Footer** "How it works" → `/how-it-works`.
- **`Surfaces` "See it →"** links repointed from in-page anchors to real
  destinations: Alerts → `/how-it-works#how`, Coverage → `/state-coverage`,
  Worklist → `/how-it-works#work`, Apply & audit → `/security`. Now locale-aware
  (`base`), so they resolve correctly from any page.
- **`llms.txt`** registers `/how-it-works` in `corePages` for the AEO/GEO feed.
- Sitemap regenerates automatically (Astro): 74 → 76 pages.

## Verified

- `pnpm --dir apps/marketing build` → 76 pages, clean.
- Dev server: `/how-it-works` renders hero → loop → worklist → surfaces → close;
  nav highlights "How it works"; Surfaces links resolve to the real destinations.
- Landing: 10 sections; merged Security renders both stats + data cards; rail = 5
  items.

### 404 migrated onto the new chrome

The `/404` page was the last route still on the **old** chrome (`components/TopNav`
+ `components/Footer` + old Tailwind tokens) — a jarring dead-end the moment a
visitor hit it. Rebuilt on `home/TopNav pageMode` + `home/Footer` + the `.m-*` kit:
eyebrow → `.m-page-title` → `.m-page-lead` → `.m-btn` CTAs, plus a bordered
"route status" card listing the published escape hatches (Homepage · How it works ·
Pricing · Open the workbench). Only `/legacy` remains on old chrome by design
(archived, noindex).

## Follow-ups

- GSAP scroll-reveal + Surfaces horizontal pin (no-JS-safe) — still pending.
- Consider whether `HowItWorks`/`Surfaces` on both landing and `/how-it-works`
  reads as teaser→detail or redundant; revisit after owner review.
