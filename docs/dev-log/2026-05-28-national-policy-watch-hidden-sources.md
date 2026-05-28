# National Policy Watch Hidden Sources

## Context

Today should communicate national tax-policy coverage, not raw source or adapter counts. The raw
source count was especially misleading once hidden Pulse watch sources were added for Federal + 50
states + DC.

## Change

- Added an internal policy-watch model for baseline rules, tax news, and disaster relief coverage.
- Added hidden national policy-watch adapters for Federal + 50 states + DC. They participate in
  Pulse ingest but are not added to the public Rule Source registry.
- Kept `/rules/sources` visible content unchanged by filtering hidden policy-watch IDs out of
  source-health and source-signal responses used by the Sources page.
- Changed Today's monitoring chip to jurisdiction coverage copy instead of raw source-count copy.

## Validation

- `pnpm --filter @duedatehq/core test -- src/rules/index.test.ts`
- `pnpm --filter @duedatehq/server test -- src/jobs/pulse/rule-source-adapters.test.ts src/procedures/pulse/index.test.ts`
- `pnpm --filter @duedatehq/ingest test -- src/ingest.test.ts`
- `pnpm --filter @duedatehq/app test -- src/features/pulse/__dev__/mock-pulse.test.ts src/features/pulse/lib/source-health-labels.test.ts`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm exec vp check packages/core/src/rules/index.ts packages/core/src/rules/index.test.ts apps/server/src/jobs/pulse/rule-source-adapters.ts apps/server/src/jobs/pulse/rule-source-adapters.test.ts apps/server/src/procedures/pulse/index.ts apps/server/src/procedures/pulse/index.test.ts apps/app/src/features/dashboard/needs-attention-section.tsx apps/app/src/i18n/locales/en/messages.po apps/app/src/i18n/locales/en/messages.ts apps/app/src/i18n/locales/zh-CN/messages.po apps/app/src/i18n/locales/zh-CN/messages.ts docs/dev-log/2026-05-28-national-policy-watch-hidden-sources.md`
- Browser: `/rules/sources` did not render any `policy-watch.*` hidden source IDs; Today rendered
  `Monitoring 52 jurisdictions` and no raw `Monitoring N sources` chip.
