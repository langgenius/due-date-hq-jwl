---
title: 'Clients detail — strip duplicates + remove contact chain (stage 3a)'
date: 2026-05-19
area: app
---

# Clients detail — content trim (stage 3a)

The detail page (and the side panel that wraps it) used to render ~14
distinct surfaces stacked in one column, with several of them duplicating
information that appeared elsewhere on the same page or belonging to a
contact schema that doesn't exist yet. Stage 3a removes the worst
offenders.

## What stage 3a removed

- **Placeholder h2 subtitle** under the client name. It literally read
  "Filing, payment, Pulse, contact, and audit context for this client."
  — a description of the page, not the client. Replaced with just the
  entity label.
- **DetailRow grid** in the right side of the identity header (EIN /
  Email / Owner / Updated). The Owner is already in the obligations
  table and list view; EIN / Email / Updated belong in the Edit-client
  form, not the read view.
- **The 4 KPI tiles** (Open work · Projected risk · Payment track ·
  Pulse matches). Open work and Pulse matches duplicated the obligations
  table and Pulse panel directly below them. The two cents-formatted
  ones were sums-of-rows the table already exposes per row.
- **Contact chain card** (Primary client contact / Internal owner /
  Fallback contact). The card itself called out that the fallback
  contact is "not modeled yet" — it was a placeholder for a future
  contact schema, not a load-bearing surface.
- **The big red "Delete client record" card** in the right rail.
  Replaced with a small `Delete` destructive-secondary button in the
  identity header's right-side action area. Same `AlertDialog`
  confirmation still fires.

## What stage 3a kept

Pulse panel, Work plan obligations table, Jurisdiction (editable), AI
Client Risk Summary, Activity log, Opportunities, Risk inputs
(editable), Fact checklist, Notes. Stage 3b will wrap most of these in
collapsibles and reorder.

## Files

- `apps/app/src/features/clients/ClientFactsWorkspace.tsx`:
  - Identity header redesigned — left side keeps badges + name + entity
    label; right side gets the small Delete button.
  - Removed the `<section>` of 4 `ClientWorkMetric` tiles, the
    `<ClientContactPlanPanel>` from the right rail, and the big delete
    card from the right rail.
  - Dropped now-unused functions: `ClientWorkMetric`,
    `ClientContactPlanPanel`, `DetailRow`.
  - Dropped now-unused imports: `CalendarClockIcon`, `MailIcon`,
    `buildClientContactPlan`, `type ClientContactPlan`.
  - Dropped the `contactPlan` variable.

The `buildClientContactPlan` helper and `ClientContactPlan` type stay in
`client-detail-model.ts` for now since no consumers were touched there;
they can be removed in a later cleanup if confirmed dead across the
codebase.

## Validation

- `pnpm check` (579 files, 0 warnings, 0 errors)
- `pnpm --filter @duedatehq/app test -- --run` (40 files, 208 tests)
- Manual: side panel at `http://localhost:5178/clients` (click a row),
  full page at `http://localhost:5178/clients/<id>`. Both render the
  trimmed layout. Delete still confirms via AlertDialog.

## Next stages

- **3b**: wrap Jurisdiction, Risk inputs, Fact readiness, Opportunities,
  and Activity log in `<Collapsible>` and move Activity log to the bottom.
- **3c**: polish identity strip (state chips inline with title, Radar
  pill, "N filings · next due X" one-liner).
- **3d**: alerts band above the work plan (Radar matches + extension
  warnings + missing-facts cues).
