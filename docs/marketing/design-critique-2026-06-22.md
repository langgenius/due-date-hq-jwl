# DueDateHQ marketing site — whole-site design critique

_Design-director synthesis · 2026-06-22 · 7 dimension reviews · components under `apps/marketing/`_

## 1. Overall impression

This is a genuinely art-directed marketing site, not templated SaaS: nearly every section invents its own layout grammar (vertical pain-list, bento workbench, document→fields beam, US tilegram, grouped comparison matrix), the type system is a disciplined three-voice deck (Instrument Serif heroes bookending Hero and Close, Instrument Sans body, Geist Mono as evidence), and the honesty is rare for the category — `Compare.astro` concedes "By design" rows to competitors and every mock is captioned "sample · not your data." What holds it back is not the craft of the visible page but its **seams**: a stale parallel copy deck in `src/i18n/en.ts` (and `zh-CN.ts`) still ships the OLD positioning into the page title, structured data, pricing and 404; there is **no mobile/tablet navigation at all** below 920px; and several accessibility floors (focus rings on the conversion CTAs, the faint meta tier, status-pill contrast) quietly fail WCAG AA.

**Overall rating: 2.5 / 4** — mean of the seven dimension scores (3, 3, 3, 2, 3, 2, 2). The visible homepage is a strong 3; it is dragged to "good, not yet excellent" by the copy/IA/localization layer, where the rendered page and the machine-readable / non-desktop / non-EN versions of the product disagree about what DueDateHQ even is.

## 2. Design health

| Dimension | Score | Key issue |
|---|---|---|
| Visual hierarchy, composition & AI-slop | 3 / 4 | Three near-identical "live feed" mocks (Hero/Sources/Surfaces) + a long mid-page run of same-padding white sections flatten rhythm |
| Typography | 3 / 4 | Serif-hero → sans `.m-h2` step too small; CJK fed into Latin-tuned serif heroes on Pricing/Trust |
| Colour & accessibility | 3 / 4 | Close CTAs get **no focus ring**; `--m-faint` meta text resolves to ~1.9:1 (fails AA) |
| UX copy, messaging & positioning | 2 / 4 | Live `<title>` + home JSON-LD use OLD positioning ("glass-box deadline intelligence") that contradicts the page body |
| Motion & micro-interactions | 3 / 4 | `ScrollRail` skips the reduced-motion guard; advertised "Surfaces horizontal pin" no longer exists in code |
| Information architecture & navigation | 2 / 4 | **No nav at all below 920px** — Pricing/Security/Sign-in unreachable on phones |
| Localization (EN ↔ zh-CN parity) | 2 / 4 | Faux-italic skewed onto Chinese headings; landing Hero has no CJK type guard; stale zh meta/JSON-LD |

## 3. What's working

