# 2026-06-07 — Cluster 2 detail-tab pixel fidelity pass

Closed the remaining pixel gaps between the obligation detail-drawer tabs and the
Pencil canvas (`duedatehq_work.pen` nodes `d4YrtC` Summary, `Ls3vb` Extension,
`AYpfU` Materials, `KsbdI` Evidence). Each change carries an explicit
`TODO(data)` where the contract genuinely lacks the field, with a static
placeholder rendered behind a "sample / estimate" affordance so the surface
matches the canvas without inventing contract fields.

Verified after every change: `tsgo --noEmit -p apps/app` (0 app-source errors),
`pnpm --dir apps/app test -- src/features/obligations --run` (34/34), and
`vp check` (0 errors).

Files:

- `apps/app/src/features/obligations/queue/ObligationQueueDetailDrawer.tsx`
- `apps/app/src/features/obligations/queue/components/primitives.tsx`

## Summary tab (`d4YrtC`)

Added the two cards that the canvas shows below "What's left to do" but the
drawer was missing entirely:

- **Expected refund** (`w9bXOk`): success-toned headline total + a 3-row ruled
  key/value breakdown (Federal withholding / CA state withholding / Estimated
  tax credit). `getDetail` has no refund or withholding projection, so the
  figures are static behind an "estimate · not yet reconciled" caption.
  `// TODO(data): expected-refund total + per-component withholding breakdown.`
- **Source docs** (`D9cnC`): the attached-file list with a per-row Preview
  action, built on the existing `FileArtifactRow` primitive (now imported here).
  The contract's `evidence` array is rule/extraction evidence (sourceType,
  verbatimQuote …), **not** file artifacts with filenames + byte sizes, so the
  rows are static; Preview + Add file are stub toasts until ingest lands.
  `// TODO(data): source-document attachments (filename, size, uploadedAt).`

## Materials tab (`AYpfU`)

- **Waived** sub-section (`BGLC4`): added under Outstanding / Received using the
  same kicker sub-header vocabulary. There is no `waived` checklist-item status
  in the contract (status ∈ missing / needs_review / received), so it always
  renders the empty state (`circle-off` icon + "No items waived" + helper line)
  matching the canvas. Hidden on terminal (filed/completed) rows where the
  checklist is an archive.
  `// TODO(data): \`waived\` checklist item status + per-row Waive action.`

## Extension tab (`Ls3vb`)

- **Extension history** table (`muzOr`): mono uppercase column heads on a
  section-tinted strip (Year / Form / Length / Original / Extended to / Filed by
  / Result), ruled rows, tone-dot result cell, "View all client extensions →"
  link. Collapses to stacked rows under `sm`. The obligation detail carries only
  this year's extension decision — no cross-year filing-history collection — so
  rows are static.
  `// TODO(data): prior-year extension/filing history.`

## Evidence tab (`KsbdI`)

- **Authority strip** (`FXD1b`): the `AuthorityFactStrip` primitive gained thin
  vertical dividers between facts and an optional leading `icon` per fact,
  matching the canvas. Wired the book-open icon onto the Authority fact and
  added the **Prior year** fact as an em-dash placeholder.
  `// TODO(data): prior-year filing date.`

## TODO(data) summary (contract gaps surfaced, not closed)

1. Expected-refund total + per-component withholding breakdown.
2. Source-document file attachments (filename, size, uploadedAt).
3. `waived` checklist item status + per-row Waive action.
4. Prior-year extension/filing history (Extension tab table).
5. Prior-year filing date (Evidence authority strip).

## Pixel compromises (deliberate, with reasons)

- Card chrome stays the drawer's flat `rounded-lg border-divider-subtle p-4`
  section style rather than the canvas's `rounded-14` white cards on a grey
  body. The drawer renders the design's full page inside a right-rail surface;
  prior passes standardized on flat sections for cross-tab consistency (see
  earlier dev-logs). New cards follow that established in-drawer vocabulary so
  the four tabs read as one surface.
- Canvas Geist / JetBrains Mono / Geist Mono map onto the app's existing type
  tokens (`font-mono`, `text-sm`, `text-caption-xs`) and color tokens
  (`#079455` → text-success, `#98a2b2` → text-tertiary, etc.) per the tokens-only
  rule — no new theme colors or fonts introduced.
