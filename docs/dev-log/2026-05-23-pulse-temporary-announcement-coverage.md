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

## Behavior

- A jurisdiction is covered only when a temporary source is healthy and machine-watchable through
  `html_watch`, `pdf_watch`, or a dedicated temporary-announcement `api_watch` feed/list adapter.
- Watch sources are eligible for `pulse.rule_source.scan`, which can create snapshots and route
  source changes into `pulse.extract`.
- RSS/Atom feeds and official news list pages are narrowed into candidate announcement items before
  extraction so Pulse reviews the item rather than the full list-page boilerplate.
- Baseline source coverage now filters to `authorityRole='basis'`, so temporary announcement pages
  cannot satisfy tax-domain source coverage.
- Rule-source adapters now ignore non-basis watch sources; the scheduled scan job is the primary
  path for these sources.
- Existing source-health failures were triaged: Illinois sales/use tax was moved to the current
  official instructions URL, and two New Hampshire basis PDF sources remain registered as
  `manual_review` because the official endpoints block generic machine fetches.

## Validation

- `pnpm --filter @duedatehq/core test -- rules`
- `pnpm --filter @duedatehq/server test -- rule-source-adapters reconcile`
- `pnpm rules:check-sources`
- `pnpm check`
- `pnpm ready`
