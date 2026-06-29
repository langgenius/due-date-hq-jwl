# Page signature views

Each list surface carries a **distinctive signature view**, toggleable against the
list/table via a one-click `Segmented` toggle (icon-only, persisted per browser).
The signatures share one DNA so the product reads as one thing, while each page
stays distinct.

**Default (2026-06-23):** `/clients` defaults to **cards** (the signature
urgency-lane view); the registry table is the opt-in toggle.

**⚠ Update (2026-06-24, Yuqi): `/deadlines` is registry-TABLE ONLY** — the
signature card view + its toggle were removed; the dead `DeadlineCardGrid.tsx` was
deleted 2026-06-29 (restore from git history if the card view is ever wanted). The
"shared card + lane DNA" below still describes `/clients`; for `/deadlines` only
the lane *banding logic* survives (see the audit note).

## The shared card + lane DNA (Clients, Deadlines)

- **Cards in urgency swim lanes.** Group by days-to-due band — Overdue → Due today
  → Due this week → Upcoming — soonest-first within each. Empty lanes drop out.
  Lane header = `CapsFieldLabel variant="group"` + neutral `CountPill`. Settled /
  done items go in a calm trailing lane (Filed / No deadlines), never scattered
  through the urgent lanes.
  - **2026-06-29 (audit P0/P1):** the banding is one shared function —
    `urgencyBandOf` in `features/obligations/queue/helpers.ts` (re-exported from
    `routes/obligations.tsx`). The **sole consumer is the `/deadlines` registry
    table** (the `DeadlineCardGrid` that also used it was deleted 2026-06-29). It
    routes every terminal-status row (done / paid / completed /
    not_applicable) to the trailing **Filed** band regardless of date,
    so a "filed 48d late" return is DONE, not Overdue. Before this the table
    grouped by date only — settled rows polluted Overdue (19 rows, 12 actionable)
    and read as inconsistent against the status-aware urgency stripe. The two
    views can no longer drift. Bands: `overdue · today · this_week · upcoming ·
    filed` (`URGENCY_BAND_ORDER`).
- **Countdown hero.** The days-to-deadline as one bold `text-stat-value` numeral.
  Its **colour is the card's only urgency tone**: red late · amber ≤7d · neutral
  comfortable. Settled rows never go red.
- **Compact recipe.** `rounded-xl border border-divider-regular bg-background-default
p-3`, `gap-2` zones, `size="md"` monogram, `text-sm` medium name, single-row
  footer pinned with `mt-auto`. ~150px tall.
- **Figure/ground.** White cards sit in a gray **well** (`rounded-xl
bg-background-section p-4`) so they separate via border + bg contrast — no card
  shadows (per restrained-shadows).
- **Prose dates** (`formatDatePretty`), never raw ISO.

## Colour discipline (hard rules)

- Urgency is expressed **once** — the hero numeral's colour. Never stack red
  border + red text + red bar/badge for the same fact.
- At-risk / priority emphasis uses a **uniform border or soft fill**, never a
  one-sided accent (including an inset box-shadow bar — it breaks on the radius).
- Secondary triage signals the status pill can't carry (payment overdue,
  e-file rejected, awaiting signature) render as **quiet inline icons**, not red
  badges, so a grid never reads as a wall of red.

## Per-page signatures

| Page             | Default signature                   | Notes                                                                                                                                     |
| ---------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Clients**      | Portfolio cards · urgency lanes     | monogram identity; open/filed counts in footer                                                                                            |
| **Deadlines**    | Deadline cards · urgency lanes      | form chip; settled → Filed lane; inline triage icons                                                                                      |
| **Alerts**       | (unchanged) live feed               | a chronological stream is the right pattern; not card-ified                                                                               |
| **Rule Library** | **Where to start** (ranked backlog) | the overview leads with the ranked review queue full-width. The Coverage map (US tilegram) is built but **currently hidden** — see below. |

## Rule Library overview — Coverage map (hidden for now)

> **Status (2026-06-23):** the Coverage map is **hidden behind
> `SHOW_COVERAGE_MAP = false`** in `routes/rules.library.tsx`. Its visual
> encoding wasn't landing, so it's shelved (not deleted) and the overview leads
> with **Where to start** full-width. Everything below describes the two-column
> layout that returns when the flag is flipped to `true`. The component
> (`RuleCoverageMap`) and its data wiring are intact.

The overview pairs the **Coverage map** (left) with the **Where to start** backlog
(right) as **equal-weight peers**: same `text-region-title` heading (18px/600),
shared baseline, left = the geographic heat, right = the ranked actionable queue.

- The split is a **container query** (`@container` → `@4xl` / 896px of the
  wrapper's own width), **not** a viewport breakpoint — the collapsible app
  sidebar makes viewport widths unreliable for inner content. Below the split
  width the two stack full-width.
- Left track is sized to the fixed tilegram (`540px`); the right track flexes
  (`minmax(0,1fr)`).
- "Where to start" is itself a `@container`; its jurisdiction cards are
  `grid-cols-1 @lg:grid-cols-2`, so they read as a ranked column in a narrow
  right track and go 2-up once it's ≥512px.

This is the app's first use of container queries — prefer them over viewport
breakpoints whenever an inner region's available width is decoupled from the
viewport (sidebars, split panes).

## Shared jurisdiction tilegram

The 13×8 US tile layout lives in `components/primitives/us-jurisdiction-tiles.ts`
(`US_JURISDICTION_TILES` + grid constants). Consumed by the `/alerts` map
(`StateTilegram`, alert-count filter) and the `/rules/library` `RuleCoverageMap`
(review-coverage heat) so the two maps can never drift apart geographically.
