# DueDateHQ — Design-Direction Inspiration Map (200 references)

Source: `~/Desktop/gallery-dl/pinterest/wu8050/DueDateHQ-Design Direction/` (200 images).
Every image is referenced by the **last 6 digits** of its filename. Most are _design details that add depth_, not whole layouts.

> **The one rule that unifies all 200:** every reference uses a single saturated accent (lime / coral / pink / purple / blue). Translate that accent to **navy #2E368C**, keep everything else ink/gray, and reserve **red strictly for risk/lateness** (our two-color discipline). Put **Geist Mono** on every date, count, ID, duration, and token.

---

## The design language that emerges (cross-cutting)

1. **Pill/chip vocabulary** — ghost pills for metadata (icon + value), soft-tinted pills for status, **dark/inverted pill for the single most-urgent item** (figure-ground emphasis with no new color). Refs: 166197, 166506, 164918, 165997, 140300, 168749.
2. **Geist Mono on all data** — dates, EINs/IDs, durations, counts, `#tokens`, ISO dates, time-of-day lighter than the date. Refs: 140094, 164892, 164915, 116286, 165997, 164836.
3. **Callout bubbles with pointer tails** — the through-line for annotating the "it reads the notice" visual + glass-box stat explainers. Refs: 166001, 166006, 167020, 166012, 165997.
4. **Restrained depth, not shadow** — faint **diagonal grain** (166481), **dotted-grid canvas** (140149/164983), **halftone-dot screen** (900817/901593), **blueprint grid** (165559), **cream + matte grain** (901737/901764). These add print richness without violating "restrained shadows."
5. **Frosted glass** on nav pill + command palettes + account switchers (115907, 165470, 167128, 166516, 140200).
6. **Segmented progress** — piano-key/segmented bars beat plain progress bars (140156, 139936, 168795, 164948).
7. **Status dot + label + right-aligned count** rows (140280, 140346, 166929) and **two-tone / two-weight headlines** for emphasis without color (116190, 167627, 165132).

---

## By section — strongest references + the detail to steal

### Nav, command palette, account switcher

- **115907 / 165470 / 167128** — validate our **floating frosted-pill nav** (active = solid white pill, others transparent, `…` overflow, dashed `+ Add` chip).
- **140200 / 165074** — a **⌘K command palette** ("jump to client/deadline"): frosted panel, result list + live preview, relative times, **kbd-hint footer legend** in mono.
- **166516 / 164975 / 166493 / 168794** — firm/workspace **switcher**: monogram + secondary line + ✓ active + right-aligned `⌘`+digit kbd pills; gradient-ring avatar; PRO/plan chip slot.
- **140259** — account kebab → menu with the single destructive action (**Log out**) in red.
- **140131 / 165575 / 166506** — `⌘K`/`/` search hint chip, hairline rules between nav groups, numeric notification badge.
- **165559** — **mega-menu**: all-caps eyebrow + blueprint-grid line-icons + giant ghost letterform behind the panel (echoes our big-wordmark footer).
- **168740** — time-bucketed list grouping (Pinned / Recents / Yesterday) with muted micro-headers.

### Hero

- **116227 / 167128** — faint **gradient/grain wash behind the "Alerts this week" panel** so it floats off bare white (navy→white radial, subtle).
- **139889 / 165132 / 167627** — oversized **serif** left + bordered device card right; **two-tone / two-weight headline** (one clause/word emphasized) for color-free emphasis.
- **167135 / 116190** — **underlined load-bearing keywords** in sub-copy; boxed `[ EYEBROW ]` mono label with bracket border; grey→ink word gradient.
- **166231** — inline **dashed placeholder chip inside the headline** ("Watching `[your state]`") — interactive feel, no real input.
- **116206** — centered email-capture variant with an inline glyph set into the headline.
- **165575 / 115989 / 116120** — frame the panel in subtle **browser chrome**; **cursor-on-button** micro-detail; "generating ✓" status pill + skeleton placeholders for the live/empty state.

### Villain — "Sound familiar?"

