# Annual rollover dialog — wired to the real engine

Date: 2026-06-07

Backend data pass, item 4. The `AnnualRolloverDialog` (Pencil c7xPK) rendered a
static `FALLBACK_PREVIEW` with no-op buttons. The rollover **engine + contract +
handlers already existed** (`obligations.previewAnnualRollover` /
`createAnnualRollover`, `runAnnualRollover`) — this was a UI-wiring task, not an
engine build.

## What shipped (no contract/engine change)

`apps/app/src/features/obligations/AnnualRolloverDialog.tsx`:

- Removed the static fallback. Preview runs via
  `previewAnnualRollover.queryOptions({ input: { sourceFilingYear, targetFilingYear }, enabled: open })`
  when the dialog opens; loading / error / empty states added.
- Summary cards + per-row table render real data: counts from
  `summary` (willCreate→Will update, review→Requires review, skipped→No verified
  rule), rows from `output.rows` (client · form, target-year due date, rule-change
  from `preview.reviewReasons`, disposition badge). The six engine dispositions
  map onto the three Pencil buckets.
- Apply actions wired to `createAnnualRollover`:
  - "Apply N safe items only" → `clientIds` = clients whose rows are all
    `will_create`.
  - "Roll over all" → no `clientIds` (full set).
    Success toasts the created count, invalidates the deadlines list, closes.
- Default `sourceFilingYear` = current year; the engine validates
  `target === source + 1` and returns the authoritative years.

## Remaining TODO(data)

- The engine row exposes the NEW (target-year) due + review reasons but not the
  source obligation's due date, so the "TY {from} due" reference cell shows an
  em-dash. Threading `sourceDueDate` through the rollover buckets would fill it.

## Verify

- tsgo (app) → 0; obligations 55/55
- `vp check` → 0 errors
