# 2026-05-21 · Readiness Document Checklist

Implemented the Obligation detail Readiness checklist as a CPA-owned document collection list instead
of an AI-generated client-answer checklist.

- Added deterministic document checklist templates in `@duedatehq/core`, covering 1040, 1065,
  1120-S, 1120, 1041, payroll/941, 1099, FBAR/foreign, 990, sales/use tax, and generic fallback.
- Added `obligation_readiness_checklist_item` with template/custom source, missing/received/
  needs-review status, notes, ordering, and received metadata.
- Updated readiness procedures so generate is idempotent, regenerate replaces only template items,
  custom items are preserved, and add/update/delete are first-class API actions.
- Made open obligation readiness derive from the internal checklist before falling back to legacy
  portal responses.
- Updated Obligation detail Readiness UI for document received checkboxes, custom item editing, and
  sending the current internal list to the client portal.
- Synced public readiness portal submissions back to the same internal document checklist.

Validation:

- `pnpm --filter @duedatehq/core test`
- `pnpm --filter @duedatehq/db test`
- `pnpm --filter @duedatehq/server test`
- `pnpm --filter @duedatehq/app test`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm check`
