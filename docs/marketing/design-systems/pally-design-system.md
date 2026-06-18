# Pally — Design System (extracted, for DueDateHQ)

A reusable "brand skill": the design language of pally.com, captured in enough detail to rebuild the look on DueDateHQ. Mirrors the 12-section structure and depth of `legora-design-system.md` (the format standard in this folder), but describes **Pally's own** language — which is the opposite temperament from Legora's editorial restraint. Source: pally.com (warm cream ground, friendly geometric sans, a single happy accent, emoji-anchored numbered use-case cards — ✈️ "Plan the trip", 💬 "Chase the reply", 🎂 "Never miss a birthday" … — and small app-badge chips for every connected tool) + the two `references - build/` clippings: the **document-parsing visual** (a notice on a gridded ground, parsed into labeled `address`/`table`/`line items`/`total` chips beside a "data-crystal" thumbnail) and the **editorial-serif hero** (Popcorn: rounded app-icon mark, "Now live!" pill, oversized serif headline, soft cloud gradient, phone mockups). 2026-06-18.

> **§0 GLOBAL BUILD RULES apply (see `legora-design-system.md §0`): LIGHT ONLY.** This file describes Pally's *warm* version of those rules — every ground here is a light/warm one. Where Pally's site would reach for an inverted band for a "moment," DueDateHQ stays light and instead changes the *warmth* of the ground (recessed cream → coral-wash → a soft warm-gradient "spotlight"), never a dark section. The locked hero headline + every fact + every honesty rule are preserved; only the *supporting* copy is rewritten into Pally's warm-conversational voice.

---

## 1 · Essence

**Warm · human · playful-modern · confidently friendly.** Where Legora withholds to earn authority, Pally *welcomes* to earn trust. The feeling is a capable friend's product, not an enterprise tool: warm off-white paper, soft-rounded everything, a single happy coral accent, friendly geometric sans, and tasteful emoji used as wayfinding rather than decoration. It feels approachable without being cute — the rounding and warmth do the work, the copy stays plain and grown-up.

The single most distinctive move: **the "app-badge" chip is the atomic unit of the visual language** — a small rounded card with a colored rounded-square glyph + a short label, repeated everywhere (sources, integrations, parsed fields, queue rows). Information is presented as a *friendly inventory of small labeled tiles* rather than dense tables. The second signature: **the document-intelligence visual rendered warmly** — a real notice on a soft gridded ground, a "data-crystal" thumbnail with little corner tabs, and the extracted facts floating out as labeled chips (`address`, `table`, `line items`, `total`). It says "we read the messy paper and hand you clean, labeled facts" without a single line of jargon.

## 2 · Color

Warm and optimistic: a cream ground, deep-navy ink (not black — friendlier), and **one coral accent** carrying all the energy. Status greens/ambers exist but stay quiet. Color here is allowed to feel *good*, not just mean something — but it's still disciplined to one hero hue.

