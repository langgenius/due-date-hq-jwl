# 2026-05-31 · Alert source coverage and rule-source review gate

Implemented the production source-role split for Alert ingest and tightened the coverage definition.
Rule sources now carry an explicit `alertPurpose`, Pulse exposes jurisdiction-level Alert source
coverage, and the coverage report no longer treats generated routing metadata or ordinary newsroom
pages as comprehensive source coverage.

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
- Split verified official email signals from routing-only email metadata. Generated local parts are
  kept for inbound routing but do not count as `email_signal` coverage unless the source declares a
  verified official subscription/GovDelivery/list signal.
- Tightened role coverage:
  - `relief_or_disaster_signal` must be IRS/FEMA or a real emergency/tax-relief source; generic
    primary news pages no longer count.
  - `multi_agency_sources` is required only for CA/TX/WA/NY/FL/MA and must come from different
    agency hosts.
  - missing roles now remain explicit instead of forcing 52/52 `comprehensive`.
- Added a structured Alert source catalog builder with `id`, `jurisdiction`, roles, agency, URL,
  source type, acquisition method, adapter kind, verification status, verified date, notes, and
  inbound email verification metadata.
- Added `monitoringBaselineAt` and `baselineMode` to `pulse_source_state`.
- Added baseline gating for Pulse web ingest, Rule Library source scans, and GovDelivery inbound
  email. First successful observation of a newly monitored source writes source state/snapshots as
  `ignored: monitoring_baseline_established` and does not enqueue `pulse.extract`; only subsequent
  new items/diffs/emails enter Alert review.
- Promoted rule-source watch sources with `source_change` into `practice_rule_review` so future
  Rule Library source changes enter Alert review before becoming effective.
- Forced non-`deadline_shift` extracts into `review_only` mode so source/rule status changes cannot
  apply due-date overlays.

## Validation

- `pnpm check` passed with 0 errors; existing unrelated warnings remain.
- `pnpm --filter @duedatehq/core test -- src/rules/index.test.ts`
- `pnpm --filter @duedatehq/server test -- src/jobs/pulse/rule-source-adapters.test.ts src/jobs/pulse/extract.test.ts src/procedures/pulse/index.test.ts src/procedures/rules/concrete-draft.test.ts`
- `pnpm --filter @duedatehq/contracts test -- src/contracts.test.ts`
- Coverage probe after tightening: 52/52 jurisdictions still have a verified primary web source and
  web-primary parser status; only jurisdictions with verified email, relief/disaster, rule-source,
  tax-type, guidance, and required multi-agency roles now show `comprehensive`. Missing email,
  relief, or multi-agency roles remain visible as `missingRoles`.
- CA is comprehensive after adding a verified FTB Tax News email signal. FED remains comprehensive.
  TX/WA are standard because verified state relief/disaster pages are still missing. NY/FL/MA are
  standard because relief/disaster and required different-host multi-agency coverage are still
  missing.
- `pnpm check` passed with 0 errors; 8 existing unrelated warnings remain.
- `pnpm --filter @duedatehq/server test -- src/jobs/pulse/rule-source-adapters.test.ts src/jobs/pulse/ingest.test.ts src/jobs/pulse/govdelivery.test.ts src/jobs/rules/reconcile.test.ts`
- `pnpm --filter @duedatehq/contracts test -- src/contracts.test.ts`
- `pnpm --filter @duedatehq/db test -- src/repo/pulse.test.ts`
- `pnpm --filter @duedatehq/core test -- src/rules/index.test.ts`
- `pnpm rules:check-sources` still exits 1 because `nh.temporary_announcements` returns HTTP 403.
  Notable skipped smoke rows include AZ/MI/RI adapter smoke 403s, KS/ND/OH The Finder timeouts, and
  NV no parsed announcement candidates.
