---
title: 'Clients detail — collapsibles + Jurisdiction redesign (stage 3b)'
date: 2026-05-19
area: app
---

# Clients detail — collapsibles + Jurisdiction redesign (stage 3b)

Stage 3a stripped the duplicates. Stage 3b restructures the rest of the
detail body into a single scrollable column of collapsibles, redesigns
the Filing jurisdictions panel so it reads as a chip list (not a form by
default), and moves the Activity log to the very bottom of the page.

## Layout — single column

Removed the two-column `xl:grid-cols-[minmax(0,1fr)_360px]` split. The
detail body now reads top-to-bottom:

1. Identity header (with `Delete` button on the right)
2. Pulse panel (alerts — always visible)
3. Work plan obligations table (the primary "what's the work?" surface)
4. **Client summary (AI)** — collapsible, open by default
5. **Filing jurisdictions** — collapsible
6. **Risk inputs** — collapsible (still editable inline)
7. **Fact readiness** — collapsible
8. **Future business cues** (Opportunities) — collapsible
9. Notes (small block, always visible)
10. **Activity log** — collapsible, at the bottom

The right rail is gone. With every secondary section collapsed by
default, single-column reads better than a column-and-rail.

## New `DetailSection` + shared `Collapsible` primitive

- `packages/ui/src/components/ui/collapsible.tsx` — new thin wrapper
  around `@base-ui/react/collapsible` matching the existing `sheet.tsx`
  pattern. Exposes `Collapsible`, `CollapsibleTrigger`,
  `CollapsiblePanel`.
- `ClientFactsWorkspace.tsx` — new in-file `DetailSection` helper.
  Renders the chrome (outer border + bg) and the trigger row (title +
  optional summary + chevron). Panel content sits below with a thin top
  border, no extra background.
- Chevron rotates via `group-data-[panel-open]:rotate-180` (Base UI sets
  `data-panel-open` on the trigger when open).

## Filing jurisdictions — less form-y

The old panel showed: state chip row + a 4-column table (State /
Counties / Tax types / Status) + two text inputs + a Save button —
always all of them, at once. Now:

- **Read view (default)**: one row per filing profile, with the state
  badge, counties as quiet text, and tax types as comma-separated
  values (or a `Needs tax type review` warning when missing). A small
  `Edit` button sits at the bottom.
- **Edit view (after clicking Edit)**: the two text inputs (Filing
  states / Primary counties) appear with `Save` and `Cancel`. Cancel
  reverts to the original strings.

The table version is gone (it duplicated the chip row + made the panel
feel like a config form). Tax types and counties are still part of the
filing profiles model — they just don't get a four-column table.

## Inner chrome stripped from panels

Now that DetailSection provides the card border + padding, the panels
that live inside it dropped their own outer `rounded-md border ...`
wrappers:

- `ClientRiskSummaryPanel` — outer card chrome + the `Client Risk
Summary` mini-header are removed. The title now comes from
  DetailSection; the refresh button + insight content remain.
- `ClientRiskInputsPanel` — outer chrome + the `Risk inputs` mini-header
  removed. Fields render flush.
- `ClientFactChecklist` — outer chrome + the `Fact readiness`
  mini-header removed. Rows render flush.
- `ClientActivityPanel` — `Card / CardHeader / CardTitle /
CardDescription` shell removed. The early-return states (no audit
  access, loading, empty) render directly.

`ClientOpportunitiesCard` (in another file) keeps its `Card` shell for
now — it ships as its own surface elsewhere too. A slight double-chrome
when expanded is acceptable until that component gets a `bare` prop.

## Files

- `packages/ui/src/components/ui/collapsible.tsx` — new wrapper.
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx`:
  - Imports `Collapsible / CollapsibleTrigger / CollapsiblePanel` from
    `@duedatehq/ui`. Imports `ChevronDownIcon` and `PencilIcon`.
    Removes `ShieldAlertIcon` (now unused).
  - Adds `DetailSection` component.
  - Adds `formatJurisdictionSummary` for the section's collapsed
    summary line.
  - Replaces the two-column section + right rail with the single-column
    list of `DetailSection`s described above.
  - Redesigns `ClientJurisdictionPanel` to a chip-readout + Edit toggle
    (internal `isEditing` state).
  - Strips outer chrome from `ClientRiskSummaryPanel`,
    `ClientRiskInputsPanel`, `ClientFactChecklist`, and
    `ClientActivityPanel`.

## Validation

- `pnpm check` (579 files, 0 warnings, 0 errors)
- `pnpm --filter @duedatehq/app test -- --run` (40 files, 208 tests)
- Manual:
  - Side panel `http://localhost:5178/clients` (click a row): renders
    new layout. Sections collapsed by default except the AI summary.
  - Full page `http://localhost:5178/clients/<id>`: same layout
    full-width.
  - Filing jurisdictions: click Edit → reveals form; Save persists and
    returns to read view; Cancel reverts.

## Next stages

- **3c**: identity strip polish (state chips inline with title, Radar
  pill, "N filings · next due X" one-liner, entity tax classification
  sub-text).
- **3d**: alerts band above the work plan (Radar matches + future
  extension warning + missing-facts cue).