- **900769 / 901069 / 900954** — chaos→order motif: swirling sticky-notes / an absurd TO-DO scroll / a monitor smothered in reminders that later **resolve into one ranked list** (before/after between villain and how-it-works).
- **900916 / 900734 / 901737** — buried-in-filings; channels converging on one stressed CPA; the **deadpan "KEEP CALM" caption over chaos** on cream grain. Render as **navy line illustration**; label the stack strata with real obligations (1040 / 1120 / extensions) in mono.
- **139859** — thick **left accent bar** beside the headline + a tilted "inbox" window with a red `Spam 1000+` count pill.
- **140159** — **diagonal hazard-stripe wash** bleeding from the trailing edge — risk-red tint only, never navy.
- **901563 / 901521 / 900829** — emotional anchors (asleep on a giant clock; the "FIN" exhale payoff; a mono "Tax season, 2am" timestamp caption).

### How it works (Watch → Match → Apply)

- **140122 / 164948 / 166926** — **vertical timeline** with state-styled nodes (filled-check done / ring current / hollow future) + a **3-cell overview band**; connector switches **solid→dashed at the active node**.
- **901604** — **5-column M–F day strip** with faint vertical grid dividers + a left→right "stress→resolved" narrative (calendar-native).
- **900825 / 168222 / 115958 / 116202** — connector treatments: a **rail with node dots**, **converging bezier wires → center Apply card**, circular `→` connector chips, dotted vertical connector + `+` FAB.
- **116286 / 140010 / 166114** — express monitoring rules as a **plain-English sentence with inline `#date_token` chips** ("When `# notice_date` changes → flag affected clients").
- **140149 / 140103** — **dotted-grid canvas** behind the step panel; "Pick an event" trigger rows (Run manually / When data changes) map 1:1 to monitoring triggers; From→To→When summary rows.
- **901553** — the 24/7 moat: **huge faint clock + small active figure** + mono small-caps eyebrow "AROUND THE CLOCK".
- **139907 / 165071** — serif headline + 3 cards each surfacing **one stat/UI fragment**; or a **split config-left / live-preview-right** ("PREVIEW — this is how it'll look").

### "It reads the official notice" (doc-extraction)

- **164915** — the definitive model: a **stepped reasoning trace** (spinner→check state dots) with **mono token chips** for extracted entities (dates, agency names) and indented **evidence cards**.
- **140052 / 140342** — present the parsed result as **prose, not a form**: a readable sentence with extracted values as soft-tinted inline chips; bold lede + muted continuation + a "Sources used" agency-logo row.
- **139748 / 140113** — **marker-highlight** the extracted date phrase (pale navy wash, not lime); set the machine-read excerpt in **Geist Mono** on a faint tinted card.
- **115932 / 166498** — connected cards on a dot-grid with **colored connector ports** wiring a source-notice card into an extracted-fields card; node card + curved connector + mono confidence/latency footer.
- **165997 / 166197 / 166001** — old→new **value pills with a `›` connector + delta badge**; extracted fields as a wrap of ghost metadata pills; **dark callout bubbles with tails** pointing at the extracted date/penalty.
- **165299** — doc cards with a **hover-reveal "View notice" footer** sliding up.

### Sources & coverage map

- **115907** — the **tilegram block grid** (mostly gray, a few navy-filled tiles) — the model our US-state heatmap already follows.
- **116219** — a **thin wireframe globe with sparse node dots** + engineering **crop-mark (`+`) corners** framing the diagram — strongest match to our calm/Linear north star; pair with or replace the tilegram.
- **164944 / 168502 / 140280** — agency rows as a registry: monochrome agency mark + quiet "**Monitored**" pill (navy-tint, not green) + "Updated 5d ago" in mono; colored-dot + label + right-aligned count.
- **139824 / 165559** — app/agency icons on a **hatched / blueprint grid** = "connect points."
- **166403 / 167093 / 901740 / 901556** — "**Show on map**" pill toggling the tilegram; editorial stacked-dot bars + trend line for seasonal density; spiral calendar w/ hand-lettered date grid; the "three watches" = simultaneous multi-jurisdiction monitoring.

### Comparison strip

- **115938** — bento "Built by one / Better than many": giant thin numeral, **dotted vertical arrow + "Skip middlemen"**, scattered data objects — strong stat/comparison vocabulary.
- **164882** — header toolbar (calendar pill + **Filters funnel** + download icon-button, vertical-rule separated) + ✓-prefixed status badges + faint hatch backdrop.

### Risk-ranked worklist (the densest cluster — steal the row anatomy)

