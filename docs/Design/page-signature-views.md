# Page signature views

Each list surface leads with a **distinctive signature view as the default**; the
list/table is demoted to a one-click `Segmented` toggle (icon-only, persisted per
browser). The signatures share one DNA so the product reads as one thing, while
each page stays distinct.

## The shared card + lane DNA (Clients, Deadlines)

- **Cards in urgency swim lanes.** Group by days-to-due band — Overdue → Due today
  → Due this week → Upcoming — soonest-first within each. Empty lanes drop out.
  Lane header = `CapsFieldLabel variant="group"` + neutral `CountPill`. Settled /
  done items go in a calm trailing lane (Filed / No deadlines), never scattered
  through the urgent lanes.
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

| Page | Default signature | Notes |
|---|---|---|
| **Clients** | Portfolio cards · urgency lanes | monogram identity; open/filed counts in footer |
| **Deadlines** | Deadline cards · urgency lanes | form chip; settled → Filed lane; inline triage icons |
| **Alerts** | (unchanged) live feed | a chronological stream is the right pattern; not card-ified |
| **Rule Library** | Coverage map (US tilegram) | review pressure as heat; high-severity count bubble; drill-in on click |

## Shared jurisdiction tilegram

The 13×8 US tile layout lives in `components/primitives/us-jurisdiction-tiles.ts`
(`US_JURISDICTION_TILES` + grid constants). Consumed by the `/alerts` map
(`StateTilegram`, alert-count filter) and the `/rules/library` `RuleCoverageMap`
(review-coverage heat) so the two maps can never drift apart geographically.
