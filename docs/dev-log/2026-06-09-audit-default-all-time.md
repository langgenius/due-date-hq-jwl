# 2026-06-09 — Audit log defaults to all time

## Change

- Changed the `/audit` time-range filter default from `Last 24h` to `All time`.
- Aligned the shared `AuditListInputSchema` default with the UI by exporting
  `DEFAULT_AUDIT_RANGE = 'all'`.
- Kept explicit range filters (`24h`, `7d`, `30d`) available from the dropdown.

## Verification

- `packages/contracts/src/contracts.test.ts` now asserts omitted `audit.list`
  range input defaults to `all`.
- `pnpm --filter @duedatehq/contracts test -- -t "freezes audit.list read contract"
src/contracts.test.ts`
- `pnpm exec tsc --noEmit -p packages/contracts/tsconfig.json`
- `pnpm exec tsc --noEmit -p apps/app/tsconfig.json`
- Browser verification showed the Time range combobox on `/audit` as `All time`
  when no `range` URL param is present.
