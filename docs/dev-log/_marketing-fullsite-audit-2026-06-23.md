# Marketing full-site audit + consistency fixes (2026-06-23)

A full-website audit (design-system consistency · UX copy · design critique) across
every live page/section, fanned out to parallel reviewers, then the systemic
findings fixed. Lens baseline = the `--m-*` token tier + the shared `.m-page-*`
subpage kit + `home/TopNav`/`home/Footer` chrome.

## What the audit found (high level)
- **Token discipline is genuinely held** — zero raw hex / zero ad-hoc px font-sizes
  across the live components (only sanctioned `#fff`/`rgba(255,…)` white-on-navy).
- **The long-tail family is real reuse** — rules / compare / guides are ~48-line
  wrappers around `GeoResourcePage`; state pages use the shared hero kit + `.m-page-*`.
- **The systemic drift was three hand-rolled heroes + freelanced radii + dead code.**

## Fixes applied this pass

### Structural / component reuse
- **Deleted 3 orphaned components** — `home/HowItWorks.astro`, `home/SeeItWork.astro`,
  `home/Trust.astro`: zero imports, superseded by LoopDeep / SurfaceDeep / Close, and
  each carried stale `id="how"`/`id="work"` anchors that would silently break the
  home scroll-spy if ever re-imported.
- **Unified three hand-rolled heroes onto the shared kit** — `/how-it-works`,
  `Pricing`, and `TrustPage` each re-declared the display-serif title + lead font
  block (and Pricing's H1 *omitted* `.m-page-title` entirely). All three now use
  `.m-page-title` + `.m-page-lead`; only genuine per-page overrides remain (Pricing
  18ch/tight leading, Trust signature-page 17ch, the how-hero `.ital` accent).
  Output is unchanged (they already pulled `--m-page-title-size`); ~50 lines of
  duplicated CSS removed and there's now one source of truth for the subpage hero.

### Radius canon (snap freelanced values to 12/8/999/4/0)
- 16px wrappers → 12px: `how-hero__ex`, `geo-peek`, `secdiag__access`,
  `trustpg__close-card`, `pr__recap-panel`, `stcov-route`.
- 6px → 4px (compact): `secdiag__mw li`, `stcov-tile`. 10px → 12px: `pr__toggle`.

### Dead / duplicate code
- `StateCoveragePage` — removed a verbatim-duplicated `.stcov-cta__note` rule.
- `Compare` — removed the fully-dead `narrow` mark (Mark union member, render
  branch, `.cmp__narrow` CSS, `narrow`/`legendNarrow` strings EN+zh); no row used it
  after the earlier "drop by-design" change.
- `index.astro` — replaced a stale "sections land in later phases" frontmatter note.

### Copy consistency (EN + zh parity)
- `Notice` — the verified-date check was a literal `✓`; now the same stroked SVG
  check used in Compare/Close.
- `Faq` (home) — EN eyebrow "Questions" → "Common questions" (matches the
  descriptive-phrase eyebrow pattern; zh unchanged).
- `SurfaceDeep` — killed the in-section 50↔51 flip (standardized on "50 states + DC");
  "one tap" → "one click" (desktop product).
- `/how-it-works` H1 verb aligned to the `<title>` meta: "touches" → "affects".

## Verified
All routes compile 200 (/, /how-it-works, /pricing, /state-coverage, /security,
/rules, /zh-CN, /zh-CN/pricing; /404 → 404 as designed). Heroes confirmed rendering
with `.m-page-title`; no `✓` literal left on home.

## Deferred (logged, not done this pass — lower value or bigger refactor)
- Buttons: Hero / Close / TopNav / TrustPage each hand-roll pill/on-dark button
  variants. They genuinely differ from the 8px-radius `.m-btn`; worth extracting one
  shared on-dark/pill button partial later.
- `StateDetailPage.std-kd` re-implements `.m-page-dl` (key-dates) — reuse it.
- `Compare`/`Pricing`/`StateCoverage` comparison matrices use `role="img"` + a hand-
  maintained aria-summary — cell data is invisible to screen readers; consider real
  table semantics.
- `StateDetailPage` hardcodes a 15-state PUBLISHED list parallel to StateCoveragePage
  (two sources of truth for "which states are live").
- `404` hardcodes its route list instead of the (now-dead) `notFound.routes[]` i18n.
- `Compare` section has an eyebrow but no `<h2>` — `aria-labelledby` points at the
  2-word eyebrow; promote the lead to a heading for the accessible name.
- `FinalCta.astro` + `primitives/SectionEyebrow.astro` still use the OLD Tailwind
  `bg-bg-*`/`text-text-*` vocabulary (legacy-only); not part of the `--m-*` system.
- 24h-reversibility phrasing varies ("reversible 24h" / "Reversible for 24 hours")
  — pick one canonical wording.

## P1 follow-up (done)
- **Shared pill-button primitive** — added `.m-cta` / `.m-cta--primary` /
  `.m-cta--ghost` to marketing.css, with an `.m-cta-dark` on-navy context that
  inverts the fills (primary→white pill, ghost→white text; chroma stays in the
  container). Hero and the Close finale (the audit's named near-duplicates) now
  use it; ~70 lines of duplicated scoped `.btn` CSS removed. Verified: hero primary
  = navy fill / 999 / 11×24, ghost = ink; close primary = white pill / accent text
  via `.m-cta-dark`, ghost = white. (Nav CTA + TrustPage close left as-is — the nav
  has collapse-state coupling and the trust close is an 8px-radius button, not a
  pill; converting either would be a visible change, logged for later.)
- **Compare a11y** — the section had an eyebrow but no heading, so its accessible
  name was the 2-word eyebrow. Promoted the deck lead to `<h2 class="compare__lead"
  id="cmp-h">` (visually identical under Tailwind preflight) and moved the
  `aria-labelledby` target onto it; the eyebrow is now an unlabelled kicker.
