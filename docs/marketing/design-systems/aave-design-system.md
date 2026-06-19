# Aave — Design System (extracted, for DueDateHQ)

A reusable "brand skill": the design language of aave.com (the friendly-fintech light redesign), captured in enough detail to rebuild the look on DueDateHQ. Format and depth follow `legora-design-system.md` (the depth standard in this folder); the _content_ is **Aave's own** language — soft pastels, periwinkle + deep teal, big rounded cards — not Legora's editorial restraint. Source: aave.com (its light, pastel, lozenge-button identity) + the friendly/editorial references in `references - build/` (the document-parsing extraction clipping with its colored field tabs; the Popcorn rounded-serif hero). 2026-06-18.

---

## 0 · Global build rules (apply to every page built in this language)

These override anything in a v1 page:

- **Light only — no dark mode, no dark sections.** Aave's own site is light, and we keep it that way: every band, hero, card, table, and CTA sits on a **soft pastel or white** ground. There is **no dark surface** in this language — the villain beat and the closing CTA, which other brands render dark, here become a **lavender/periwinkle-tinted light band**. The only "dark" allowed is a small element: a status dot, a glyph, mono digits — never a section background. No `prefers-color-scheme: dark` variant.
- **Adapt the copy to Aave's voice.** Keep the **locked headline** — "Catch every tax-deadline change — and see exactly who it affects." — plus every fact and honesty rule, but rewrite supporting copy (subhead, eyebrows, section titles, blurbs, microcopy, CTA support) in Aave's **friendly-but-credible** tone: a calm, capable colleague who's already handled the messy part. Warm, plain, reassuring; never hyped, never cute-for-cute's-sake.
- **Polish — miss no detail.** Fully realize the pastel grounds, the pill geometry, the big rounded cards, the soft violet-tinted shadows, and especially the **document-intelligence** signature (notice → colored extraction tabs). High aesthetic bar.
- **Honesty (unchanged):** no "AI" / "Radar" / pricing / fabricated proof; a "sources we watch" soft-chip strip in place of logos; "Open the workbench" / "Try it live" CTAs; every date and claim literally true and source-backed. Friendliness never used to imply a capability the product lacks.

---

## 1 · Essence

