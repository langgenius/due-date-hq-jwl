---
title: 'In Review steps simplified'
date: 2026-05-26
author: 'Yuqi pairing with Codex'
area: ux
---

# In Review now uses three CPA-facing steps

The deadline drawer no longer exposes every internal prep/review flag as a
separate step. The old six-step strip made newly generated review rows appear
to start around step four because `reviewStage='ready_for_review'` was treated
as a visible milestone.

## What changed

- Collapsed the visible In Review workflow to Preparing return → Reviewing
  return → Ready to file.
- Kept `prepStage` and `reviewStage` as the auditable backend fields, but moved
  user actions into the current-step task list instead of making every marker a
  clickable slider step.
- Changed new rule-generated review obligations to start with
  `reviewStage='not_required'`, so they display as Preparing return until the
  preparer explicitly sends the return to review.
- Preserved notes handling as a Reviewing return annotation and task action.
- Follow-up: queue-row status changes now invalidate `obligations.getDetail`
  and `obligations.listByClient` as well as the queue list, so the right-side
  deadline detail progress syncs when status is changed from the table.
- Follow-up: every server-side transition into `In review` now resets the
  compact review workflow to `prepStage='ready_for_prep'` and
  `reviewStage='not_required'`. This covers row status changes, bulk status
  changes, and filed-return rejection unwind, so leaving In Review and coming
  back starts at Preparing return instead of reusing an old Ready-to-file state.
- Follow-up: Waiting-stage cards now expose a secondary `Mark blocked` action
  so users can enter the Blocked milestone without using the table status
  dropdown.
- Follow-up: `Mark materials received` no longer advances to In Review while
  the Materials checklist still has missing or needs-review items. The click
  opens Materials and shows a toast explaining how many items must be marked
  received first.

## Verification

- `pnpm --filter @duedatehq/app i18n:extract` passed.
- `pnpm --filter @duedatehq/app i18n:compile` still fails on the existing
  zh-CN catalog gap; after translating this change's new strings, the remaining
  count was 256 missing translations.
- `pnpm --filter @duedatehq/app test -- src/routes/obligations.test.ts`
  passed with 32 tests after the Waiting/Materials gating follow-up.
- `pnpm --filter @duedatehq/server test --
src/procedures/rules/_obligation-generation.test.ts
src/procedures/obligations/_service.test.ts` passed during the In Review
  simplification pass.
- `pnpm --filter @duedatehq/app exec tsc -p tsconfig.json --noEmit` passed.
- `pnpm --filter @duedatehq/server exec tsc -p tsconfig.json --noEmit` passed
  during the In Review simplification pass.
- `git diff --check` passed.
- Browser smoke: from `/deadlines/0ec3f5e6f5b9/summary`, changed the selected
  queue row's status through the table status control; the right-side detail
  panel updated to `WAITING ON CLIENT` and the milestone timeline moved to the
  Waiting stage.
- Browser smoke: from `/deadlines/be0705712eb9/summary`, the Waiting detail
  card rendered both `Mark materials received` and `Mark blocked`. Reloading
  the route after fixing duplicate Previous-stage keys produced no new browser
  console errors; direct click validation was blocked by the feedback overlay's
  page-interaction lock.
- `pnpm --filter @duedatehq/server test --
src/procedures/obligations/_service.test.ts` passed after adding regression
  coverage for resetting In Review sub-steps on single status updates, bulk
  status updates, and filed-return rejection unwind.
- `pnpm --filter @duedatehq/server exec tsc -p tsconfig.json --noEmit` passed
  after the In Review reset change.
