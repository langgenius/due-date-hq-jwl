# AUTOSEND — Design System (extracted, for DueDateHQ)

A reusable "brand skill": the design language of autosend.com — **editorial-serif meets technical dev-tool** — captured in enough detail to rebuild the look on DueDateHQ. Depth/format standard: the Legora system in this folder. Source: autosend.com + the editorial-serif and document-parsing references in `references - build/` (the AUTOSEND hero with the pixel-art mountain, the document-clipping → extracted-fields screen, the centered Newsreader-serif "One global plan / No hassle" hero). 2026-06-18.

> Follows §0 GLOBAL BUILD RULES of `legora-design-system.md`: **LIGHT ONLY**; **ADAPT COPY** to AUTOSEND's technical-precise dev-tool voice while keeping the locked headline + every fact + honesty rule; **POLISH** every detail.

---

## 0 · Global build rules (inherited — apply to EVERY reference page)

- **Light only.** Off-white ground, ink type, one violet/indigo accent. No dark hero, band, table, or `prefers-color-scheme: dark`. Dark appears only as a *small* element — the chip behind the extraction icon, a mono key, the brand mark, the single inverted close band — never as a section background that defines the page mood. (The close section may invert to ink for one beat of weight; everything above it stays on paper.)
- **Adapt the copy to AUTOSEND's voice** (see §9). Keep the **locked headline** — "Catch every tax-deadline change — and see exactly *who* it affects." with *who* in serif-italic — and every fact + honesty rule. Rewrite eyebrows, subheads, intros, blurbs, microcopy in the *technical-precise, comparison-driven* register.
- **Polish.** Fully realize the signature visuals — above all the **document-intelligence extraction** (clipping → labeled fields) and the **comparison table**.
- **Honesty (unchanged).** No "AI" / "Radar" / pricing / fabricated proof. A "sources we watch" strip replaces logos. CTAs: "Open the workbench" / "Try it live". A literal "What it never does" boundary — mirroring AUTOSEND's own *"What AutoSend Does NOT Do"* section — is on-brand here, not a deviation.

---

## 1 · Essence

**Editorial-serif meets technical dev-tool. Precise, comparison-driven, characterful, honest by construction.** AUTOSEND reads like a developer's reference doc that hired an art director. The frame is a technical product page — monospace labels, an endpoint mentality, a literal *"What it does NOT do"* section, "under 30 minutes," "the modern alternative to X, Y, Z" — but the headline is set in a large serif with one **italic** word, and the imagery has *character*: a hand-drawn pixel-art mark, or a real document being **parsed into labeled fields** on a faint engineering grid. The result feels both human and exact: a tool built by people who respect your time and refuse to oversell.

The single most distinctive move: **a serif-italic display headline, centered, floating on off-white over a faint grid — paired with monospace/uppercase labels and a document that visibly resolves into structured fields.** Editorial warmth up top; engineering precision in the labels and the comparison.

Three pillars, always present:
1. **Serif display + mono labels** — the warm/precise contrast that *is* the brand.
2. **The parse** — a document clipping → extracted, violet-labeled fields. Show the machine *reading*, not a marketing illustration.
3. **The comparison** — "the modern alternative to ___." Position by an honest table, not adjectives.

## 2 · Color

Off-white ground, ink type, **one violet/indigo accent** that carries meaning (extraction, action, "this is ours"). Severity stays scoped to status. Light only.

| Token | Hex | Role |
|---|---|---|
| `ground` | `#F5F4F1` | Page ground (off-white, faintly warm) |
| `ground-2` | `#EFEEEA` | Alternate band / inset shade |
| `paper` | `#FCFBF9` | Lifted paper — cards, the clipping, fields |
| `ink` | `#18181B` | Primary text, headlines, the dark chip/mark |
| `ink-soft` | `#3A3A40` | Body emphasis, secondary headings |
| `muted` | `#71717A` | Body, captions, nav links |
| `muted-2` | `#9A9A9F` | Tertiary, fine print, mono captions |
| `hairline` | `#E1DFD9` | Card borders, dividers |
| `hairline-2` | `#EAE8E2` | Inner rules, list separators |
| `line-strong` | `#D5D2CA` | Input/pill borders, grid lines |
| `violet` | `#6C5CE7` | **The accent** — action, extraction, links, "ours" |
| `violet-deep` | `#5847D6` | Hover / pressed |
| `violet-ink` | `#3A2E9E` | Violet text on tint (labels) — AA on `violet-tint` |
| `violet-tint` | `#EEEBFB` | Field-label backgrounds, "ours" cells |
| `violet-tint-2` | `#F4F2FD` | Faintest violet wash (comparison column) |
| `amber` | `#B7791F` text / `#F6ECD7` tint | Severity: needs-review |
| `green` | `#2F7D4F` text / `#E5F1E9` tint | Live / verified / "yes" |
| `cyan` | `#14C5F6` | Reserved highlight — the live dot on the inverted close band only |

