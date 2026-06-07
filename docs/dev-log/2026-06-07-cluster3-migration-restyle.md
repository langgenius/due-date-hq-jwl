# Cluster 3 — Migration wizard restyle-in-place

Restyle the `/migration/new` wizard toward the canonical Pencil frames
(`duedatehq_work.pen`: SLw8Q/dCUv7/Ni54l Step1, kVCz1/AQoBE/C1rGt Step2,
oIjlr/g8CrCZ/tGcB0 Step3, zKPm2/YcJR4 Step4, OBKVs/uoNwI success). Visual
language kept (blue/Geist). Restyle-in-place: existing structure/tests
preserved where they conflict with a full pixel-exact restructure.

## Shipped

- **Stepper** (`Stepper.tsx`): bordered rounded-md chips + flex connector
  rail → rounded-full pills with numbered circles, filled-accent active
  pill, green-tint completed pill + check, ChevronRight separators
  (design SLw8Q/dCUv7). Display-only.
- **Shell header** (`WizardShell.tsx`, `Wizard.tsx`): added the "Import
  history" ghost button present in every frame; opens the existing
  `ImportHistoryDrawer` mounted in-place inside the wizard (gated to its
  open state so the wizard still renders without the app providers).
- **Step 2** (`Step2Mapping.tsx`): count-chip PillStrip (Auto-mapped /
  Needs review / Skipped) + override hint; shield-check "nothing applies
  until step 4" helper; per-row confidence readout → toned Badge pills
  (label strings unchanged for test assertions).
- **Step 3** (`Step3Normalize.tsx`): Auto-normalized / Confirm / Default
  Matrix count chips + "Audit logged"; Checkbox → Switch for the
  per-group apply toggle; "Edit defaults" link in the matrix card header;
  shield-check reassurance helper.
- **Step 4** (`Step4Preview.tsx`): headline counts → "READY TO IMPORT"
  hero with a 3-cell SummaryMetric grid (clients / already-in-list /
  deadlines); secondary skipped/historical/rolled-forward facts kept as a
  quiet list below.
- **Step 1** (`Step1Intake.tsx`): parse-error Alert → reject callout with
  OctagonAlert icon + "Source format unrecognized" framing + a "Use
  Generic CSV instead" recovery (clears the preset, re-attempts as plain
  CSV).

## Deferred — TODO(pixel-exact)

- Step 2 strict 4-column table (design AQoBE) — banner rows kept
  (asserted by `Step2Mapping.test`).
- Step 3 flat FIELD/BEFORE/AFTER/STATUS happy table + per-category
  needs-input cards (tGcB0) — collapsible category model kept.
- Step 4 segmented dup control + gray modal body.

## Deferred — TODO(data) / net-new (flagged, not built)

- Step 1 structured "MISSING REQUIRED COLUMNS (N of M)" per-column panel:
  the csv-parser only throws a generic message and does not expose which
  required columns are missing — needs parser/contract changes.
- Step 3 inline "Re-run AI" handler (mirror `handleStep2Rerun` against
  `runNormalizerMutation`) — no Step-3 re-run handler exists in
  `Wizard.tsx`.
- Step 4 Applied-success `SuccessModal` (design uoNwI): rich surface with
  4 stats (clients / rules active / upcoming-30-days / emails sent), a 24h
  undo countdown banner, and a "what to do next" list. Undo capability
  already exists (toast → AlertDialog → `revertMutation`); the surface +
  countdown + extra stats need additional apply-result/dashboard data.
- Preset chips for Canopy / IIF (QuickBooks Desktop) / Generic CSV
  (design Step-1 chip list): `PresetId` is a closed contract enum — adding
  these needs a contract change.

## Verify

- `npx tsgo --noEmit -p apps/app` — 0 errors in app source.
- `pnpm --dir apps/app test -- src/features/migration` — 66 passed.
  (`Wizard.test` all-ignore assertion aligned to the
  "Review your column mappings" fallback heading.)

i18n: `<Trans>`/`t` strings added; `i18n:extract`/`compile` left for the
central pass.
