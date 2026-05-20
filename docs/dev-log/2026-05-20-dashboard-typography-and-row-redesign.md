# Dashboard — typography baseline + Actions row redesign

Branch: `design/preview-integration` (continuing 2026-05-20 polish thread).

## Why

Designer review on the previous dashboard pass surfaced three problems
that were independent of layout:

1. **Type was too small and too uniform.** Section headers were
   `text-base font-semibold` — barely heavier than the body text they
   sat above, so the eye had no anchor. Body labels at `text-xs` /
   `text-sm` were forcing the user to lean in.
2. **`font-mono tabular-nums` was applied to every numeric value.**
   The aggregate effect read as ATM-receipt, not workbench. The hero
   amounts (`$13,750.00`) were the worst offenders.
3. **The Actions row buried the two signals a CPA actually triages
   on.** Dollar penalty and due-date sat on the right, in muted
   secondary text. Client and task copy lived under
   `text-sm font-medium`, which collapsed visually against the
   adjacent badge and the chevron.

The Pulse alerts section also had a structural problem: the
"Source needs attention" warning rendered as an orphan banner
**above** the section's `<h2>`, so the eye read it as a separate
section header. The user's complaint: "why is the pulse alerts title
above source needs attention?"

## Changes

### Typography baseline (DESIGN.md §Typography)

Documented a single size ladder and weight discipline. Highlights:

- Numerals are sans-serif by default. Use `tabular-nums` for column
  alignment; reserve Geist Mono for rule IDs / EINs / URLs / raw
  matrix codes — not for currency, day counts, or counters.
- `font-semibold` only on H1 / H2 / KPI numerals. `font-medium`
  only on row primary anchors. Everything else stays at 400.
- Size ladder: H1 `text-2xl`, H2 `text-xl`, KPI value `text-2xl`,
  row primary `text-base`, row secondary `text-sm`, tertiary
  `text-sm text-text-tertiary`.

### Actions this week — new row anatomy

`apps/app/src/features/dashboard/actions-list.tsx`

```
[ penalty pill ] [ due-date pill ]  Client name                       [ ⌄ ]
                                    Task prompt
```

- **Penalty pill** (left, fixed width). Red-filled when past-due with
  accrued penalty; neutral outline when projected; muted dash when
  no figure.
- **Due-date pill.** Red-filled when past due; neutral when due
  today/upcoming. Drop the bare red-text-on-white state — pills
  with backgrounds read as urgency, raw red text reads as bug.
- **Client name** is the primary anchor at `text-base font-medium`;
  task prompt sits under it at `text-sm text-text-secondary`.
- **Click-to-expand** reveals an inline detail panel: status sentence,
  form, attached source count, penalty rule label, plus a primary
  "Open in Obligations" link. Click (not hover) — hover-expanding
  a long list causes layout jitter; designer accepts the trade.

### Pulse alerts — single grouped section

`apps/app/src/features/dashboard/needs-attention-section.tsx`

- Section `<h2>` at `text-xl semibold` with the counter beside it.
- When sources are unhealthy, the warning renders **inside** the
  section group (`gap-3` between header → warning → cards) so it
  never reads as an orphan banner.
- Warning copy: "_N_ source needs attention" with source labels as
  inline chips.
- Primary action is **Review** (filled button); **Hide** is a ghost
  button — Review is the desired path, Hide is the lesser one.

### Exposure tiles — bigger numerals, sans-serif

`apps/app/src/features/dashboard/exposure-strip.tsx`

- KPI numeral at `text-2xl font-semibold tabular-nums tracking-tight`.
- Label below at `text-sm text-text-secondary`.
- Tile padding bumped (`px-4 py-3`), min width up to 160px so the
  amount has room to breathe.
- Tone discipline preserved: only `blocked` uses destructive red.

### Card surface refresh

`apps/app/src/features/dashboard/needs-attention-card.tsx`

- Title at `text-base font-medium` (was `text-sm semibold`).
- Source eyebrow at `text-sm` (was uppercase tiny).
- Client chips at `text-sm` (was `text-xs`).
- Footer source link at `text-sm` so the URL is actually scannable.

### DESIGN.md

- Rewrote `## Typography` with the size ladder and weight discipline
  rules. Documented sans-first numerals.
- Updated `## Page sections — the dashboard's heartbeat` with the
  new Pulse alerts grouping rule (warning inside section, Review
  primary).
- Added `### Actions this week — row anatomy` describing the
  chip-front row layout, pill tone rules, and the click-not-hover
  expand rationale.

## Out of scope / open questions

- **"Key actions besides Import."** Held off adding speculative
  buttons (Add deadline, Add client) since neither has a backend
  single-shot creation flow today. Worth a follow-up discussion
  before wiring fake CTAs.
- **KPI tile destinations.** Kept routing to `/obligations?<filter>`
  — that's the canonical "Single drilldown" rule. We could layer
  secondary affordances later (a hover popover on _At risk_
  showing top contributors; an inline "send reminder to all" on
  _Waiting on client_).
