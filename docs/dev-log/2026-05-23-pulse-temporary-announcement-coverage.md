---
title: '2026-05-23 · Pulse temporary announcement coverage'
date: 2026-05-23
author: 'Codex'
---

# Pulse temporary announcement coverage

## Summary

- Added internal temporary announcement coverage for `FED + 50 states + DC`.
- Added state-level `{jurisdiction}.temporary_announcements` rule sources for official tax agency
  news, notices, relief, press, or update pages.
- Added `listTemporaryAnnouncementSourceCoverage()` so coverage can be checked separately from the
  Rule Library baseline matrix.
- Kept temporary announcement sources as `authorityRole='watch'`, not `basis`.
- Added explicit temporary announcement adapter metadata (`adapterKind='rss_or_announcement_list'`
  plus optional `feedUrl`) so RSS feeds and machine-readable announcement lists can be scanned
  without expanding the legacy live adapter path.

## Behavior

- A jurisdiction is covered only when a temporary source is healthy and machine-watchable through
  `html_watch`, `pdf_watch`, or a dedicated temporary-announcement `api_watch` feed/list adapter.
- Watch sources are eligible for `pulse.rule_source.scan`, which can create snapshots and route
  source changes into `pulse.extract`.
- RSS/Atom feeds and official news list pages are narrowed into candidate announcement items before
  extraction so Pulse reviews the item rather than the full list-page boilerplate.
- `api_watch` temporary announcement sources count as covered only when backed by the dedicated
  RSS/list adapter. Generic `api_watch` sources are still excluded from coverage.
- Baseline source coverage now filters to `authorityRole='basis'`, so temporary announcement pages
  cannot satisfy tax-domain source coverage.
- Rule-source adapters now ignore non-basis watch sources; the scheduled scan job is the primary
  path for these sources.
- Pulse extraction now rejects deadline-change outputs that lack both original and new due dates,
  and rejects `no_regulatory_change` outputs that still try to carry actionable fields.
- The announcement prefilter drops common noisy agency items such as awards, staffing, auctions,
  portal maintenance, newsletters, scams, and generic webinars unless the item also carries a
  high-signal tax deadline, relief, disaster, filing, or payment term.
- Existing source-health failures were triaged: Illinois sales/use tax was moved to the current
  official instructions URL, and two New Hampshire basis PDF sources remain registered as
  `manual_review` because the official endpoints block generic machine fetches.
- `rules:check-sources` now smoke-tests dedicated RSS/list adapters when a feed/list is reachable,
  while treating local curl network/TLS probe failures as skipped after retry. Real HTTP failures
  still fail the gate.

## Validation

- `pnpm --filter @duedatehq/core test -- rules`
- `pnpm --filter @duedatehq/ingest test -- ingest`
- `pnpm --filter @duedatehq/ai test -- ai`
- `pnpm --filter @duedatehq/server test -- rule-source-adapters reconcile`
- `pnpm rules:check-sources`
- `pnpm check`
- `pnpm ready`
