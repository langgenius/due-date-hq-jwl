---
title: 'Source Health Recheck Clears Banner'
date: 2026-06-13
author: 'Codex'
---

# Source Health Recheck Clears Banner

## What changed

- `/rules/sources` now writes the `retrySourceHealth` response directly into the
  `pulse.listSourceHealth` query cache. When a re-check returns the source as
  healthy, the Needs attention banner disappears immediately.
- Removed the stale TX Comptroller RSS degraded state from demo seed data. The
  current TX watcher uses the official Comptroller News HTML page, so a fresh
  demo seed should not open with the old RSS 304 incident pinned.

## Validation

- `pnpm --filter @duedatehq/app test -- src/features/rules/sources-tab.test.tsx src/lib/utils.test.ts`
- `pnpm --filter @duedatehq/app exec vp check src/features/rules/sources-tab.tsx src/features/rules/sources-tab.test.tsx src/lib/utils.ts src/lib/utils.test.ts`
- `pnpm --filter @duedatehq/db demo:generate`
- `curl -I -sS https://comptroller.texas.gov/about/media-center/news/` returned HTTP 200.
- Local D1 showed `tx.cpa.rss` as `healthy` with `last_error = NULL`; in-app browser reload of
  `/rules/sources` showed no Needs attention banner.