- **165604 / 165575** — the **table blueprint**: gray uppercase column headers, subtle **zebra striping**, right-aligned outlined icon-toolbar (Sort/Columns/Filter/Download), mono numerics, quiet footer "N results · ‹ 1 ›"; canonical **icon-prefixed field-row card** (status / due-date / client-pill / amount).
- **166481 / 166506 / 166502** — row = **checkbox · task · category tag · due pill ("in 1 day") · progress ring · avatar stack**; a red **`i` info dot only for at-risk** items; faint diagonal grain on the surface.
- **164918** — status-badge system: soft tinted fills where **only OVERDUE gets red + weight** (one emphasized state per row, no double-highlight); review-violet selection checkboxes (matches our review = violet canon).
- **164931 / 164907** — **dark floating bulk-action bar** ("3 of 200 selected" — bold-white count, muted-gray nouns, segmented actions); **FilterTrigger `Label │ Value ✕`** with clearable value + violet "In progress" pill.
- **164892 / 165723 / 164932** — column headers with leading icon + sortable caret; mono ISO dates; title + muted total count + **underline view-tabs** + Filter trigger with a numeric **count-badge**.
- **165552 / 139882 / 165460** — right-rail **Notes + Audit-Log vertical timeline** (Detected→Matched→Applied, name • mono date), kebab action menu, wavy divider, tinted "Due in 3 days" mini-box.
- **164893 / 164959 / 164965 / 164971** — customize-columns slide-over with `N/M` count pills; **fact-row list** (icon, label, value right); **left vertical accent-bar tag** as the risk marker; dashed divider with an inline label-pill.
- **140094 / 140107 / 140280 / 140300** — mono right-aligned dates + thin **black→hatched progress bar** ("X of Y filed") + "Due in **4 days**"; the **single dark-highlighted bar** among muted bars (color only for risk); status dot + label + right count; small tone chips + label-only filter pills.
- **116096 / 116198 / 168716 / 168749 / 164866 / 164836 / 166487 / 166929** — success **toasts** + wallet-style rows (colored leading icon + value + kebab); role dropdown chips; **dual chips (timing + state)** + assignee avatars ("Affecting [clients]"); status-pill specs (tinted + icon + loader) + ultra-light row dividers; active-vs-outline chip set + **navy focus ring**; computed score ("Risk 84"); leading status dot + mono code + duration chip.
- **140271 / 168177** — breadcrumb collapsed `…` + Active/Archive/Pending dropdown tabs; **sticky scroll-spy feature rail** with active = navy dot + bold.

### Product-surfaces 4-card grid

- **901084** — **strongest direct steal**: small **isometric line-icon + serif-italic caption** + muted color-coded file-tabs (translate tabs to source/agency categories).
- **139889 / 116198 / 140183 / 165139 / 168177 / 168435 / 166518** — 3×2 services grid (rounded-square mono-line icons + 2-line desc); left-text / right-illustration card split with a **browser-chrome mini-mockup**; **embedded micro-UI fragments** (a tiny alert card, a tiny worklist row) on a graph-paper bg to _show_ the surface; suggested-task card + sparkle glyph; paired CTA cards (filled + bordered).

### Trust / glass-box stats

- **140156 / 140192 / 115938 / 168742** — **segmented piano-key progress bar** + ↗30% **delta pill**; hero % + inline +1.78%↗ delta; giant thin numeral + "5X"; fanned-card stack + inline directional-arrow stats (big number ink, rest muted).
- **139930 / 164889 / 167043 / 140306** — 4-tile stat row with a **receipt-scallop card edge** (on-brand for tax/deadlines); metadata-pill cluster (icon + number + noun); **number dominant, label demoted**; 10-segment bar that only reddens at the risk threshold.
- **166391 / 165195** — cream editorial **quote card** + dark circular `→` (a regulator/CPA quote); **trust micro-row** (icon + label, pipe-separated, `ⓘ`).

### Security & privacy

- **140355 / 166002 / 168800 / 165195** — icon │ **bold label + one-line helper** │ right-aligned control rows; gated capability as a navy "**Team**"/"Soon" pill (not coral); three **trust micro-cards** (square outline-icon: info / lock / **shield-check** + reassurance, key terms bolded). The shield/lock vocabulary is exactly our security section.

### FAQ, tooltips, callouts

