# Eighty-seventh pass — Tidy 3/N: primitive extraction (kickoff)

**Date:** 2026-05-26
**Branch:** `feat/jolly-hopper-46479d` (worktree `jolly-hopper-46479d`)

## What this pass does

Pass 3 is **primitive extraction** — moving inline components out of
the giant files (obligations.tsx 11.5k lines, ClientFactsWorkspace.tsx
5.5k lines, rules.library.tsx 3.9k lines, coverage-tab.tsx 2.6k lines)
and into colocated feature files where they belong.

This kickoff commit extracts **just one** component — `AssigneeAvatar`
— specifically because the user called it out by name in the gap-list
that triggered the tidy series:

> "Patterns I established (e.g., the inline CompletedKeyDates panel
> inside ActiveStageDetailCard, the inline AssigneeAvatar, multiple
> inline section components) live inline in giant files."

Pulling out just one establishes the pattern (file location, comment
hygiene, dependency cleanup) so the larger extractions can follow with
the path of least surprise. Larger extractions are scoped separately
in subsequent commits because the risk profile of moving 200-1300-line
inline components is materially higher than the dead-code deletions of
Passes 1+2.

## Change — AssigneeAvatar

- **From:** `apps/app/src/routes/obligations.tsx` (line 4374-4408
  pre-edit; 46 lines including the 3-iteration design-history comment
  block above the function).
- **To:** new file `apps/app/src/features/obligations/AssigneeAvatar.tsx`.

Same component, same props (`{ name, isMine, title }`), same render
output. The 3-iteration design-history comment that documented the
24px → 28px → 32px size bumps and the per-name tint adoption was
preserved and moved with the function — that history is exactly the
kind of context the next person editing this primitive will want.

Side-effects of the move:

- Dropped the now-unused `getAssigneeTint` import in `obligations.tsx`
  (only consumer was inside the extracted function).
- Kept `initialsFromName` import in `obligations.tsx` (still used
  twice elsewhere in the same file by inline members of
  AssigneeQuickPicker + DeadlineInputRequestDialog).
- Added `import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'`
  next to the existing `ObligationPanelDispatcher` feature import.

## Verification

```
pnpm exec tsc -p apps/app/tsconfig.json --noEmit  → clean
pnpm exec vp lint apps/app                        → 0 warnings, 0 errors
```

obligations.tsx: 11,498 → 11,452 lines (−46).

## Pass 3 inventory (deferred, awaiting scope decision)

The full obligations.tsx inline-component inventory is documented
below. Each row is a candidate for its own extraction commit.

| Approx lines | Component                       | Notes                                                                        |
| -----------: | ------------------------------- | ---------------------------------------------------------------------------- |
|         1304 | `ActiveStageDetailCard`         | The big one. Nests other components inside; needs internal scoping check.    |
|          651 | `PathToFilingSummary`           | 2nd biggest. Drawer right-panel chrome.                                      |
|          235 | `ReadinessOverview`             |                                                                              |
|          207 | `ChecklistItemRow`              |                                                                              |
|          142 | `PrimaryDeadlineStrip`          | Pairs with DeadlineTile (93 lines) — extract together.                       |
|          139 | `CalendarSyncPopover`           |                                                                              |
|          138 | `MaterialsRequestPreviewDialog` |                                                                              |
|          125 | `AssigneeQuickPicker`           | Sibling of AssigneeAvatar (this commit). Extract together when revisited.    |
|          125 | `DeadlineInputRequestDialog`    |                                                                              |
|          124 | `EvidenceInlineItem`            |                                                                              |
|          111 | `AlertPanel`                    |                                                                              |
|          110 | `PenaltyInputDialog`            |                                                                              |
|          104 | `ObligationQueueSortableHeader` |                                                                              |
|           93 | `DeadlineTile`                  | Pair w/ PrimaryDeadlineStrip.                                                |
|           87 | `BlockerContextCard`            |                                                                              |
|           80 | `StageActions`                  | Lives next to ActiveStageDetailCard.                                         |
|           76 | `FlatDateList`                  |                                                                              |
|           75 | `ObligationQueueSearchControl`  |                                                                              |
|           69 | `CompletedKeyDates`             | **User-named target.** Lives inside ActiveStageDetailCard.                   |
|         + 13 | smaller components              | DetailRow (21), AuditSummaryRows (14), ExportAxis (13), EmptyPanel (8), etc. |

A similar inventory exists for ClientFactsWorkspace.tsx (40+ inline
components) — not enumerated here yet because the path is the same:
delegate inline components to colocated feature files. Tabled until
the obligations.tsx inventory is drained.

## Out of scope

- Bulk extractions across the 5 giant files. Each meaningful component
  becomes its own commit so failures are isolated and review is
  tractable.
- Pass 4 (deduplication) will revisit some primitives that exist in
  parallel in obligations.tsx + ClientFactsWorkspace.tsx (e.g.,
  `AssigneeAvatar` in this pass vs `ClientAssigneeAvatar` in
  ClientFactsWorkspace.tsx). Merging those is Pass 4's job, not Pass 3.

## Files

- `apps/app/src/features/obligations/AssigneeAvatar.tsx` (new)
- `apps/app/src/routes/obligations.tsx`
- `docs/dev-log/2026-05-26-eighty-seventh-pass-tidy-3-extract-assignee-avatar.md` (this file)
