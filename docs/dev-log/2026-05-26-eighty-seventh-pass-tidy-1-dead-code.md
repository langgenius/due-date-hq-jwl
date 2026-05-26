# Eighty-seventh pass — Tidy 1/N: dead code removal

**Date:** 2026-05-26
**Scope:** `apps/app/src/routes/obligations.tsx`, `apps/app/src/features/pulse/PulseDetailDrawer.tsx`
**Branch:** `feat/jolly-hopper-46479d` (worktree `jolly-hopper-46479d`)

## What changed

Removed five underscore-prefixed orphan functions plus their downstream
dead helpers and the imports they were keeping alive. These had all
been retained with `_`-prefix specifically to silence
`@typescript-eslint/no-unused-vars` and had been generating warnings on
every `vp lint` run for weeks. None had any live caller.

### `apps/app/src/routes/obligations.tsx` (−314 lines)

Removed:

- `_statusDropdownOptions` + `void` statement — retained "in case we
  restore the pill" after feedback #4 (2026-05-26). The pill stayed
  removed; the local recomputation is gone.
- `_PenaltyBreakdownCard` + its 5 dead helpers: `PenaltySourceList`,
  `penaltyFactLabel`, `penaltyInputLabel`, `formatPenaltyFormula`,
  `formatPenaltyInputValue`. All orphaned after Risk-tab removal
  (2026-05-21).
- `_penaltyFormulaDisplay`, `_penaltyFactsDisplay` — same Risk-tab
  vintage.
- `_DeadlineTipPanel` + its only consumer helpers `InsightStatusBadge`
  and `InsightCitationChips`. `InsightStatusBadge` was a duplicate of
  the live copy at `ClientFactsWorkspace.tsx:4503`; kept that one and
  removed the obligations.tsx copy. `_DeadlineTipPanel` itself was
  orphaned after the same Risk-tab pass.
- Unused import: `type AiInsightPublic` (only referenced by the dead
  panel + dead InsightStatusBadge).
- Two other dead imports the orphan-walk surfaced: `FileSearchIcon`,
  `UpgradeCtaButton`.

Kept (verified live): `AlertPanel` (used at obligations.tsx:6859),
`formatCents`, `humanizeToken`, `ALL_STATUSES`,
`LIFECYCLE_V2_STATUSES`.

### `apps/app/src/features/pulse/PulseDetailDrawer.tsx` (−93 lines)

Removed:

- `_SuggestedActionsPanel` — orphaned 2026-05-26 (sixteenth pass #6)
  when the inline action panel was retired in favor of the sticky
  `SheetFooter` (DrawerActions). Was kept "for reference."
- The 16-line JSDoc + 8-line trailing comment block that explained why
  it was orphaned.
- Imports the orphan was keeping alive: `Plural` (from
  `@lingui/react/macro`), `CheckCircle2Icon` (from `lucide-react`).

The in-flow comment at PulseDetailDrawer.tsx:778 ("SuggestedActionsPanel
removed — its Apply / Mark-reviewed buttons duplicated the sticky
SheetFooter…") was **kept** — it explains _why_ there is no inline
action panel at that mount site, which is still useful context for
anyone considering re-adding one.

## Verification

```
pnpm exec tsc -p apps/app/tsconfig.json --noEmit  → clean
pnpm exec vp lint apps/app                        → 0 warnings, 0 errors
```

Pre-pass lint had 3 active warnings (the 5 orphans collapse into 3
distinct lint diagnostics — eslint dedupes by identifier prefix). All
gone.

`apps/app/src/routes/obligations.tsx`: 11812 → 11498 lines.
`apps/app/src/features/pulse/PulseDetailDrawer.tsx`: 1267 → 1174 lines.

## Why

User feedback (2026-05-26):

> "have you tidied up the current code for the application? so they
> are component based, all wired and clean"
> "No dead code removal. Several functions are explicitly marked as
> orphaned with `_` prefix and I left them: \_DeadlineTipPanel,
> \_PenaltyBreakdownCard, \_penaltyFormulaDisplay, \_penaltyFactsDisplay,
> \_statusDropdownOptions — the lint warnings called them out every
> time I ran vp lint this session."

Honest gap that had been ignored across multiple passes — these
weren't load-bearing comments, they were dead branches kept "just in
case" through 80+ passes. Time to actually delete them.

## Out of scope (next passes)

This is Pass 1/N of a code tidying series. Still pending:

- Pass 2 — Unused export audit across `apps/app/src` (find exports not
  imported anywhere).
- Pass 3 — Primitive extraction (inline components in giant files
  like `obligations.tsx`, `ClientFactsWorkspace.tsx`, `rules.library.tsx`
  → colocated feature files).
- Pass 4 — Deduplication (find duplicate logic, redundant helpers,
  copy-pasted patterns).
- Pass 5 — Comment consolidation (move historical dated comments
  referencing removed features into `docs/dev-log/`; keep "why"
  comments at the code site).
- Pass 6 — Type-safety tightening (weak types, residual `any`).

## Files

- `apps/app/src/routes/obligations.tsx` — net −314 lines (−303 dead
  block + −11 inline `_statusDropdownOptions` block + −3 import lines
  - cleanup)
- `apps/app/src/features/pulse/PulseDetailDrawer.tsx` — net −93 lines
- `docs/dev-log/2026-05-26-eighty-seventh-pass-tidy-1-dead-code.md`
  (this file)
