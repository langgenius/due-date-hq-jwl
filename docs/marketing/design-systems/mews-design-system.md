# Mews — Design System (extracted, for DueDateHQ)

A reusable "brand skill": the design language of mews.com, captured in enough detail to rebuild the look on DueDateHQ. Mirrors the depth/format of `legora-design-system.md` (12 sections). Where Legora is _editorial restraint on warm paper_, Mews is the opposite pole — a **clean, high-contrast, light "operating-system" SaaS**: bright white grounds, near-black ink, big confident geometric-sans headlines, modular white cards, and **one** decisive pink/magenta accent. Source: mews.com/en + the references in `references - build/`. 2026-06-18.

---

## 0 · Global build rules (apply to EVERY reference page, not just Mews)

These override anything in a v1 page:

- **Light only — no dark mode, no dark sections.** Every page is built on bright white / light-gray grounds. Mews is _already_ a light system, so this is native — but it also means a v1's dark villain band must convert to a **light** treatment (light-gray band, near-black ink, pink accent). No `prefers-color-scheme: dark` variant. Near-black is for **type and small UI**, never as a section background.
- **Adapt the copy to the brand's voice.** Keep the **locked headline** — "Catch every tax-deadline change — and see exactly who it affects." — and every fact + honesty rule, but rewrite the _supporting_ copy (subhead, eyebrows/titles, intros, feature blurbs, microcopy, CTA support) in **Mews's tone**: confident, modern, outcome-led, "operating system" framing ("Run your whole deadline practice on one system"). Plain-spoken but assured; never hyped, never cute.
- **Polish — miss no detail.** Fully translate the visual language: the bright modular card layout, the left-text/right-visual hero, the single pink accent, the geometric-sans hierarchy, the generous whitespace. Refine the signature **document-intelligence** visual to a high aesthetic bar.
- **Honesty (unchanged):** no "AI" / "Radar" / pricing / fabricated proof; no "15,000 properties" or award badges (those are Mews's, not ours); a "sources we watch" strip in place of logos; "Open the workbench" / "Try it live" CTAs.

---

## 1 · Essence

**Clean · confident · modern · systematic.** Mews looks like a well-built operating system presented in daylight: bright white, near-black ink, enormous breathing room, and a single hot-pink accent that does all the pointing. It earns authority not by withholding (Legora) but by **order** — everything is a tidy module, every claim sits in its own white card, every section is a clear horizontal band. The feeling is "this is the calm, organized system that replaces your scattered tools."

The single most distinctive move: **content is organized into bright white modular cards and full-width bands on a white/light-gray ground, with one confident magenta accent — high contrast, never busy.** Where Legora separates with hairlines on paper, Mews separates with _whitespace, light-gray bands, and soft-edged white cards._

## 2 · Color

High-contrast light system: white and light-gray grounds, near-black ink, **one** vivid magenta accent. Color is decisive and sparse — the pink is a spotlight, not wallpaper.

| Token       | Hex       | Role                                                    |
| ----------- | --------- | ------------------------------------------------------- |
| `paper`     | `#FFFFFF` | Page ground, cards                                      |
| `band`      | `#F6F5F4` | Light-gray section band (alternating rhythm)            |
| `band-2`    | `#FBF0F5` | Faint pink-tinted band (rare, for an accent section)    |
| `surface`   | `#FCFBFB` | Barely-lifted card on a gray band                       |
| `ink`       | `#16161A` | Headlines, primary text (near-black, not pure black)    |
| `ink-2`     | `#3A3A42` | Body / secondary text                                   |
| `ink-3`     | `#6B6B76` | Tertiary, captions, nav links                           |
| `faint`     | `#9A9AA4` | Eyebrow fine print, disabled                            |
| `line`      | `#E8E7E6` | Card borders, dividers (soft, low-contrast)             |
| `line-2`    | `#D8D7D6` | Stronger border (ghost button, hover)                   |
| `pink`      | `#F2247B` | THE accent — primary CTA, links, highlights, icon tint  |
| `pink-ink`  | `#C81E5E` | Pink hover/pressed, pink-on-light text (AA)             |
| `pink-soft` | `#FCE4EE` | Pink tint — eyebrow pills, icon chips, marker highlight |
| `ok`        | `#137A52` | Verified / resolved (status only)                       |
| `amber`     | `#B5710A` | Caution / "needs review" (status only)                  |

**Rules:** white is the default ground; light-gray bands create rhythm between sections (white → gray → white). **One** accent, the magenta, carries action + emphasis + a thin top-rule on metric cards. Near-black ink for type. Status colors (`ok` green, `amber`) appear _only_ on status (a verified check, a "needs review" flag), never as decoration. Contrast: ink on white ≈ 15:1; pink `#F2247B` on white ≈ 4.0:1 — **use `pink` for large/bold text and fills, `pink-ink` for small body links** (AA). No second decorative color; navy/cyan from the logo mark may appear _in the mark only_, never as a UI accent.

## 3 · Typography

A single confident **geometric sans** does the headline and structural work; a clean text sans carries body; mono carries data. **No serif** — this is the key departure from Legora (whose hero sets a serif-italic word). Mews headlines are bold geometric grotesk, tight, in near-black.

| Family             | Font (Google)               | Fallback                               | Use                                                             |
| ------------------ | --------------------------- | -------------------------------------- | --------------------------------------------------------------- |
| Display / headings | **Space Grotesk** (600/700) | `Inter, system-ui, sans-serif`         | Hero headline, section titles, big stats, brand                 |
| Body / UI          | **Inter**                   | `system-ui, -apple-system, sans-serif` | Body, subheads, nav, labels, blurbs                             |
| Numerals / data    | **JetBrains Mono**          | `ui-monospace`                         | Stats, dates, EINs, form numbers, table verdicts (tabular-nums) |

> Space Grotesk is the chosen stand-in for Mews's custom geometric grotesk — same DNA: tight, even, slightly squared, confident at large sizes. Headlines run **700** at hero scale, **600** for sections. The pink emphasis word is set in the **same** geometric sans (colored `pink`), _not_ italicized and _not_ a serif.

**Scale (px · weight · line-height · tracking):**

| Token          | Size         | Wt                  | LH   | Tracking           |
| -------------- | ------------ | ------------------- | ---- | ------------------ |
| eyebrow        | 12           | 600                 | 1    | `0.10em` UPPERCASE |
| body-sm        | 14           | 400                 | 1.55 | 0                  |
| body           | 16–18        | 400                 | 1.6  | 0                  |
| lead           | 19–21        | 400                 | 1.5  | `-0.01em`          |
| h3 (card)      | 19–20        | 600                 | 1.2  | `-0.02em`          |
| h2 (section)   | clamp(30–46) | 600                 | 1.08 | `-0.025em`         |
| display (hero) | clamp(40–70) | 700                 | 1.03 | `-0.035em`         |
| stat           | clamp(38–56) | 700 (Space Grotesk) | 1    | `-0.02em`          |

**Usage:** headlines = Space Grotesk, very tight tracking (`-0.03em`+), oversized, near-black. The hero emphasizes **one** word by coloring it `pink` (e.g. "…exactly **who** it affects.") — geometric sans, _not_ serif-italic. Eyebrows are uppercase, tracked `0.10em`, sit in a soft pink pill. Body is generous Inter (16–18px / 1.6). Numbers — stats, dates, EINs — are always mono + tabular, and big stats may use Space Grotesk for a confident "operating-system metric" look.

## 4 · Spacing & layout

- **Base** 4px / 8px rhythm. Vertical section padding **88–112px** desktop / **56–64px** mobile. Whitespace is generous but _structured_ (everything snaps to a grid), not Legora's acres-of-paper looseness.
- **Max content width** ~1180px, centered, comfortable side margins (28px).
- **Grid** 12-col, 24px gutter. The **hero is left-text / right-visual** (a split, not centered) — the signature Mews layout. Section heads are left-aligned; the closing CTA may center.
- **Rhythm:** alternating bands — **white → light-gray → white** — give the page its "stacked modules" feel. Inside a section, content is laid out as a **modular card grid** (2-col feature modules, 3-col firm cards, 4-col metric cards). Cards are the unit; bands are the container.
- **Card grids** are the signature: equal-height white cards, soft border, generous interior padding (24–28px), a small accent icon-chip top-left.

## 5 · Radius · borders · elevation

- **Radius:** buttons/inputs **10px** (slightly rounder, friendlier than Legora's 8); cards **16px**; the hero visual frame **24px**; pills/eyebrows **999px**; compact chips **8px**. Rounder corners read modern-SaaS, not editorial.
- **Borders:** 1px `line` (soft, low-contrast) on cards and the visual frame. Bands are borderless — the value shift (white vs light-gray) does the separating.
- **Elevation:** **soft, sparing.** Cards default to a 1px border + the band contrast; on hover they lift 2–3px with a soft shadow. The hero visual frame gets one real shadow (`0 18px 48px rgba(22,22,29,.10)`). Primary pink button carries a tinted shadow. No heavy shadows, no glows, no glass; the lift is gentle and purposeful. (Per house rule: micro-shadows on small affordances, never blur ≥ 24 on flat cards.)

## 6 · Components

- **Button / primary:** `pink` fill, white text, radius 10, padding 14×24, 15px/600, tracking 0. Tinted shadow `0 8px 20px rgba(242,36,123,.25)`. Hover → `pink-ink` + `translateY(-1px)`. One primary per view. An arrow `→` nudges right on hover.
- **Button / dark:** near-black `ink` fill, white text — used for the nav CTA ("Open the workbench") so the pink stays special on the page body.
- **Button / ghost:** white fill, `line-2` border, ink text; hover darkens border. The quiet secondary.
- **Eyebrow:** uppercase Space Grotesk/Inter 12px/600, `0.10em`, `pink-ink` text on a `pink-soft` pill with a soft pink border and a 6px pink dot. (A muted variant: ink text on white pill for use over gray bands.)
- **Pill / status:** radius 999, soft border, small status dot — "● Early access · FED + 50 states + DC". A live pulse dot for "watching".
- **Card (the workhorse):** white fill, 1px `line`, radius 16, padding 24–28, a 40–46px accent icon-chip (`pink-soft` bg, `pink-ink` icon) top-left, h3 + blurb + optional "Learn more →" link in `pink-ink`. Hover: lift + soft shadow + border darken. **One feature card may invert** to near-black ink with a pink icon-chip for emphasis (the "featured" tile) — this is the only dark element on the page, and it's a _card_, not a band.
- **Metric card:** white card with a short `pink` top-rule (3px × 44px), a big Space-Grotesk/mono number, a label, a small description. Used in the 4-up "capability" grid.
- **Nav:** white, slightly translucent + blur on scroll, 1px bottom `line`. Brand mark + name, muted Inter links, a status pill, and a near-black "Open the workbench" CTA.
- **Comparison/table:** soft row rules, generous row height, mono verdicts, the DueDateHQ column emphasized with `ok` checks — flat, white, no zebra.

## 7 · Imagery & iconography

- **Product-forward and clean.** Mews leans on tidy UI mockups and modular system visuals, presented in bright white frames. For DueDateHQ the signature is the **document-intelligence visual**: an official notice ("Texas Comptroller", "IRS") rendered as a real document — masthead, body, the key sentence highlighted with a pink marker — beside it the change **extracted** into clean labeled field-cards (`source` / `change` / `affected clients` / `next step`), each field-label a small mono tag in a meaning color (navy source, pink change, near-black clients, green action). It reads like a system _parsing a document into structured data_ — exactly the Mews "operating system" promise.
- The whole visual sits in a white, soft-shadowed frame (radius 24) with a small "live preview · not your data" caption pill.
- No stock 3D, no gradient blobs, no mascots, no photography of offices. UI is rendered minimally (white, soft borders, mono numbers, one pink marker).
- **Icons:** outline, 2px stroke, 20–24px, near-black or `pink-ink` inside a `pink-soft` chip. Geometric, consistent, used as the card's lead element.

## 8 · Motion

- One tempo: **150–180ms ease-out** (`cubic-bezier(.2,.7,.2,1)`). Cards lift 2–3px on hover; content fades + rises 8px on scroll-in, staggered ~60ms; arrows nudge 3px on hover. The extracted field-cards in the hero visual animate in sequentially (a 150ms stagger) to _show_ the parse happening.
- A small "watching" pulse-dot ping (the only looping animation) signals live monitoring.
- Restraint over flourish; nothing bounces. Respect `prefers-reduced-motion` (collapse to instant; field-cards appear immediately).

## 9 · Voice & visual copy treatment

Confident, modern, outcome-led — the **operating-system** voice. States what the system _does for you_ plainly and assuredly, without hype or cuteness. Eyebrows are crisp uppercase labels. The hero emphasizes one word in pink (not italics). Section titles are short and declarative ("It runs the long tail. _You_ make the calls.", "Everything you'd otherwise track _by hand_."). Microcopy is mono where it's data. Never overclaim (no "handles it all"); the honesty rules keep every claim literally true.

## 10 · Signature section patterns

1. **The split hero** — left: pink-pill eyebrow → oversized geometric-sans headline (one pink word) → 18px lead → pink primary CTA + ghost secondary → trust chips. Right: the **document-intelligence visual** in a white soft-shadowed frame. Below: the "sources we watch" strip between two soft rules.
2. **The modular card grids** — the workhorse: 3-up firm-type cards (who it's for), 2-up feature modules (what's inside, with a "Learn more →"), 4-up metric cards (capability, with pink top-rules). Each grid sits in its own band.
3. **The light villain band** — Legora's dark band, converted: a **light-gray** band, near-black headline with one pink emphasis word, calm ink-2 body. Order over agitation.
4. **The trust split** — left: the glass-box principle paragraph + a boundary callout (left pink/ink rule); right: a stack of stat cards (`100%` sourced · `0` auto-applied · `Audited`).
5. **The capability metrics** — a 4-up of white metric cards with pink top-rules and big mono/Space-Grotesk numbers — the "operating-system dashboard" beat.

Sections alternate **white / light-gray bands**; cards are the unit inside them. (Contrast with Legora: there, sections are separated by hairlines on constant paper.)

## 11 · Do / Don't

- ✅ Bright white + light-gray bands, modular white cards, one confident magenta accent, bold geometric-sans headlines (near-black, tight tracking), generous structured whitespace, left-text/right-visual hero, mono numbers, soft rounded corners.
- ❌ Dark section backgrounds, serif headlines or serif-italic emphasis (that's Legora), a second decorative accent color, heavy shadows/glass/gradients, busy or ungridded layouts, color used as wallpaper, centered landing-page hero, "15,000 properties"/award badges/pricing.

## 12 · Applying to DueDateHQ

- **Nav:** white + blur, brand mark, muted links (How it works · Why trust it · What's inside · Resources), status pill "Early access · FED + 50 states + DC", near-black CTA "Open the workbench".
- **Hero:** locked headline "Catch every tax-deadline change — and see exactly **who** it affects." with _who_ colored `pink` (geometric sans, **not** italic); pink-pill eyebrow "Never miss a deadline change · FED + 50 states + DC"; pink primary CTA "Open the workbench" + ghost "Try it live ↓"; trust chips; the document-intelligence visual at right; "sources we watch" strip below (IRS · CA FTB · NY DTF · TX Comptroller · FL DOR · WA DOR · FEMA).
- **Villain beat ("Sound familiar"):** the **light-gray** band (not dark), near-black headline with "_not knowing_" in pink, calm ink-2 body.
- **How it works (Watch · Match · Apply):** three white cards with mono step numbers (STEP 01/02/03 in pink), pink icon-chips, keyboard-hint chips.
- **Who it's for:** a 3-up firm-type card grid; one inverted near-black "featured" card.
- **Trust:** the glass-box principle paragraph + boundary callout, beside a stack of stat cards (`100%` sourced · `0` auto-applied · `Audited`).
- **What's inside:** 2-up feature modules (Alerts · Risk-ranked worklist · Reminders & drafted emails · Evidence on every date) on a faint pink-tinted band.
- **Capability metrics:** 4-up metric cards with pink top-rules (50+DC states · 24/7 · 100% sourced · 24h undo) — "measured, not promised".
- **Close:** calm centered CTA — "Walk into next busy season already ahead." with pink + ghost CTAs.
- **Honesty:** "sources we watch" strip in place of logos; no "AI"/"Radar"/pricing/award badges/"15,000 properties"; every source + trust claim literally true.
