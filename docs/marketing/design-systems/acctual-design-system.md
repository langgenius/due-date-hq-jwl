# Acctual — Design System (extracted, for DueDateHQ)

A reusable "brand skill": the design language of acctual.com, captured in enough detail to rebuild the look on DueDateHQ. Same depth/format standard as `legora-design-system.md` (the canonical reference in this folder) — read its **§0 Global build rules** first; they apply here too. Source: acctual.com + the document-parsing reference (`references - build/Screenshot 2026-06-18 at 14.49.33.png` — an invoice parsed into labeled fields) and the editorial-serif hero clipping (`…14.31.42.png`, Popcorn). 2026-06-18.

> **Inherits §0 from Legora.** Light only · adapt the copy to *this* voice (keep the locked headline + every fact + every honesty rule) · polish every detail. Acctual's voice is the bright, conversational, SMB-friendly end of the spectrum: a smart friend who already did the boring part for you.

---

## 1 · Essence

**Bright · friendly · confident · effortless.** Where Legora earns authority by *withholding*, Acctual earns trust by feeling *easy*. It's the consumer-grade fintech look applied to a back-office job: clean white, generous air, soft rounded everything, one happy green that means "go," and copy that talks to you like a person, not a procurement committee. The promise the look makes is **"this is going to be simple."**

The single most distinctive move: **the document-intelligence visual is the hero, not a footnote.** A real document (an invoice, a notice, a form) sits on the page like paper on a desk, and the product is shown *reading it* — a scanline passing over it, key regions lighting up, the important facts lifted out into small, clean, labeled cards beside it. The whole product story (we read the messy thing so you don't) is told in one image.

The second move: **a green CTA anchors every section.** It's a long, calm scroll, and at the end of each beat the same friendly green button reappears — never pushy, always there. The page never traps you on a wall of text without an obvious next step.

## 2 · Color

Bright and clean: white ground, soft-gray rest bands, near-black ink, and **one** confident emerald that owns every action. Color is mostly absent so the green pops; status colors (amber/navy) appear only on real status, never as decoration.

| Token | Hex | Role |
|---|---|---|
| `white` | `#FFFFFF` | Primary page ground |
| `band` | `#F6F7F9` | Soft-gray rest band (alternating sections) |
| `band-2` | `#FBFCFD` | Barely-lifted surface (card insets, nav blur) |
| `ink` | `#14141A` | Headlines, primary text |
| `ink-2` | `#3A4150` | Strong body |
| `muted` | `#5B6470` | Secondary text, captions, nav links |
| `faint` | `#8A929E` | Eyebrows fallback, fine print |
| `line` | `#E6E8EC` | Card borders, dividers |
| `line-soft` | `#EEF0F3` | Hairline section separators, inner rules |
| `green` | `#12B981` | **The accent** — CTAs, links, "go," highlights |
| `green-700` | `#0E9A6C` | CTA hover/pressed, link text on white |
| `green-50` | `#E7F8F1` | Accent tint — icon chips, pills, scan glow |
| `green-100` | `#D2F2E5` | Stronger accent tint — active scan region |
| `amber` | `#C9821B` | Severity: urgent / "waiting on you" (text) |
| `amber-50` | `#FBF1DF` | Urgent pill / waiting tint |
| `navy` | `#23304A` | "Needs review" status, mono data, deep label |

**Rules:** white is the default; the soft-gray `band` is the *only* alternate ground (never a dark band — see §0). **One** accent (green) carries action, links, and the "this is done / good" signal. Severity color lives only on status (an Urgent pill, a Waiting badge, a Needs-review dot) — never as page decoration, never green text where green would imply "go" falsely. Contrast: ink on white ≈ 15:1; green-700 on white ≈ 4.0:1 (use green-700, not green, for text/links to clear AA); white on green ≈ 2.4 → so green buttons use **white text at 16px/600** which clears AA large, and never set small green-on-white body.

## 3 · Typography

One friendly, slightly-rounded grotesk does almost everything; a mono carries data. Acctual's headlines are **bold and warm, not severe** — heavier weight, slightly looser tracking than an editorial grotesk, so they read as confident-friendly rather than institutional. (The editorial-serif reference is borrowed only as an *option* for a single hero word, never for the whole page — Acctual's default hero is the bold sans.)

