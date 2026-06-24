# VISITORS.NOW — Design System (extracted, for DueDateHQ)

A reusable "brand skill": the design language of visitors.now, captured in enough detail to rebuild the look on DueDateHQ. Format/depth standard is `legora-design-system.md` §0–§12. Source: visitors.now + the dashboard-product references in `references - build/`. Voice for this exploration: **indie-technical** — a maker built this, ships in the open, and lets the product UI do the talking. 2026-06-18.

---

## 0 · Global build rules (inherited — apply to this page)

These override anything in a v1 page:

- **Light only — no dark mode, no dark sections.** Every band is white or light-gray. Convert any dark hero, band, card, or comparison table from a v1 into a **light** treatment (white / `#F7F8FA` gray) in this palette. The v1 visitors-indie had a _dark_ villain band and a _dark_ comparison table — both must become **light** here. Dark is allowed only as a tiny element (a `●` status dot, a mono caret, a sparkline stroke), never as a section ground.
- **Adapt the copy to visitors.now's voice.** Keep the **locked headline** — "Catch every tax-deadline change — and see exactly who it affects." — and every fact + honesty rule, but rewrite the _supporting_ copy (subhead, eyebrows, intros, blurbs, microcopy, CTA support) in the **indie-technical** register: plain, builder-direct, a little playful, never corporate. Short sentences. "One script tag" energy → here, "one paste, one click."
- **Polish — miss no detail.** Translate the reference fully: the white ground, the electric-blue accent, green for ✓, the light-gray product cards, monospace numerals everywhere data lives, the **dashboard-preview hero**, and the **signature comparison table** rendered light. Refine the document-intelligence visual to a high bar.
- **Honesty (unchanged):** no "AI" / "Radar" / pricing / fabricated proof on the page; a "sources we watch" strip in place of logos; "Open the workbench" / "Try it live" CTAs; every source/trust claim literally true.

---

## 1 · Essence

**Indie · technical · dashboard-forward · honest.** This is the look of a product built by one or two people who care about analytics and ship in public. It earns trust not by looking expensive but by looking **real**: the hero _is_ a screenshot of the working dashboard, the numbers are mono and look like live data, the comparison table names competitors out loud. Nothing is hidden behind marketing gloss. The mood is clean white space, one sharp electric-blue accent, green ticks for "yes," and crisp light-gray cards that read like product chrome.

The single most distinctive move: **the product UI is the hero.** Where editorial brands withhold and show a document, visitors.now leads with a _dashboard preview card_ — real stat tiles, a live feed, mono numerals — sitting on white. The marketing page and the app look like the same software. Decoration is near-zero; the credibility comes from the data-viz itself.

Second move: **the comparison table is a signature, not a footnote.** A clean, named, light-mode "us vs. them" grid with green checks and muted X's is a load-bearing section — indie products win by being legibly better at one thing, and they prove it in a table.

## 2 · Color

Clean white, near-black ink, **one electric-blue accent**, **green for ✓/yes/live**, and a tight set of cool grays for cards and lines. Color carries meaning (action = blue, verified/yes = green, severity = amber); it is never decoration. Light-only — no dark grounds.

| Token       | Hex       | Role                                                                      |
| ----------- | --------- | ------------------------------------------------------------------------- |
| `bg`        | `#FFFFFF` | Page ground (pure white)                                                  |
| `surface`   | `#F7F8FA` | Light-gray card / band fill (the "product chrome" gray)                   |
| `surface-2` | `#FBFCFD` | Faintest lift for nested rows / hover                                     |
| `ink`       | `#0B1220` | Headlines, primary text (near-black, cool)                                |
| `ink-2`     | `#3A4658` | Body / secondary text                                                     |
| `muted`     | `#6B7689` | Tertiary, captions, nav, mono labels                                      |
| `faint`     | `#9AA4B5` | Eyebrow tracking, fine print, placeholder X's                             |
| `line`      | `#E6E9EF` | Card borders, dividers, table rules                                       |
| `line-2`    | `#EEF1F6` | Faint inner hairlines, grid lines                                         |
| `blue`      | `#2D6BFF` | **Electric-blue accent** — primary CTA, links, active, the product column |
| `blue-700`  | `#1F50D6` | CTA hover / pressed                                                       |
| `blue-50`   | `#EDF3FF` | Blue tint — affected-client pill, icon chip, product-column wash          |
| `green`     | `#12B886` | **✓ / yes / verified / live** — checks, the "live" dot, the up-trend      |
| `green-50`  | `#E7F8F1` | Green tint — "reviewed" pill, status chip                                 |
| `amber`     | `#D9890B` | Severity: urgent (the only "warm" signal)                                 |
| `amber-50`  | `#FDF3E2` | Urgent tint                                                               |

