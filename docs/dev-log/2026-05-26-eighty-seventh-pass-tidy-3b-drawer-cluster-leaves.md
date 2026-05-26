# Eighty-seventh pass — Tidy 3b/N: drawer-right-panel cluster leaves

**Date:** 2026-05-26
**Branch:** `feat/jolly-hopper-46479d`

## What this pass does

Pass 3 phase B — extracts the four **leaf** components of the
obligation-drawer right-panel cluster out of `apps/app/src/routes/
obligations.tsx`. The drawer's right panel is organized as one big
`ActiveStageDetailCard` (the parent stage-detail surface, 1,300 lines)
that mounts four supporting components. This commit pulls the four
leaves out so the parent can be extracted cleanly in the next commit
without those internal dependencies leaking back into obligations.tsx.

Strategy: extract leaves first, parent last. Each leaf becomes its
own colocated file under `apps/app/src/features/obligations/`.

## Extractions

### 1. `CompletedKeyDates` (69 lines) — user-named target

The "Key dates" mini-panel rendered on the Completed stage. Opened /
Filed / Completed dates derived from audit events, plus cycle-time in
days. Pure presentational; only ext deps are `useMemo`, the contracts
types, Lingui macros, and the date helpers. Moved to:
**`apps/app/src/features/obligations/CompletedKeyDates.tsx`**.

### 2. `StageActions` + `StageTask` / `StageTaskFlavor` (80 lines + types)

Action cluster rendered at the bottom of every stage card. Splits the
row's available tasks across three shapes (solid primary mutation /
ghost secondaries / manual reminders) per the documented flavor
system. The `StageTask` and `StageTaskFlavor` types moved with it so
the type lives where the consumer is. Moved to:
**`apps/app/src/features/obligations/StageActions.tsx`**.

obligations.tsx keeps a short pointer comment where the types used to
live, so the next person scanning the file knows where to find them.

### 3. `BlockerContextCard` (87 lines)

Card shown on the Blocked stage that fetches and renders the upstream
blocking obligation (form / client / due / current status). Tightly
coupled to `obligations.getDetail` + `STATUS_VARIANT` from
`status-control`. Moved to:
**`apps/app/src/features/obligations/BlockerContextCard.tsx`**.

obligations.tsx dropped its `STATUS_VARIANT` import as a side-effect
(the only consumer was inside this component).

### 4. `ChecklistItemRow` (207 lines)

The per-document row inside the Materials checklist (Figma-matched
card visual; selection checkbox + title + status chips + overflow
menu). Heaviest leaf in this batch — extensive imports and
Lingui-macro labels. Moved to:
**`apps/app/src/features/obligations/ChecklistItemRow.tsx`**.

obligations.tsx dropped these now-unused imports: `EllipsisVerticalIcon`,
`Trash2Icon`, `ClientReadinessResponsePublic`.

### Bonus — `daysBetween` → `lib/utils.ts`

`daysBetween` was a local helper inside obligations.tsx and a
dependency of `CompletedKeyDates`. Rather than inline it in the new
file, promoted it to `apps/app/src/lib/utils.ts` (alongside the other
date helpers like `formatDate`, `formatRelativeTime`). It's a pure
utility and now reachable to any future caller. obligations.tsx
imports it from there in 2 remaining call sites.

## Verification

```
pnpm exec tsc -p apps/app/tsconfig.json --noEmit  → clean
pnpm exec vp lint apps/app                        → 0 warnings, 0 errors
```

`obligations.tsx`: 11,452 → **11,007 lines** (−445 lines extracted +
−7 lines of import cleanup).

## Out of scope (next commits in Pass 3)

- **`ActiveStageDetailCard`** (1,300 lines) — the parent. This is the
  largest single extraction in the tidying series; deferred to its
  own focused commit because moving it requires migrating the
  per-stage `useMemo` that builds the StageTask list, the mutations
  it threads through, and the prep/review-stage handlers it owns.
  None of those should change shape; the work is mechanical but the
  blast radius warrants isolation.
- The rest of the inline-component inventory in obligations.tsx
  (PrimaryDeadlineStrip, DeadlineTile, FlatDateList, PathToFilingSummary,
  ReadinessOverview, PenaltyInputDialog, etc.). Not in the cluster
  the user scoped; tabled until Pass 4 (dedup) surfaces parallel
  primitives to merge.

## Files

- New: `apps/app/src/features/obligations/CompletedKeyDates.tsx`
- New: `apps/app/src/features/obligations/StageActions.tsx`
- New: `apps/app/src/features/obligations/BlockerContextCard.tsx`
- New: `apps/app/src/features/obligations/ChecklistItemRow.tsx`
- Modified: `apps/app/src/routes/obligations.tsx` (−445 net)
- Modified: `apps/app/src/lib/utils.ts` (+10, `daysBetween`)
- New: `docs/dev-log/2026-05-26-eighty-seventh-pass-tidy-3b-drawer-cluster-leaves.md`