| Token | Hex | Role |
|---|---|---|
| `ground` | `#FBF8F4` | Page ground (warm cream, slightly pinker than Legora's ivory) |
| `ground-2` | `#F4EEE5` | Recessed bands, chip fills, inset wells |
| `card` | `#FFFFFF` | Lifted card surface (cards ARE used here — see §5) |
| `ink` | `#1B2A4A` | Primary text, headlines (warm deep navy, never pure black) |
| `ink-soft` | `#4A5670` | Body / secondary |
| `ink-faint` | `#7A859B` | Captions, meta, nav-secondary, eyebrows on light |
| `coral` | `#FF6B4A` | THE accent — primary CTA, links, active state, energy |
| `coral-deep` | `#E8512F` | CTA hover/pressed, coral text on light (AA) |
| `coral-wash` | `#FFEDE7` | Coral eyebrow pills, step-number tiles, soft accent fills |
| `mint` | `#1D9E75` | "Watching / live / verified / yes" status only |
| `mint-wash` | `#E1F5EE` | Live-status pill fill, "next step" well |
| `amber` | `#BA7517` text / `#FAEEDA` wash | Severity: urgent (warm, never alarm-red) |
| `line` | `#E9E1D5` | Hairlines, card borders (warm, not gray) |
| `line-strong` | `#DCD2C2` | Ghost-button border, stronger dividers |
| `spotlight` | radial `coral-wash → ground` | The warm "moment" ground that *replaces* a dark band (emotional beats, consolidation) |

**Rules:** cream ground everywhere; navy ink for type. **One** accent (coral) owns action, links, and emphasis — never introduce a second decorative hue. Status mint/amber appear *only* on status (a live blip, an Urgent pill, a verified check), never as decoration; urgency is warm amber, never red-alarm. App-badge glyphs may use per-source gradient fills (a small navy IRS tile, a coral CA tile, etc.) — this is the ONE place multi-color is sanctioned, because each glyph is an identity token, not decoration. Navy is used *only* as ink, as a glyph fill, and as the brand-mark square — **never as a section background** (§0 LIGHT ONLY). Contrast: ink on cream ≈ 12:1; coral-deep on cream ≈ 4.6:1 (AA for ≥18px / bold); always pair coral text with weight ≥600 or size ≥18px.

## 3 · Typography

One friendly geometric sans does almost everything; a serif is reserved for the rare editorial "big moment" (the Popcorn reference hero), and a mono for data.

| Family | Font (Google) | Fallback | Use |
|---|---|---|---|
| Display / UI | **Plus Jakarta Sans** | `-apple-system, Inter, system-ui` | Headlines, nav, body, labels, buttons — the workhorse. Rounded-humanist geometric; warmer than Inter, more modern than Nunito |
| Editorial accent (optional) | **Fraunces** (opt. soft) or **Newsreader** italic | `Georgia, serif` | The one oversized "moment" headline or a single emphasis word, à la the serif reference |
| Numerals / data | **Geist Mono** / `ui-monospace` | `SF Mono` | Stats, dates, EINs, queue counts, source meta (`tabular-nums`) |

**Scale (px · weight · line-height · tracking):**

| Token | Size | Wt | LH | Tracking |
|---|---|---|---|---|
| eyebrow | 12.5 | 700 | 1 | `0.12em` UPPERCASE |
| body-sm | 14 | 400–500 | 1.55 | 0 |
| body | 16 | 400 | 1.6 | 0 |
| lead | 18–20 | 400–500 | 1.6 | `-0.005em` |
| h3 (card title) | 19–21 | 800 | 1.2 | `-0.02em` |
| h2 (section) | clamp(28–42) | 800 | 1.1 | `-0.02em` |
| display (hero) | clamp(34–62) | 800 | 1.04 | `-0.03em` |
| serif moment (opt.) | clamp(40–72) | 500–600 *serif* | 1.05 | `-0.02em` |

**Usage:** headlines are **bold (800)**, tight, friendly — Pally leans *heavier* than Legora (which sits at 600), because weight reads as confidence-with-warmth here. Eyebrows are coral, uppercase, tracked, set in a `coral-wash` pill (not bare text). Body is generous at 16/1.6. Numbers are mono + tabular. The serif is optional and rare: use it for at most one oversized hero or one pull-moment, never for UI. Emoji sit on the text baseline at ~1.2–1.4× the cap height, treated as a glyph in the type stream (see §7).

## 4 · Spacing & layout

- **Base** 4px. Vertical section padding **80–96px** desktop / **56–64px** mobile. Roomy, but not the cathedral-whitespace of Legora — warmth wants things a touch closer and more populated.
- **Max content width** ~1120px, centered.
- **Grid** 12-col, 24px gutter. **The hero is centered** (this is the big departure from Legora's left-aligned editorial hero) — Pally is unashamedly a friendly landing page, so the hero centers headline + subhead + CTAs and drops the product surface beneath, centered.
- **Rhythm:** alternating *grounds* are allowed and encouraged — a cream section, then a recessed `ground-2` band, then a warm **`spotlight`** band (a soft `coral-wash → ground` radial) for a "moment" (villain beat, consolidation). The mood changes section to section by shifting *warmth*, not by going dark; this is a guided tour, not one continuous sheet, and never an inverted band (§0 LIGHT ONLY). Cards (§5) carry content within sections.
- **Card grids** are the default content container — 3-up on desktop, 2-up tablet, 1-up mobile — with comfortable 18–20px gaps.

## 5 · Radius · borders · elevation

This is where Pally most diverges from Legora's low-radius seriousness.

- **Radius scale (generous, soft):** **24px** on content cards/surfaces · **32px** on the big CTA "pillow" card · **14px** on buttons, inputs, and app-badge chips · **8–12px** on small glyph tiles & kbd · **999px** on pills/eyebrows/status. Nothing is sharp. The rounding *is* the friendliness.
- **Borders:** 1px warm `line` on cards (a hairline, but on a rounded box). Ghost buttons get 1.5px `line-strong`. Borders are present but quiet — the radius + soft shadow does most of the separating.
- **Elevation:** **soft, real, but restrained.** Cards rest on a two-stop soft shadow (`0 1px 2px rgba(27,42,74,.04), 0 8px 28px rgba(27,42,74,.06)`); on hover they lift ~3–4px to a deeper but still gentle shadow. The coral CTA carries a tinted coral shadow (`0 6px 16px rgba(255,107,74,.28)`) — the one place a shadow is allowed color. No hard drop-shadows, no glow, no glass. Shadow blur stays ≤ ~48px and opacity ≤ ~.12.

## 6 · Components

- **Button / primary:** `coral` fill, white text, radius 14, padding 14×22, 15px/700, tinted coral shadow. Hover → `coral-deep` + `translateY(-2px)` + slightly deeper shadow. One primary per view region.
- **Button / ghost:** white fill, ink text, 1.5px `line-strong` border, radius 14. Hover → border darkens to ink + lift. Secondary CTA pattern ("Try it live ↓").
- **Button / dark:** navy fill, white text — used on cream when coral would clash, or as the nav mark.
- **Button / on-coral:** white fill + `coral-deep` text, for CTAs sitting inside the coral pillow card.
- **Eyebrow:** uppercase Plus Jakarta 12.5px/700, `0.12em`, `coral-deep` on `coral-wash`, radius 999, with an optional 7px coral dot. The same treatment holds on every ground (cream, recessed, `spotlight`) — there are no dark bands to invert against.
- **App-badge chip (THE signature primitive):** rounded 14px white card, 1px `line`, soft shadow; a 26px rounded-square **glyph tile** (per-source gradient fill, white 11px/800 abbreviation) + a 13px/700 ink label. Variants: inside cards → flat `ground` fill, no shadow; on a warm `spotlight`/recessed band → white card on the warm ground (the glyph keeps its color identity). Used for sources, integrations, parsed fields, queue-row leads.
- **Status pill:** radius 999, mint text on `mint-wash`, with a pulsing 7px mint **blip** (expanding ring keyframe) for "watching now / live".
- **Severity pill:** radius 999, 11px/800 uppercase — `amber`/`amber-wash` for Urgent, `ink-faint`/`ground-2` for FYI. Never red.
- **Cards:** YES, used freely (the opposite of Legora). Radius 24, white, 1px `line`, soft shadow, hover-lift. The default content container.
- **Numbered use-case card:** a card with an emoji + a `01`-style count pill top-right, an 800 title, body, and a footer row of app-badge chips above a hairline. The signature content block.
- **Step card:** a coral-wash rounded **number tile** (`01`/`02`/`03`), a coral kicker, title, body, and mono `kbd` keys.
- **Stat:** big coral (or mint) mono number (~40px/800) + an 800 label + a `ink-soft` sentence, inside a white rounded card.
- **kbd:** 11px mono, `ground` fill, `line-strong` border with a 2px bottom border (a soft "key" look), radius 7.
- **Nav:** translucent cream with blur on scroll, a rounded navy app-icon mark + 800 wordmark, `ink-soft` 600 links, a mint live-status pill, and a coral primary CTA.
- **FAQ:** rounded `details` cards with an emoji per question, an 800 summary, a rotating chevron, and the answer indented under the emoji column.

## 7 · Imagery & iconography

- **The signature image is the warm document-intelligence visual.** Rebuild the reference clipping in DueDateHQ's terms: a real **official notice** (IRS / state comptroller) rendered as a paper document on a **soft gridded ground**, beside a small **"data-crystal" thumbnail card with little corner tabs** (the "we read this" moment), with the change *extracted* into a cluster of floating **app-badge field chips** — here `deadline`, `jurisdiction`, `form`, `affected clients` (the tax analogue of the reference's `address`/`table`/`line items`/`total`). It must look like a friendly tool quietly handing you clean labeled facts, not a SaaS hero illustration.
- **App icons / glyph tiles** are a core asset: small rounded-square tiles with a per-source gradient and a 2–3 letter abbreviation (IRS, CA, NY, TX, FL, WA, FEMA, DC). These stand in for "logos we watch" honestly — no real agency seals, no fake partner logos.
- **Emoji as wayfinding, not decoration:** one emoji anchors each use-case/villain/FAQ card (👀 watch, 🎯 match, ✉️ draft, ⏰ remind, 📎 evidence, ↩️ undo; 🌐/📨/📊 for the villain threads). One per card, baseline-aligned, `aria-hidden`. Never sprinkle emoji into body copy or use more than one per element.
- **Product UI**, when shown, is rendered warmly: cream/white cards, rounded corners, mono numbers, app-badge leads, a soft browser-chrome bar with three dots and a "live preview · not your data" caption.
- **Icons:** outline, 2px stroke, 18–22px, `ink`/`coral`/`mint`. Friendly rounded line-caps. Used in feature tiles and inline checks.
- No stock 3D, no gradient blobs, no mascots, no fake headshots/testimonials.

## 8 · Motion

- **Tempo:** ~150–180ms ease-out (`cubic-bezier(0,0,0.2,1)`). Friendlier than Legora's pure fade — Pally allows a gentle **lift**: cards `translateY(-3 to -4px)` on hover with a shadow deepen; buttons `translateY(-2px)`.
- **Signature motion:** the **live blip** — a mint dot with an expanding-then-fading ring (`box-shadow` keyframe, ~2.4s loop) signalling "watching now." It's the one always-on animation and it embodies the product promise.
- **Scroll reveals:** content fades + rises ~8px, staggered ~60ms. Nothing bounces or overshoots; warmth ≠ bounciness. Respect `prefers-reduced-motion` (collapse transitions/animations to instant; freeze the blip).

## 9 · Voice & visual copy treatment

Plain, warm, confident — like a sharp, capable friend, never a chatbot or a hype-machine. Outcomes stated simply; the emoji and rounding carry the friendliness so the *words* can stay grown-up and honest. Eyebrows are short coral labels in a pill. The "principle" beat (glass-box trust) is stated plainly in a paragraph with one tag-pill ("🔍 We call it glass-box"), not a serif manifesto. Microcopy is mono where it's data (dates, counts, sources). Crucially: warmth never tips into overclaim — the honesty rules (§12) override the friendly tone.

## 10 · Signature section patterns

1. **The friendly centered hero** — coral pill eyebrow → bold sans headline (one coral-colored emphasis phrase, optionally one serif word) → 18–20px lead → coral primary CTA + ghost secondary → a sub-CTA microline → a row of trust chips → the warm product surface centered beneath, capped by the promise strip in coral.
2. **The "sources we watch" strip** — a recessed `ground-2` band: a quiet uppercase label + a row of app-badge chips (IRS · CA · NY · TX · FL · WA · FEMA). Honest stand-in for a logo wall.
3. **The warm "moment" band** (§0 LIGHT ONLY — replaces what a dark band would do) — a `spotlight` section (a soft `coral-wash → ground` radial on warm cream, framed by hairlines) for emotional beats (the villain "Sound familiar?", the "all your states, one queue" consolidation). Same coral eyebrow + coral-wash pills; app-badges are white cards on the warm ground; one coral funnel-arrow. The lift comes from the warm radial glow and a hair more shadow on the cards, not from going dark.
4. **The numbered use-case grid** — 3-up cards, each emoji + `0N` count pill + title + body + a footer row of app-badge chips. Pally's most recognizable content pattern.
5. **The document-intelligence feature** — the warm parsed-notice visual (§7) as a standalone signature section.
6. **The coral pillow close** — a single oversized `coral` rounded-32 card with a soft radial highlight, white headline, on-coral CTAs.

Sections are separated by **changing grounds and card grids**, not hairlines — the inverse of Legora.

## 11 · Do / Don't

- ✅ Warm cream ground, soft 24px-radius cards, ONE coral accent, bold friendly sans, app-badge chips everywhere, one purposeful emoji per card, soft restrained shadows, mono numbers, a pulsing live-blip, alternating cream/recessed/`spotlight` warm grounds, the warm document-parsing visual.
- ❌ **Any dark/inverted section background** (§0 LIGHT ONLY — navy is ink/glyph/mark only), a second decorative accent color, alarm-red, sharp corners, hard/glowy drop-shadows or glassmorphism, emoji sprinkled through body copy, gradient blobs or 3D stock, fake testimonials/headshots/partner logos, a left-aligned editorial hero (that's Legora), coral text under 18px without bold (contrast), color used as pure decoration outside the source-glyph tiles.

## 12 · Applying to DueDateHQ

- **Hero (centered, locked copy):** coral pill eyebrow "Never miss a deadline change · FED + 50 states + DC"; headline "Catch every tax-deadline change — **and see exactly who it affects.**" with the second clause in coral; 18–20px lead (the locked subhead); coral **"Open the workbench"** + ghost **"Try it live ↓"**; sub-CTA microline; four trust chips (Sourced every date · You approve every change · Undo within 24h · No black box); the warm Alerts product surface beneath; coral promise strip "Every deadline. Every change. Every client. Handled."
- **Sources we watch:** the `ground-2` app-badge strip (IRS · CA FTB · NY DTF · TX Comptroller · FL DOR · WA DOR · FEMA) — honest, no real seals/logos.
- **Villain beat ("Sound familiar?"):** warm `spotlight` band (coral-wash radial on cream, hairline-framed), coral-wash eyebrow, the locked title + lede, three emoji "loose-thread" cards (🌐 fifty open tabs · 📨 an inbox you can't trust · 📊 a spreadsheet only you understand) as white cards on the warm ground.
- **How it works (Watch · Match · Apply):** three step cards with coral-wash `01/02/03` number tiles, coral kickers, mono `kbd` keys.
- **Why you can trust it:** the glass-box paragraph with a "🔍 We call it glass-box" tag-pill + a dashed "Not tax advice" boundary card; three stat cards `100%` sourced · `0` auto-applied · `Audited`.
- **Document-intelligence signature:** the warm parsed-notice visual — IRS notice on a gridded ground → data-crystal thumbnail → floating field chips (`deadline` / `jurisdiction` / `form` / `affected clients`). This is the element that proves "we read the official paper and hand you clean facts."
- **What's inside:** rounded feature tiles with coral-wash outline-icon tiles. **Numbered use-case grid:** six emoji + `0N` cards, each footed with the relevant source app-badges. **Consolidation:** a warm `spotlight` "All your states. One queue." with a funnel of white source app-badges → a single ranked queue card lifted on a slightly deeper shadow.
- **Close:** the coral pillow card — locked title, locked body, on-coral "Open the workbench" + "Get a guided setup", reassurance line.
- **Honesty (overrides tone):** keep every source/trust claim literally true; no "AI"/"Radar"/pricing/fake proof; emoji and warmth never used to imply capability the product doesn't have; coral never used to dress up an overclaim.
