# Marketing — full-site UI/UX audit + remediation (2026-06-24)

A comprehensive UI/UX/architecture audit of the whole marketing site (5 parallel
reviewers: home, subpages, long-tail templates, design system, interactions),
then a P0→P2 fix pass. Also folds in three smaller review-cycle items (spyrail
tightened, nav cross-page jump fixed, /pricing → "coming soon").

## P0 — integrity
- **/pricing structured data matched to the visible page.** The "coming soon"
  state hid the priced cards + matrix but left the plan/beta **FAQ** rendering and
  the **JSON-LD still publishing $39/$79/$149 Offers + a "free during the beta"
  FAQ** — a visible-content/markup mismatch (and a self-violation of the privacy
  page's own promise). New `lib/pricing-state.ts` `PRICING_COMING_SOON` is the
  single source of truth, imported by `Pricing.astro` (gates tiers + matrix + FAQ)
  and the page wrappers (`pricingStructuredData(..., comingSoon)` drops the Offers
  + FAQ nodes). Verified: 0 priced Offers, 0 beta strings on the built page.

## P1 — correctness
- **Dead-end CTAs.** `/states/[state]` + `/state-coverage` "Start free" linked to
  `/` (homepage); now `getStartedHref()` → app `/login` like everywhere else.
- **Killed "free during the beta" sitewide.** State-page ctaNotes + the entire
  Pricing i18n (en/zh hero title/note/subtitle + the beta FAQ) reframed to the
  locked 3-months-Team-free launch offer. 0 beta strings left in any rendered/i18n
  copy (nav `Beta` badge is a separate brand decision, left for the user).
- **Analytics page-views.** `initMarketingAnalytics()` ran once → views died after
  the first view-transition nav. Split into a guarded one-time setup
  (`initMarketingAnalytics`) + a per-page `trackPageView()`, both fired on every
  `astro:page-load` (BaseLayout). Funnel now counts every page.
- **Home contradictions.** Hero "~10 min" vs Close "~30 min" (same paste action) →
  unified to ~10. Close ghost CTA "Book a demo call" (→ /login, a broken promise)
  → "See how it works" → /how-it-works. EN + zh.

## P2 — architecture & consistency
- **Deleted the dead `legacy.astro` tree** — the `noindex` legacy page + its 13
  old-design components (duplicate top-level Hero/TopNav/Footer/Security + Problem/
  Workflow/Proof/SlaStrip/FinalCta/HeroSurface/WorkflowStep + primitives/
  SectionEyebrow,KbdHint). Removed the "is this component-based?" ambiguity in one
  cut. (LoopDeep/SurfaceDeep are NOT dead — how-it-works uses them.)
- **Radius tokenized.** Added `--m-radius-{sm:4,md:8,lg:12,pill:999}` and snapped
  all 14 freelance radii (6/7/10/11/16px…) to the scale — the audit's weakest
  dimension is now enforceable, not a doc note.
- **One accordion everywhere.** Extracted `FaqAccordion.astro`; `FaqList` (subpages)
  and `home/Faq` (landing's editorial 2-col layout) now share it — the duplicate
  `<details>` implementation is gone, both layouts preserved.
- **Broken interactions.** Surfaces jurisdiction "tabs" were an incomplete ARIA
  tablist (no tabpanels, no keyboard) that hid tabs 3–4 <560px → downgraded to
  proper `aria-pressed` toggles (role=group) that scroll on mobile. Sources
  tilegram had no way back to the live feed → re-click the active tile to deselect.

## Review-cycle polish (same batch)
- Spyrail (`ScrollRail`) gap 11→6px (tighter).
- Nav cross-page "jump": `transition:persist` on the nav so it stays put across
  view-transition swaps and the glider SLIDES to the new page's active link
  (URL-derived active sync); no more cross-fade teleport.
- `/pricing` → "coming soon" (tiers/matrix gated; offer + recap + FAQ-less; the
  team's checkout wiring preserved behind the flag).

## Verified
Production build clean (73 pages, down from 84 after the legacy deletion); built
`dist/` confirms: 0 priced Offers / 0 beta copy on pricing, state CTAs → app login,
home contradictions gone, shared `faqacc__` accordion on home + subpages, no
`legacy.html`. No new type errors from these edits (6 pre-existing type errors
remain in untouched-logic files — out of scope, flagged for later).
