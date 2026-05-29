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
  jurisdictions present and now reports no manual-review or blocked family coverage; the former 24
  manual baseline-rule families are parser-backed review-only coverage.
- Added source automation remediation audit details so manual/blocked/signal-only gaps list
  source IDs, URLs, acquisition method, health, and suggested parser kind. The audit is internal and
  does not alter `/rules/sources`.
- Expanded parser-backed rule-source adapters: HTML pages, RSS/API lists, PDF documents/indexes,
  and inferred manual registry URLs can now write snapshots and enter extract. PDF and weak
  baseline sources remain review-only and never expose Apply unless extract evidence is complete.
- Tightened hidden announcement-list ingest: hidden policy-watch adapters no longer fallback from a
  generic list page into an alert candidate, RSS/list noise is filtered before extraction, and
  PDF-only hidden watch sources become CPA-facing review-only Alerts instead of entering Apply.
- Added a hidden source reliability audit for parser-ready, generic, stale/redirected, stale PDF
  root, transient fetch-blocked, and needs-replacement source states. CO/NH/VT-style direct-fetch
  403s are tracked as transient browser-openable issues instead of hard failures.
- Replaced deterministic weak hidden watch roots with more specific official sources where
  available: CT DRS Media Room, NV News and Publications/feed, PA Tax Update Newsletter PDF index,
  SC DOR News, WI DOR News, WV Administrative Notices, and more specific AK/AR/DE pages. Ohio no
  longer uses an old single PDF as the watch root; it is held as review-only through the official
  OHTAX GovDelivery subscription source until a proper archive/inbound parser is connected.
- Expanded announcement parsing so tax update, tax bulletin, administrative notice, and technical
  assistance links can reach extract. PA Tax Update Newsletter PDFs are now treated as tax-policy
  Alert candidates and remain review-only.
- Removed the separate legacy source-event product/interface path. Parsed items now write
  `pulse_source_snapshot` and enter extract; `signal_only` means review-only Alert, not an
  internal queue.
- Added DB migration 0056, preserving legacy source-event rows as source snapshots before dropping
  the old table and concrete-draft legacy reference column.
- Added lightweight duplicate suppression before creating extracted Pulse rows, keyed by
  jurisdiction, change kind, action mode, source URL, dates, forms, entity types, and counties.
- Kept `/rules/sources` visible content unchanged and removed the old source-event trail panel.
- Changed Today's monitoring chip to jurisdiction coverage copy instead of raw source-count copy.
- Clarified the internal metrics: Rule Library registry sources, public/source-health Pulse
  adapters, and hidden policy-watch adapters are engineering inventory. Product-facing copy should
  continue to use jurisdiction coverage, not adapter/source counts.

## Validation

- `pnpm --filter @duedatehq/core test -- src/rules/index.test.ts`
- `pnpm --filter @duedatehq/server test -- src/jobs/pulse/rule-source-adapters.test.ts src/jobs/pulse/ingest.test.ts src/jobs/pulse/extract.test.ts`
- `pnpm --filter @duedatehq/ingest test`
- `pnpm --filter @duedatehq/db test -- src/repo/pulse.test.ts`
- `pnpm --filter @duedatehq/contracts test -- src/contracts.test.ts`
- `pnpm --filter @duedatehq/app test -- src/features/pulse/__dev__/mock-pulse.test.ts src/features/pulse/lib/source-health-labels.test.ts`
- `pnpm --filter @duedatehq/app test -- src/features/pulse src/features/rules`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm exec vp check packages/core/src/rules/index.ts packages/core/src/rules/index.test.ts packages/contracts/src/rules.ts packages/ingest/package.json packages/ingest/src/http.ts packages/ingest/src/pdf.ts packages/ingest/src/index.ts packages/ingest/src/ingest.test.ts apps/server/src/jobs/pulse/rule-source-adapters.ts apps/server/src/jobs/pulse/rule-source-adapters.test.ts apps/server/src/jobs/pulse/ingest.ts apps/server/src/jobs/pulse/ingest.test.ts apps/server/src/jobs/pulse/extract.ts apps/server/src/jobs/pulse/extract.test.ts apps/app/src/routes/rules.pulse.tsx docs/dev-log/2026-05-28-national-policy-watch-hidden-sources.md`
- Browser: `/rules/sources` did not render any `policy-watch.*` hidden source IDs; Today rendered
  `Monitoring 52 jurisdictions`; `/rules/pulse` also rendered `Monitoring 52 jurisdictions` and no
  raw adapter/source count; review-only Alert controls did not include Apply.
