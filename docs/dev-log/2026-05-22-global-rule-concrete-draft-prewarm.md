---
title: 'Global rule concrete draft prewarm'
date: 2026-05-22
author: 'Codex'
area: rules
---

# Global rule concrete draft prewarm

## Context

`draftConcreteRule` still ran in the customer-facing open-rule path. Many
source-defined rules either waited on official-source fetch/model latency or
returned schema/guard errors, so users could sit in the pending review queue
waiting for per-practice draft generation.

## Change

- Extracted rule concrete draft generation into a shared service used by both
  the API capability and Worker jobs.
- Added global AI output lookup/recording: successful concrete drafts are
  stored in `ai_output` with `firm_id=null` and `user_id=null` under the stable
  `rule:<ruleId>:<sourceId>` context ref.
- Added `rule.concreteDraft.generate` queue messages plus scheduled/source
  changed prewarm dispatch. Failures are recorded/logged and acked so one bad
  rule does not block the batch.
- Switched `rules.listConcreteDrafts` and `bulkVerifyCandidates` to prefer
  global cached drafts, with a current-firm fallback for legacy runs.
- Removed frontend automatic `draftConcreteRule` reads. Rule Detail and the
  pending review queue now read only `rules.listConcreteDrafts` cache data.
- Fixed pending queue cache matching so `sourceSignalId` returned with a cached
  draft is treated as provenance only; draft readiness is keyed by the stable
  `ruleId + sourceId` target.

## Verification

- `pnpm --filter @duedatehq/db test -- ai`
- `pnpm --filter @duedatehq/server test -- queue concrete-draft ingest`
- `pnpm --filter @duedatehq/app test -- coverage-tab`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm check`
- `pnpm ready` passed with existing warnings, including Wrangler EPERM while
  writing its local log file during dry-run.
- `pnpm check:deps`
