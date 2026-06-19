# Voiceflow — Design System (extracted, for DueDateHQ)

A reusable "brand skill": the design language of voiceflow.com, re-pitched **LIGHT** and captured in enough detail to rebuild the look on DueDateHQ. Follows the depth/format standard set by `legora-design-system.md` (12 sections). Source: voiceflow.com + the Voiceflow Stories / document-canvas / editorial-serif references in `references - build/` (the Stories nature cards, the document-intelligence canvas, the Popcorn centered serif hero). 2026-06-18.

> **Re-pitch note.** Live Voiceflow leans on a deep-ink hero and dark photographic bands. Per the global build rules this reference is rebuilt **LIGHT ONLY**: white and soft mist-gray grounds, a calm green accent, dark text, atmospheric nature imagery used as _light-toned accents_ (soft gradients, framed cards) rather than full-bleed dark backgrounds. The atmosphere is kept — it is just made of light, not darkness.

---

## 0 · Global build rules (apply to EVERY reference page, not just Voiceflow)

These override anything in a v1 page:

- **Light only — no dark mode, no dark sections.** Every page is built on light / mist grounds. **For Voiceflow this is the critical move:** convert the v1's deep-ink hero, dark sources strip, dark villain beat, dark stats band, dark glass-box compare, dark close, and dark footer into **light** treatments in the brand's own palette. No `prefers-color-scheme: dark` variant. Dark is allowed _only_ as a small element — a status dot, an icon glyph, mono text on light — never as a section background.
- **Adapt the copy to the brand's voice.** Keep the **locked headline** — "Catch every tax-deadline change — and see exactly _who_ it affects." — and every fact + honesty rule, but rewrite the _supporting_ copy (subhead, eyebrows, section titles, intros, feature blurbs, microcopy, CTA support lines) in Voiceflow's **enterprise-calm** tone: infrastructure framing ("the operating system for…"), confidence without hype ("with confidence," "without the black box"), outcomes over features, "build / launch / scale" cadence, plural-team language.
- **Polish — miss no detail.** Fully translate the visual language; refine palette, type scale, spacing, hierarchy, components, and the signature visuals (especially the **document-intelligence** canvas) to a high aesthetic bar.
- **Honesty (unchanged):** no "AI" / "Radar" / pricing / fabricated proof; a "sources we watch" strip in place of customer logos; "Open the workbench" / "Try it live" CTAs.

---

## 1 · Essence

