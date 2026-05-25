# 2026-05-21 · Obligation Evidence Extension Summary

Addressed the obligation drawer Evidence tab showing raw extension decision JSON such as
`{"decision":"applied","memo":null,...}`.

- Added a shared extension-decision evidence formatter for obligation evidence surfaces.
- The obligation drawer now renders extension evidence as a CPA-readable summary with target date,
  payment treatment, optional source, and optional memo rows.
- The reusable evidence drawer uses the same formatter so it does not fall back to raw JSON for
  extension decision records.

Validation:

- `pnpm --filter @duedatehq/app test src/features/evidence/extension-decision-evidence.test.tsx`
- `pnpm --filter @duedatehq/app test src/features/obligations/timeline.test.tsx`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm --filter @duedatehq/app build`

Notes:

- `pnpm exec prettier --check ...` was not available in this workspace because `prettier` is not
  installed as a direct executable.