1. **Composition is authored, not templated.** `Villain.astro` is an intentional vertical icon-list (the code literally comments "NOT a card grid"), `Surfaces.astro` is a single bento workbench window, `Notice.astro` is a document-clip → dashed-beam → extracted-fields flow, `Sources.astro` is a US tilegram, `Compare/Pricing` are grouped matrices. Each section earns its own structure.
2. **A real signature type move with restraint.** The Instrument Serif display face is reserved for exactly two places — the Hero open and the Close finale (plus the two signature trust pages) — so the page literally bookends itself. Heroes are confident (`.hero__head` clamps to 76px, line-height 1.02, balanced 15ch measure), not the timid 36px hero that plagues AI landing pages.
3. **No classic AI-slop tells.** Zero gradient text (chroma stays in containers per the "no coloured text on dark" canon), no rainbow icon chips, no left side-stripe accent cards, restrained shadows (ambient lifts and hairlines, never blur ≥ 24). White-on-navy strong text measures 10.4:1.
4. **Unusually honest, on-brand positioning.** `Compare.astro` concedes all-in-one strengths as a neutral pill (not red), the footnote says "the two aren't in competition," and `Security` states "we make no security claim on this page that the product does not actually do." Every mock carries a "sample · not your data" caption. The composition reinforces the beta/glass-box honesty instead of over-claiming.
5. **Motion is safety-first progressive enhancement.** `ScrollMotion.astro` paints a `.m-js` flag pre-paint to prevent FOUC, hides the pre-state only behind `.m-js` (no-JS sees everything), resets under `prefers-reduced-motion`, and wraps a `try/catch showAll()` so a motion failure never leaves content hidden. The `TopNav` collapse-to-pill (animating only `max-width`/`height`/`padding`/`gap` with `cubic-bezier(0.32,0.72,0,1)` and 64/24px hysteresis) is the best micro-interaction on the site.
6. **Tight, principled IA at the top.** Exactly 4 nav destinations (well under Miller's ceiling), a curated Resources column that is a real long-tail on-ramp (not a link dump), and a principled landing-vs-`/how-it-works` split (3-node teaser vs 4-stage deep-dive) that avoids duplication with `#how`/`#work` anchors preserved.

## 4. Priority issues (P0 + P1, de-duplicated, ordered by severity then impact)

### P0-1 · No navigation at all below 920px — core pages unreachable on mobile/tablet
- **What.** `src/components/home/TopNav.astro` (verified: `.nav__pill { display:none }` at the `@media (max-width:920px)` block, line ~311; sign-in hidden below 560px) collapses the header to just the brand logo + "Start free" CTA. There is no hamburger/menu markup anywhere in the file.
- **Why.** Below 920px — all phones, most tablets, small laptops — the four core pages (How it works, Coverage, Pricing, Security) and Sign in have **zero** header entry point. A returning user on a phone literally cannot reach Pricing or Sign in from the top of any page; they must scroll the entire page to the footer. For a beta courting CPA-firm signups this is a hard usability + trust failure, not polish.
- **Fix.** Add a hamburger button at the same 920px breakpoint that opens a sheet/drawer exposing the four nav links + Sign in + CTA. It has a natural home in `.nav__right`; gate it with the existing media query so desktop is untouched.

### P0-2 · Live page title + home structured data ship the OLD, contradictory positioning
- **What.** `src/i18n/en.ts` (verified) — `meta.title` = "See deadline risk before it becomes a missed filing"; `meta.description` and `geo.structuredData.organizationDescription`/`productDescription` describe "**glass-box deadline intelligence** software" / "deadline intelligence **workbench**." `index.astro` hard-codes a v2 H1 ("Catch every tax-deadline change…") but pulls the JSON-LD from `en.ts.geo.structuredData` via `homeStructuredData()`.
- **Why.** Search engines, LLM answer engines, and social unfurls see a **different product name-and-promise** than the page body. `meta.title` even contradicts the visible H1. This is the single biggest coherence break and it's machine-readable, so it undermines positioning exactly where it is hardest to notice and hardest to A/B away.
- **Fix.** Rewrite `en.ts.meta` and `geo.structuredData` to the v2 argument, e.g. _"deadline-change monitoring for US CPA practices — catches when an IRS, state, or FEMA deadline moves and shows exactly which clients it affects, with a source on every date."_ Treat the visible Hero/Compare copy as canonical source of truth.

### P1-1 · Banned term "Radar" is still live in `en.ts` (collides with the Alerts surface)
- **What.** `src/i18n/en.ts` (verified) — "deadline-and-rule-change **radar**" (line 31), "**Radar** on top of your stack" (36), "Deadline **Radar** loads instantly" (201).
- **Why.** Project memory explicitly bans "Radar" because it reads as a feature name that collides with the actual Alerts surface. The visible site already replaced it ("Alerts"/"watch"/"monitor"); any page treating `en.ts` as the copy deck reintroduces a term the team killed.
- **Fix.** Purge "Radar" from `en.ts`; replace with "monitoring"/"Alerts"/"watches your stack." If `en.ts.hero` is fully dead, delete the block rather than leave a contradictory ghost deck.

### P1-2 · "24h Alert SLA" is an over-claim for a free beta and contradicts the visible "sample data" honesty
- **What.** `src/i18n/en.ts` (verified) — trust pill "**24h Alert SLA**" (line 40), proof "ALERT SLA · 24h" (~510), plus the SLA rule block.
- **Why.** An SLA is a contractual availability commitment; promising it for a free beta whose own surfaces hedge to "Scanning every minute"/"Sample data" is the exact over-claim this product is otherwise careful to avoid (cf. Security's "no security claim the product does not actually do"). The legacy deck promises something the live product deliberately does not.
- **Fix.** Drop the SLA framing entirely. If a cadence claim is wanted, use the visible descriptive phrasing ("we watch around the clock," "scanning every minute"). Never present a time-bound SLA while in free beta.

### P1-3 · Close (conversion) CTAs have no keyboard focus ring — WCAG 2.4.7 failure on the most important buttons
- **What.** `src/components/home/Close.astro` (verified: `grep focus-visible` → 0 matches). Close uses its own `.close` section class and local `.btn`/`.btn--primary`/`.btn--ghost` (not `.m-section`, not `.m-btn`). The global focus rule in `marketing.css` (line ~334) is scoped to `.m-section :where(a,button,…)` and `.m-btn` — so it never matches Close.
- **Why.** The two finale CTAs — the page's primary conversion buttons — receive zero visible focus indicator on keyboard tab. This is a 2.4.7 failure on the highest-value interactive elements on the page.
- **Fix.** Add `.close :where(a,button):focus-visible` to the global focus block, or switch Close's CTAs to the shared `.m-btn` primitive. The white primary button on navy needs a visible offset ring (2px white/cyan, 2px offset); the ghost needs one too.

### P1-4 · `--m-faint` meta text fails AA (and even the 3:1 non-text floor)
- **What.** `marketing.css` `--m-faint = rgb(16 24 40 / 0.3)` (≈ #b7babe ≈ **1.9:1** on white). Used in `.m-eyebrow`, `receipt__eyebrow`, `usmap__cap`, `feed__foot-right` ("Sample data"), `feed-row__when`, `m-page-reviewed`.
- **Why.** Eyebrows, the audit-receipt label, the map caption, and — critically — the honest "Sample data" / "sample preview · not your data" **disclaimers** are real, information-bearing text a low-vision CPA needs to read. For a beta whose whole trust story is "we don't over-claim," the disclaimer being the faintest text on the page is a self-own.
- **Fix.** Promote these labels to `text-tertiary` (#676f83 ≈ 5.0:1), or darken `--m-faint` to ~`rgb(16 24 40 / 0.55)` (~3.6:1) minimum and reserve 0.3 alpha for truly decorative hairline marks only.

### P1-5 · `ScrollRail` indexes only 5 of ~9 sections and mislabels its first stop
- **What.** `src/components/home/ScrollRail.astro` (verified) items = `#how` ("The loop"), `#notice`, `#sources`, `#security`, `#faq`. Verified actual order (`index.astro` 45–54): Hero → Villain → Surfaces → HowItWorks(`#how`) → Notice → Sources → Compare → Security → Faq → Close.
- **Why.** The rail silently omits Villain, **Surfaces** (the product/workbench section, arguably the most important stop), and Compare. Its first dot "The loop" (`#how`) sits third in reading order, so while the reader is in Villain or Surfaces **no dot is active** and the rail reads as broken/out of sync. A scroll-spy that doesn't map its page increases cognitive load.
- **Fix.** Make the rail reflect the true sequence (add Surfaces; reconsider Villain), or — if a curated subset is intended — ensure the first rail item is the first scrollable section so the active state is never empty for a long stretch.

### P1-6 · Surfaces "See it" links scatter to four structurally different destinations; "apply" mismatches its target
- **What.** `src/components/home/Surfaces.astro` (~104–107): alerts → `/how-it-works#how`, coverage → `/state-coverage`, worklist → `/how-it-works#work`, apply → `/security`.
- **Why.** Four visually identical "See it →" affordances lead somewhere structurally different; "apply" (a product action) sends the reader to a **security** page — a label/target mismatch. Identical link text + divergent destinations raises per-click uncertainty exactly where the page wants to feel like one coherent product.
- **Fix.** Make link text predict the destination ("See in the tour" vs "View coverage"), or point all four into the `/how-it-works` surface deep-dive. At minimum repoint "apply" away from `/security` to the SurfaceDeep apply section.

### P1-7 · Serif hero → sans `.m-h2` step is too small; the two display voices nearly collide
- **What.** `marketing.css` `.m-h2` = `clamp(29px,3.6vw,44px)`; `.m-page-title` = `clamp(30px,…,48px)`. On long-tail pages a sans `.m-page-title` and the `.m-h2` below it differ by only a few px at mid widths.
- **Why.** Hierarchy reads strong at the serif hero (~1.7× over `.m-h2`) but goes timid the moment you're past it — the H1/H2 contrast flattens. The gap is currently set by happy per-component accident, not by the token system.
- **Fix.** Pull `.m-h2` down a step (e.g. `clamp(26px,3.2vw,40px)`) OR push `.m-page-title` to a clear H1 ceiling (`clamp(34px,4.4vw,54px)`), keeping a deliberate ≥ 1.4× H1→H2 ratio everywhere.

### P1-8 · CJK rendered through Latin-tuned serif heroes — landing Hero, Pricing, and Trust all crowd
- **What.** `Hero.astro` `.hero__head`, `Pricing.astro` `.pr__title` (line-height 1.0), `TrustPage.astro` `.trustpg__title--display` (1.04) all use `var(--m-font-display)` (Instrument Serif, **no CJK glyphs**) with negative tracking authored for Latin caps. `how-it-works.astro` already solved this (zh branch → line-height ~1.16, letter-spacing 0, wider measure, balanced wrap, with a Chinese-language comment) — the highest-traffic Hero and the two trust pages never got the override.
- **Why.** CJK falls back to a system serif at a line-height/tracking that crowds full-height square glyphs; two-line zh titles nearly touch and lose the brand display face. The team demonstrably knows the fix; it's just not applied consistently.
- **Fix.** Add one shared `:where([lang='zh-CN'])` rule in `marketing.css` for the display-hero classes (`.hero__head`, `.pr__title`, `.trustpg__title--display`): line-height ~1.18, letter-spacing 0, CJK-capable stack, slightly wider `max-width`. One rule covers all four heroes.

### P1-9 · Faux-italic skew applied to Chinese words in headings
- **What.** `Hero.astro` wraps the accent ("影响到哪些") in `<span class="ital">` → `.ital { font-style: italic }`; same device in `Compare.astro` (~line 119) and ~11 other home components.
- **Why.** CJK fonts ship no italic; the browser synthesizes a slanted oblique — a recognized typographic error in Chinese that reads as broken/amateur. The whole "editorial italic accent" device is Latin-only and silently degrades on every zh heading that uses it.
- **Fix.** Add `:lang(zh) .ital, [lang='zh-CN'] .ital { font-style: normal; }` to `marketing.css`, and give zh headings a CJK-appropriate emphasis (weight or color) instead.

### P1-10 · Landing Hero has no CJK type guard (unlike how-it-works)
- **What.** `Hero.astro` `.hero__head` is a single shared style for both locales (`var(--m-font-display)`, letter-spacing −0.01em, `max-width:20ch`). The `/how-it-works` page proves the per-locale guard exists; the highest-traffic hero just didn't get it.
- **Why.** The zh headline silently falls back to a system font (losing the brand display face) and negative tracking crushes CJK glyphs — and the two heroes are now inconsistent with each other.
- **Fix.** Mirror the how-it-works guard on `.hero__head` (folds into the shared `:lang(zh)` rule from P1-8).

### P1-11 · zh home meta + structured data describe a stale, different product
- **What.** `src/i18n/zh-CN.ts` `meta` + `geo.structuredData` still describe "玻璃盒截止日智能 / Migration Copilot / Workbench" — the OLD narrative. `pages/zh-CN/index.astro` hard-codes a correct zh title/description inline, but `ogImage` and all JSON-LD still pull the stale `t.meta`/`t.geo` values.
- **Why.** The zh page body says one thing while its social card and structured data say another, hurting SEO/AEO and trust parity — the zh mirror of P0-2.
- **Fix.** Rewrite `zh-CN.ts` `meta` + `geo.structuredData` to match the current home narrative (mirror the corrected `en.ts`), or repoint the zh home's `structuredData` to a fresh source so title/description/JSON-LD agree with the rendered page.

### P1-12 · Three near-identical "live feed" product mocks compete for the same eye on one scroll
- **What.** `Hero.astro` `.panel` (alerts feed) + `Sources.astro` `.feed` (monitoring feed) + `Surfaces.astro` `.bench` (workbench mini-alert) — all white rounded panels with a pulsing live dot, mono timestamps, severity pills, and the **same Apr 15 → Nov 3 / 8-clients** data.
- **Why.** By the third one the device has lost novelty; the page reads as one motif repeated rather than three distinct surfaces, and the repeated identical datum makes the eye suspect it's all the same screenshot.
- **Fix.** Differentiate the three: let Hero own the "alerts inbox" look; make Sources visibly a monitoring/log surface (denser rows, no severity pills, lean on the tilegram as hero and demote the feed to a side strip); vary the sample data (different agency/date) so they read as three real screens.

### P1-13 · Long mid-page run of same-width, same-padding white sections flattens rhythm
- **What.** `index.astro` order: Surfaces → HowItWorks → Notice (3 white `.m-section`), then Compare → Security → Faq (3 more) before Close. Only Villain (navy) and Sources (gray) break the field; six of eight remaining sections are white `.m-section` at identical 1240px width, identical block padding, identical eyebrow→h2→body opener.
- **Why.** The eye gets no altitude change for long stretches, so intentional sections start to feel like a stack.
- **Fix.** Add one rhythm break per white run — give Compare or Security a tinted band like Sources, vary container width on Notice/Surfaces, or alternate the opener so a couple of sections lead with the product mock and trail the heading.

### P1-14 · Advertised "Surfaces horizontal pin" no longer exists in the code
- **What.** `Surfaces.astro` has no `<script>`, no GSAP, no pin/sticky (verified: the single grep hit is the section comment, not real ScrollTrigger) — yet commit `8ebe71f1` is titled "GSAP scroll-reveal + Surfaces horizontal pin." A later workflow commit reverted Surfaces to a static grid; the only GSAP left is the reveal in `ScrollMotion.astro`.
- **Why.** The signature scroll-pin the team thinks shipped is gone, leaving the product-intro section the flattest on the page (generic fade-in only), and the team may be reviewing for behavior that isn't there.
- **Fix.** Decide intent: re-introduce the pinned horizontal scrub (gated ≥ 1000px, behind a `prefers-reduced-motion` matchMedia, overflow clipped) so Surfaces earns a signature beat — or accept the static grid and correct the dev-log/commit narrative.

### P1-15 · `ScrollRail` has no reduced-motion guard
- **What.** `ScrollRail.astro` (verified: `grep reduced-motion` → 0 matches). `.spyrail` slides in via `translate(-8px)`; the active dot springs to `scale(1.15)` with a growing box-shadow on every section change. TopNav, Hero, Sources and `marketing.css` all respect `prefers-reduced-motion`; the rail does not.
- **Why.** A vestibular-sensitive user who sets reduce-motion still gets the rail and dot animating — a real accessibility regression in an otherwise careful system.
- **Fix.** Add `@media (prefers-reduced-motion: reduce)` setting `transition:none` on `.spyrail`/`.spyrail__item`/`.spyrail__dot` and dropping the `.is-active` `scale` so the dot only changes color. Mirror the TopNav pattern.

## 5. Persona red flags

### Solo CPA evaluating the site for the first time (likely on a laptop, may pull it up on a phone)
- **Phone = dead end (P0-1).** If they open the link on a phone — common for a quick first look — they get a logo and one button. No way to reach Pricing or Security, the two pages a cautious buyer wants most. Reads as an unfinished product.
- **The disclaimer they're told to trust is the hardest text to read (P1-4).** The "Sample data / not your data" honesty is the trust pivot for a beta, but at ~1.9:1 a 45-year-old's eyes may not catch it — undercutting the exact reassurance it's meant to give.
- **Machine-level mixed signals (P0-2, P1-2).** If they Google the product or paste the link into an LLM, the answer comes back "glass-box deadline intelligence" with a "24h Alert SLA" — a different, over-claiming product than the page they just read. For a skeptical CPA, that inconsistency reads as either two products or marketing they can't trust.
- **Pricing page can't decide what it costs.** The hero says "One price," a note says "free during the beta," and the table shows four tiers at $39/$79/$149 with savings math — a top-to-bottom contradiction on the highest-intent page (P2 below).

### Returning power user (has an account, navigates fast, often keyboard-driven)
- **Can't get to Sign in on mobile (P0-1).** A returning user on a phone has no header path to sign in — they must scroll to the footer on every page.
- **Keyboard tab lands invisibly on the final CTA (P1-3).** A keyboard-driven user tabbing the page gets no focus ring on the Close conversion buttons — the one place they're trying to act.
- **CTA verb flips on them (P2).** Live chrome says "Start free"; `en.ts`-fed pages (Pricing, 404) say "Open the workbench." Same session, two different "the button that signs me in" labels — friction for exactly the user who pattern-matches CTAs.
- **The scroll-rail lies about where they are (P1-5).** A fast scroller watches the rail go inactive through Villain/Surfaces and never see the workbench section indexed — the wayfinding aid reads as broken.

## 6. Minor polish (P2 / P3, grouped)

**Composition / layout**
- _P2_ — Hero `.panel` is over-dense (7-chip filter rail + three maximally-detailed rows): no single focal point at the moment a visitor is orienting. Calm rows 2–3, trim the rail to 4–5, or drop the per-row status line.
- _P2_ — Two full-bleed navy moments (Villain band + Close card, same `--m-accent`) sit close enough that the page reads as "two navy sections" rather than one pain beat + one singular finale. Push Villain darker/textured and lean Close harder into its serif + cyan signature.
- _P3_ — Pricing `.pr__card--rec` (ribbon + accent frame + lift on a 4-up equal grid) is the one stretch that edges toward template SaaS. De-templatize with asymmetric width per the project's "asymmetric attention" instinct rather than a sticker.

**Typography**
- _P2_ — Hero sub-lead measure (46ch) is tighter than the system's 62/68ch leads, giving the most important paragraph a choppy narrow rag. Lift to ~52–54ch and document the measure ladder.
- _P2_ — Pricing price (mono 700, 44px) doesn't out-weight the plan name (sans 600, 18px) as hard as its size implies; mono reads optically lighter/gappy at display size. Bump to ~52px or tighten tracking and confirm the 700 weight ships in the Geist Mono subset.
- _P3_ — Eyebrows are a uniform 12px/600/0.14em uppercase across ~6–8 sections — tidy but mechanical. Let one or two signature sections vary it (e.g. a numbered `01 / Watch` mono eyebrow, which how-it-works already hints at).

**Colour / accessibility**
- _P2_ — Green status-pills ("Verified," "Live") at 10px uppercase ~3.2–3.9:1 fail AA. Use a darker on-tint ink (green-700 ≈ 4.8:1) on the light fill, the pattern the brand already uses with `--color-brand-highlight-ink`.
- _P3_ — Tilegram "watched" rides on colour + motion; with reduce-motion the scan cue vanishes with nothing replacing it (mild 1.4.1 edge, rescued by `aria-label` + text legend). Optional: a static corner-tick "watched" affordance.
- _P3_ — `--m-canvas` (#f2f4f7) and `--m-section` (#f9fafb) differ by ~1.03:1; the light system leans on hairlines, not luminance, to delineate surfaces. Drop `--m-canvas` a step or verify every boundary keeps its hairline.
- _P3_ — Hero `Hero.astro:232` ships a no-op ternary: `row__delta--${a.sev === 'urgent' ? 'later' : 'later'}` — both branches return `later`, so the URGENT "202 days later" row renders the same green "positive" pill as a routine postponement. Collapse to a single class or restore a real urgent branch; either way remove the dead ternary.

**Copy / messaging**
- _P2_ — CTA verb inconsistency: live "Start free" vs `en.ts` "Open the workbench" (lines 23, 32, 538, 540). Standardize on "Start free" for the beta; reserve "Open the workbench" for returning-user/sign-in affordances.
- _P2_ — Pricing FAQ promises four named tiers ($39/$79/$149 with "Save $192/yr") while the hero says "One price" and the note says "free during the beta." Pick one frame and clearly label post-launch pricing as such.
- _P3_ — Container noun drifts in `en.ts` ("console"/"Today"/"intelligence workbench") vs the settled live "workbench." Standardize on "workbench" + the four Surfaces names; retire "console."

**Motion**
- _P2_ — Notice tab toggle hard-snaps (`display:none → grid`, can't transition) and the connector beam is static. Give the incoming panel a short fade+rise (gated by reduce-motion); optionally animate the beam once per switch to dramatize extraction.
- _P2_ — Motion tokens (`--m-ease`, `--m-dur-fast`, `--m-dur`) are defined but only `.m-btn` consumes them; TopNav/Notice/ScrollRail each invent their own durations (0.18/0.2/0.22/0.3/0.45/0.5s) and eases. Route component transitions through the tokens and promote the nav's `cubic-bezier(0.32,0.72,0,1)` to a named `--m-ease-collapse`.
- _P3_ — GSAP reveal uses `start:'top 82%'` + `once:true`; a deep-linked/short-viewport section can sit at opacity:0 until the user scrolls up then down. Add a one-time post-load sweep that force-reveals any `[data-reveal]` already within/above the viewport.

**IA / navigation**
- _P2_ — Footer lists `/state-coverage` twice (Product col line 16 + Resources col line 25) — a redundant slot. And `current='coverage'` only resolves on the index coverage page, so `/states/[state]` detail pages lose their "you are here" signal. Drop the Resources duplicate; pass `current='coverage'` to state-detail pages.
- _P3_ — Footer wordmark `footer__name` (Footer.astro:63) is a non-clickable `<span>`; convention (and the only home link once the top nav scrolls away on mobile) expects it to return home. Wrap it in `<a href={base + '/'} aria-label="DueDateHQ home">`.

**Localization**
- _P2_ — Untranslated English fragments mid-sentence in zh long-tail (`finalCta.body`: "先用 trial 或 demo workspace…保持生产 practice 在线"; "fail closed"). Localize the prose nouns; keep only true code tokens (`source_url`, `Form 1120-S`) in English.
- _P2_ — `zh-CN.ts` legacy hero/problem/workflow blocks are orphaned relative to the new inline-copy home — two sources of truth for zh, which is what produced the stale-meta drift. Delete the dead blocks once confirmed unused, or migrate inline zh copy back into the catalog.

## 7. Recommended next pass

A focused remediation sequence — the first three close the P0/structural gaps, the rest clean the trust-floor and consistency seams:

1. **Ship a mobile/tablet nav (P0-1).** Add a hamburger + drawer in `TopNav.astro` at the existing 920px breakpoint exposing the 4 links + Sign in + CTA. Single highest-impact fix; unblocks every non-desktop visitor.
2. **Reconcile the copy deck to the visible site (P0-2, P1-1, P1-2, + P2 CTA/pricing).** Rewrite `en.ts` `meta` + `geo.structuredData` to the v2 narrative; purge "Radar" and "24h Alert SLA"; standardize the primary CTA on "Start free." Then mirror the same fixes into `zh-CN.ts` (P1-11). Treat the rendered Hero/Compare copy as canonical and consider deleting the dead `en.ts`/`zh-CN.ts` hero/problem/workflow blocks so this can't re-drift.
3. **Patch the WCAG-AA floor (P1-3, P1-4, + P2 status-pills).** Scope a `:focus-visible` ring to the Close CTAs (or switch them to `.m-btn`); darken `--m-faint` and promote the "Sample data" disclaimers to `text-tertiary`; darken green status-pill ink to green-700. Three small CSS edits, removes the trust-led contradictions.
4. **Make the scroll-rail tell the truth + respect motion (P1-5, P1-15).** Add Surfaces (and reconsider Villain) to `ScrollRail` items so the active state is never empty; add the `prefers-reduced-motion` guard mirroring TopNav.
5. **Add one shared CJK display-hero guard (P1-8, P1-9, P1-10).** A single `:where([lang='zh-CN'])` rule in `marketing.css` for `.hero__head`/`.pr__title`/`.trustpg__title--display` (line-height ~1.18, letter-spacing 0, CJK stack) plus `:lang(zh) .ital { font-style: normal }` fixes all four heroes and the faux-italic in one place.
6. **Recover Surfaces' signature beat + clarify its links (P1-14, P1-6).** Decide whether the horizontal pin returns (gated, reduced-motion-guarded) or the commit narrative gets corrected; repoint the "apply" link off `/security` and make the four "See it" labels predict their destinations.
7. **Tune the type ladder and break the mid-page white run (P1-7, P1-13).** Pull `.m-h2` down or push `.m-page-title` up for a deliberate ≥1.4× H1→H2 step; give one section in each white run a tinted band or differentiated opener.

---
_Scores: visual hierarchy 3 · typography 3 · colour/a11y 3 · copy/positioning 2 · motion 3 · IA/navigation 2 · localization 2 → overall 2.5 / 4._
