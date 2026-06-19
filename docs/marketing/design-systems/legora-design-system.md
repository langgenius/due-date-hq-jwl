# Legora — Design System (extracted, for DueDateHQ)

A reusable "brand skill": the design language of legora.com, captured in enough detail to rebuild the look on DueDateHQ. This file is the **depth/format standard** for the other reference design systems in this folder. Source: legora.com + the editorial-serif references in `references - build/` (Popcorn, the print/document clippings). 2026-06-18.

---

## 0 · Global build rules (apply to EVERY reference page, not just Legora)

These override anything in a v1 page:

- **Light only — no dark mode, no dark sections.** Every page is built on light / warm grounds. Convert any dark hero, band, card, or table from a v1 into a **light** treatment in the brand's own palette. No `prefers-color-scheme: dark` variant. (Dark accents are fine _only_ as small elements like a status dot or an icon, never as a section background.)
- **Adapt the copy to the brand's voice.** Keep the **locked headline** — "Catch every tax-deadline change — and see exactly who it affects." — and every fact + honesty rule, but rewrite the _supporting_ copy (subhead, section eyebrows/titles, intros, feature blurbs, microcopy, CTA support lines) in **this reference's tone**. These are style explorations; per-design voice is the point — editorial-restrained (Legora), warm-conversational (Pally), technical-precise (AutoSend), enterprise-calm (Voiceflow), bright-friendly (Acctual), confident-modern (Mews/Frontify), indie-technical (visitors.now).
- **Polish — miss no detail.** Fully translate the reference's visual language; refine palette, type scale, spacing, hierarchy, components, and the signature visuals (especially the **document-intelligence** visual) to a high aesthetic bar.
- **Honesty (unchanged):** no "AI" / "Radar" / pricing / fabricated proof; a "sources we watch" strip in place of logos; "Open the workbench" / "Try it live" CTAs.

---

## 1 · Essence

**Editorial · premium · restrained · institutionally confident.** A high-end editorial feel — think a modern professional journal printed on warm stock. Oversized headlines, one disciplined accent, hairline rules instead of cards. It earns authority by _withholding_: almost no color, almost no decoration, enormous whitespace. The reader feels they're looking at something serious and expensive.

The single most distinctive move: **content sits on warm paper and is separated by full-width hairlines, never by boxes or shadows.**

## 2 · Color

Mostly monochrome on warm paper + one navy accent. Color carries meaning only (risk/status), never decoration.

| Token          | Hex                             | Role                                  |
| -------------- | ------------------------------- | ------------------------------------- |
| `paper`        | `#F5F2EA`                       | Page ground (warm ivory)              |
| `surface`      | `#FBFAF6`                       | Lifted paper for the rare inset block |
| `ink`          | `#1A1A18`                       | Primary text, headlines               |
| `ink-2`        | `#4A483F`                       | Body / secondary text                 |
| `muted`        | `#73716A`                       | Tertiary, captions, nav               |
| `faint`        | `#9A978C`                       | Eyebrows, fine print, hairline labels |
| `hairline`     | `#DCD7C9`                       | Dividers, rules, inset borders        |
| `accent`       | `#2E368C`                       | Primary CTA, links (warm navy-indigo) |
| `accent-hover` | `#232A6E`                       | CTA hover/pressed                     |
| `urgent`       | `#9A6A12` text / `#F3E6CC` tint | Severity: urgent (amber)              |
| `ok`           | `#2E7D52`                       | Resolved / "yes" / verified           |

**Rules:** paper everywhere; ink for type; **one** accent (navy) for action + links only. Severity color appears _only_ on risk/status (an Urgent pill, a Resolved check) — never as decoration, never red on a resolved row. Contrast: ink on paper ≈ 13:1; navy on paper ≈ 7:1 (AA+).

## 3 · Typography

Two families do all the work: a grotesk for structure, a serif italic for editorial emphasis.

| Family           | Font (Google)           | Fallback                           | Use                                                       |
| ---------------- | ----------------------- | ---------------------------------- | --------------------------------------------------------- |
| Display / UI     | **Instrument Sans**     | `-apple-system, Inter, sans-serif` | Headlines, nav, labels, body-UI                           |
| Editorial accent | **Newsreader** (italic) | `Georgia, serif`                   | One emphasis word in the hero; the "principle" pull-quote |
| Numerals         | **Geist Mono**          | `ui-monospace`                     | Stats, dates, EINs, table verdicts (tabular-nums)         |

**Scale (px · weight · line-height · tracking):**

| Token          | Size         | Wt                        | LH   | Tracking           |
| -------------- | ------------ | ------------------------- | ---- | ------------------ |
| eyebrow        | 12           | 600                       | 1    | `0.14em` UPPERCASE |
| body-sm        | 14           | 400                       | 1.5  | 0                  |
| body           | 18           | 400                       | 1.55 | 0                  |
| lead           | 21           | 400                       | 1.5  | `-0.01em`          |
| h3             | 22           | 600                       | 1.2  | `-0.01em`          |
| h2 (section)   | clamp(30–40) | 600                       | 1.1  | `-0.02em`          |
| display (hero) | clamp(44–64) | 600                       | 1.03 | `-0.03em`          |
| pull-quote     | clamp(28–36) | 400 _italic_ (Newsreader) | 1.2  | `-0.01em`          |

**Usage:** headlines = grotesk, tight tracking, oversized. The hero may set **one** word in Newsreader _italic_ for editorial lift (e.g. _"…exactly **who** it affects."_). Eyebrows are uppercase, tracked, `faint`. Body is generous (18px/1.55). Numbers are always mono + tabular.