**Enterprise-calm · infrastructural · transparent · quietly premium.** Voiceflow sells itself as _an operating system_, not a tool — the calm, dependable substrate that serious teams build on. The feeling is a well-run control room with the lights up: lots of soft daylight, generous air, a single living-green accent, and product/document surfaces rendered with care. It earns trust not by withholding (Legora's editorial austerity) but by **showing its work** — the canvas, the extracted fields, the source link. The unstated promise: _this is calm, capable infrastructure you won't have to fight._

Two distinctive moves carried over and re-lit:

1. **The big centered editorial serif hero** on a soft mist ground (the Popcorn / Voiceflow-Stories "Start curating…" gesture) — oversized, serene, one calm green emphasis.
2. **The "without the black box" differentiation** — a transparent glass-box panel, rendered in _light_ (a clear, glassy green-tinted surface) against a muted "black box" foil, so the value is _legible_, not literally dark.

The atmosphere — the nature imagery Voiceflow is known for — survives as **light-toned accents**: soft green/mist gradients, a faint canvas grid, framed story cards with luminous gradient art. Never a dark backdrop.

## 2 · Color

Light grounds + one calm green accent + a quiet navy for system/structure. Color carries meaning (status/risk) or wayfinding (action), never decoration.

| Token          | Hex                             | Role                                                                                                     |
| -------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `paper`        | `#FFFFFF`                       | Page ground, cards                                                                                       |
| `mist`         | `#F4F6F2`                       | Soft mist-gray section ground (the signature "daylight" band)                                            |
| `mist-2`       | `#ECEFE9`                       | Deeper mist for inset blocks, rails                                                                      |
| `canvas`       | `#F7F8F5`                       | The document-canvas ground (faint grid lives here)                                                       |
| `ink`          | `#10231A`                       | Primary text, headlines (a near-black with a green undertone, not pure black)                            |
| `ink-2`        | `#3C4A43`                       | Body / secondary text                                                                                    |
| `muted`        | `#69756E`                       | Tertiary, captions, nav, eyebrows                                                                        |
| `faint`        | `#9AA59E`                       | Fine print, mono labels, hairline labels                                                                 |
| `line`         | `#E2E7DE`                       | Hairlines, card borders, dividers                                                                        |
| `line-2`       | `#D2D9CE`                       | Stronger border, ghost-button outline                                                                    |
| `green`        | `#2F7A4F`                       | **Primary accent** — CTA, links, active state (a calm, alive forest green)                               |
| `green-deep`   | `#256340`                       | Hover/pressed for green                                                                                  |
| `green-soft`   | `#3F9665`                       | Lighter green for gradient art, icon glyphs                                                              |
| `green-tint`   | `#E7F1EA`                       | Green wash — icon chips, glass-box panel, active-rail fill                                               |
| `green-tint-2` | `#F0F6F1`                       | Faintest green wash for atmospheric gradients                                                            |
| `navy`         | `#2E368C`                       | **System/structure** accent — mark, source links, mono data, "system" pill (used sparingly; green leads) |
| `navy-tint`    | `#ECEDF6`                       | Navy wash for the rare system chip                                                                       |
| `amber`        | `#9A6A12` text / `#FBF1DF` tint | Severity: urgent (warm amber, never red)                                                                 |
| `ok`           | `#2F7A4F`                       | Resolved / verified (same family as green)                                                               |

**Rules:** white + mist grounds everywhere; ink for type; **green is the one brand accent** (action, links, active, atmosphere). Navy is the quiet "system" voice — the mark, source-citation links, mono data — and must never out-shout green. Severity color appears _only_ on risk/status (an Urgent pill, a "needs review" chip). Contrast: ink on paper ≈ 14:1; green `#2F7A4F` on paper ≈ 4.8:1 (AA for ≥18px and UI); for green text below 18px or critical small copy, use `green-deep` `#256340` (≈ 6:1). No color is ever used as pure decoration.

## 3 · Typography

A calm serif for editorial lift (the centered hero, story titles, the principle), a clean grotesk for everything structural, mono for data.

| Family              | Font (Google)                 | Fallback                               | Use                                                                                                                 |
| ------------------- | ----------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Display / editorial | **Newsreader** (incl. italic) | `Georgia, serif`                       | Centered hero headline, section titles where serene, story-card titles, the principle/pull-quote, big stat numerals |
| UI / structure      | **Inter**                     | `-apple-system, system-ui, sans-serif` | Nav, labels, body, buttons, feature copy, intros                                                                    |
| Data / mono         | **IBM Plex Mono**             | `ui-monospace, monospace`              | Eyebrows, dates, EINs, source URLs, table verdicts, field labels (tabular-nums)                                     |

**Scale (px · weight · line-height · tracking):**

| Token                  | Size         | Wt                        | LH   | Tracking                                                          |
| ---------------------- | ------------ | ------------------------- | ---- | ----------------------------------------------------------------- |
| eyebrow                | 11.5         | 500                       | 1    | `0.13em` UPPERCASE (mono, `muted` or `green`)                     |
| body-sm                | 14           | 400                       | 1.55 | 0                                                                 |
| body                   | 17           | 400                       | 1.62 | 0                                                                 |
| lead / intro           | 18.5         | 400                       | 1.62 | `-0.005em`                                                        |
| h3                     | 21           | 600                       | 1.2  | `-0.02em` (Inter)                                                 |
| story-title            | 21           | 500                       | 1.18 | `-0.01em` (Newsreader)                                            |
| h2 (section)           | clamp(30–46) | 500                       | 1.07 | `-0.02em` (Newsreader for serene beats; Inter 600 for dense ones) |
| hero (display)         | clamp(38–66) | 500                       | 1.04 | `-0.025em` (Newsreader, centered)                                 |
| pull-quote / principle | clamp(28–44) | 500 _italic_ (Newsreader) | 1.15 | `-0.015em`                                                        |
| stat numeral           | clamp(40–56) | 500                       | 1    | `-0.02em` (Newsreader)                                            |

**Usage:** the **hero is centered Newsreader** at display size, calm and oversized, with exactly one italic-green emphasis (e.g. _exactly who_). Section titles use Newsreader where the beat is serene (close, villain, document-intelligence) and Inter 600 where it's dense (how-it-works, what's-inside). Eyebrows are uppercase mono, tracked, `muted`/`green`. Body is generous (17px/1.62). All data — dates, URLs, counts, field labels — is mono + tabular. The principle ("glass-box") gets a large Newsreader-italic line.