| Family | Font (Google) | Fallback | Use |
|---|---|---|---|
| Display / UI | **Onest** | `Inter, -apple-system, sans-serif` | Headlines, nav, labels, body-UI — friendly geometric grotesk |
| Body fallback | **Inter** | `-apple-system, sans-serif` | Long body where Onest isn't loaded; also the data/caption companion |
| Numerals / data | **Geist Mono** *(or* `ui-monospace`*)* | `ui-monospace` | EINs, form numbers, dates, extracted-field values (tabular-nums) |

**Scale (px · weight · line-height · tracking):**

| Token | Size | Wt | LH | Tracking |
|---|---|---|---|---|
| eyebrow | 13 | 700 | 1 | `0.08em` UPPERCASE |
| body-sm | 15 | 400 | 1.55 | 0 |
| body | 17 | 400 | 1.6 | 0 |
| lead | 19 | 400 | 1.55 | `-0.005em` |
| h3 | 21–22 | 700 | 1.25 | `-0.02em` |
| h2 (section) | clamp(30–42) | 700 | 1.12 | `-0.03em` |
| display (hero) | clamp(38–58) | 800 | 1.08 | `-0.035em` |

**Usage:** headlines are **bold (700) and oversized**, hero at **800** — the weight is the personality. Tracking tightens as size grows (`-0.035em` on the hero). The hero highlight is set in **green** (`.hl{color:var(--green)}`) on the second clause — Acctual highlights *with color*, not italic. Eyebrows are short, uppercase, tracked, and usually **green-700** (the accent doubles as the section-label color). Body is generous (17px/1.6). All numbers, dates, EINs, and form codes are **mono + tabular-nums**, which also makes the extracted-field visual read as "data the machine pulled out."

## 4 · Spacing & layout

- **Base** 4px. Vertical section padding **88px** desktop / **60px** mobile — generous but not cavernous; this is a friendly product page, not a museum.
- **Max content width** ~1160px, centered, 24px side padding (18px on mobile).
- **Grid** 12-col, 24px gutter. The **hero is a two-column split** (text left ~1.05fr, the document-intelligence preview right ~0.95fr) — this is the signature, not a centered hero. Most content sections are **center-headed** (eyebrow + title + sub centered) over a grid of rounded cards; feature deep-dives use an **alternating two-column blurb** (text/visual, then visual/text).
- **Rhythm:** white section → soft-gray `band` section → white, alternating. The bands do the structural work (no hairline-only rule like Legora); each band change is a new "chapter." A thin `line-soft` separator + the source strip break the hero from the body.

## 5 · Radius · borders · elevation