## 4 · Spacing & layout

- **Base** 4px. Vertical section padding **96–120px** desktop / **56px** mobile. This whitespace _is_ the design.
- **Max content width** ~1120px, centered, with wide side margins.
- **Grid** 12-col, 24px gutter. Hero and most sections are **left-aligned** (not centered) — editorial, not landing-pagey.
- **Rhythm:** section → full-width hairline → section. No alternating color bands; the paper is constant. Lift comes from type scale + whitespace, not background changes.

## 5 · Radius · borders · elevation

- **Radius:** 8px on buttons/inputs/inset blocks · 999px on pills/eyebrow badges · **0** on section rules and most blocks. Low-radius is part of the editorial seriousness.
- **Borders:** 1px `hairline`. Section dividers are full-bleed 1px `hairline`.
- **Elevation:** **none.** No shadows, no gradients, no glows. The only "lift" is `surface` vs `paper` (a 2–3% value shift) + a hairline.

## 6 · Components

- **Button / primary:** `accent` fill, white text, radius 8, padding 14×24, 15px/500, tracking 0. Hover → `accent-hover`. One primary per view.
- **Button / secondary:** ink text + 1.5px ink underline (a "text link with weight"), or a hairline-outline ghost. No second fill color.
- **Eyebrow:** uppercase Instrument Sans 12px/600, `0.14em`, `faint`; may sit in a pill.
- **Pill badge:** radius 999, 1px hairline, `faint` text, optional 6px status dot — e.g. "● Now watching 50 states".
- **Cards:** _avoid._ Default to hairline-separated blocks. When a container is unavoidable, use `surface` + 1px hairline + radius 8 + **no shadow**.
- **Nav:** muted 14px text links + one `accent` pill CTA, on paper, no border (or a single bottom hairline on scroll).
- **Stat:** big mono number (clamp 33–48 / 600) over a 13px `muted` label; stats sit in a hairline-ruled band, equal columns.
- **Comparison/table:** hairline row rules, generous 56px+ row height, mono verdicts, the DueDateHQ column subtly emphasized (ink header, `ok` checks) — but still flat.

## 7 · Imagery & iconography

- **Imagery is editorial and sparse.** The signature image is the **document-intelligence visual**: an official notice (IRS / "Texas Comptroller") rendered like a real paper clipping/letter — masthead, serif body, the key sentence highlighted — with the change _extracted_ into clean labeled fields beside it. It looks like a document on a desk, not a SaaS illustration.
- No stock 3D, no gradient blobs, no mascots. Product UI, when shown, is rendered minimally (paper, hairline, mono numbers).
- **Icons:** outline, 1.5px stroke, 18–20px, `ink`/`muted`. Used rarely.

## 8 · Motion

- One tempo: **180ms ease-out** (`cubic-bezier(0,0,0.2,1)`) for fades/reveals. Content fades + rises 8px on scroll-in, staggered ~60ms.
- Restraint over flourish; nothing bounces. Respect `prefers-reduced-motion` (collapse to instant).

## 9 · Voice & visual copy treatment

Plain, confident, editorial — outcomes stated, never hyped. Eyebrows are quiet uppercase labels. The hero allows exactly one serif-italic emphasis word. The product's _principle_ gets a serif pull-quote (a "manifesto" beat). Microcopy is mono where it's data.

## 10 · Signature section patterns

1. **The editorial hero** — left-aligned, pill eyebrow → oversized grotesk headline (one serif-italic word) → 18px lead → `accent` CTA + ghost secondary → the document-intelligence visual to the side. Whitespace-heavy.
2. **The impact band** — a hairline-ruled row of 3–4 big mono stats (e.g. `50 +DC` watched · `24/7` · `100%` sourced · `1-click`).
3. **The principle pull-quote** — a single large Newsreader-italic statement of the product belief, unattributed (or "The DueDateHQ principle"), acres of whitespace.
4. **The trust band** — hairline-separated row: source-backed · audited · per-practice isolation · the not-tax-advice boundary, set quietly.

Sections are always separated by **full-width hairlines**, never cards.

## 11 · Do / Don't

- ✅ Warm paper, hairlines, whitespace, oversized grotesk, one navy accent, mono numbers, one serif-italic emphasis word.
- ❌ Drop shadows, gradients, glassmorphism, rounded card grids, stock illustration, a second accent color, centered landing-page hero, color used as decoration.

## 12 · Applying to DueDateHQ

- **Hero:** locked headline "Catch every tax-deadline change — and see exactly _who_ it affects." with _who_ in Newsreader italic; pill eyebrow "Never miss a deadline change"; navy CTA "Open the workbench" + ghost "Try it live"; document-intelligence visual at right.
- **Villain beat ("Sound familiar"):** a quiet editorial paragraph in `ink-2`, not a loud band.
- **How it works (Watch · Match · Apply):** three hairline-separated steps with big mono step numbers (01 / 02 / 03), no cards.
- **Why you can trust it:** the **principle pull-quote** (glass-box belief) + the trust band; stats `100%` sourced · `0` auto-applied · audited.
- **What's inside / comparison:** hairline blocks / a flat comparison table.
- **Close:** a calm CTA on paper — "Walk into next busy season already ahead."
- **Honesty:** "sources we watch" hairline strip (IRS · CA FTB · NY DTF · TX Comptroller · FL DOR · WA DOR · FEMA) in place of logos; no "AI"/"Radar"/pricing/fake proof; keep source/trust claims literally true.
