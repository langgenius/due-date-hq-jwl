# 2026-05-25 · Deadline terminology copy sweep

## Summary

The public product vocabulary now treats `deadline` as the user-facing name for
the work item and keeps `obligation` as the internal data-model name.

- Replaced the `/deadlines` loading, empty, export, detail drawer, blocking,
  evidence, and workflow copy that still said obligation/obligations.
- Swept related app surfaces: Rule Library, Pulse, clients, workload, audit,
  migration preview, practice settings, reminders guidance, and rule generation
  preview copy.
- Swept marketing strings and server-returned text used by exports, readiness,
  morning digest, opportunities, and deadline detail errors.
- Updated Playwright/page-object and focused unit-test expectations to the
  deadline wording, and aligned `DESIGN.md` terminology.
- Changed the deadline detail panel's client-name kicker to navigate directly
  to the client detail page instead of opening the client drawer.

## Validation

- `pnpm --filter @duedatehq/app i18n:extract` passed.
- `pnpm --filter @duedatehq/app i18n:compile` still fails because the zh-CN
  catalog has 181 missing translations.
- `pnpm --filter @duedatehq/app exec lingui compile` passed to refresh generated
  message bundles.
- `pnpm --filter @duedatehq/app test -- src/routes/obligations.test.ts src/features/rules/generation-preview-tab.test.tsx src/features/rules/coverage-tab.test.tsx src/features/audit/audit-log-model.test.ts`
  passed.
- `pnpm --filter @duedatehq/server test -- src/procedures/obligations/_service.test.ts src/procedures/obligations/index.test.ts src/procedures/readiness/index.test.ts`
  passed.
- `pnpm exec vp check apps/app/src/routes/obligations.tsx` passed.
- `pnpm --filter @duedatehq/app test -- src/routes/obligations.test.ts`
  passed.
- `rg` sweeps for the old visible phrases now return only internal identifiers,
  comments, test names, and placeholder names such as `obligation_url`.
