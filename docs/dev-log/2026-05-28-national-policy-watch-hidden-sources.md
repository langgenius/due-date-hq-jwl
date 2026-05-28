# National Policy Watch Hidden Sources

## Context

Today should communicate national tax-policy coverage, not raw source or adapter counts. The raw
source count was especially misleading once hidden Pulse watch sources were added for Federal + 50
states + DC.

## Change

- Added an internal policy-watch model for baseline rules, tax news, and disaster relief coverage.
- Added hidden national policy-watch adapters for Federal + 50 states + DC. They participate in
  Pulse ingest but are not added to the public Rule Source registry.
- Added an internal policy-watch coverage audit so coverage can distinguish automated,
  review-only, manual-review, and blocked source families. The current audit keeps 52
  jurisdictions present, identifies 24 baseline-rule families still needing manual-review
  hardening, and marks PDF-only watch coverage as review-only rather than strong automation.
- Tightened hidden announcement-list ingest: hidden policy-watch adapters no longer fallback from a
  generic list page into an alert candidate, RSS/list noise is filtered before extraction, and
  PDF-only hidden watch sources become CPA-facing review-only Alerts instead of entering Apply.
- Removed the separate legacy source-event product/interface path. Parsed items now write
  `pulse_source_snapshot` and enter extract; `signal_only` means review-only Alert, not an
  internal queue.
- Added DB migration 0056, preserving legacy source-event rows as source snapshots before dropping
  the old table and concrete-draft legacy reference column.
- Added lightweight duplicate suppression before creating extracted Pulse rows, keyed by
  jurisdiction, change kind, action mode, source URL, dates, forms, entity types, and counties.
- Kept `/rules/sources` visible content unchanged and removed the old source-event trail panel.
- Changed Today's monitoring chip to jurisdiction coverage copy instead of raw source-count copy.
- Clarified the internal metrics: 356 Rule Library registry sources, 101 public/source-health Pulse
  adapters, 52 hidden policy-watch adapters, and 153 total ingest adapters. Product-facing copy
  should continue to use jurisdiction coverage, not adapter/source counts.

## Validation

- `pnpm --filter @duedatehq/core test -- src/rules/index.test.ts`
- `pnpm --filter @duedatehq/server test -- src/jobs/pulse/rule-source-adapters.test.ts src/jobs/pulse/ingest.test.ts src/jobs/pulse/extract.test.ts`
- `pnpm --filter @duedatehq/ingest test -- src/ingest.test.ts`
- `pnpm --filter @duedatehq/db test -- src/repo/pulse.test.ts`
- `pnpm --filter @duedatehq/app test -- src/features/pulse/__dev__/mock-pulse.test.ts src/features/pulse/lib/source-health-labels.test.ts`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm exec vp check packages/core/src/rules/index.ts packages/core/src/rules/index.test.ts packages/ingest/src/types.ts packages/ingest/src/announcements.ts packages/ingest/src/ingest.test.ts packages/db/src/repo/pulse.ts packages/db/src/repo/pulse.test.ts apps/server/src/jobs/pulse/rule-source-adapters.ts apps/server/src/jobs/pulse/rule-source-adapters.test.ts apps/server/src/jobs/pulse/ingest.ts apps/server/src/jobs/pulse/ingest.test.ts apps/server/src/jobs/pulse/extract.ts apps/server/src/jobs/pulse/extract.test.ts apps/server/src/procedures/pulse/index.ts docs/dev-log/2026-05-28-national-policy-watch-hidden-sources.md`
- Browser: `/rules/sources` did not render any `policy-watch.*` hidden source IDs; Today rendered
  `Monitoring 52 jurisdictions` and no raw `Monitoring N sources` chip.
