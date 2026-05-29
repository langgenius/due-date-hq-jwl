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
  apply-readiness candidate, manual-review, and blocked source families. The current audit keeps 52
  jurisdictions present and now reports no manual-review or blocked family coverage; the former 24
  manual baseline-rule families are parser-backed due-date candidate coverage.
- Added source automation remediation audit details so manual/blocked/signal-only gaps list
  source IDs, URLs, acquisition method, health, and suggested parser kind. The audit is internal and
  does not alter `/rules/sources`.
- Expanded parser-backed rule-source adapters: HTML pages, RSS/API lists, PDF documents/indexes,
  and inferred manual registry URLs can now write snapshots and enter extract. PDF and weak
  baseline sources may produce `due_date_overlay` Alerts; Apply stays blocked by readiness until
  the CPA confirms a new due date and selects affected deadlines.
- Tightened hidden announcement-list ingest: hidden policy-watch adapters no longer fallback from a
  generic list page into an alert candidate, RSS/list noise is filtered before extraction, and
  PDF-only hidden watch sources can still surface CPA-facing due-date candidates when extract finds
  deadline intent.
- Added a hidden source reliability audit for parser-ready, generic, stale/redirected, stale PDF
  root, transient fetch-blocked, and needs-replacement source states. The original CO/NH/VT
  homepage/newsroom roots were confirmed as browser-only/WAF-sensitive for backend fetching and
  replaced with more specific parser-backed official entries.
- Replaced deterministic weak hidden watch roots with more specific official sources where
  available: CT DRS Media Room, NV News and Publications/feed, PA Tax Update Newsletter PDF index,
  SC DOR News, WI DOR News, WV Administrative Notices, and more specific AK/AR/DE pages. Ohio no
  longer uses an old single PDF as the watch root; the official OHTAX GovDelivery subscription
  source is treated as a due-date candidate source while Apply remains CPA-gated.
- Expanded announcement parsing so tax update, tax bulletin, administrative notice, and technical
  assistance links can reach extract. PA Tax Update Newsletter PDFs are now treated as tax-policy
  Alert candidates and are not source-level forced into review-only mode.
- Added technical bulletin and technical information release matching so NH DRA TIRs and Vermont
  Department of Taxes Technical Bulletins can produce tax-policy Alert candidates from PDF indexes.
- Replaced the generic Wyoming DOR homepage watch with the official Wyoming DOR Rules and
  Regulations page and expanded announcement matching for rules-and-regulations/effective-date
  links.
- Browserless target requests now use browser-compatible page headers instead of forwarding the
  Pulse bot user agent into WAF-protected government pages.
- Removed the separate legacy source-event product/interface path. Parsed items now write
  `pulse_source_snapshot` and enter extract; `signal_only` is an internal coverage-quality flag,
  not an internal queue and not an automatic review-only downgrade.
- Narrowed source-level review-only forcing to aggregate early-signal channels
  (`fema.declarations`, generic `govdelivery.inbound`). Incomplete due-date evidence now stays
  `due_date_overlay`; Apply readiness handles the missing new date or affected deadline selection.
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