**Rules:** white everywhere; ink for type; **electric-blue** is the single action/identity accent (CTA, links, active state, the highlighted product column). **Green is reserved** for affirmation — a ✓, a "live"/"watching" dot, an up-trend — never for buttons or decoration. Amber appears _only_ on urgent severity. Two-color discipline in practice: blue = "do / us," green = "yes / verified." Contrast: ink on white ≈ 16:1; blue on white ≈ 5.4:1; green check on white ≈ 3.2:1 so checks always pair with a label or shape, not color alone (AA-safe).

## 3 · Typography

A clean grotesk does structure and body; a **monospace carries every numeral and every piece of "machine" data** (stats, dates, sources, table verdicts, URLs, keys). The mono is the signature — it's what makes the page read like a dashboard.

| Family          | Font (Google)      | Fallback                                         | Use                                                                                                |
| --------------- | ------------------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Display / UI    | **Inter**          | `-apple-system, system-ui, sans-serif`           | Headlines, nav, labels, body, buttons                                                              |
| Numerals / data | **JetBrains Mono** | `ui-monospace, SFMono-Regular, Menlo, monospace` | Stats, dates, EINs, source hosts, table verdicts, kbd keys, eyebrows (tabular-nums + slashed zero) |

No serif. The indie-technical voice doesn't reach for editorial italic — its "lift" is the contrast between clean Inter and the mono data. The locked headline's emphasis clause is colored **electric-blue**, not set in a second family.

**Scale (px · weight · line-height · tracking):**

| Token              | Size         | Wt  | LH   | Tracking           |
| ------------------ | ------------ | --- | ---- | ------------------ |
| eyebrow (mono)     | 12           | 600 | 1    | `0.12em` UPPERCASE |
| body-sm            | 14           | 400 | 1.55 | 0                  |
| body               | 16–17        | 400 | 1.6  | 0                  |
| lead               | 18           | 400 | 1.6  | `-0.01em`          |
| h3                 | 18–19        | 700 | 1.2  | `-0.02em`          |
| h2 (section)       | clamp(26–38) | 800 | 1.08 | `-0.03em`          |
| display (hero)     | clamp(34–54) | 800 | 1.05 | `-0.03em`          |
| stat number (mono) | clamp(22–40) | 700 | 1    | `-0.02em`          |

**Usage:** headlines = Inter, weight 800, tight tracking. Eyebrows are **mono**, uppercase, tracked, `muted` or `blue`, often with a `—` rule or `●` dot prefix (the "terminal label" look). Every number, date, source host, and table verdict is **JetBrains Mono** with `font-feature-settings:"tnum" 1,"zero" 1`. Body is generous (16–17px / 1.6). Buttons are Inter 600.

## 4 · Spacing & layout

- **Base** 4px. Vertical section padding **80–96px** desktop / **56px** mobile. Whitespace is generous but the page is _denser_ than an editorial site — there's always product to show.
- **Max content width** ~1180px, centered. The hero is a **two-column** split (copy left, dashboard preview right) on desktop; most other sections are centered with a left-aligned section head.
- **Grid** 12-col, 24px gutter. Cards live in 2- and 3-col grids; the comparison table is full-width within the wrap.
- **Rhythm:** white section → optional `surface` (light-gray) band → white section. Bands alternate by **value, not hue** — a 1–2% gray shift plus a top/bottom `line`, never a colored or dark band. The "trust" and "sources" bands are the light-gray ones.

## 5 · Radius · borders · elevation

- **Radius:** 10–12px on cards and the dashboard preview · 8px on buttons/inputs/inner stat tiles · 6px on pills/keys/mono chips · 999px on status dots and round pills. Consistent, slightly soft — "product chrome," not editorial-sharp.
- **Borders:** 1px `line` on every card and table rule. The dashboard preview and the comparison table get a 1px `line` frame. The highlighted product column gets a `blue` ring/wash, not a heavier border.
- **Elevation:** **minimal and crisp.** Default cards are border + bg contrast, no shadow. The _hero dashboard preview_ may carry one soft product shadow (`0 24px 60px -32px rgba(11,18,32,.22)`) to lift it off the white as a "real window." Small affordances (stat tiles, alert rows) get at most a 1px border + a hairline hover shadow. No glows, no gradients-as-decoration (one faint blue/green radial wash behind the hero is the only gradient, very low opacity).

