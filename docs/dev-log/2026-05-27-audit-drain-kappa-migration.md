# Audit drain — κ migration wizard (wave 2)

**Author:** Agent κ (kappa-migration-wizard)
**Branch:** `design/audit-drain-kappa-migration`
**Scope:** Drain remaining Step 7 audit Flow 6 findings on the Migration Copilot wizard. Files owned: `apps/app/src/routes/migration.new.tsx`, `apps/app/src/features/migration/**`.

## Starting state

Wave 1 had landed 17 of the 27 F6-\* findings. This pass picks the mechanically safe leftovers — copy edits, label re-typography, a live row counter, repositioning a trust line, an EIN tooltip, and the live undo countdown the dev-log had flagged as deferred-cross-component.

| Finding | State on arrival | Action                                                                                                                                             |
| ------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| F6-01   | shipped          | verified                                                                                                                                           |
| F6-02   | deferred         | **shipped** (rename + reorder)                                                                                                                     |
| F6-03   | shipped          | verified                                                                                                                                           |
| F6-05   | deferred         | **shipped** (font-mono uppercase → canonical Label)                                                                                                |
| F6-06   | deferred         | **shipped** (live row count)                                                                                                                       |
| F6-08   | shipped          | verified                                                                                                                                           |
| F6-09   | deferred         | **shipped** (lock line above paste)                                                                                                                |
| F6-10   | shipped          | verified                                                                                                                                           |
| F6-11   | shipped          | verified                                                                                                                                           |
| F6-12   | shipped          | verified                                                                                                                                           |
| F6-13   | deferred         | **shipped** (EIN tooltip)                                                                                                                          |
| F6-14   | shipped          | verified                                                                                                                                           |
| F6-16   | shipped          | verified                                                                                                                                           |
| F6-17   | shipped          | verified                                                                                                                                           |
| F6-18   | shipped          | verified                                                                                                                                           |
| F6-19   | shipped          | verified                                                                                                                                           |
| F6-20   | shipped          | verified                                                                                                                                           |
| F6-21   | deferred         | **shipped** (live undo countdown in ImportHistoryDrawer)                                                                                           |
| F6-22   | shipped          | verified                                                                                                                                           |
| F6-23   | shipped          | verified                                                                                                                                           |
| F6-24   | shipped          | verified                                                                                                                                           |
| F6-25   | shipped          | verified                                                                                                                                           |
| F6-26   | shipped          | verified                                                                                                                                           |
| F6-27   | deferred         | skipped — Wizard.test.tsx asserts literal "Continue" on Steps 1-3; copy change belongs in a single commit that also updates tests, not this drain. |

## Changes

### F6-02 · ActivationOutcome chip rename + reorder (`migration.new.tsx`)

Three chips now read `Import → Deadlines → Risk view` (mental model: act → see → assess). Renamed `Today risk` → `Risk view` because the chip is showing what surface the import unlocks, not a stat. Also renamed the first chip `Client facts` → `Import` so the row reads as a workflow rather than three nouns the user has never met.

Icons unchanged.

### F6-05 · Step 1 paste/upload/source-preset labels → canonical Label

Step 1 had three uppercase-tracked `font-mono` labels above three input affordances (`Paste rows`, `Upload file`, `I'm coming from…`). They read as terminal eyebrows; the rest of the app uses sentence-case `<Label>` for form fields. Adopted `<Label htmlFor=…>` for the paste textarea and the upload drop zone; left the preset-chips label as a plain `<span>` (it labels a group of chips, not an input).

Visual change: the three labels switch from `text-xs uppercase tracking-eyebrow text-text-tertiary` mono to the canonical Label component (`text-sm font-medium text-text-primary`). The wizard now reads as part of the workbench instead of as a terminal pane embedded in it.

### F6-06 · Live row count below paste textarea

While typing/pasting, the textarea now renders a live `~N rows detected` line below it regardless of parse outcome. Previously the user had to wait until parse succeeded (often debounced) to see any feedback. For 1000-row pastes the counter prevents the "did it take the paste?" doubt.

The estimate counts non-empty lines in `intake.rawText`. Once the parse completes, the canonical "N rows ready to import" line further down the step still owns the authoritative count.

### F6-09 · Lock-icon trust line moved above the paste textarea

The `<LockIcon /> We block SSN-like patterns…` line previously sat after paste, upload, AND the preset chips — far from the place the user commits sensitive data. Moved it directly above the paste textarea (still inside the paste/upload group) so the trust signal lands before the action that needs it. Anchored via `aria-describedby` so the announcement order in AT is paste-input → trust-line.

### F6-13 · EIN summary metric tooltip (`Step2Mapping.tsx`)

The summary card "EIN: Found / Not found" had visual prominence but no explanation. Wrapped the metric in a `Tooltip` whose content reads "Required for penalty risk forecasting." — the same vocabulary the rest of the product uses for EIN. Visual chrome unchanged.

### F6-21 · Live "undo expires in X" countdown (`ImportHistoryDrawer.tsx`)

`isBatchRevertible(batch)` already used `revertExpiresAt`; the drawer just printed the timestamp ("Revert until: May 27, 4:32 PM PT"). Added a `<RelativeUndoCountdown />` child that reads `revertExpiresAt`, ticks once a minute, and renders one of:

- `Undo expires in 23h 47m`
- `Undo expires in 47m`
- `Undo expires in <1m`
- (nothing once expired — the Revert button is already disabled)

Ticks via a single `setInterval(60_000)` shared across all open batches; cleaned up on unmount. Honours `prefers-reduced-motion` only insofar as it's text — no animation.

The static "for 24 hours" promise on Step 4 (`Step4Preview.tsx`) is unchanged — that's the pre-import promise. The countdown only matters post-import when the user actually has a batch to revert.

## TypeScript

`pnpm exec tsc --noEmit` clean.

## i18n

`pnpm i18n:extract` ran. New zh-CN strings added:

- `Risk view` → `风险视图`
- `Import` (chip context) → already present
- `~{rowCount} rows detected` → `检测到约 {rowCount} 行`
- `Required for penalty risk forecasting.` → `用于罚款风险预测。`
- `Undo expires in {hours}h {minutes}m` → `撤销在 {hours} 小时 {minutes} 分后过期`
- `Undo expires in {minutes}m` → `撤销在 {minutes} 分钟后过期`
- `Undo expires in <1m` → `撤销在 1 分钟内过期`

## Notes

- Files outside `features/migration/` + `routes/migration.new.tsx` left untouched. zh-CN strings added only for new msgids in this batch.
- F6-27 (step-specific Continue labels) deliberately skipped — the override would force a Wizard.test.tsx update that belongs in its own commit. Documented in this dev-log so future passes don't re-discover.
