# Marketing site — RE-CRITIQUE v2 (2026-06-22)

## Headline verdict

The remediation pass landed. The single hard blocker — no mobile navigation — is gone, replaced
by a real, accessible `role=dialog` sheet, so phones and tablets can finally reach
Pricing/Security/Sign in. The catalog meta + JSON-LD now agree with the live H1 on the v2
"deadline-change monitoring" narrative, the "Radar" / "glass-box workbench" positioning is purged
from every **indexed** home component, the "24h Alert SLA" over-claim is dropped, the pricing
"one price vs tiers" contradiction is reconciled, and colour/accessibility is now clean (all four
flagged P1s fixed in source).

**New overall score: 3.25 / 4** (mean of 3 · 3 · 4 · 3) — up from **2.5 / 4**, a **+0.75** delta.

The ceiling on a higher score is now narrow and concrete: the stale positioning that was purged
from the indexed HTML **still ships verbatim in the two machine-readable AI feeds**
(`/llms.txt`, `/llms-full.txt`) and the long-tail SEO content — the exact channel P0-2/P1-1 was
about, just a different file than the catalog that got fixed — and the CJK headline guard is
architecturally a no-op (it lives inside `@layer components` and is silently overridden by Astro's
unlayered component `<style>`, so zh headlines still render the Latin Instrument Serif).

> Old per-dimension scores were 3/3/3/2/3/2/2 (= 2.5 overall across the original seven sub-axes).
> This v2 scores the four consolidated dimensions below.

## Scorecard

| Dimension                                | Old → New | What moved                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Copy/positioning + IA/navigation         | 2 → **3** | Real mobile nav sheet (P0 cleared); catalog meta/JSON-LD reconciled to v2; "Radar"/SLA purged from indexed site; CTA standardized on "Start free"; pricing tiers reconciled; footer dedup + clickable wordmark; ScrollRail first-dot + Surfaces stop fixed. Caps at top-of-3: stale positioning still in `/llms.txt` + `/llms-full.txt` + `seo-content.ts`. |
| Localization (EN ↔ zh-CN parity)         | 2 → **3** | zh meta + structured data genuinely rewritten to v2 (rendered JSON-LD carries zero stale terms); stray-English finalCta fragment fixed. Net +1 not +2: the CJK display-serif guard is a cascade no-op (layered vs unlayered) so zh heads still render Latin serif and the faux-italic kill never fires.                                                     |
| Colour & accessibility                   | 3 → **4** | `--m-faint` darkened to ~4.5:1; Close CTAs get a cyan-on-navy focus ring; green/urgent pill labels use darker `-ink` tokens for AA; mobile nav is a fully accessible dialog (aria, focus trap, Esc, focus restore). Only original optional P3 edges remain.                                                                                                 |
| AI-slop + visual hierarchy + composition | 3 → **3** | Hero panel calmed (5-chip rail + anchor/receding rows); the two navy beats made distinct; third near-identical live-feed mock eliminated; Surfaces unified into one workbench window. Caps at strong-3: mid-page field rhythm still a long same-altitude run; recommended-plan stacks asymmetric width _on top of_ the sticker rather than instead of it.   |

## Fixes confirmed

Verified against source on 2026-06-22.

**IA / navigation**

- **Mobile nav exists and is well-built.** `TopNav.astro` adds a hamburger (67-79) shown only
  ≤920px, opening a real `role=dialog` / `aria-modal` sheet (84-111) with the 4 links + Sign in +
  CTA, plus focus trap, Esc-close, scrim/outside-click dismiss, resize-up dismiss and
  reduced-motion handling (script 598-686). Cleared the lone P0.
- **ScrollRail first-dot / empty-active fixed + Surfaces stop added.** Items now 7; first =
  `#villain-h` "The problem" (first scrollable section after Hero), "Surfaces" `#surfaces` is item
  2 (`ScrollRail.astro:21-31`) — no long empty-active stretch.
- **Footer dedup + clickable wordmark.** `/state-coverage` appears once as "Coverage" in the
  Product column (`Footer.astro:16`), wordmark is an `<a>` with aria-label (63), tagline is the v2
  line (48).

**Copy / positioning**

- **Catalog meta + JSON-LD rewritten to v2.** `en.ts` meta (5-8) and `geo.structuredData`
  (698-705) read the "deadline-change monitoring … shows exactly which clients it affects" line;
  `zh-CN.ts` mirrors it; `homeStructuredData()` (`structured-data.ts:229`) pulls
  `t.meta.title/description`, so JSON-LD agrees with the live H1.
- **"Radar" purged from the indexed site.** Zero matches in `en.ts`/`zh-CN.ts` and all live home
  components; the only surviving "glass-box/radar" deck is consumed solely by `legacy.astro`, which
  is `noindex` (`legacy.astro:26`).