**Rules:** off-white everywhere; ink for type; **one** accent (violet) for action, links, extraction, and the "this is DueDateHQ" emphasis. Severity (amber/green) appears *only* on status — a "Needs review" flag, a "Verified" check, a live dot — never as decoration. The pixel-art reference uses a tiny mosaic of violet/grey squares: chromatic interest lives in a *contained* mark, not loose on the page. Contrast: ink on ground ≈ 14:1; violet on paper ≈ 5.3:1 (AA for the 15px+ at which it's used); violet-ink on violet-tint ≈ 7:1.

## 3 · Typography

Two families carry the brand contrast: a **serif display** for editorial lift, a **monospace** for technical labels/data. A neutral grotesk handles UI body so the serif/mono pairing stays special.

| Family | Font (Google) | Fallback | Use |
|---|---|---|---|
| Display / editorial | **Instrument Serif** (regular + *italic*) | `Georgia, "Times New Roman", serif` | Hero headline, section H2s, the clipping masthead/lede, extracted-quote fields, big stat numerals |
| Labels / data | **IBM Plex Mono** (400/500/600 + italic) | `ui-monospace, "SF Mono", monospace` | Nav, eyebrows, field labels, source chips, table tags, keys, footer headings, dates/forms |
| UI body | **Inter** (400/450/500/600) | `system-ui, -apple-system, sans-serif` | Paragraphs, leads, buttons, feature copy |

**Scale (px · weight · line-height · tracking):**

| Token | Size | Family / Wt | LH | Tracking |
|---|---|---|---|---|
| mono-label | 11–12 | Plex Mono 500 · UPPERCASE | 1 | `0.12em` |
| body-sm | 13.5–14 | Inter 400 | 1.55 | 0 |
| body | 16 | Inter 400 | 1.6 | 0 |
| lead | 16.5–19.5 | Inter 400 | 1.62 | 0 |
| h3 | 19–22 | Inter 600 | 1.2 | `-0.01em` |
| h2 (section) | clamp(34–56) | Instrument Serif 400 | 1.04 | `-0.01em` |
| display (hero) | clamp(46–88) | Instrument Serif 400 | 1.02 | `-0.01em` |

**Usage:** the hero and every section title are **serif**, large, with **one italic word** for editorial emphasis (`who`, `not knowing`, `clicks back`, `already ahead`). Because Instrument Serif runs visually light, display weight stays at 400 — size carries the authority, not boldness. Labels, eyebrows, source chips, dates, EINs, forms, table verdicts are **mono, uppercase where they're labels, tabular for numbers.** Body is Inter at 16/1.6, generous and quiet so the serif/mono pair reads as the voice.

## 4 · Spacing & layout

- **Base** 4px. Vertical section padding **clamp(60–128px)** desktop / ~56px mobile. Whitespace is part of the editorial register.
- **Max content width** ~1160px, centered; narrow variant ~920px for the villain/close.
- **Grid** 12-col mental model, but the hero is **centered** (editorial-display, AUTOSEND-style) — eyebrow → serif headline → lead → CTAs → trust chips → the extraction visual, all stacked and centered. Interior sections center their heads and use 2–3-col card/feature grids.
- **The faint engineering grid.** A signature texture from the document-parsing reference: a very low-contrast dot/line grid (`line-strong` at ~6–8% opacity) can sit *behind* the extraction figure to read as "technical workspace." Never loud — it's a whisper, removed entirely on mobile if it crowds.
- **Rhythm:** constant off-white, sections separated by `--paper` / `--ground-2` value shifts + 1px hairline borders (not heavy color bands). One inverted ink band at the very end for the close.

## 5 · Radius · borders · elevation

- **Radius:** **16px** on cards / the clipping / fields (softer than Legora — this is a *tool*, friendlier); **8px** on inputs/inset; **999px** on pills, buttons, source chips, eyebrows; **6–11px** on small chips (keys, the extraction chip, brand mark); **0** on full-width section rules.
- **Borders:** 1px `hairline` on cards; 1px `line-strong` on pills/inputs. The "ours" comparison column gets a **2px violet** bottom border on its header — the one place a border carries emphasis.
- **Elevation:** mostly flat. **Two soft shadows only** — `--shadow-soft` (a 1px + a wide -18px diffuse) on lifted pills and fields; `--shadow-lift` (slightly deeper) on the clipping and the extraction chip so the "document on a desk" reads. Never a hard drop shadow, never a glow, never blur ≥ 24. Borders + the paper/ground value shift do most of the lifting.

## 6 · Components

- **Button / primary (`btn--violet`):** violet fill, white text, radius 999, padding 13×22, Inter 15/500, a soft violet-tinted shadow. Hover → `violet-deep`, lift 1px. The hero + close use this.
- **Button / dark (`btn--primary`):** ink fill, paper text — the compact nav CTA; hover transitions to violet (a small brand tell). One primary action per view.
- **Button / ghost:** transparent, ink text, `line-strong` border, radius 999. Hover → paper fill + ink border. The "Try it live ↓" secondary.
- **Eyebrow / mono-label:** Plex Mono 11–12 / 500 uppercase, `0.12em`, `muted`. Either bare (with a violet dot) or in a **pill-eyebrow** (paper, `line-strong` border, radius 999, soft shadow, a green "live" dot with a slow ripple).
- **Source chip:** Plex Mono 11.5, paper, hairline border, radius 999, a green live dot — "● IRS", "● TX Comptroller". The honesty strip is a row of these.
- **Cards (used, not avoided):** unlike Legora, AUTOSEND is comfortable with cards — paper, 1px hairline, radius 16, `--shadow-soft` or none. They read as tool panels. Hover lifts 2px + border darkens to `line-strong`.
- **Field (extraction output):** paper card radius 12, a violet-tint **mono label chip** at top (uppercase, `violet-ink`), then the extracted value — a serif quote, a `from → to` diff, or a client list — then a mono source line with a green "Verified" check. Fields animate in staggered (≈250/500/750ms) to dramatize the parse; collapse to instant under reduced-motion.
- **Key / kbd:** Plex Mono 11, a `kbd` with a 2px bottom border (a pressable cap) — `⌘ ↵ Apply`, `J K Move`. The dev-tool signature on the How-it-works steps.
- **Nav:** brand mark + wordmark + a mono "For US CPA practices" tag (left-bordered), mono-ish text links, a mono status pill ("● Early access · FED + 50 states + DC"), and the dark→violet CTA. Sticky, blurred off-white, a hairline appears on scroll.
- **Comparison table:** the centerpiece. Hairline row rules, 16px row padding, mono verdicts ("24/7 · 14 sources", "Yes · + 24h undo", "Narrow by design"); the DueDateHQ column washed `violet-tint-2` with a `violet-ink` header, a mono "The watch layer" tag, and a 2px violet underline. Checks are `green`; ours are `violet`; absent is a quiet `muted-2` ✕.

## 7 · Imagery & iconography

- **Two house styles, both characterful — never generic SaaS 3D.**
  1. **The document parse (primary signature).** A real official notice — "The Comptroller Record", masthead + serif lede + a violet-highlighted key sentence, body text fading out — connected by a dashed beam through a small dark **extraction chip** to a stack of **labeled output fields** (Source quote · The change · Who's affected). It visibly turns a *document on a desk* into *structured data*. This is AUTOSEND's "document-intelligence" screen, adapted: clipping → extracted fields, on a faint grid.
  2. **Pixel-art mark (optional accent).** Per the AUTOSEND hero, a small hand-drawn/pixel-art glyph carries personality — a mosaic of violet/grey squares (the extraction chip can echo this), or the stacked-bars DueDateHQ mark rendered with that same crafted, low-fi warmth. Used as a *contained* mark, not a hero illustration.
- No stock photography, no gradient blobs, no mascots, no glassmorphism.
- **Icons:** outline, 1.5–1.8px stroke, 17–20px, `ink`/`muted`/`violet`. Feather-style. The "scan/extract" frame icon and the eye/users/bolt set recur.

## 8 · Motion

- One tempo: **~180ms ease-out** (`cubic-bezier(0,0,0.2,1)`) for hovers, lifts, fades.
- **The parse animation** is the one allowed flourish: extracted fields fade + slide in from the right, staggered ~250ms apart, so the document visibly *resolves* into fields. A slow `ripple` (2.6s) on the green "live" dots signals continuous watching.
- Buttons lift 1–2px on hover; the arrow nudges 2px. Cards lift 2px. Nothing bounces, nothing spins.
- Respect `prefers-reduced-motion`: collapse animations to instant, set fields to their resting state, disable smooth scroll.

## 9 · Voice & visual copy treatment

**Technical, precise, comparison-driven, honest by omission.** AUTOSEND's copy specifies rather than sells: "the modern alternative to SendGrid, Resend, and Loops", "under 30 minutes", "pay per email sent, not per contact stored", and a literal *"What AutoSend Does NOT Do"*. Adapt DueDateHQ into that register:

- **Eyebrows are mono, uppercase, spec-like:** `HOW IT WORKS`, `WHY YOU CAN TRUST IT`, `THE WATCH LAYER`, `WHAT IT NEVER DOES`.
- **Positioning is comparative and concrete:** "They tell you a date. We tell you *when it changed*." "Not another calendar you maintain — the one that maintains itself." Name the alternatives (File In Time, TaxDome, Excel + Outlook) and beat them in a table.
- **Numbers do the persuading:** `14 sources` · `24/7` · `100% sourced` · `0 auto-applied` · `~30 minutes` · `24h undo`. Mono, tabular, everywhere a claim could be vague.
- **The honesty section is a feature, not a disclaimer.** Mirror AUTOSEND's "does NOT do": a "What it watches / What it never does" pair, stated flatly and confidently.
- **One serif-italic word** per headline carries the editorial warmth that keeps it from reading like a man page: *who*, *not knowing*, *clicks back*, *already ahead*.

The hero headline is **locked**; the spec voice lives in the supporting copy, eyebrows, blurbs, and the comparison verdicts.

## 10 · Signature section patterns

1. **The centered editorial-spec hero** — pill-eyebrow ("● Never miss a deadline change · FED + 50 states + DC") → centered serif display headline with one italic word → Inter lead → violet "Open the workbench" + ghost "Try it live ↓" → Google sub-CTA microline → trust chips → **the document-parse figure** below, captioned in mono. Centered, AUTOSEND-style.
2. **The parse figure** — clipping → dashed beam through the extraction chip → three labeled output fields, on a faint grid. The product's whole thesis in one image: it reads the notice and resolves it into who's affected.
3. **The sources strip** — a centered row of mono source chips with live dots ("Sources we watch · ● IRS · ● TX Comptroller …"), replacing a logo wall.
4. **The spec steps (Watch · Match · Apply)** — three tool-panel cards, each with a mono `01 · Watch` tag, an ink icon chip, and a `kbd` key row — the dev-tool tell.
5. **The watch / never pair** — a two-column "What it watches | What it never does", the honesty section reframed as capability spec (AUTOSEND's "does NOT do").
6. **The comparison table** — the positioning centerpiece: alternatives across the top, DueDateHQ's column washed violet with a "The watch layer" tag and mono verdicts.
7. **The inverted close** — one ink band at the very end (the only dark surface), violet CTA, a cyan live dot — a single beat of weight after acres of paper.

## 11 · Do / Don't

- ✅ Off-white ground, serif display with **one** italic word, mono/uppercase labels, **one** violet accent, a faint engineering grid, the document-parse figure, a comparison table, mono numbers, `kbd` keys, a literal "never does" honesty section, characterful (pixel-art / parse) imagery, soft 16px-radius tool cards.
- ❌ Dark page mood (one inverted close band is the only exception), a second accent color, gradient blobs, stock 3D, glassmorphism, hard drop shadows / glows, bold-weight serif, color as decoration, a generic centered "SaaS hero" with no parse figure, hype adjectives where a number would do.

## 12 · Applying to DueDateHQ

- **Hero:** locked headline "Catch every tax-deadline change — and see exactly *who* it affects." with *who* in Instrument Serif italic violet; pill-eyebrow "● Never miss a deadline change · FED + 50 states + DC"; violet "Open the workbench" + ghost "Try it live ↓"; Google sub-CTA; trust chips; the **document-parse figure** ("The Comptroller Record" clipping → Source quote / The change / Who's affected fields) on a faint grid.
- **Sources strip:** mono source chips with live dots — IRS · CA FTB · NY DTF · TX Comptroller · FL DOR · WA DOR · FEMA · "+ disaster declarations nationwide" — in place of logos.
- **Villain beat ("Sound familiar?"):** centered serif H2 with *not knowing* italic, one quiet Inter lead — the only soft, human paragraph.
- **How it works (Watch · Match · Apply):** three spec cards, mono step tags, `kbd` key rows.
- **Why you can trust it:** the glass-box paragraph + the "What it watches / What it never does" pair (AUTOSEND's "does NOT do") + three serif stat numbers (`100%` sourced · `0` auto-applied · `Audited`) + the dashed-border "Not tax advice" boundary.
- **What's inside:** a 3-col tool-card grid; the Alerts card leads with an ink (not violet) icon chip.
- **Comparison:** File In Time · TaxDome · Excel + Outlook vs **DueDateHQ ("The watch layer")** — violet-washed column, mono verdicts, "Narrow by design".
- **Reach row:** in-app / email / calendar-feed tool cards.
- **Close:** the one inverted ink band — "Walk into next busy season *already ahead*." with *already ahead* italic, violet CTA + ghost guided-setup, mono reassurance line.
- **Honesty:** sources strip not logos; no "AI"/"Radar"/pricing/fake proof; every source/trust claim literally true; "Open the workbench" / "Try it live" CTAs.