## 6 · Components

- **Button / primary:** `blue` fill, white text, radius 8, padding 12×20, 15px/600. Hover → `blue-700` + 1px lift. A subtle blue-tinted shadow is acceptable (it reads as "the live app's button"). One primary per view.
- **Button / secondary (ghost):** white fill, `ink` text, 1px `line` border, radius 8. Hover → `surface` + `muted` border. No second fill color.
- **Eyebrow:** **mono**, uppercase 12px/600, `0.12em`, `muted` or `blue`, prefixed with a `—` rule or `●` dot (terminal-label feel).
- **Pill / status:** radius 999 or 8, 1px border, mono text. "● Live · watching" = `green` dot + `green-50` fill; "● Early access" = `blue` dot. Affected-client pill = `blue-50` fill + mono count in `blue`.
- **Cards:** the default container — white or `surface`, 1px `line`, radius 10–12, no shadow. Hover lifts the border to a blue-tinted `#C9D6F5` + a hairline shadow. This is the workhorse; product cards, feature cards, and stat tiles are all this shape.
- **Stat tile:** light-gray `surface` inset, 1px `line`, radius 8; a 11px `muted` label over a big **mono** number (clamp 22–40 / 700), optional mono sub-line (`▲ 6 vs last week` in `green`). Stat tiles sit in equal-column rows inside the dashboard preview and the trust band.
- **Dashboard preview card** _(signature)_ — see §7.
- **Comparison table** _(signature)_ — light, white/gray, full-width; mono row labels left, competitor columns center, **DueDateHQ column gets a `blue` header + `blue-50` wash + `green` checks**; `✓` = green check, `✕` = `faint` X, partial/manual = `muted` mono text. Generous 56px rows, 1px `line` rules. See §10.
- **Nav:** white, sticky, 1px bottom `line`. Logo + audience tag (mono pill) left, text links center (`ink-2`, hover `blue`), a `green`-dot "Early access" status pill + one `blue` CTA right.

## 7 · Imagery & iconography

- **The hero IS the product.** The signature visual is a **dashboard-preview card**: a faux browser window (3 traffic-light dots, a mono URL `app.duedatehq.com/workbench`, a "live preview · not your data" caption) framing a real-looking workbench — a row of 3 **stat tiles** (Changes caught · this week `14`; Clients flagged `38`; States watched `50+DC`) over a **recent-alerts feed** of 2–3 alert rows (severity dot, mono source host, mono date, change-type, a `blue-50` affected-client pill, an "Apply to 12" / "Reviewed ✓" button). It must look like a screenshot of the live app, not an illustration. This is the page's center of gravity.
- **The document-intelligence visual** (secondary, but high-craft): a real official notice (IRS / "Texas Comptroller") rendered as a light paper clipping — masthead, body text, the key sentence highlighted in `blue-50` — with the change **extracted** into clean labeled mono fields beside it (`Form ▸ 05-163`, `New due date ▸ Nov 3, 2025`, `Source ▸ comptroller.texas.gov`). Mirrors the `references - build/` extraction diagram (address / table / line items / total fields pulled off a document). It proves "every date traces to its source" visually.
- No stock 3D, no gradient blobs, no mascots, no people photos. If anything is shown, it's product UI rendered in the real palette.
- **Icons:** outline, 1.5–2px stroke, 18–20px, `blue` inside a `blue-50` rounded chip for feature cards, otherwise `muted`. Sparkline/bar mini-charts (the logo mark is three rising bars) appear where a trend is implied.

## 8 · Motion

- One tempo: **150–180ms ease-out** (`cubic-bezier(0,0,0.2,1)`) for fades, hovers, and reveals. Content fades + rises 6–8px on scroll-in, staggered ~50ms.
- The only _animated_ element is the **"live" status dot** — a slow `ping` halo (green for "watching," ~2.2s) that signals the product is awake. It's the one indie-technical flourish; everything else is calm.
- Buttons lift 1px on hover; cards raise their border tint + a hairline shadow. Nothing bounces. Respect `prefers-reduced-motion` (collapse the ping and all transitions to instant).

## 9 · Voice & visual copy treatment