- **"24h Alert SLA" over-claim dropped from live** — no "SLA" in any live `.astro`; pricing
  reframed to honest beta language.
- **CTA standardized on "Start free"** across TopNav (24), Hero (96), Close (37) in EN and zh
  ("免费开始"); "Open the workbench" survives only in the dead `en.ts` catalog and the reserved
  404 app-route label.
- **Pricing tiers reconciled.** `en.ts.pricing` hero "Free during the beta. Honest tiers after
  launch." (554), note (557), tiers tagged "POST-BETA PRICING · FREE TO RUN TODAY" (562) + a FAQ
  entry (665-667). No "One price" framing remains.
- **Surfaces "apply" link off `/security`.** Apply now → `/how-it-works`
  (`Surfaces.astro:115`); per-card labels predict the destination (81,87,98,106).

**Localization**

- **zh home meta + structured data rewritten to v2.** `zh-CN.ts` meta (4-9) and
  `geo.structuredData` (678-687) read the "deadline-change monitoring" narrative; a scan of the
  rendered LD for 玻璃盒 / Migration Copilot / 工作台 / glass-box / intelligence returns zero.
- **Stray-English `finalCta.body` fixed** — `zh-CN.ts:520` now reads
  "先用试用或演示工作区体验…让你的正式事务所保持在线"; the trial/demo/fail-closed fragments are gone.
- **Guard selector list is correct and complete** (`marketing.css:391`) — every targeted class
  exists. Only the cascade mechanism fails (see below).

**Colour & accessibility**

- **`--m-faint` darkened** to `rgb(16 24 40 / 0.55)` ~4.5:1 (`marketing.css:30`), was ~1.9:1.
- **Close CTA focus ring** — 2px `--m-cyan` outline + 2px offset, scoped to the local `.btn`
  (`marketing.css:355-358`).
- **Green/urgent pill ink** — new `--m-ok-ink` (green-700, ~4.8:1) and `--m-urgent-ink`
  (`marketing.css:49`) applied to the pill labels; brighter tokens kept for dot/fill only.
- **Hero dead ternary removed** — `Hero.astro:232` is now a static `row__delta--later`.

**AI-slop / hierarchy / composition**

- **Hero panel calmed** — filters trimmed to 5 chips; rows split into one `.row--anchor` (urgent,
  carries the status line) + receding `.row--secondary` rows (weight 400 / `--m-ink-2`).
- **Two navy beats made distinct** — Villain band somber/recessed (ink vignette); Close brighter
  navy with cyan top-edge bar + corner bloom + display-serif headline.
- **Third near-identical live-feed mock eliminated** — `Sources.astro` `.feed` is now a
  monitoring/log surface (code badges, agency tags, Scanned/New/Verified pills); Hero alone owns
  the alerts-inbox look.
- **Surfaces is one unified workbench window** — `.bench` titlebar + jurisdiction tabs holding four
  hairline-divided panels, not loose cards or a clipped horizontal pin.

## Still open / newly introduced

No P0 remains. Ordered by severity, de-duplicated (the AI-feed and CSS-cascade issues each
appeared under more than one dimension and are listed once).

### P1

1. **Stale "glass-box deadline-intelligence workbench" + banned "radar" still ship in the live AI
   feeds.** `src/pages/llms.txt.ts:149` ("a glass-box deadline-intelligence workbench…") and `:154`
   ("a deadline-and-rule-change radar…"); `src/pages/llms-full.txt.ts:26` (same "radar" line).
   These are live published GET endpoints consumed by LLM answer engines — the exact
   machine-readable channel P0-2/P1-1 targeted, just a different file than the catalog that was
   fixed. _Fix:_ rewrite both openings to the v2 narrative used in
   `en.ts.geo.structuredData`; replace "radar" with "monitoring/Alerts". Ideally source the strings
   from the same catalog so they cannot re-drift.

2. **CJK display-serif guard is overridden by unlayered Astro styles — zh headlines still render
   the Latin Instrument Serif (no CJK glyphs).** The guard at `marketing.css:391-397` sits inside
   `@layer components` (block opens at `marketing.css:90`); Astro's per-component `<style>` rules
   (`Pricing.astro` `.pr__title`, `Close.astro` `.close__h`, `Hero.astro` `.hero__head`) are
   **unlayered** and unlayered always beats `@layer` regardless of specificity. Verified live:
   `/zh-CN/pricing` `.pr__title` → `font-family: 'Instrument Serif'`, `letter-spacing: -1.52px`.
   _Fix:_ move the guard **out** of `@layer components` (a top-level `html[lang='zh-CN']` rule is
   unlayered and then wins on specificity), or set the CJK font/line-height/letter-spacing inside
   each component's own `[lang='zh-CN']` block (the pattern Hero already uses). The code comment's
   specificity rationale is wrong about why it would win.

