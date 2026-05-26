# Seventy-first pass — cross-page canonical chip + Rule library elevation

**Date:** 2026-05-26
**Branch:** `design/filed-strip-dedup`
**Scope:** Pull /alerts and /rules/library into the same product
family as /clients and /deadlines. The canonical move is the page-
header count chip (Yuqi's `9 Clients` reference). Plus reverting
the seventieth-pass "number-first" experiment that diverged from
the family.

## The canonical chip pattern

`/clients` already shipped the shape:

```tsx
<span className="inline-flex items-center gap-2">
  <Trans>Clients</Trans>
  <span className="rounded-full bg-state-base-hover px-2 py-0.5 text-xs font-medium text-text-secondary tabular-nums">
    <Plural value={clients.length} one="# Client" other="# Clients" />
  </span>
</span>
```

Title noun · rounded pill chip with `bg-state-base-hover` ·
secondary text · tabular-nums · the qualifying word that names
WHAT the count represents on this surface.

Each page now picks its own qualifying noun:

- /clients → `9 Clients`
- /deadlines → `17 open`
- /alerts → `3 ongoing`
- /rules/library → `N rules`

The qualifier matters: on /deadlines the chip names the OPEN
slice (not the total ever recorded); on /alerts it names the
ONGOING slice (vs. archived).

## /deadlines — reverted number-first experiment

The seventieth pass put `17` BEFORE the `Deadlines` word
("17 Deadlines"). Cross-page audit showed that broke parity with
/clients and /alerts (both have the word first). Reverted to the
canonical shape: `Deadlines` + chip "17 open".

## /alerts — adopted chip + dropped redundant right-edge count

The Alerts header was running its own custom shape:

- Title row with `PulsingDot` + `<Trans>Alerts</Trans>`
- Right-edge `<span>N active</span>` in tiny tertiary text
- "N shown · M total" when filters were applied

Two parallel count surfaces on the same row, in different visual
styles. Aligned to canonical:

- Title row: `Alerts` + chip `3 ongoing` + PulsingDot (kept — it
  carries "live signal here" semantics that no other page has)
- Right-edge count: gone

The filter-aware "N shown" count lives in the active-filter banner

- row footer, so we don't lose that info — just stops the header
  from carrying duplicate signal.

## /rules/library — canonical chip + product feel

The library page felt "far away" because its title was a bare
string (`'Rule library'`) — no chip, no count, no parity with the
rest of the product. The StatsBar / EntityChipRow / banner /
table all stack on top of that bare title, making the page read
as a dashboard widget rather than a route in the same family as
/clients and /deadlines.

Title now reads:

> Rule library · N rules

Same pill chip, same `bg-state-base-hover` tone, same secondary
text. The page header now scans as one of the family members. The
StatsBar, banner, and table chrome below it stay as the
domain-specific surface they need to be — but they now sit under
a recognizable family header.

(Earlier passes already brought the library's table chrome
in-line with /deadlines: TableHeader bg-subtle, sm-medium normal-
case headers, toolbar row above the table with the Expand-all
button. Today's chip closes the last visible gap.)

## Pages NOT touched this pass (deliberate)

- **/today (DashboardRoute)** — uses a different shape (greeting +
  cluster of sections), not a list-with-count page. The canonical
  chip doesn't apply because there's no single set to count. The
  Today page is the home screen, not a list view.
- **Sidebar** — already canonical (icon + label + optional badge
  on items with counts). No header-chip equivalent to add.

## Verification

- `pnpm check` — 0 errors, 9 pre-existing warnings (unchanged).

## Quick critique — visual cohesion across the four

Where the four pages are now coherent:

- **Page header**: title noun + chip with qualifying count
  (/clients, /deadlines, /alerts, /rules/library all share this)
- **Table chrome**: bg-subtle header, sm-medium normal-case
  headers, transparent body, dimmed row hover (/clients,
  /deadlines, /alerts list, /rules/library)
- **Action button cluster**: outline `<Button size="sm">` with
  inline-start icon — `Export`, `Import history`, `Calendar sync`,
  `+ New ...` all share this shape
- **Spacing**: `gap-6` between header and first child;
  `max-w-page-wide mx-auto` cap on the page container; `px-4
md:px-6 pt-6 md:pt-8 pb-4 md:pb-6` shell padding

Where Rule library still feels heavier than the others:

- **StatsBar** is unique to /rules/library — no other list page
  has a progress-bar + entity-chip row above the table. That's a
  product decision (catalog completeness IS a unique concern), but
  it's the single biggest reason the page reads denser than its
  siblings. Park for now; if the goal is calmer chrome, dropping
  the progress bar and pushing the active/needs-review split into
  the chip would be the move.
- **Active-filter banner** is unique too — /deadlines uses
  inline filter chips in the toolbar row, /alerts uses chip-as-
  toggle in the action strip. Could converge on one banner
  pattern across all three later.

Both are bigger structural moves; flagging not landing this
round.
