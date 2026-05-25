---
title: 'Coverage v6: side-by-side entity-coverage styles (summary / chips / bar)'
date: 2026-05-19
author: 'Claude'
area: rules
---

# Coverage v6: side-by-side entity-coverage styles

## Context

Designer kept rejecting the per-card entity treatment across three
iterations:

1. **Popover trigger + summary text** (original PRD §3.3) — too hidden,
   needed an extra click to see anything.
2. **Inline 7-dot strip** (v5/v6 polish) — too cryptic, codes (S-C /
   C-C / PRT) need decoding, 5 identical orange dots per card.
3. **Dots + named codes with hover tooltips** (post-/critique polish)
   — better but still reads as a spec sheet, not as UI.

Their note: "still don't like the current entity coverage. any other
way?"

The pattern of "make the matrix less terrible at small sizes" wasn't
yielding. The honest move was to step back and try three structurally
different treatments and let them pick.

## Change

Added a **`Coverage style` toggle** at the top of the left pane, next
to the existing Business/Personal/All entity-group toggle. Three
options drive how each `JurisdictionCard` renders its entity coverage:

### Summary (default)

A single readable line. Skips zero terms:

```
2 active · 2 review · 1 no rule
```

Color-codes the count, not the label. No per-entity affordance on the
card; the rail still has the full per-entity grid when you select a
jurisdiction.

### Chips

Each entity as a named chip, status carried by fill:

- `verified` → green-filled chip with green text (`bg-status-done/10
text-status-done border-status-done/40`)
- `review` → outlined warning chip (`bg-severity-medium/10
text-severity-medium border-severity-medium/40`)
- `none` → muted ghost chip with strikethrough

Each non-`none` chip is a `<button>` that drills into Library filtered
by jurisdiction + entity — same affordance the dots had. Single click
target per entity, name visible, no codes-to-decode.

### Bar

A single segmented horizontal bar per card:

```
▰▰▰▱▱▱▱
2 of 5 entities active
```

Tone-coded segments (green = active, warning = review, muted = no
rule). Width sums to 100% of card width. Hover/aria-label carries
the breakdown. No per-entity click target — just the shape of
coverage.

### Toggle

Each toggle button shows a `title` tooltip explaining the tradeoff:

- Summary: "Card shows count only; rail does per-entity detail."
- Chips: "Per-entity named chips, status carried by fill."
- Bar: "Single segmented bar; shape of coverage at a glance."

State is component-local for now (`useState`); will move to URL state
or persistence once a winner is picked.

## Why all three at once

Three iterations of "let me try one thing" produced three rejections.
Putting the candidates in front of the user simultaneously lets them
A/B/C on the same data without me guessing the right vocabulary. The
rail's entity grid keeps the legacy dots+codes treatment for now;
once a card-level winner is picked, the rail will follow.

## Files

- `apps/app/src/features/rules/coverage-rail-view.tsx`
  - `EntityCoverageStyle` type + `ENTITY_STYLE_VALUES`
  - `EntityStyleToggle` component (mirrors `EntityGroupToggle` chrome)
  - `EntityCoveragePresentation` switch + three render components
    (`EntitySummaryLine`, `EntityChips`, `EntityProportionBar`)
  - `countStates(jurisdiction, entities)` helper for shared count math
  - `JurisdictionCard` accepts `coverageStyle` prop, replaces the
    fixed 7-dot grid with the presentation component

## Verified

- `pnpm exec tsc -p apps/app/tsconfig.json --noEmit` → exit 0
- Browser preview at `/rules/coverage-v6`:
  - Toggle reads `[Summary][Chips][Bar]` with Summary active by default
  - **Summary**: CA reads "2 active · 2 review · 1 no rule"; FL reads
    "2 review · 3 no rule"
  - **Chips**: CA renders 5 chips (LLC outlined orange, PRT outlined
    orange, S-C filled green, C-C filled green, SP outlined orange);
    FL shows LLC/PRT strikethrough + S-C/C-C/SP outlined
  - **Bar**: CA shows segmented bar + "2 of 5 entities active"; TX
    shows fully-orange bar + "0 of 5 entities active"
  - Switching Business → Personal → All re-renders the entity set
    across all three styles
  - All status pills, source-health callout, rail, next-best-action
    untouched

## Open

- **Rail still uses the legacy dots+codes grid** — will sync to the
  winning card style once the user picks one.
- **State is in-memory only** — once a winner is picked, decide
  whether the toggle stays (as a user preference) or the loser
  variants get removed.
- The bar variant's segments use a 1.5px-tall track. May want to
  bump to 2px for accessibility/contrast.