- **166012 / 166006 / 167020 / 166100** — standardize **one tooltip primitive** (light default: white, hairline border, blur ≤ 4; dark variant for on-image annotations), with a pointer tail and a navy `?`/`ⓘ` anchor; dismissible **pill hint** + inline **keycap chip** + "Got it".
- **164836 / 140095** — navy **focus ring** on inputs; inline **keycap chips** (`⌘`/`↵`) in helper text.

### Close CTA / early-access

- **139954** — iridescent **grain-gradient header** + "**Private Beta**" → "Beta/Early Access" badge + dimmed-table backdrop for focus.
- **116206 / 139930 / 164886** — centered email-capture + flat 3D envelope + "Join 2,500" social-proof; **receipt-scallop** card edge; "**Or authorize with**" hairline-divider-with-text + product screenshot bleeding off the right edge.
- **165132 / 167134 / 166215 / 901764 / 901521** — two-tone close headline + navy pill CTAs; centered serif + a single tasteful illustration + underlined tertiary link; big action tiles over a blurred backdrop; witty visual-pun + cream/grain + one solid anchor; the "FIN" exhale as the payoff to the villain's stress.

### Footer

- **165559** — giant faint **ghost letterform** behind the panel (validates our big-wordmark footer; consider making it bolder/larger per Legora).

### Empty / loading / first-run / onboarding

- **140271 / 139942 / 139743 / 168789** — centered empty state: soft-square icon (or a **trio of fanned rounded-icon tiles** / ghost skeleton rows) + title + one-line + secondary/primary CTA — reuse verbatim for "**No deadline changes this week**".
- **139917 / 139744** — honest **zero-state** ("score is 0" with ghosted bars) → our glass-box `0` and empty worklist; dual chip buttons (primary navy-tint + neutral) for source-error states.
- **165473 / 168795 / 139936 / 140028 / 140298 / 165071** — setup **action cards** (grid illustration + navy "Create" + ghost "See example") + dashed "Pin/Add" slot; **segmented underline progress** + ToggleChip multi-select; `1/4` count + per-step state icons (check / spinner) + **dark tooltip**; left numbered stepper + live preview + `★ Primary` file row.
- **139985** — avatar cluster transitioning into **dashed empty slots** → repurpose as "covered agencies + dashed for more added weekly."

### Texture & depth system (pick 1–2, apply sparingly)

- **166481 / 164965** diagonal grain/stripe · **140149 / 164983** dotted-grid canvas · **900817 / 901593** halftone-dot screen · **165559** blueprint grid · **901737 / 901764** cream + matte grain · **164882** hatch · **901521** horizontal hatch shading · **116120** faint navy radial bleed.

### Illustration style (if we add spot art)

- **900796 / 422578 / 945925 / 901521 / 167134** one-line ink figures · **901084** isometric line-icon · **945938** single-line "chaos" scribble (villain mark). Keep 1.5px navy stroke, no fill.

---

## Priority quick-wins (highest depth-per-effort, all CSS-only)

1. **Geist Mono everywhere data lives** + **navy focus ring** on inputs (164836) — instant product polish.
2. **Status/risk chip system** for the worklist (164918 / 168749 / 166506) — soft-tinted pills, one red emphasis per row, dark inverted pill for the most-urgent.
3. **Dark callout bubbles with tails** on the "it reads the notice" visual (166001 / 167020) — adds the "AI pointed at this" depth.
4. **Faint dotted-grid or diagonal-grain** behind one or two product panels (140149 / 166481) — depth without shadow.
5. **Old→new value pill with `›` connector + delta badge** in the alerts/extraction (165997).
6. **Segmented piano-key progress + delta pill** for the glass-box stats (140156).
7. **Vertical timeline with state nodes + solid→dashed active connector** for Watch→Match→Apply (140122).
8. **Sticky scroll-spy rail** for the product-surfaces grid (168177); **receipt-scallop edge** on the close/stat card (139930) — memorable, on-theme for tax.

## Deliberately skipped (generic / off-register — listed so none are "missed")

900837 (AI clip-art) · 901059 · 901535 · 945966 (dup of 945938) · 945995 · 946009 · 114327 · 116214 (dup of 115979) · 139931 · 140079 · 140120 · 140128 · 168502 (mostly) — borrow only the one detail noted inline above where applicable.