- **Radius:** this is a defining trait — **everything is softly rounded.** `999px` on buttons, pills, chips, status badges, and the brand-mark dot (Acctual's buttons read as fully-rounded *pills*, not rectangles). `18px` on feature cards / containers. `22–24px` on the large preview/visual panels. `12px` on small inset rows and the brand mark square. `7–8px` on keycaps and tiny chips. Never freelance odd values.
- **Borders:** 1px `line` on cards; `line-soft` for inner hairlines and section separators. A `1px dashed line` is allowed for the one quiet "boundary / not-tax-advice" note.
- **Elevation:** **soft and sparing.** Cards default to border + white (no shadow). The hero preview panel and the alternating feature visuals get **one gentle card shadow** (`0 1px 0 rgba(20,20,26,.03), 0 8px 24px rgba(20,20,26,.05)`) to read as "a real object on the desk." Buttons get a tiny tinted micro-shadow in the accent color and a `translateY(-1px)` lift on hover. Never blur ≥ 24; never a glow on a section.

## 6 · Components

- **Button / primary (the green CTA):** `green` fill, **white** text, **fully rounded** (`999px`), 13×22 padding (16×28 for `lg`), 16px/600, gap 8 for a trailing icon. Hover → `green-700` + `translateY(-1px)`. Tiny accent micro-shadow. **This button repeats at the end of every section.** One primary per view region.
- **Button / secondary (ghost):** white fill, `ink` text, 1.5px `line` border, same pill radius. Hover → border darkens, faint band fill. Used for "Try it live ↓" / "Get a guided setup."
- **Text link / inline:** `green-700`, 600, with a `→`/`↓` that nudges on hover (`gap` grows). Acctual loves a small animated arrow.
- **Eyebrow:** uppercase Onest 13px/700, `0.08em`, **green-700** (or `muted` for the villain beat). May sit inline with a leading icon.
- **Pill / status chip:** radius 999, soft tinted fill + matching text — `green-50`/`green-700` for "Ready/Eligible/live," `amber-50`/`amber` for "Waiting/Urgent," `navy` tint for "Needs review." A pulsing 7px green dot for "live / now watching."
- **Trust chip:** white pill, 1px `line`, ink text, a small green leading icon — used as a row under the hero ("Sourced every date," "You approve every change").
- **Card:** white, 1px `line`, radius 18, 28×26 padding; an icon chip top-left (46px rounded square, `green-50` bg + `green-700` icon, or `green` bg + white icon for the "what's inside" set). Hover lift on interactive cards only.
- **Icon chip:** 46–48px rounded-12 square; the friendly accent container that fronts every feature.
- **Nav:** sticky, white at 86% + blur, 1px `line-soft` bottom. Brand (rounded-square green mark + wordmark + a muted audience tag) · muted text links · a green "live" status pill · a ghost text-link · the green CTA pill. Collapses to a menu button on mobile.
- **FAQ:** flat accordion — hairline-separated rows, a `+` that rotates to `×` and turns green on open, generous 24px row padding. No card boxes.
- **Stat:** big green mono-ish number (clamp 33–48 / 800, tight tracking) beside a short bold label + muted line; sits in a white bordered stat card (the trust trio).

## 7 · Imagery & iconography — the document-intelligence hallmark

This is where Acctual's identity concentrates. **The signature visual is a document being read and parsed into clean labeled fields**, and it should look like the real reference:

1. **The source document** sits on the left as a faithful paper artifact — a masthead, ruled body lines, a serif-ish official feel — rendered in pale grays so it reads as "the messy original."
2. **A scanline / detection pass** moves down it: a thin bright green vertical rule (or a soft `green-100` highlight band) with small region-tick marks, plus a tiny "scanning" node. This is the one moment of motion (see §8).
3. **The extracted fields** appear to the right as small, separate, rounded cards — each with a **colored tab label** (e.g. `address`, `table`, `line items`, `total` in the reference) and the pulled value inside in **mono**. They're connected back to the document by faint leader lines or simple proximity.

Adapted for DueDateHQ, the document is **an IRS / state notice**, and the extracted fields are the things the product lifts out: `deadline` (the new date, mono), `jurisdiction`, `form`, `change type`, and `affected clients (N)` — each in its own labeled mini-card, with the key sentence in the notice highlighted by a `green` left-border quote. The message is identical to Acctual's: *we read the official document and hand you only the facts that matter.*

- **No stock 3D, no gradient blobs, no mascots.** Product UI (the Alerts preview, the worklist, the evidence card) is rendered cleanly: white, soft borders, rounded rows, mono data, soft status pills.
- **Icons:** Tabler / outline, 1.5–2px stroke, 18–24px, usually inside a `green-50` rounded chip. Friendly and consistent; used liberally (every feature gets one), unlike Legora's sparseness.

## 8 · Motion

- **Tempo:** friendly and quick — **160ms ease-out** (`cubic-bezier(0,0,0.2,1)`) on hovers/reveals; buttons lift `-1px`, links grow their `gap`, cards lift `-2px` with the soft shadow.
- **Scroll-in:** content fades + rises 8px, staggered ~60ms — gentle, never bouncy.
- **The one signature animation:** the **scanline** on the document-intelligence visual — a green rule sweeps down the document once (or on a slow loop), and the extracted-field cards **pop in** in sequence (`green-100` flash → settle) as the line passes each region. It dramatizes "reading the document" in ~1.5s. Keep it subtle; it's a demonstration, not a toy.
- **The "apply" micro-interaction:** the mini "Apply to N" button on the Alerts preview swaps to a green "Applied to N · Undo 23:59" confirmation on click — shows the real product loop in one tap.
- Respect `prefers-reduced-motion`: collapse the scanline to a static "parsed" end-state and disable lifts/transitions.

## 9 · Voice & visual copy treatment

**Bright, plain-spoken, second-person, confident-but-never-hypey.** Acctual writes like a sharp friend: short sentences, contractions, the benefit first, the mechanism second. Eyebrows are quick labels ("How it works," "The workbench"). Section titles are conversational and often a two-beat ("It runs the long tail. You make the calls."). The green highlight in the hero does the emphasis that Legora gives to a serif-italic word. Microcopy is warm ("so you don't," "the emails you'd otherwise write by hand") and data is mono. **Honesty unchanged:** the locked headline and every fact/honesty rule stay exactly; only the *supporting* copy gets the bright-conversational lift. No fabricated proof, no "5,000+ businesses," no "AI/Radar," no pricing on the page.

## 10 · Signature section patterns

1. **The split hero** — left: pill eyebrow (white pill + green dot) → bold 800 headline with a **green** second clause → 19px lead → **green CTA** + ghost "Try it live ↓" → a Google sub-CTA microline → a row of white trust chips. Right: the **document-intelligence preview** (or the Alerts preview card) on a soft shadow.
2. **The promise + sources strip** — the four-beat promise ("Every deadline. Every change. Every client. **Handled.**" with "Handled" in green) over a centered row of source pills (IRS · CA FTB · NY DTF · TX Comptroller · FL DOR · WA DOR · FEMA), framed by `line-soft` rules.
3. **The villain beat (soft-gray band)** — a centered, muted-eyebrow agitation paragraph + a trio of small problem cards (Scattered / Easy to miss / All manual), each numbered, with a `green-50` icon chip.
4. **How it works** — three numbered step cards, each with a green numbered badge, conversational headline, and mono keycaps.
5. **Why you can trust it (soft-gray band)** — a glass-box pill + the principle paragraph on the left, the **stat trio** (`100%` Sourced · `0` Auto-applied · `Audited`) as white cards on the right, plus the dashed "not tax advice" boundary note. Green stat numbers.
6. **The document-intelligence deep-dive** — the alternating blurb where the parsing visual gets full real-estate: the highlighted notice quote + the extracted mini-cards, opposite a checklist of what's pulled.
7. **The repeating green CTA** — **every** major section ends with the green button (or a green text-link with a nudging arrow). The closing section is a **light/emerald** treatment (white or soft-green-tinted card with a green CTA), *not* a dark band.

Sections alternate **white ↔ soft-gray band**; the green CTA is the through-line.

## 11 · Do / Don't

- ✅ White + soft-gray bands, one bright emerald, fully-rounded pill buttons, friendly bold Onest headlines with a green highlight, soft 18px-radius cards, generous air, the document-parsing visual as the hero, a repeating green CTA, mono for data, green text uses `green-700` for AA.
- ❌ A dark closing band (or any dark section — convert to light/emerald), a second accent color used decoratively, severity color as decoration, rectangular hard-edged buttons, drop-shadow-heavy/glassmorphic cards, glow on a section, stock 3D / blobs / mascots, fake proof or "5,000+ businesses," "AI/Radar"/pricing, plain-text-only sections with no CTA, small green-on-white body text (fails AA).

## 12 · Applying to DueDateHQ

- **Hero (split):** pill eyebrow "Never miss a deadline change · FED + 50 states + DC" → locked headline **"Catch every tax-deadline change —"** + **green** "and see exactly who it affects." → 19px lead (bright-conversational rewrite) → green **"Open the workbench"** + ghost **"Try it live ↓"** → Google microline → trust chips. Right: the **document-intelligence preview** parsing an IRS notice into extracted fields (deadline · jurisdiction · form · affected clients) with a green scanline — *this is the hallmark, lead with it.*
- **Villain beat ("Sound familiar"):** soft-gray band, conversational and warm ("The work was never the hard part; the not-knowing is.") + the Scattered / Easy-to-miss / All-manual trio.
- **How it works (Watch · Match · Apply):** three numbered green-badge cards, two-beat title "It runs the long tail. You make the calls."
- **Why you can trust it:** glass-box pill + paragraph; green stat trio `100%` Sourced · `0` Auto-applied · `Audited`; dashed boundary note. The Cloudflare-isolation + email-first trust line stays.
- **What's inside / deep-dives:** rounded feature cards (green icon chips); the **document-intelligence deep-dive** gets the parsing visual its full alternating-blurb slot; the affected-client list and evidence card render as clean rounded product UI.
- **Close:** a **light/emerald** card — white or soft-green-tinted, not dark — "Walk into next busy season already ahead.", green "Open the workbench" + ghost "Get a guided setup," reassurance line. Every section above it already ended on a green CTA.
- **Honesty:** "sources we watch" pill strip in place of logos; no "AI"/"Radar"/pricing/fake proof; keep every source/trust claim literally true; "not tax advice" boundary stays.
