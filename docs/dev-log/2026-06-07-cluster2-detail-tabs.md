# 2026-06-07 — Cluster 2: deadline detail tabs (pixel-exact + responsive)

Replicated the four Pencil deadline-detail tab designs (`d4YrtC` Summary,
`Ls3vb` Extension, `AYpfU` Materials, `KsbdI` Evidence) inside the EXISTING
right-rail drawer (`ObligationQueueDetailDrawer.tsx`), in the current blue
`#155aef` / Geist visual language — NOT the green canvas theme. The canvas
full-page chrome (icon sidebar, hero strip, 320/340px side rails) is out of
scope; only each tab's body content + copy + field set was mapped onto the
drawer's `<TabsContent>` panels. Spec: `docs/dev-log/_spec-cluster2-detail-tabs.md`.

Per the data rule, no contract schema / DB migration was added. Panels needing
data not in the current contract render a clean minimal state with a
`// TODO(data): …` marker (collected below); the central agent wires the data.

## New reusable primitives (`queue/components/primitives.tsx`)

All map design hexes → existing tokens (accent / state-success / text-warning /
text-tertiary). Card chrome (rounded-14 white cards) is deliberately NOT
replicated 1:1 — the drawer uses flat sections; these primitives carry the inner
content + the design's dot / mono-label / colour vocabulary.

- `MilestoneChip` — dot + label + sub-state caption pill (Summary strip styling).
- `PaymentStillDueCallout` — amber "filing ≠ payment" callout (Extension).
- `FileArtifactRow` — f9fafb icon tile + mono filename + meta + actions
  (Summary Source Docs / Evidence Workpapers — exported for the central agent;
  not yet wired in the drawer because Evidence keeps the richer
  `EvidenceInlineItem` and Summary Source Docs is deferred for data).
- `EvidenceArtifactStatusGrid` + `ArtifactStatusCell` — the 1/4 checks grid
  (Evidence hero), responsive 2-col → 4-col.
- `AuthorityFactStrip` + `AuthorityFact` — quiet mono-labelled fact strip
  (Evidence authority), wraps fluidly.
- `MaterialsProgressLegend` — green progress bar + 3-dot received/outstanding/
  waived legend (Materials header).

## Per-tab matches / divergences

### Summary (`d4YrtC`)

- ADDED a condensed read-only "What's left to do" list mirroring the materials
  checklist (`xOO3r`): accent-filled box + strikethrough for received rows,
  "received <date>" sub, "N of M complete" header, "Manage in Materials →" link
  routing to the tab that owns the editor (no duplicate editor). Hidden on
  filed/completed rows.
- Milestone strip: kept the richer 6-stage `PathToFilingSummary` (product's
  milestone vocabulary) rather than the design's 3 chips — `MilestoneChip` is
  available for a future restyle but the strip was not regressed to 3 stages.
- Expected refund / Source docs / right rail: NOT added (see TODO + spec §1c —
  no data and the drawer has no room for a 320px rail).

### Extension (`Ls3vb`)

- ADDED the amber `PaymentStillDueCallout` ("Extension defers filing, not
  payment") when `row.paymentDueDate` is set — the design's twice-repeated
  payment warning, surfaced once.
- Kept the internal-target-date + decision-memo fields (intentional firm-internal
  plan per project memory) and the `AlertPanel` intro copy. Design's
  form/channel/reason selects stay display-only (derived from matched rule).
- Two-col rule-ref + apply cards → single stacked column (already the case).
- Extension history table: NOT added (no prior-year history data).

### Materials (`AYpfU`, code value `readiness`)

- ADDED `MaterialsProgressLegend` (progress bar + 3-dot legend) under
  `ReadinessOverview`. received = `received`; outstanding = everything else.
- Waived bucket renders 0 — no `waived` checklist status in the contract today.
- The existing flat checklist (with its own Outstanding/Received subsections)
  was kept; not refactored into 3 separate status-bucket cards to avoid churning
  the large, already-shipped checklist render + send-request flow.

### Evidence (`KsbdI`)

- ADDED the 1/4 artefact-checks hero (`EvidenceArtifactStatusGrid`): WORKPAPERS /
  FILED RETURN / E-FILE ACK / FORM 8879, all derived from EXISTING fields
  (`detail.evidence` count, `row.status`, `row.efileState` pipeline) — no
  invented field.
- ADDED the always-visible `AuthorityFactStrip` (AUTHORITY / RULE / DUE +
  "Open rule reference →") promoting the headline authority facts out of the
  collapsed `<details>`, which is kept for the verbose per-source excerpts.
- Workpapers rows keep `EvidenceInlineItem` (richer typed evidence); Filed-return
  / E-file-ack / Client-signoffs sub-cards NOT added as separate panels — their
  state is summarised in the hero grid; the signature flow stays on the existing
  `onRemindSignature` path.

## TODO(data) gaps (rendered minimal / omitted; central agent to wire)

- Evidence authority strip: **prior-year filing date** (`PRIOR YEAR` fact) — no
  prior-year filing record on the obligation. Marked inline in the drawer.
- Materials: **`waived` checklist item status** + per-row Waive action — legend
  waived bucket hard-codes 0 until the status lands. Marked inline.
- Summary (omitted, spec §1c / data-gaps): Expected-refund + withholding figures;
  per-deadline Source-docs list; Status/Assigned/Recent-activity right rail.
- Extension (omitted, spec §2c): prior-year extension history table; editable
  form / channel / reason-code selects (currently display-only from matched rule).

## Verify

- `npx tsgo --noEmit -p apps/app` → 0 errors.
- `vp lint` + `vp fmt --check` on both touched files → clean.
- Obligations vitest: 21 tests passed (3 unrelated files fail on a worktree
  `@/` alias-resolution env issue, not these changes).

i18n: `<Trans>` / `t` strings added but `i18n:extract`/`compile` deliberately NOT
run (central pass avoids parallel catalog conflicts).