Plain, builder-direct, lightly playful — the voice of a maker who'd rather show you the dashboard than sell you. Sentences are short and concrete. Eyebrows are mono terminal-labels. The hero's emphasis clause is colored blue, not italicized. Where editorial brands write a pull-quote manifesto, the indie voice writes a **one-liner** ("They store the dates you type in. We watch the law for you.") and lets the comparison table carry the rest. Microcopy is mono wherever it's data (`9 open · newest first`, `link · quote · verified date`, `+ 24h undo`). Honesty is part of the voice: it says what it _doesn't_ do as plainly as what it does.

## 10 · Signature section patterns

1. **The dashboard hero** — two-column: left = mono eyebrow → oversized Inter headline (emphasis clause in `blue`) → 17px lead → `blue` CTA + ghost secondary → a `green`-check trust-chip row; right = the **dashboard-preview card** (§7). White ground, one faint blue/green radial wash. This is the brand.
2. **The sources / live band** — a light-gray (`surface`) strip: the promise line + a row of mono source pills each with a `green` "live" dot (IRS · CA FTB · NY DTF · TX Comptroller · FL DOR · WA DOR · FEMA). Reads like a status page.
3. **The product / "what's inside" grid** — 2–3-col cards, each a `blue-50` icon chip + mono kicker + short blurb. The Alerts card spans 2 to anchor the loop (`WATCH → READ → MATCH → APPLY → AUDIT`).
4. **The signature comparison table** — full-width **light** grid; mono capability labels left; "Excel + Outlook / File In Time / TaxDome" columns with `faint` X's; **DueDateHQ column highlighted** with a `blue` header, `blue-50` wash, `green` checks, and a mono `v-emph` sub-line (`24/7 · 14 sources`). A single italic-free one-liner below. This is the page's proof, rendered honestly and light.
5. **The trust band** — light-gray; the glass-box paragraph + 3 mono stat tiles (`100%` sourced · `0` auto-applied · `Audited`) + the not-tax-advice boundary set quietly in a `line`-bordered note.

Sections alternate white ↔ light-gray by value, separated by 1px `line` — never a dark or colored band.

## 11 · Do / Don't

- ✅ White ground, electric-blue accent, green checks, light-gray product cards, mono numerals everywhere data lives, a dashboard-preview hero, a clean named comparison table, a slow green "live" dot, builder-plain copy.
- ❌ **Dark sections of any kind** (convert the v1's dark villain band + dark comparison table to light), a second non-functional accent, green used for buttons/decoration, drop-shadow soup, gradient blobs, stock illustration, editorial serif italic, corporate hedging language, centered-everything (the hero is a split, not a stack).

## 12 · Applying to DueDateHQ

- **Hero:** locked headline "Catch every tax-deadline change — and see exactly who it affects." with the second clause in **electric-blue**; mono eyebrow "● Never miss a deadline change · FED + 50 states + DC"; `blue` CTA "Open the workbench" + ghost "Try it live ↓"; the **dashboard-preview card** at right; a `green`-check trust-chip row (Sourced · You approve · Undo 24h · No black box).
- **Sources/live band (light-gray):** the promise line "Every deadline. Every change. Every client. Handled." + mono source pills with `green` live dots.
- **Villain beat ("Sound familiar"):** rebuilt **light** — a centered or left section on white/`surface`, mono eyebrow, plain `ink-2` body, a row of `line`-bordered struck-through "old way" mono chips (no dark band).
- **How it works (Watch · Match · Apply):** three cards with mono step numbers `01 / 02 / 03`, a `blue` top-accent, mono kbd keys; the `WATCH → READ → MATCH → APPLY → AUDIT` flow line in mono below.
- **Trust:** the glass-box paragraph + 3 mono stat tiles (`100%` / `0` / `Audited`) on a light-gray band; the not-tax-advice boundary in a quiet `line` note.
- **Comparison:** the **signature light table** — DueDateHQ column blue-washed with green checks; "They store the dates you type in. We watch the law for you."
- **Close:** calm CTA on white — "Walk into next busy season already ahead." + `blue` CTA + ghost.
- **Honesty:** "sources we watch" mono strip (IRS · CA FTB · NY DTF · TX Comptroller · FL DOR · WA DOR · FEMA) in place of logos; no "AI"/"Radar"/pricing/fake proof; source/trust claims literally true; the affected-client counts and "14 sources / 24-7" framed exactly as the USP brief allows.
