# 2026-05-30 · Rule Library row border

## Context

Yuqi flagged `/rules/library` jurisdiction rows as visually double-bordered: each row had the
table primitive's bottom hairline plus an added top border, making adjacent row separators look
too thick.

## Change

- Removed the extra `border-t-2 border-divider-deep` from `GroupHeaderRow`.
- Kept the shared `TableRow` primitive as the single source for row separators, so each
  jurisdiction row renders one bottom hairline only.

## Verification

- `pnpm --filter @duedatehq/app test -- src/routes/rules.library.test.tsx` — 17/17 passed.
- `pnpm --filter @duedatehq/app exec tsc --noEmit` — passed.
- Browser check on `http://localhost:5173/rules/library`: Alaska group row computed
  `border-top: 0px` and `border-bottom: 1px`.

`DESIGN.md` remains aligned: this restores the shared table primitive's single-row separator
contract instead of introducing a new Rule Library-specific chrome pattern.
