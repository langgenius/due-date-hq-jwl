---
title: 'Clients detail — wrap inline detail in a side panel (stage 1)'
date: 2026-05-19
area: app
---

# Clients detail — side panel (stage 1)

The Clients page previously used a takeover pattern: selecting a client
replaced the list with a full-height detail view, and the only way back was
the explicit "Back to clients" button. That made it slow to step through
clients during fact-validation triage and lost the user's scan position in
the list every time.

Staged this as a three-step rollout. **This change is stage 1 only.**

## What stage 1 does

- Wraps the existing `ClientDetailWorkspace` in a right-side `Sheet`
  (consistent width with `PulseDetailDrawer`: full-width on mobile,
  ~820–880px on md/xl).
- The list view stays mounted under the overlay, so closing the panel returns
  the user to exactly where they were in the table.
- The page header (`Client facts` title + Import/Add buttons) is no longer
  hidden when a client is selected — the panel overlays on top instead.
- Sheet open/close is driven by the existing `?client=<id>` URL param:
  `Sheet.onOpenChange(false)` calls `onClearSelectedClient`, which clears the
  param via the same code path that the in-panel "Back to clients" button
  already used.
- `SheetTitle` is `sr-only` to satisfy a11y without duplicating the visible
  client name that the detail body already renders.

No content was added, moved, or removed. The detail body is byte-identical
to what was rendered inline before.

## What stage 1 does NOT do (intentional)

- **No new route.** The full-page `/clients/:id` and "Open full view"
  affordance come in stage 2 once the panel UX is validated.
- **No content trimming.** All six detail sections (identity card, Work
  plan, Pulse impact, Contact chain, Activity log, Opportunities) still
  render inside the panel. Trimming the panel to essentials and
  reorganizing the full page lands in stage 3.
- **No layout changes to the detail body.** The internal "Back to clients"
  button stays — it's a redundant close affordance but harmless. Will
  remove or convert in stage 2/3.

## Files

- `apps/app/src/features/clients/ClientFactsWorkspace.tsx` — added Sheet
  imports, removed the early-return takeover branch, appended a Sheet at
  the bottom of the workspace render that wraps the existing
  `ClientDetailWorkspace`.
- `apps/app/src/routes/clients.tsx` — removed the
  `selectedClient ? null : <header>` conditional so the page header stays
  visible behind the overlay.

## Validation

- `pnpm check`
- `pnpm --filter @duedatehq/app test -- --run` (40 files, 208 tests)
- Manual: open at `http://localhost:5178/clients`, click a row → panel
  slides in from right; close (X or backdrop) → returns to list with the
  same scroll/filter state.

## Next stages

- **Stage 2**: introduce `/clients/:id` full-page route. Same body
  component, rendered full-width. Add "Open full view" button to the
  panel header; remove the redundant in-panel "Back to clients".
- **Stage 3**: per-surface content split. The panel keeps essentials
  (identity, summary line, top 3 obligations, Pulse teaser) while the full
  page holds the full obligations table, audit log, contact chain, and
  opportunities. Truncations called out in conversation: panel will hide
  the full obligations table, Contact chain, Activity log, EIN row, Notes
  editor, Delete dialog, and the Projected risk / Payment track metrics.