3. **Faux-italic kill (`.ital`) is a no-op on Chinese accent words — synthesized oblique still
   renders.** Same root cause as #2: `marketing.css:398`
   `html[lang='zh-CN'] .ital { font-style: normal }` is layered, the component `.ital` rules are
   unlayered. Verified live: `getComputedStyle('.hero__head .ital').fontStyle === 'italic'` on
   `/zh-CN`. _Fix:_ same — unlayer it (or raise specificity), then give zh emphasis via weight or
   colour instead of the dropped italic. **Fixes #2 and #3 in one move.**

### P2

4. **Mid-page field rhythm is still a long same-altitude run.** `index.astro:45-54` — Surfaces /
   HowItWorks / Notice are three consecutive plain `.m-section` on the `--m-canvas` page base, and
   Compare / Security / Faq are three more; only Villain, Sources and Close break the field. The
   per-section internal grammar is now well varied, which softens this. _Fix to fully close P1-13:_
   give ONE section in each white run a field break — e.g. tint Compare or Security with a band like
   Sources (`background: var(--m-section)` + top hairline), or vary container width / lead-with-mock
   on Notice or Surfaces.

5. **Stray English noun "practice" (= 事务所) renders 15× in zh Pricing prose.** `zh-CN.ts` pricing
   copy — e.g. "1 个 practice 工作区" (561,582), "1 个生产 practice" (605,627), "practice Owner"
   (668). _Fix:_ localize the prose noun to 事务所 (or 团队); keep only true code/format tokens and
   proper names (IRS, FEMA, Drake, source_url) in English.

6. **Banned "Deadline Radar" named as a product surface in long-tail SEO content (EN + zh), which
   renders on indexed resource/guide pages.** `seo-content.ts:781` ("…evidence gaps, and Deadline
   Radar.") and `:1164` (zh "…证据缺口和 Deadline Radar。"). _Fix:_ replace with "Alerts" / "the
   Alerts surface" (zh: "Alerts/提醒") to match the live product vocabulary and the team's ban on
   "Radar".

7. **Recommended pricing plan adds asymmetric width on top of the sticker rather than instead of
   it.** `Pricing.astro` — `.pr__card--wide` spans 3 of 9 tracks (the strong de-templatizing move),
   but `.pr__card--rec` still simultaneously carries a top ribbon, a 1.5px accent frame, a tinted
   body and a box-shadow lift. _Fix:_ the width signal now does the hierarchy work — drop the ribbon
   OR the accent frame so the card reads "wider and quietly marked", not template-SaaS.

### P3

8. **Orphaned legacy zh blocks still ship a contradictory narrative in the catalog** (dead, but a
   re-drift risk). `zh-CN.ts` hero (24-31, eyebrow "玻璃盒截止日智能"), `finalCta.pillCaption`
   (516+), footer "Migration Copilot"/"Workbench" (1380-1382) — confirmed NOT consumed by the live
   home. _Fix:_ delete the confirmed-dead hero/problem/workflow/finalCta blocks so the stale
   narrative can't re-enter via a future component — this is exactly what produced the original meta
   drift. (The orphaned `en.ts` "Open the workbench" route label, `en.ts:23,1394`, belongs in the
   same sweep.)

9. **Three of four Surfaces "See it" links share identical text "See in the tour" while pointing at
   three different anchors** (`/how-it-works#how`, `#work`, `/how-it-works`). `Surfaces.astro:81,98,106`.
   All three legitimately land in the tour so the label is honest; _optional fix:_ differentiate the
   two anchored ones ("See the alert flow" / "See the worklist"). Much improved over the prior
   four-way scatter.

10. **`--m-canvas` (#f2f4f7) vs `--m-section` luminance ~1.03:1** — canvas/section boundaries are
    delineated by hairline only. `marketing.css:33,35`. _Fix:_ drop `--m-canvas` a step, or audit
    that every boundary keeps its hairline.

11. **Tilegram "watched" cue rides on colour + pulse; with reduce-motion the live-scan signal has no
    motion replacement.** `Sources.astro`. Not failing AA (rescued by `aria-label` + visible
    legend). _Fix (optional):_ add a static "watched" affordance (corner tick).

## Recommendation

**Almost ship-ready — one half-day touch-list closes the gap to 4 on two dimensions.** Land the
three P1s, which are really two edits: (a) rewrite the `/llms.txt` + `/llms-full.txt` + `seo-content.ts`
openings to the v2 narrative and kill "radar" (best: source from the shared catalog), and (b) move
the CJK guard out of `@layer components` so it actually wins the cascade — one move that fixes both
the Latin-serif-on-zh-headlines and the faux-italic no-op. Everything else (field-rhythm band, "practice"
localization, recommended-card de-stickering, dead-catalog deletion) is P2/P3 polish that can ship
in a follow-up.
