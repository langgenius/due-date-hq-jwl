# Frontify — Design System (extracted, for DueDateHQ)

A reusable "brand skill": the design language of frontify.com, captured in enough detail to rebuild the look on DueDateHQ. Matches the depth/format standard set by `legora-design-system.md` and obeys its **§0 global build rules** (light only; adapt the copy to this brand's voice keeping the locked headline + facts + honesty; polish every detail). Where Legora *withholds* (warm paper, hairlines, almost no UI), Frontify **shows the product**: a crisp, white, software-forward enterprise surface where the hero of every section is a polished, fully-rendered product-UI specimen. Source: frontify.com/en + the document-parsing reference (`Screenshot …14.49.33.png` — an invoice parsed into colour-tabbed labeled fields on a light dot-grid) and the editorial-serif references in `references - build/`. 2026-06-18.

> **§0 reminder — LIGHT ONLY.** Frontify's own site is light. This system is built entirely on white + two light-grays; there are **no dark sections, no dark hero, no dark cards, no `prefers-color-scheme: dark`**. Any dark band, panel, evidence drawer, or CTA slab from a v1 page is **converted to a light treatment** in this palette (white/`band` surface, crisp 1px border, indigo accent). Dark is permitted only as a tiny element — a status dot, an icon glyph, the logo mark — never as a section or card background.

---

## 1 · Essence

**Sophisticated · enterprise · product-forward · confidently clean.** A modern SaaS surface that looks like the inside of a well-run platform, not a brochure. It earns trust the way enterprise software does — by *showing the work*: real-looking product cards, structured data, labeled fields, asset tiles, extraction overlays. Bright clinical white, generous air, bold near-black headlines, and **one confident indigo accent** that does all the pointing. Nothing is dusty, dark, or editorial; everything feels engineered, current, and in-control.

The single most distinctive move, and the thing to copy: **the page is built out of light product-UI specimens.** Frontify doesn't draw an illustration of brand management — it renders a fragment of the actual interface (an asset grid, an auto-tagged image card, a document parsed into labeled colour-tabbed fields) sitting on clean white with a faint dot-grid behind it. The mockup *is* the marketing. For DueDateHQ that maps perfectly onto the **document-intelligence visual** — an IRS / state notice parsed into labeled, *sourced* fields — rendered as a light, white-card surface, never a dark drawer.

Contrast with Legora in one line: **Legora = warm paper + hairlines + withhold the UI; Frontify = white canvas + crisp borders + lead with the UI.** Same restraint and the same single-accent discipline, opposite material — and both fully light.

## 2 · Color

Bright neutral system on white, structured by light-gray bands, anchored by near-black ink, pointed by one indigo. Color carries either **structure** (which band you're in) or **meaning** (status, the accent's "look here") — never decoration. The whole palette is light: there is no dark surface token.

| Token | Hex | Role |
|---|---|---|
| `bg` | `#FFFFFF` | Page ground — clinical white, the default everywhere |
| `band` | `#FAFAFB` | Light-gray section band (the alternating rhythm) |
| `band-2` | `#F4F4F6` | Deeper inset / table-header / chip ground |
| `ink` | `#0C0C0E` | Headlines, primary text — near-black, not pure black |
| `ink-2` | `#2A2A30` | Body emphasis, strong labels |
| `muted` | `#6A6A73` | Body, secondary text |
| `muted-2` | `#9A9AA3` | Captions, table eyebrows, fine print |
| `line` | `#ECECEE` | Hairline borders, card edges, dividers (the workhorse) |
| `line-2` | `#E0E0E2` | Slightly stronger control border (buttons/inputs) |
| `accent` | `#4F46E5` | **The one indigo** — primary in-product CTA, links, "look here", active state |
| `accent-ink` | `#3F37C9` | Accent hover/pressed; the deepest readable indigo for emphasis |
| `accent-soft` | `#EEEDFC` | Accent tint — icon chips, active rows, soft fills, highlighted source quote |
| `navy` | `#2E368C` | DueDateHQ brand navy — logo mark; sparing structural accent |
| `cyan` | `#14C5F6` | DueDateHQ brand highlight — used *only* inside containers (logo mark bars, a tiny dot/glyph), never as running text, never on a dark ground (there are none) |
| `amber` | `#B7791F` text / `#FEF6E6` bg | Severity: urgent / needs-review (warm, not red) |
| `green` | `#1A7F4B` text / `#EAF7EF` bg | Verified / ready / "yes" |

**Rules:** white is the constant; the two gray bands create rhythm without ever introducing a *color* band. **One** chromatic accent (indigo) for action, links, and the active/look-here signal — full stop. Status color (amber/green) appears *only* on status objects (an Urgent pill, a Verified badge, a Ready chip), never as decoration and never red-on-resolved. The DueDateHQ cyan/navy are reserved for the logo mark and the occasional structural detail — cyan never becomes colored running text (house rule "no coloured text on dark" is moot here since nothing is dark, but the spirit holds: chroma lives in containers, not type). Contrast: ink on white ≈ 18:1; indigo on white ≈ 6.5:1; `accent-ink` on white ≈ 9:1; all AA+.

## 3 · Typography

One contemporary grotesk does ~everything; a serif italic is available for *one* editorial emphasis word; mono carries all data. This is a UI-typographic system, not a print one — weight and size do the hierarchy, not a second display face.

| Family | Font (Google) | Fallback | Use |
|---|---|---|---|
| Display / UI | **Inter** | `system-ui, -apple-system, sans-serif` | Headlines, nav, labels, body, product-UI chrome |
| Editorial accent | **Newsreader** (italic) | `Georgia, serif` | Optional: one emphasis word in the hero / a single pull-quote |
| Numerals / data | **JetBrains Mono** | `ui-monospace, monospace` | Stats, dates, form codes (05-158), EINs, table verdicts (tabular-nums) |

**Scale (px · weight · line-height · tracking):**

| Token | Size | Wt | LH | Tracking |
|---|---|---|---|---|
| eyebrow | 12 | 700 | 1 | `0.09em` UPPERCASE |
| body-sm | 13.5 | 400 | 1.55 | 0 |
| body | 17 | 400 | 1.6 | 0 |
| lead | 18 | 400 | 1.6 | `-0.005em` |
| h4 / card-title | 16.5 | 700 | 1.2 | `-0.015em` |
| h3 | 20–21 | 700 | 1.2 | `-0.02em` |
| h2 (section) | clamp(30–40) | 800 | 1.1 | `-0.032em` |
| display (hero) | clamp(38–58) | 800 | 1.04 | `-0.035em` |
| stat | clamp(33–48) | 800 | 1 | `-0.03em` |

**Usage:** headlines are **heavy (800) and tightly tracked** — this is the enterprise-confident signal, distinct from Legora's lighter 600 editorial grotesk. The hero may optionally set one word as a subtle indigo gradient *or* a Newsreader italic (pick one device, never both). Eyebrows are uppercase, tracked, and — Frontify's signature — frequently **indigo, not gray**, because the accent is allowed to label sections. Body is generous (17px/1.6). Every number, date, and code is mono + `tabular-nums` so columns align.

## 4 · Spacing & layout

- **Base** 4px. Vertical section padding **96px** desktop / **64px** mobile. Air is generous but tighter than Legora's 120 — this is a working surface, not a journal spread.
- **Max content width** ~1180px, centered, with comfortable side margins (`--pad` 24px desktop / 18px mobile).
- **Grid** 12-col, 24px gutter. The hero and most "spotlight" sections are a **two-column split**: copy on the left, a light product-UI mockup on the right (≈1.04 : 1). Feature and step grids are even 3- or 4-up.
- **Rhythm:** white section → light-gray `band` → white section. The alternation is the page's metronome. Unlike Legora (constant paper + hairline rules), Frontify **does** use bands — but only the two grays, never a colored or dark band — plus a 1px `line` top/bottom on each band so the seam is crisp.

## 5 · Radius · borders · elevation

- **Radius scale (fixed, never freelanced):** `16px` outer product-surface wrapper · `12px` cards / inner panels · `8px` buttons, inputs, table cells, chips' parent · `999px` pills, status chips, avatars · `4–6px` compact mono kbd keys. Larger radius than Legora — softer, more "app."
- **Borders:** 1px `line` is the workhorse and is *everywhere* — it's how Frontify delineates without shadow. Controls get `line-2`. Crisp, hairline, never heavy. (Never a per-side stroke on a rounded box — uniform border or none.)
- **Elevation:** **mostly border + contrast, with one restrained product shadow.** Flat cards get no shadow (border does the lift). The signature product surfaces (hero mockup, alert panel, document-intelligence visual, evidence card) get exactly one soft card shadow — `0 12px 34px -14px rgba(12,12,14,.16)` plus a 1px inset top highlight — to float them off the white. Never a glow, never blur ≥ 24, never a shadow on a flat content card. Micro-shadow (blur ≤ 4) only on small affordances (a backdrop caption chip).

## 6 · Components

- **Button / primary (page-level):** `ink` fill, white text, radius 8, padding 13×20, 15px/600. Hover → pure black + a soft drop. This near-black primary is the Frontify "Book demo / Get started" button. One per view.
- **Button / accent:** `accent` indigo fill, white text — used for the *in-product* action (the "Apply", "Open the workbench") so the action the page wants you to take reads as the same indigo as the live UI. Hover → `accent-ink` + soft indigo drop.
- **Button / ghost:** white fill, `line-2` border, ink text. Hover → `band` fill + darker border. The secondary ("Try it live").
- **Eyebrow:** uppercase Inter 12/700, `0.09em` — **indigo** by default, `muted` when neutral.
- **Pill / status chip:** radius 999, soft tint bg + matching text + 5–6px dot. `accent-soft`/indigo (waiting/active), `green-bg`/green (verified/ready), `amber-bg`/amber (urgent/needs-review). The nav status pill uses a 1px `line` outline + a green pulse dot.
- **Cards:** allowed and central — radius 12, 1px `line`, white fill, **no shadow** by default; on hover lift via border-darken + the soft card shadow + 2px translateY. (Frontify uses cards freely; the discipline is no shadow at rest.)
- **Product surface:** the signature container — radius 16, 1px `line`, the soft card shadow, an **app-bar** header (traffic dots + breadcrumb + a live "Monitoring on" pulse), then real UI inside, all on white. This is the hero element.
- **Table:** 1px `line` row rules, uppercase `muted-2` headers on `band`, mono data cells, hover row → `band`. The DueDateHQ column emphasized by accent header text, not by a fill.
- **kbd key:** mono 11px, `band` fill, `line-2` border with a 2px bottom border (a "physical key"), radius 6 — used to show keyboard shortcuts on the steps.
- **Nav:** sticky, translucent white (`rgba(255,255,255,.82)` + blur), 1px bottom `line`; muted 14.5px links that turn indigo on hover; a status pill + an ink primary CTA on the right.

## 7 · Imagery & iconography

- **Imagery is light product-UI, not photography.** This is the core of the system. Where Frontify shows its own asset-management UI on white (asset grids, auto-tag cards, and the signature **document-parsing visual** — an invoice on the left, parsed into labeled colour-tabbed field cards: a blue **address** tab, a purple **table** tab, an amber **line items** tab, a green **total** tab, each over a little 1px-bordered white data card on a faint dot-grid), DueDateHQ shows **its** UI: an Alerts inbox, an alert-detail with an affected-clients table, a risk-ranked worklist, and the **document-intelligence visual** — an official IRS / Texas-Comptroller notice parsed into clean labeled, *sourced* fields (source link · exact quote · verified date), rendered as **light white cards** beside the document, like a real notice on a desk being read into structure. (Adapt Frontify's colour-tabbed field labels to DueDateHQ's accent-soft/green/amber field tabs — but DueDateHQ's are *sourced*: each carries a citation, never a bare extraction.)
- **No stock photography, no 3D blobs, no mascots, no gradient-mush hero, and no dark drawer.** The only "texture" is an optional very-faint dot-grid behind a floating mockup, and a barely-there radial accent wash high in the hero (≈ 7% indigo). Everything else is white.
- **Icons:** outline, 1.5–2px stroke, 18–22px, `ink`/`muted`/`accent`. Sit in soft `accent-soft` or `band` rounded chips (radius 10–11) at feature/step heads. Used purposefully, not decoratively.

## 8 · Motion

- One tempo: **150–200ms ease-out** (`cubic-bezier(0,0,0.2,1)`) for hovers, fades, reveals. Cards lift 2px on hover; content fades + rises ~8px on scroll-in, staggered ~60ms.
- One ambient loop allowed: a slow "live" pulse-ring on the Monitoring-on dot (≈2s) — it signals *the product is watching*, which is on-message. Nothing bounces, nothing parallaxes hard.
- Respect `prefers-reduced-motion`: collapse all animation + transition to instant.

## 9 · Voice & visual copy treatment

**Confident-modern enterprise.** Plain, current, in-control — enterprise software that respects the reader's time and sounds like it already runs at scale. Outcomes stated, never hyped; the product is shown rather than adjective-stacked. Lines are short and declarative, with a quiet swagger ("It runs the long tail. You make the calls." · "Every number on the screen clicks back to its source."). Eyebrows are crisp uppercase labels, often indigo. The product's *principle* (glass-box) is allowed a slightly larger, calmer statement but stays in the grotesk — Frontify doesn't do a serif manifesto pull-quote the way Legora does (one optional serif emphasis word in the hero is the only serif license). All data — dates, counts, codes, EINs — is set in mono so the copy reads as *operational*, not marketing. The locked headline ("Catch every tax-deadline change — and see exactly who it affects.") and every fact + honesty rule are preserved verbatim; only the *supporting* copy is tuned to this confident-modern register.

## 10 · Signature section patterns

1. **The product-split hero** — left: indigo pill eyebrow → heavy 800 grotesk headline (one optional indigo-gradient/serif emphasis on *who*) → 17–18px lead → ink primary + ghost secondary → a row of soft trust chips. Right: **the floating light product surface** (app-bar + live alert cards) on white with a faint accent wash and dot-grid stage. This split *is* Frontify.
2. **The sources/credibility strip** — a thin `band` strip directly under the hero: a quiet label + a flat row of the things the product watches/integrates. For DueDateHQ this is the **"sources we watch"** strip (IRS · CA FTB · NY DTF · TX Comptroller · FL DOR · WA DOR · FEMA) standing in for the enterprise logo wall — honest, not borrowed credibility.
3. **The contrast beat (light)** — one `band` section that breaks the white rhythm with a small lifted white "before/after" panel (the villain beat). The break is achieved with the gray band + a bordered specimen, **not** with an inverted dark slab; the "live" row is highlighted with an `accent-soft` fill + indigo accent.
4. **The spotlight mockup section** — a full light product specimen on a `band`: an alert-detail panel + a "what happens on apply" aside + a risk-ranked worklist table. The interactive "Try it live" lives here.
5. **The principle + document-intelligence pair** — copy (glass-box) on the left with mono stats (`100%` sourced · `0` auto-applied · Audited); a **light evidence card / document-intelligence visual** on the right (the notice parsed into a source-link field, an exact-quote field with an `accent-soft` highlight, and a green Verified badge) — the signature extraction, rendered white-on-white.
6. **Even feature/integration grids** — 3-up feature cards, 4-up integration cards, each icon-chip + title + line of copy.
7. **The light closing CTA** — a rounded `band`/white slab (1px `line`, soft card shadow, faint indigo radial wash) with a pill + heading + accent CTA + ghost secondary. Confident close, still light.

Bands and product surfaces carry the rhythm; **the light mockup is always the visual payload.**

## 11 · Do / Don't

- ✅ Clinical white + two light-gray bands, near-black 800 headlines, **one** indigo accent, crisp 1px borders, light product-UI mockups as the hero of every section, mono for all data, fixed radius scale, status color only on status objects, exactly one soft shadow on product surfaces, the document-intelligence visual rendered white-on-white.
- ❌ **Any dark section / band / card / hero / evidence drawer / CTA slab** (convert all to light); a `prefers-color-scheme: dark` variant; a second chromatic accent; colored section bands; drop shadows on flat content cards; glows/blur ≥ 24; stock photography or 3D blobs; borrowed-logo credibility wall; red-on-resolved; per-side strokes on rounded boxes; freelanced radius values (6/10/14); a serif display face doing real hierarchy work.

## 12 · Applying to DueDateHQ

- **Hero:** locked headline "Catch every tax-deadline change — and see exactly who it affects." (optional indigo-gradient or Newsreader-italic on *who*); indigo pill eyebrow "Never miss a deadline change · FED + 50 states + DC"; ink primary "Open the workbench" + ghost "Try it live ↓"; soft trust chips. Right: the **floating light Alerts product surface** with the live Texas-Comptroller alert and "Apply to 12".
- **Sources strip:** the honest "sources we watch" band in place of an enterprise logo wall — IRS · CA FTB · NY DTF · TX Comptroller · FL DOR · WA DOR · FEMA.
- **Villain beat ("Sound familiar"):** the one **light** contrast section (gray `band`), with a small white before/after panel ("checked by hand / unread / fragile" → an `accent-soft`-highlighted "caught" row). No dark slab.
- **How it works (Watch · Match · Apply):** three even cards with STEP 01/02/03 mono labels, accent-soft icon chips, and mono kbd shortcut keys.
- **Try it live:** the spotlight mockup section on a band — alert-detail panel + "what happens on apply" aside + risk-ranked worklist table; "Open the workbench" / "Try it live" CTAs.
- **Why you can trust it:** the principle (glass-box) + mono stats (`100%` Sourced · `0` Auto-applied · Audited) paired with the **light document-intelligence visual** (source link · exact quote with `accent-soft` highlight · green Verified badge) — the parsed-notice signature, white-on-white.
- **What's inside:** 3-up feature cards; **integrations** as a 4-up grid (calendar feed / email digest / your existing tools / shared team workload).
- **Close:** the **light** rounded CTA slab (band + 1px line + faint indigo wash) — "Walk into next busy season already ahead." + accent CTA.
- **Honesty (locked):** "sources we watch" strip instead of logos; **no "AI" / "Radar" / pricing / fake proof** (no Microsoft/OpenAI/etc.); keep every source/trust claim literally true; CTAs are "Open the workbench" / "Try it live"; the light product-UI mockups + the document-intelligence evidence visual are the signature elements and must stay.
