---
title: 'Merge origin/design/preview-integration into local: conflict resolutions + rule-library legacy cleanup'
date: 2026-05-22
author: 'Claude (Yuqi pairing)'
area: meta
---

# Merge origin/design/preview-integration → design/preview-integration (local)

## Context

The local `design/preview-integration` branch had diverged from
`origin/design/preview-integration` because two designers were both
landing big surface refactors against the same branch over the past
week. hanxujiang shipped five commits removing the penalty/exposure
feature, retiring `rule-library-tab`, and reshaping
`rules.library.tsx` into a `CoverageTab`-only wrapper. Locally Yuqi
and I shipped the obligation drawer unification, client-detail page
panel, dashboard picker split, and the V3 rule library with grouped
sections + batch review.

The merge surfaced five conflicted files plus one latent post-merge
type error. This log documents the choices made for each.

## Files resolved

### `apps/app/src/features/obligations/CreateObligationDialog.tsx`

Manually merged (logged separately in
`2026-05-21-create-obligation-dialog-restore.md` companion notes).
Final shape: searchable ClientCombobox + jurisdiction + formName +
obligationType (with payment-vs-filing date routing) + status +
internal-notes textarea. Vocabulary split landed here: trigger reads
**"Add deadline"** (workflow voice), dialog title and form internals
read **"Add obligation"** (system voice). Post-merge re-stage was a
no-op prettier reflow.

### `apps/app/src/features/dashboard/actions-list.tsx`

Whole-row click + opacity-animated Review button on the right side.
Order: prompt → Review (opacity-transitioned) → RowMeta. Row is
`role="button"` with Enter/Space handlers.

### `apps/app/src/routes/obligations.tsx`

Seven conflict blocks resolved per Yuqi's prior decisions:

- Saved-view code dropped (intentional removal pre-merge).
- `appliedFilterChips` memo from hanxujiang's 30f29dc was deleted
  during commit-time follow-up. Yuqi's earlier design call (task
  #27 in this session's task list) was "column-header filters are
  the only filter UI" — keeping a parallel chip row would have been
  redundant. The first pass kept the memo without wiring it to JSX;
  the lint hook caught the dead code.
- Scope tabs stacked on top (no chip row beneath).
- 2-column layout kept for queue + obligation panel side-by-side.
- Orphaned `exposure` / `riskMin` / `riskMax` references cleaned up
  in `EmptyState` `hasActiveFilters` and the now-removed "Penalty
  input needed" chip.

### `apps/app/src/routes/rules.library.tsx`

Four conflict blocks. V3's much richer route wins on the
`RulesLibraryRoute` definition itself, but **two pieces from
hanxujiang's version were ported in**:

1. **`normalizeRulesLibrarySearch` helper + `<Navigate replace />`
   redirect.** Legacy deep links like `?view=rules`, `?library=active`,
   `?jur=CA` exist in docs, saved bookmarks, and previously-shared
   chat links. Without the redirect, V3 silently 404s those URLs.
   The function adapts cleanly to V3's narrower URL contract:
   `?view=` and `?library=` are dropped (V3 has no toggle, no
   URL-level status filter), and `?jur=CA` translates to `?q=CA`
   (V3's search input flattens jurisdiction groups). The redirect
   runs after all hooks to satisfy rules of hooks; `<Navigate replace />`
   keeps history clean.

2. **Header comment updated** to mention the back-compat behavior so
   the next reader knows what `normalizeRulesLibrarySearch` is for.

What was **not** ported:

- `CoverageSummaryStrip` / `SourcesSummaryStrip` / `SummaryStrip` /
  `SummaryNumber` / `SummarySeparator` primitives. V3 already shows
  the same numbers (active / needs review / gaps / sources) inline
  in its custom `StatsBar`. Porting would have duplicated the UI.
- `aggregateCoverageStrip` helper (only the strips used it).
- hanxujiang's `RulesLibraryRoute` body — it was a thin wrapper
  around `CoverageTab` and would have replaced 1700+ lines of V3
  with a much simpler page.

### `packages/db/src/repo/obligation-queue.ts`

Single conflict block on the `compareRows` function. HEAD still
contained an `exposure_desc` / `exposure_asc` sort branch with an
`exposureSortValue(a) - exposureSortValue(b)` body. The contract
(`ObligationQueueSortSchema`) had already been narrowed on
hanxujiang's side to `['smart_priority', 'due_asc', 'due_desc',
'updated_desc']` — so the HEAD branch was unreachable. Dropped it.
No remaining `exposureSortValue` references anywhere in the repo.

## Post-merge cleanup: deleted `rules.library-v2.tsx`

After resolving the five UU files, `tsc --noEmit` flagged two errors
in `apps/app/src/routes/rules.library-v2.tsx`:

- imports the deleted `@/features/rules/rule-library-tab` module
- imports the no-longer-exported `RuleLibraryFilter` type

`rules.library-v2.tsx` was the older two-view preview shape — the
matrix/list toggle that V3 retired. Its in-file docstring already
labeled it "kept as a legacy reference." With both of its
dependencies removed by hanxujiang's branch, the cleanest move was
to delete the file outright and remove its `/rules/library-v2`
route entry from `router.tsx`. V3 at `/rules/library` is the only
rule library surface now, which matches the V3 dev-log's promise.

Historical references to `library-v2` survive in dev-logs (those
are append-only).

## Outcome

- 0 conflict markers in tree
- 0 type errors from `npx tsc --noEmit -p apps/app/tsconfig.json`
- `/rules/library` keeps V3 features (grouping, batch review,
  scoreboard, gap rows, new-rule modal) **plus** silently absorbs
  legacy `?view=` / `?library=` / `?jur=` bookmarks
- Obligation queue sort options match the contract (no dead branch)
- Penalty/exposure surfaces fully retired across UI, sort, and form

## Files touched

- M `apps/app/src/features/obligations/CreateObligationDialog.tsx`
  (re-staged; no semantic change vs. earlier resolution)
- M `apps/app/src/features/dashboard/actions-list.tsx` (resolved previously)
- M `apps/app/src/routes/obligations.tsx` (resolved previously)
- M `apps/app/src/routes/rules.library.tsx` (this pass — block 4 + redirect port)
- M `apps/app/src/router.tsx` (drop `/rules/library-v2` route)
- D `apps/app/src/routes/rules.library-v2.tsx` (orphaned)
- M `packages/db/src/repo/obligation-queue.ts` (drop exposure sort branch)