## 4 · Spacing & layout

- **Base** 4px. Vertical section padding **96–112px** desktop / **64–70px** mobile. Generous whitespace is the "calm" — air around every CTA and headline.
- **Max content width** ~1180px, centered, with comfortable side margins (28px desktop / 18px mobile).
- **Grid** 12-col, 24px gutter. **The hero and serene beats are centered** (Voiceflow/Popcorn editorial-center); dense informational sections (how-it-works, document-intelligence, what's-inside) are **left-aligned section heads with multi-column bodies**. Alternate the two.
- **Rhythm — alternating LIGHT grounds.** This is the Voiceflow signature done in light: `paper` → `mist` → `paper` → `canvas` → `mist` … Bands differ by a 3–5% value shift (white vs mist) plus a soft atmospheric gradient, **never** by going dark. A faint hairline can separate same-color neighbors.

## 5 · Radius · borders · elevation

- **Radius:** `14px` on cards / large surfaces · `10px` on buttons & inputs · `8px` on small chips/fields · `999px` on pills, status dots, avatars · `6px` on the paper-document clipping (looks like real paper). One coherent rounded scale; no freelance values.
- **Borders:** 1px `line` hairlines on cards and dividers; `line-2` for ghost-button outlines and stronger separators. The active rail item and primary CTA are filled, not outlined.
- **Elevation — soft, daylight, restrained.** Default is border + value-contrast, no shadow. The hero product surface and the document clipping get **one soft, low shadow** (large blur, very low opacity — `0 24px 60px -28px rgba(16,35,26,.18)`) to read as "lifted in daylight." Story cards lift `translateY(-4px)` + a soft shadow on hover. **No glows, no dark vignettes, no blur ≥ 24 on small elements.** Atmosphere comes from light gradients, not heavy shadow.

## 6 · Components

- **Button / primary:** `green` fill, white text, radius 10, padding 13×22, 15px/600, tracking `-0.01em`. Hover → `green-deep` + a soft green-tinted shadow. One primary per view. (The live site uses a blue primary; re-pitched, **green is primary** to keep one brand accent and reserve navy for "system.")
- **Button / secondary (ghost):** ink text + 1px `line-2` outline on paper; hover → `mist` fill + `muted` border. No second fill color.
- **Eyebrow:** uppercase IBM Plex Mono 11.5px/500, `0.13em`, `muted` or `green`; may sit alone or in a pill.
- **Pill / status:** radius 999, 1px `line`, `muted` text, a 7px `green` dot with a soft expanding pulse ring — e.g. "● Now watching FED + 50 states + DC." Light only.
- **Cards:** `paper` + 1px `line` + radius 14 + (optional) soft daylight shadow on hover. The "primary" feature card is marked by a `green` inset ring, not a different fill.
- **Nav:** sticky, translucent white (`rgba(255,255,255,.82)` + blur), 1px `line` bottom. Muted 15px Inter links with `mist` hover pills; a `green` primary CTA; a light status pill. (Voiceflow groups nav into a pill cluster — optional flourish: wrap the link group in a `mist` 999px pill.)
- **Stat:** big Newsreader numeral (clamp 40–56) with a `green-soft` unit, over a 14.5px Inter label + a muted descriptor. Stats sit in a **light** hairline-ruled band on `mist` or `paper` — equal columns, 1px `line` dividers (never a dark band).
- **Glass-box compare:** two columns in a 14px-radius `line`-bordered frame. The "black box would…" foil column is **muted gray** (`mist-2` ground, `muted` text, faint `×` glyphs) — _muted, not dark_. The "DueDateHQ does…" column is a **luminous glass panel** (`green-tint` ground, `ink` text, `green` checks). The contrast is legibility-of-value, achieved with light + green, not black.
- **Field (extraction):** `paper` + 1px `line` + radius 10, a mono `green` field-label (with an icon), an ink value, a muted sub, an optional mono `navy` source link. Hover → `green` border + a 3px `green-tint` ring. This is the atom of the document-intelligence visual.
- **Story card:** the Voiceflow-Stories signature, re-lit — a luminous gradient/SVG art panel (green→mist, not green→black), a mono `green` kicker, a Newsreader title, muted body, a `green` "Read it →" link.

## 7 · Imagery & iconography

- **The document-intelligence canvas is the hero visual.** Re-pitched from the Voiceflow extraction-canvas reference: an official notice (e.g. "Texas Comptroller") rendered as a **real paper clipping** on a faint-grid `canvas` ground — masthead, serif body, the changed line highlighted in amber — with the change _extracted_ into clean labeled mono fields beside it (What changed · Form & jurisdiction · Source · Affected clients), each field a light card. It reads like a document on a bright workbench, the connective tissue (a node, hairline links) drawn in green. **You see the work** — this is the visual embodiment of "without the black box."
- **Atmospheric nature, in light.** The Voiceflow Stories nature cards (golden grass, glass prisms, green geometric burst) are re-lit as **luminous SVG gradient art** on the story cards — green→mist, prism/lattice/radial-burst motifs in `green-soft`/`navy` line work on a _light_ gradient. They carry the atmosphere without a single dark backdrop.
- **Soft daylight gradients** carry "atmosphere" elsewhere: a faint radial `green-tint-2 → transparent` behind the hero and close, a faint canvas grid masked to a soft ellipse. Always subtle, always light.
- No stock 3D, no gradient blobs as decoration, no mascots. Product UI is rendered minimally (paper, hairline, mono numbers, one green active state).
- **Icons:** Tabler outline, 1.5px stroke, 18–22px, `ink`/`muted`; accent icons in `green` on a `green-tint` chip. Used purposefully, not decoratively.

## 8 · Motion

- One calm tempo: **180–200ms ease-out** (`cubic-bezier(.2,.7,.2,1)`). Content fades + rises 8px on scroll-in, staggered ~60ms. Cards lift `translateY(-3/4px)` on hover; the status dot has a slow 2.4s pulse ring.
- Calm over flourish — nothing bounces or springs. The motion vocabulary says "dependable," not "playful." Respect `prefers-reduced-motion` (collapse all to instant).

## 9 · Voice & visual copy treatment

Enterprise-calm: **infrastructure framing, confidence without hype, outcomes over features.** Lead with the operating-system metaphor ("the operating system for your filing deadlines"), the "build / launch / scale" or "watch / match / apply" cadence, and reassurance verbs ("with confidence," "without the black box," "you stay in the loop"). Plural-team where natural ("your team," "your practice"). Eyebrows are quiet mono labels. The hero is one calm serif line with a single italic-green emphasis. The product _principle_ (glass-box) gets a serene Newsreader pull-quote. Microcopy is mono where it's data. Never breathless; never jargon-as-drama. The honesty boundary is stated plainly and calmly, not buried.

## 10 · Signature section patterns

1. **The centered editorial hero** — soft `paper`/`mist` ground with a faint green-tint daylight gradient; pill eyebrow → big **centered Newsreader** headline (one italic-green word) → 18px Inter lead → `green` primary CTA + ghost secondary → trust chips → a serene serif promise strip → the lifted **product surface** preview below (light card, soft daylight shadow). No dark hero.
2. **The sources strip** — a **light** mist band: "Sources we watch — around the clock" over a centered row of source names (IRS · CA FTB · NY DTF · TX Comptroller · FL DOR · WA DOR · FEMA), each with a small green icon. (v1's dark strip → light.)
3. **The operating-system band (how it works)** — left-aligned head + a `Watch → Match → Apply` flow line + three light cards with mono step numbers and a soft green/navy gradient accent strip; calm, infrastructural.
4. **The document-intelligence canvas** — the signature: paper clipping ↔ extracted light fields on a faint-grid canvas ground. "You see the work, not a black box."
5. **The impact band** — a **light** hairline-ruled row of 4 big Newsreader stats (`50+DC` · `24/7` · `100%` · `24h`) on mist. (v1's dark stats → light.)
6. **The glass-box differentiation ("without the black box")** — the principle pull-quote + three light value cards + the **light** glass-vs-muted compare frame (luminous green-tint glass column vs muted-gray foil). The brand's central belief, rendered legible in light.
7. **The atmospheric story cards** — three Voiceflow-Stories cards with luminous light gradient art, serif titles, green "Read it →" links.
8. **The calm close** — centered, soft daylight green-tint gradient on light, Newsreader headline (one italic-green word), `green` CTA + ghost. "Walk into next busy season already ahead."

Sections alternate **light** grounds (paper / mist / canvas) with soft gradients — never a dark band.

## 11 · Do / Don't

- ✅ White + mist daylight grounds, one calm green accent, navy only as the quiet "system" voice, centered Newsreader hero, soft light gradients for atmosphere, the document-intelligence canvas, a _light_ glass-box panel, luminous (not dark) story-card art, generous whitespace, mono data, soft daylight shadows.
- ❌ Any dark hero/band/footer, dark glass-box (the foil must be _muted gray_, the value column _luminous green_, both light), red severity, glows / heavy vignettes, glassmorphism-on-dark, blur ≥ 24 on small elements, navy out-shouting green, "AI"/"Radar"/pricing/fake proof, a second decorative accent, blocky drop-shadows.

## 12 · Applying to DueDateHQ

- **Hero (centered, light):** pill eyebrow "● Never miss a deadline change · FED + 50 states + DC"; locked headline "Catch every tax-deadline change — and see _exactly who_ it affects." (_exactly who_ in Newsreader italic green); enterprise-calm subhead ("The operating system for your filing deadlines — it watches the IRS and all 50 states, so your team doesn't have to."); `green` CTA "Open the workbench" + ghost "Try it live ↓"; trust chips; serene promise strip "Every deadline. Every change. Every client. Handled."; lifted light product-surface preview below.
- **Sources strip:** light mist band, "Sources we watch — around the clock" + the seven source names.
- **Villain beat ("Sound familiar"):** a **light** centered editorial beat on mist (v1's dark villain → light) — quiet Newsreader title, calm `ink-2` paragraph, one italic-green lift.
- **How it works (Watch · Match · Apply):** OS-framed band — flow line + three light step cards, mono step numbers, soft green/navy accent.
- **Document-intelligence:** the paper-clipping ↔ light-fields canvas. "You see the work, not a black box."
- **Stats:** light hairline band on mist — `50+DC` sourced · `24/7` watched · `100%` sourced · `24h` undo.
- **Without the black box (trust):** the principle pull-quote + three light value cards + the **light** glass-vs-muted compare. Stats: `100%` sourced · `0` auto-applied · audited.
- **What's inside:** light feature-card grid; the "Alerts" card carries the `green` inset-ring "primary" treatment.
- **Stories / resources:** three luminous-light atmospheric cards.
- **Close:** calm centered CTA on light with a soft green-tint daylight gradient — "Walk into next busy season _already ahead_."
- **Footer:** **light** (v1's dark footer → light mist) — brand + tagline, three link columns, a calm legal line + "All systems operational" status.
- **Honesty:** "sources we watch" light strip in place of logos; no "AI"/"Radar"/pricing/fake proof; every source/trust claim kept literally true; the not-tax-advice boundary stated plainly and calmly.
