# Audit P2 — in-flight guards on consequential mutations

**Date:** 2026-06-23
**Surfaces:**

- `apps/app/src/features/obligations/StageActions.tsx`,
  `apps/app/src/features/obligations/queue/components/panels.tsx`,
  `apps/app/src/features/obligations/queue/ObligationQueueDetailDrawer.tsx`
  — in-card stage actions, checklist remove, assignee sheets.
- `apps/app/src/routes/clients.tsx`,
  `apps/app/src/features/clients/ClientFactsWorkspace.tsx`,
  `apps/app/src/features/clients/ClientsEmptyState.tsx` — sample-data seed.

Closing the P2 cluster from `docs/Design/post-action-behaviour-audit-2026-06-23.md`:
secondary mutation triggers that skipped the in-flight guard the primary
path already had, so a double-click could double-fire.

## What changed

- **In-card `StageActions` (the systemic one).** `StageActions` gained an
  optional `pendingTaskId`. The matching button shows the canonical
  `Loader2Icon` spinner + `aria-busy`; **all** action buttons disable while any
  task is pending. The drawer passes each stage mutation's `isPending` down as a
  flags object (`changeStatus / confirmAcceptance / prepStage / reviewStage /
efileState`); `ActiveStageDetailCard` maps it back to the pending task via the
  same task-id→mutation map as `handleTaskClick` (derive-from-`isPending`, no new
  state). Dialog-opening tasks (remind-8879, unwind) intentionally get no spinner.
- **Checklist remove.** `removeChecklistItem` early-returns while
  `deleteChecklistItemMutation.isPending` (the delete is one-at-a-time, so a
  second click is a duplicate) — guards the row action without touching the
  out-of-cluster `ChecklistItemRow`.
- **Assignee sheets.** Both the header `DeadlineTopActions` sheet and the
  Ownership-card "Change" sheet disable their radio items + "Clear assignee"
  while the assign mutation is pending.
- **/clients sample-data seed.** `seedSampleMutation.isPending` threads
  clients.tsx → ClientFactsWorkspace → ClientsEmptyState; the "Explore with
  sample data" chip disables (`disabled` + `aria-busy` + dimmed) so a
  double-click can't seed duplicate demo rows.

Already-correct (verified, no change): the bulk-assign FloatingActionBar guard
(`disabled={bulkAssigneeMutation.isPending}`) and the key-spread warning fix
(`tax-code-label.tsx` lifts Base UI's injected key for TaxCodeLabel/Badge).

## i18n

No new strings (behavior-only; spinner glyphs are `aria-hidden`). The ~10
un-extracted strings PR #81 carried over were translated independently on main
by PR #84, so this wave touches no catalogs.

## Verify

`tsgo` ui + app clean; `vp run @duedatehq/app#build` clean; `i18n:extract` →
0 missing / `i18n:compile --strict` passes. Behavior-only (disabled + spinner on
existing controls); no layout change. Built on `claude/polish-wave-3` off
canonical `origin/main`; pushed `HEAD:main`.
