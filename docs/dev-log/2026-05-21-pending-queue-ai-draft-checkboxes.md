# Pending queue AI draft checkboxes

**Date:** 2026-05-21

## Change

Adjusted the Coverage pending review queue so row checkboxes only appear for
rules that can actually enter a batch workflow.

## Implementation Notes

- Added `rules.listConcreteDrafts`, backed by a read-only AI output cache
  lookup, so the queue can tell whether a source-defined rule has a cached AI
  concrete draft without triggering generation.
- The queue also merges the currently selected Rule Detail AI concrete draft
  into the same ready-state map, so a draft generated in the open panel can be
  selected for bulk review immediately, before the cache-list query refetches.
- Generated drafts are read back from TanStack Query's `draftConcreteRule`
  cache for every source-defined pending row, so the checkbox stays visible
  after the reviewer switches to another rule.
- Added `rules.bulkVerifyCandidates` for source-defined rules with cached
  drafts. The handler re-loads the cached run, re-validates the draft against
  source text and guard rules, then writes active concrete practice rules.
- Updated the queue UI:
  - no disabled row checkbox for source-defined rules that still need an AI
    draft;
  - no disabled row checkbox for `source_changed` rows;
  - cached-draft and currently generated source-defined rows show selectable
    checkboxes and `AI draft ready`;
  - the drawer shows AI draft fields alongside the batch note before accept.
- Raised the concrete-draft lookup input cap to 500 so a full pending review
  queue does not fail the cache lookup before row-level ready-state can render.
- Updated Lingui catalogs and zh-CN translations for the new queue and drawer
  copy.

## Validation

- `pnpm --filter @duedatehq/app test -- --run src/features/rules/coverage-tab.test.tsx`
- `pnpm --filter @duedatehq/contracts test -- --run src/contracts.test.ts`
- `pnpm --filter @duedatehq/db test -- --run src/repo/ai.test.ts`
- `pnpm --filter @duedatehq/server test -- --run src/procedures/rules/onboarding-activation.test.ts src/procedures/rules/concrete-draft.test.ts`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm check` passes with existing unrelated lint warnings in
  breadcrumb/kbd/current-user/obligations/action-list and obligation-queue.
