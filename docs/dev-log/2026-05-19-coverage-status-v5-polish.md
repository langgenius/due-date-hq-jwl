---
title: 'Coverage status v5 polish: entity strip, status pill, Source ↗; drop v3/v4'
date: 2026-05-19
author: 'Claude'
area: rules
---

# Coverage status v5 polish: entity strip, status pill, Source ↗; drop v3/v4

## Context

Three Coverage status variants (v3 Kanban, v4 Tiles, v5 Hybrid) had
landed earlier today as side-by-side experiments. Designer review:

- **Kick out v3 and v4** — Kanban and Tiles don't pull their weight.
- **Hybrid (v5) is the direction**, but it has gaps versus v1:
  - "Watched sources" block doesn't make sense (each rule already
    carries its source via the row chip).
  - No entity coverage display.
  - No Business / Personal toggle.
  - No status detail in the cards.
  - The full source title competes with the rule title — "source is
    source, no need to spell it out."

## Change

### Removed

- `apps/app/src/features/rules/coverage-kanban-view.tsx`
- `apps/app/src/features/rules/coverage-tiles-view.tsx`
- `apps/app/src/routes/rules.coverage-v3.tsx`
- `apps/app/src/routes/rules.coverage-v4.tsx`
- Their entries in `router.tsx`, `route-summary.ts`, `app-shell-nav.tsx`

### Polished v5 (`coverage-hybrid-view.tsx`)

**Entity coverage strip per card.** Each rich and slim card renders
the per-jurisdiction entity dots (with short codes IN / TR / LLC /
PRT / S-C / C-C / SP), pulled from `coverageCellState`. Mirrors the
v1 table column block; the matrix info is now per-card, not page-wide.

**Business / Personal / All toggle.** Page-level pill toggle near the
top, defaults to Business. Drives the columns shown in every card's
entity strip. Three buttons (Business / Personal / All) with
`aria-pressed`; active state uses the neutral filled-pill treatment
already used by the sidebar's active firm chip.

**Action-first status pill.** Every card now has an explicit pill
under the header showing the action label with its tone:

- Rich card (Needs approval): "● Approve N pending" (review tone)
- Manual verify: "● Verify cadence per client." (medium tone)
- Auto-managed: "● Auto-tracks the IRS calendar." (success tone)

Pulled out of the card body and given consistent chrome (rounded
border + dot + label) so all cards read with the same visual rhythm.

**Dropped the Watched sources block.** Each rule row already carries
its source as a `Source ↗` chip — repeating the source list at the
bottom of the rich card was duplicate information. The page-level
source-health callout (top of the page) still surfaces incidents.

### Simplified `coverage-rule-row.tsx`

The source chip used to read `[icon] California FTB Due Dates for…`
(truncated to ~28 chars). Two side-by-side titles per row made the
row scan as competing labels rather than "rule + reference."

New chip: `Source ↗` — the word "Source" plus the external arrow.
The full source title and URL live on hover (`title` attribute) +
in `aria-label`, so screen readers and tooltip users still get the
document name. Click target unchanged: opens the source URL in a new
tab. This is a designer-driven simplification: "source is source,
not telling the full name of the source."

## Why

The v1 table answered "what's the state of jurisdiction X?" The v5
hybrid answers "what's on my plate?" The polish round closes the gap
on v1's affordances (entity coverage + Business/Personal scope +
status detail) without losing v5's action-first structure. The
side panel still does the heavy lifting for rule-level work —
click the rule title, get the full audit trail without leaving the
scan view.

## Affordance contract per row (unchanged)

```
[ Rule title ──────────────── ]   [ Source ↗ ]
  click → opens side panel          click → opens cited URL in new tab
                                    hover → tooltip with document title
```

## Verified

- `pnpm exec tsc -p apps/app/tsconfig.json --noEmit` → exit 0
- Browser preview (`/rules/coverage-v5`):
  - Sidebar lists v1 / v2 / v5 only — v3/v4 removed
  - Business toggle (default) shows 5 entity dots per card (LLC / PRT
    / S-C / C-C / SP); Personal shows 2 (IN / TR); All shows 7
  - Each rich card has: jurisdiction header, "Approve N pending"
    pill, entity strip, pending rule list with `Source ↗` chips, and
    a "+N more in Library" CTA when applicable
  - Slim cards (WA / FL) have: jurisdiction header, status pill,
    entity strip, "View N rules" CTA
  - Standard queue still collapsed by default behind the expander
  - Click rule title → side panel opens with full rule detail and
    Accept/Reject actions; URL gains `?rule=<id>`
- No new runtime errors in the console (existing Base UI warning is
  pre-existing, triggered by `RouteErrorBoundary`)

## Open product question

The user also raised: **should Coverage and Library stay as two pages?**
Position: yes — different intents. Coverage is "scan + approve" (a
governance read), Library is "manage the catalog" (CRUD + search +
bulk). The side panel now collapses ~80% of the daily "let me peek at
this rule" trips, so Library is the destination only for catalog-wide
operations. Worth revisiting once the polished v5 ships to the main
slot.

## Files

- `apps/app/src/features/rules/coverage-hybrid-view.tsx` (overhaul)
- `apps/app/src/features/rules/coverage-rule-row.tsx` (Source label)
- `apps/app/src/router.tsx` (drop v3/v4 routes)
- `apps/app/src/routes/route-summary.ts` (drop v3/v4)
- `apps/app/src/components/patterns/app-shell-nav.tsx` (drop v3/v4)
- `apps/app/src/features/rules/coverage-kanban-view.tsx` (deleted)
- `apps/app/src/features/rules/coverage-tiles-view.tsx` (deleted)
- `apps/app/src/routes/rules.coverage-v3.tsx` (deleted)
- `apps/app/src/routes/rules.coverage-v4.tsx` (deleted)
