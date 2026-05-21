# 2026-05-21 · Obligation Timeline Activity Labels

Addressed the Timeline tab audit fallback showing raw technical action keys such as
`obligation.extension.decided`.

- Registered `obligation.extension.decided` in the shared audit action label map as
  `Extension plan saved`, matching the Extension tab save confirmation copy.
- Routed Timeline "Other activity" rows through `formatAuditActionLabel`, so known actions use
  curated labels and unknown actions fall back to readable humanized text instead of dotted keys.
- Kept the underlying audit action unchanged for compliance/search; only the CPA-facing display
  label changed.

Validation:

- `pnpm --filter @duedatehq/app test src/features/audit/audit-log-model.test.ts`
- `pnpm --filter @duedatehq/app test src/features/obligations/timeline.test.tsx`
- `pnpm --filter @duedatehq/app build`
