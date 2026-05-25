---
title: 'Unified surface vocabulary applied: Rule library + Clients list + Client detail (sections-not-tabs)'
date: 2026-05-22
author: 'Yuqi pairing with Claude'
area: ux
---

# Unified surface vocabulary — Steps 2 through 5

Continues the plan in
`docs/Design/unified-table-surface-vocabulary.md`. Step 1 (build
`SurfaceSummaryStrip` primitive) landed earlier today. This entry
covers Steps 2-5 + the Step 4 deferral.

## Step 2 — Rule library got the strip

**Decision: keep the progress-bar visualization, replace the caption
line below it.** The progress bar visualizes the active vs.
review-backlog split, which is rule-library-specific (other surfaces
don't have an analogous binary). Stripping it would lose real signal.

What changed in `StatsBar` inside `apps/app/src/routes/rules.library.tsx`:

- Progress bar + its two labels (active / needs review) — KEPT
- "Total · missing · sources [paused]" caption line — REPLACED with
  `<SurfaceSummaryStrip label="Coverage" items={...} />`
- `EntityChipRow` — UNTOUCHED (separate filter concern, V4 column-header
  migration is its own task)

Items in the strip: `total`, `missing` (destructive when > 0), `watched`
(linked to `/rules/sources`), `paused` (warning when > 0, also linked).
Strip has `detailHref="/rules/sources"` so the View-sources link sits
at the right edge.

## Step 3 — Clients list got the strip

`ClientsActionStrip` was a 3-tile button grid (At risk / Waiting / Pulse
hits) — replaced with a 4-item `SurfaceSummaryStrip` that surfaces
**all four** counts including the previously banner-only `missing facts`:

- At risk — destructive tone, clickable → blocked obligations filter
- Waiting on client — warning tone, clickable → status filter
- Pulse hits — review tone, clickable → Pulse filter
- Missing facts — warning tone, clickable → Fix-now

Zero-state items render muted (per `SurfaceSummaryStrip`'s tone
override — "0 needs review" never screams red).

**Needs-facts alert banner kept** when `needsFactsCount > 0`. It's the
only place that carries the "Fix now" CTA. Documented in the plan's
risk #2 as the discoverability path; the strip lists the metric, the
banner shouts the urgency.

The old `ActionTile` component is deleted — no other importers.

## Step 4 — Obligations queue: DEFERRED

The scope tabs (`pending` / `waiting_on_client` / `blocked` / `review` /
`done`) already encode per-status counts. Stacking a strip with the
SAME counts above them is design noise — user reads the same data
twice. The plan's "stacked" recommendation works when the strip shows
DIFFERENT metrics (e.g. "due this week" / "filed this month" /
"overdue") that aren't in `statusFacetCounts` today.

Logged in plan doc Step 4 with the conditions for picking it back up:
new server-side date-range aggregates.

## Step 5 — Client detail Tabs → Sections (V14)

`ClientDetailWorkspace` rendered Work + Activity as `<Tabs>` (shadcn).
Converted to **two stacked `<DetailSection>` collapsibles** with
URL-bound open/closed state:

- `?work=open` — default. Work content (WorkPlan → CompliancePosture →
  CONFIGURE → DISCOVER) renders eagerly because it's the daily driver.
- `?activity=open` — default closed. Activity content (AI summary +
  notes + audit log) loads on demand so the heavier `riskSummaryQuery`
  - `auditQuery` don't fire on every navigation.

`nuqs` added (already a project dep, just imported here for the two
new params).

`Tabs` / `TabsContent` / `TabsList` / `TabsTrigger` import dropped —
no other usages in this file.

Inner `DetailSection`s (Filing jurisdictions / Risk inputs / Fact
readiness / Suggested forms / Future business cues) remain
unchanged — they were already collapsibles.

## Verification

- `npx tsc --noEmit -p apps/app/tsconfig.json` → clean across all steps
- `pnpm --filter @duedatehq/app test -- run src/features/_surface-vocabulary` → 7/7 passing
- No new lint errors introduced in the touched files (will know for
  sure at commit-time pre-commit hook)

## Files

### Step 2 — Rule library

- M `apps/app/src/routes/rules.library.tsx` — StatsBar partial swap, +1 import

### Step 3 — Clients list

- M `apps/app/src/features/clients/ClientFactsWorkspace.tsx` —
  `ClientsActionStrip` body swap, dropped `ActionTile` definition

### Step 5 — Client detail

- M `apps/app/src/features/clients/ClientFactsWorkspace.tsx` —
  Tabs→Sections (also touched by Step 3, same file)

### Docs

- M `docs/Design/unified-table-surface-vocabulary.md` — Step 4 deferral note
- A `docs/dev-log/2026-05-22-surface-vocab-steps-2-through-5.md` (this file)

## Tomorrow's queue

Per the plan, what's left:

- **Step 4 (deferred):** add date-range aggregates server-side, then
  add strip above scope tabs with `due this week` / `filed this month`
- **V4 column-header filter migration on Rule library:** move
  `EntityChipRow` into a jurisdiction-column header popover so the
  rule library matches Obligations' column-header-only filter rule
- **Step 5 follow-ups:** verify `tabular-nums` sweep on Clients list
  counts; verify peek-icon timing matches Obligations (Eye fade-in)