**Friendly · soft · trustworthy · quietly confident.** Aave reads like a serious financial primitive that decided to be _approachable_ — pastel grounds the color of sea glass and lavender, geometry rounded until nothing has a hard corner, buttons shaped like lozenges, big cards that look pillow-soft. It earns trust not by withholding (Legora's move) but by feeling _calm and safe_: nothing shouts, every surface is gently lifted, the color is sweet but never garish. The reader feels they're holding something modern, reassuring, and a little delightful — fintech without the cold.

The single most distinctive move: **everything sits on a soft pastel ground and is lifted by big rounded cards with diffuse, low-contrast, violet-tinted shadows — never hairlines, never hard borders.** Where Legora separates with a line, Aave separates with _air and a soft shadow_. The second move: a **periwinkle primary** doing all the heavy lifting for action, with **deep teal** as the one trustworthy accent for "verified / done."

## 2 · Color

A **light-only** palette: palest-lavender grounds + a periwinkle primary + a deep-teal trust accent + candy pastels as quiet section grounds and soft icon tiles. Color is _generous_ here (unlike Legora's monochrome), but it is **organised**: one periwinkle for action, one teal for verified, candy pastels only as grounds and tiles — never as type, never competing with the periwinkle.

| Token          | Hex                             | Role                                                                                                      |
| -------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `ground`       | `#F4F3FF`                       | Page ground (palest lavender-white)                                                                       |
| `ground-warm`  | `#FBFAFF`                       | Lifted ground for nav / inset bands                                                                       |
| `surface`      | `#FFFFFF`                       | Card / panel surface                                                                                      |
| `violet`       | `#6361E8`                       | **Primary (AA text)** — CTAs, links, primary mark (Aave periwinkle, deepened so white text on it ≥ 4.5:1) |
| `violet-press` | `#4E4CCC`                       | CTA hover/pressed, link-on-hover                                                                          |
| `violet-brand` | `#7B79F2`                       | Aave's literal brand periwinkle — fills, accents, the hero word, blur-orbs                                |
| `violet-tint`  | `#E4E3FF`                       | Soft periwinkle tile / chip ground                                                                        |
| `violet-mist`  | `#EDECFF`                       | Faintest lavender wash (hover, the "soft band" sections — villain & close)                                |
| `teal`         | `#00827B`                       | **Trust accent** — verified checks, "done / applied", trust stats                                         |
| `teal-bright`  | `#2FB4AC`                       | Live-dot, secondary teal                                                                                  |
| `teal-tint`    | `#D6F1EE`                       | Soft teal tile ground                                                                                     |
| `ink`          | `#211D2E`                       | Primary text, headlines (warm violet-charcoal near-black)                                                 |
| `ink-2`        | `#4A4658`                       | Body / secondary text                                                                                     |
| `muted`        | `#7C7790`                       | Tertiary, captions, nav links                                                                             |
| `faint`        | `#A8A2B8`                       | Fine print, hairline labels                                                                               |
| `line`         | `#E7E5F5`                       | Rare hairline (card divider, input border) — used sparingly                                               |
| `peach`        | `#FFC38B`                       | Pastel accent (warm icon, "new date" tab)                                                                 |
| `peach-tint`   | `#FFEEDC`                       | Soft peach tile / urgency well                                                                            |
| `sky`          | `#7FC0FF`                       | Pastel accent (info icon, "jurisdiction" tab)                                                             |
| `sky-tint`     | `#E4F1FF`                       | Soft sky tile ground                                                                                      |
| `lemon-tint`   | `#FFF7CC`                       | Highlight wash (the key sentence in the notice) — use _very_ sparingly                                    |
| `amber`        | `#B8741C` text / `#FFEEDC` well | Severity: urgent (sits on peach-tint)                                                                     |

**Rules:** light pastel grounds everywhere; **one** periwinkle for action + links; **one** teal for verified/done. Candy pastels (peach / sky / lemon) appear only as **soft icon-tile fills, section grounds, and the extraction tabs** — never as text, never more than one per card. Severity color (amber on peach-tint) appears only on a genuine urgent alert — sized, never red-and-bold. **There is no dark surface**: the two "moment" sections (villain beat, close) are a `violet-mist` light band lifted by pastel blur-orbs, not an inverted panel. Contrast: ink on ground ≈ 14:1; white on `violet` ≈ 5.1:1 (AA); `violet` text on white ≈ 5.1:1 (AA); `teal` on white ≈ 5.6:1 (AA).

## 3 · Typography

One warm geometric sans does almost everything; a rounded serif gives the hero its friendly editorial lift. (Aave itself runs a single humanist sans; DueDateHQ borrows the Popcorn-reference's rounded-serif hero for one beat of warmth.)

| Family           | Font (Google)                     | Fallback                           | Use                                                                                          |
| ---------------- | --------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------- |
| Display / UI     | **Plus Jakarta Sans**             | `-apple-system, Inter, sans-serif` | Headlines, nav, labels, body-UI — friendly geometric, slightly rounded                       |
| Editorial accent | **Fraunces** (opsz, soft optical) | `Georgia, serif`                   | The one warm-serif emphasis phrase in the hero; the principle pull-quote                     |
| Numerals         | **Plus Jakarta Sans** (tabular)   | `ui-monospace`                     | Stats, dates, EINs, table verdicts (`font-variant-numeric: tabular-nums`) — warmer than mono |

**Scale (px · weight · line-height · tracking):**

| Token          | Size         | Wt               | LH   | Tracking           |
| -------------- | ------------ | ---------------- | ---- | ------------------ |
| eyebrow        | 12.5         | 700              | 1    | `0.09em` UPPERCASE |
| body-sm        | 14           | 500              | 1.55 | 0                  |
| body           | 16           | 500              | 1.62 | 0                  |
| lead           | 19           | 500              | 1.6  | `-0.005em`         |
| h3             | 21           | 800              | 1.2  | `-0.015em`         |
| h2 (section)   | clamp(28–44) | 800              | 1.12 | `-0.02em`          |
| display (hero) | clamp(38–66) | 800              | 1.06 | `-0.025em`         |
| display-serif  | clamp(40–70) | 500 _(Fraunces)_ | 1.04 | `-0.02em`          |
| pull-quote     | clamp(28–40) | 500 _(Fraunces)_ | 1.18 | `-0.015em`         |

**Usage:** headlines are **heavy** (800) geometric sans, tight tracking, big — Aave's friendliness comes from _weight + roundness_, not thinness. The hero sets **one** phrase in **Fraunces** (soft rounded serif italic) for editorial warmth — the locked headline's second clause, _"and see exactly who it affects."_ Eyebrows are uppercase, modestly tracked, in `violet` (the pastel context carries a little color). Body is 16px/1.62, weight **500** (friendly fintech runs body a touch heavier than 400 so it reads warm on pastel). Big stat numbers are 800-weight sans in `violet`/`teal`, not mono — warmer than Legora's mono; data digits use tabular-nums.

## 4 · Spacing & layout

- **Base** 4px. Vertical section padding **80–110px** desktop / **52px** mobile. Whitespace is generous but _cozier_ than Legora — the soft cards do some of the separating work.
- **Max content width** ~1200px, centered, comfortable side margins.
- **Grid** 12-col, 24px gutter. Hero and section heads are **centered** (Aave is a friendly landing page, not editorial-left-aligned — a deliberate divergence from Legora). Content rows inside sections may go asymmetric (60/40 trust split).
- **Rhythm:** section → _air_ → section. Separation is **whitespace + a soft card lift**, not a hairline rule. The strongest rhythm beats are full-bleed **soft pastel bands** (`violet-mist`) — the promise strip, the villain beat, the principle pull-quote, the close — never a dark inversion.

## 5 · Radius · borders · elevation

- **Radius:** core to the brand. **28px** on big cards / hero preview · **22px** on medium cards, soft bands, CTA blocks · **16px** on tiles / inset blocks / alert rows · **999px** on every button, pill, chip, badge, avatar · **14–16px** on icon tiles. **Nothing is sharper than 14px** except a hairline divider. Generous rounding _is_ the friendliness.
- **Borders:** mostly **none**. Cards lift with shadow + surface contrast, not a stroke. When a 1px `line` border appears (inputs, the rare flat chip), it is faint and paired with a soft shadow — never a hard hairline doing the work alone.
- **Elevation:** **soft, diffuse, low-contrast, violet-tinted shadows are the signature** (the opposite of Legora's "no shadow"). Three tiers:
  - `shadow-sm` — `0 2px 10px rgba(60,52,120,0.06)` (chips, small affordances)
  - `shadow` — `0 14px 40px rgba(94,80,200,0.10)` (cards, hover lift)
  - `shadow-lg` — `0 26px 70px rgba(94,80,200,0.16)` (hero preview, modals)
    Shadows are violet-tinted (not gray), always blurry and spread, never harsh. No glows on type; glows allowed only as soft pastel blur-orbs behind the hero / soft bands (see §7).

## 6 · Components

- **Button / primary:** `violet` fill, white text, **radius 999** (full pill), padding 15×28, 15.5px/700. Soft periwinkle shadow `0 10px 24px rgba(99,97,232,0.34)`. Hover → `violet-press` + lift `translateY(-2px)` + deeper shadow. One primary per view. _Friendly tell: it lifts on hover, it doesn't just darken._
- **Button / secondary (ghost):** white fill, `ink` text, radius 999, `shadow-sm` + faint `line` border. Hover → lift + `violet-mist` border tint. A third "light" variant: `violet-tint` fill + `violet-press` text (for on-card secondary actions).
- **Eyebrow:** uppercase Plus Jakarta 12.5px/700, `0.09em`, `violet`, optionally preceded by a 7px `teal-bright` dot.
- **Pill badge (status):** radius 999, white fill, `shadow-sm`, faint border, `violet-press` text; live variant carries a pulsing `teal-bright` dot with a soft ring. E.g. "● Early access · FED + 50 states + DC".
- **Chip (filter / trust):** radius 999, white fill, `shadow-sm`; selected = `violet-tint` fill + `violet-press` text. A `teal` check-icon leads the trust chips.
- **Cards:** **the primary container** (unlike Legora). White surface, **radius 28/22**, soft `shadow`/`shadow-sm`, no hard border. Hover lifts `-4/-6px` into `shadow`. Big rounded cards are _the_ Aave look.
- **Icon tile:** 50–64px rounded square (radius 16–20), a **pastel tint fill** (`violet-tint` / `teal-tint` / `peach-tint` / `sky-tint`) with the matching saturated icon color. Outline/duotone icon, ~22–30px. Each card gets exactly one tile; tiles rotate through the pastel set so a grid reads multicolored-but-calm.
- **Nav:** pastel-ground bar, blurred on scroll (`backdrop-filter: blur(14px)`), muted-gray pill-shaped text links that fill white on hover, one `violet` pill CTA. No bottom border until scrolled (then a faint `line`).
- **Stat:** big 800-weight sans number (clamp 30–44) in `violet`/`teal`/`ink` over a 13.5px `muted` label. Stats sit either in soft individual cards or a single rounded **metric band** card divided by faint `line`s — not Legora's open hairline band.
- **Comparison / table:** rounded-card container (radius 22), faint `line` row rules, generous 56px+ rows, tabular numerals, the DueDateHQ column tinted `violet-mist` with `teal` checks. Soft, not flat-austere.
- **Accordion (FAQ):** each row a white rounded card (radius 22, `shadow-sm`); a circular `ground` chevron button that fills `violet` and rotates 180° when open; open card deepens to `shadow`.
- **Soft band (the "moment" surface — replaces the dark band):** a full-width `violet-mist` rounded block (radius 28) lifted by pastel blur-orbs, ink text, the key line in `violet`/`teal`. Used for villain beat, principle pull-quote, promise strip, and close — the light-only stand-in for an inverted panel.

## 7 · Imagery & iconography

- **The signature image is the document-intelligence visual** — and Aave's friendly skin makes it _delightful_ rather than austere: an official notice (IRS / "Texas Comptroller") rendered as a soft white rounded card (radius 16) sitting on the pastel ground, the key sentence highlighted in `lemon-tint`, with the extracted change pulled into **clean labeled field-cards beside it — each field a small rounded card with a colored label tab** (a sky-blue "jurisdiction" tab, a violet "form" tab, a peach "new date" tab, a teal "affected clients" tab — directly echoing the document-parsing reference's colored extraction tabs `address` / `table` / `line items` / `total`). It reads as "the messy paper notice → tidy, sourced, colorful fields," and the affected-client count is the punchline tab. This is the hero's right-hand element and recurs as a standalone section motif.
- **Soft pastel blur-orbs:** behind the hero and the soft "moment" bands, 300–420px circles of `violet-tint` / `teal-tint` / `peach`, blurred ~70px, low opacity. This is Aave's only "decoration" — gentle atmosphere, never a hard gradient, never a dark vignette.
- No stock 3D, no glossy gradient blobs, no literal mascot on DueDateHQ (Aave has Ronnie the Ghost; we keep the _spirit_ — rounded, friendly geometry — without importing a cartoon into a CPA tool). Product UI is rendered as soft rounded cards with pastel tiles and tabular numbers.
- **Icons:** outline / duotone, 1.75px stroke, 18–24px, sitting in pastel tiles or inline in `violet` / `teal` / `muted`. Rounded line-caps (matches the geometry). Used freely but tidily.

## 8 · Motion

- One friendly tempo: **180ms ease-out** (`cubic-bezier(0,0,0.2,1)`) for fades; **220ms** for the card hover-lift. Cards rise `-4/-6px` on hover; buttons rise `-2px`. Content fades + rises 10px on scroll-in, staggered ~70ms.
- One playful loop: the live-dot **pulse** (a `teal-bright` dot with an expanding soft ring, ~2.4s). Nothing else bounces or spins.
- Friendliness = the _lift_, not flourish. Respect `prefers-reduced-motion` (collapse to instant, freeze the pulse).

## 9 · Voice & visual copy treatment

Warm, plain, reassuring — outcomes stated like a helpful colleague who's already done the tedious part, never hyped. Eyebrows are quiet uppercase violet labels. The hero allows exactly one **Fraunces** serif-emphasis phrase for warmth. The product's _principle_ (glass-box) gets a soft pull-quote on a `violet-mist` ground — a gentle manifesto, not a shout. Microcopy that is data (dates, counts, sources) is tabular and quietly precise. The tone is "we've got the messy part handled, calmly" — the friendliness is in the softness and the reassurance, not in exclamation marks.

## 10 · Signature section patterns

1. **The friendly hero** — centered: pill eyebrow (live teal dot) → big heavy headline with one Fraunces-serif phrase → 19px lead → `violet` pill CTA + ghost pill secondary → soft trust chips → the **document-intelligence card** below/beside, floating on pastel blur-orbs. Cozy, lifted, reassuring.
2. **The promise strip** — the four-beat ("Every deadline. Every change. Every client. Handled.") on a rounded `violet-mist` soft band (radius 22), "Handled." in `teal`.
3. **The Watch · Match · Apply loop** — three big rounded white cards (radius 28), each with a pastel icon tile, a step label "01 · Watch", and on hover a `-6px` lift. Soft connector arrows between them on desktop.
4. **The principle pull-quote** — the glass-box belief in Fraunces serif on a soft `violet-mist` ground, lots of air.
5. **The trust split + metric band** — a 60/40 trust card (copy + soft stat cards), then a single rounded metric band (50+DC · 24/7 · 100% · 24h) in `violet` / `teal` / `peach` / `ink`.
6. **The soft close** — a rounded `violet-mist` CTA band with pastel blur-orbs, `violet` pill CTA. (Light, not a dark inversion.)

Sections are separated by **air + the occasional soft pastel band**, never by hairline rules and never by a dark panel.

## 11 · Do / Don't

- ✅ Light pastel grounds, big rounded cards, full-pill buttons, soft violet-tinted shadows, one periwinkle (action) + one teal (verified), candy-pastel icon tiles + extraction tabs, one Fraunces serif hero phrase, tabular numbers, a calm pulse dot, gentle hover-lift, soft `violet-mist` "moment" bands.
- ❌ **Any dark section background** (the whole point — Aave is light), hairline-only separation (that's Legora), hard 90° corners, hard/gray drop shadows, more than one pastel per card, candy pastel used as _text_, red+bold urgency (urgency = amber-on-peach, sized not shouted), glossy gradient blobs, a cartoon mascot dropped into a CPA tool, a second saturated accent competing with periwinkle.

## 12 · Applying to DueDateHQ

- **Hero:** locked headline "Catch every tax-deadline change — and see exactly _who_ it affects." with the second clause in **Fraunces** serif italic for warmth; pill eyebrow "Never miss a deadline change · FED + 50 states + DC" with a pulsing teal dot; `violet` pill CTA "Open the workbench" + ghost pill "Try it live"; the **document-intelligence card** (IRS notice → colored extraction tabs → "5 clients affected") as the signature visual, on pastel blur-orbs.
- **Villain beat ("Sound familiar"):** a soft `violet-mist` rounded band with pastel blur-orbs — quiet, light, reassuring; ink copy, the key line ("the not-knowing is") in `violet`. (No dark panel.)
- **How it works (Watch · Match · Apply):** three big rounded white cards with pastel icon tiles (violet / teal / peach), "01 · Watch" step labels, soft hover-lift, connector arrows.
- **Why you can trust it:** the **glass-box pull-quote** in Fraunces on a `violet-mist` ground + the trust split (copy + soft stat cards) + the rounded metric band; stats `100%` sourced · `0` auto-applied · Audited.
- **What's inside:** a grid of soft rounded feature cards, each with a rotating pastel icon tile.
- **FAQ:** rounded-card accordion with circular violet chevrons.
- **Close:** a soft `violet-mist` rounded CTA band — "Walk into next busy season already ahead." — `violet` pill CTA. Light, lifted, calm.
- **Honesty (non-negotiable):** "sources we watch" soft-chip strip (IRS · CA FTB · NY DTF · TX Comptroller · FL DOR · WA DOR · FEMA) in place of logos; no "AI" / "Radar" / pricing / fake proof; CTAs are "Open the workbench" / "Try it live"; every date/claim stays literally true and source-backed.
