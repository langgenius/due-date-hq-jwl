# 2026-05-31 · Alert source coverage and rule-source review gate

Implemented the production source-role split for Alert ingest. Rule sources now carry an explicit
`alertPurpose`, and Pulse exposes jurisdiction-level Alert source coverage rather than treating raw
adapter count as coverage.

## Changes

- Added explicit source purposes: `explicit_live_adapter`, `temporary_announcements_or_news`,
  `rule_source_watch`, `email_signal`, and `hidden_policy_watch`.
- Expanded web-first announcement adapters beyond the old API/RSS-only set so 50 states + DC have
  official temporary/news coverage in the Alert pipeline; GovDelivery/email subscriptions remain
  parallel email signals.
- Added Ohio The Finder Sales Tax Rates and Changes as the primary Ohio web signal; Ohio Tax Alerts
  GovDelivery remains a parallel email signal.
- Added IRS Tax Tips as a T2 federal live adapter; FED coverage now includes IRS disaster, newsroom,
  guidance, tax tips, FEMA, and IRS Newswire email signal.
- Added `pulse.listAlertSourceCoverage`, including primary web source IDs, email signal source
  IDs, rule-source watch IDs, hidden policy-watch IDs, and last source-health timestamps.
- Added comprehensive coverage roles and generated parallel inbound email metadata for every state
  temporary/news announcement source.
- Promoted rule-source watch sources with `source_change` into `practice_rule_review` so future
  Rule Library source changes enter Alert review before becoming effective.
- Forced non-`deadline_shift` extracts into `review_only` mode so source/rule status changes cannot
  apply due-date overlays.

## Validation

- `pnpm check` passed with 0 errors; existing unrelated warnings remain.
- `pnpm --filter @duedatehq/core test -- src/rules/index.test.ts`
- `pnpm --filter @duedatehq/server test -- src/jobs/pulse/rule-source-adapters.test.ts src/jobs/pulse/extract.test.ts src/procedures/pulse/index.test.ts src/procedures/rules/concrete-draft.test.ts`
- `pnpm --filter @duedatehq/contracts test -- src/contracts.test.ts`
- Coverage probe: 52/52 jurisdictions covered, 52/52 comprehensive, 52/52 web-primary, 52/52 with
  parallel email signals, 69 Alert watch adapters, 297 rule-source watch adapters, 366 visible
  Alert source adapters.
- `pnpm rules:check-sources` still exits 1 because `nh.temporary_announcements` returns HTTP 403.
  Notable skipped smoke rows include AZ/MI/RI 403 adapter fetches, KS/ND/OH The Finder timeouts,
  and NV no parsed announcement candidates.
