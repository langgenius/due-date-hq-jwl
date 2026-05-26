# Eighty-seventh pass — Tidy 5/N: comment consolidation (clear cases)

**Date:** 2026-05-26
**Branch:** `feat/jolly-hopper-46479d`

## What this pass does

Trims stacked iteration-history comment blocks where a later dated
comment in the same block explicitly REVERTS or supersedes the
earlier one. The earlier block describes a state the code no longer
has — keeping it is misleading.

This is the conservative slice of Pass 5. Per the survey:

- 143 dated comments in `obligations.tsx` (1.3% of lines)
- 101 in `ClientFactsWorkspace.tsx` (1.8%)
- 50 in `rules.library.tsx` (1.3%)
- ~38 of those are blocks with 2-3 stacked dates
- ~5 of those have **textbook stale stacks** (later reverts earlier)

This commit acts on those 5. The remaining ~33 stacked blocks need
per-block judgment (some are legitimate complementary decisions, not
stale supersessions) and are deferred to follow-up commits where each
trim can be reviewed independently.

## Rubric used

Keep a dated comment if it explains **why** the live code is the way
it is — load-bearing context for future readers. Cull if it:

- Describes a feature/value that a later comment in the same block
  reverted (textbook stale stack).
- Talks about a removed module/component that no longer exists.
- Restates what the code obviously does without adding rationale.

In doubt → keep. Stale comments cost lines; missing context costs
hours.

## Trims applied

### 1. `DeadlineTile` — 21 lines → 6 lines (−15)

**`apps/app/src/routes/obligations.tsx`**

First block described a "compressed tile" with sentence-case labels
and `text-[11px] font-medium`. Second block REVERTED to uppercase +
tracking and `font-mono` → canonical sans + tabular-nums. Live code
matches the second block. Dropped the first block; kept the second's
"why" (canonical eyebrow treatment + no `font-mono` for dates).

### 2. `groupHeadersByFirstRowId` useMemo — 41 lines → 16 lines (−25)

**`apps/app/src/routes/obligations.tsx`**

Three stacked dates documenting the evolution from adjacent-same-
client clustering → parallel group-by paths → final per-mode
wireframe semantics. Comment 1's "single-row clients are NOT keyed
— they don't need a header" contradicts comment 3's "header per
client (even single-row)". Consolidated to the final-spec version,
preserved the "computed from `rows` not `pagedRows`" implementation
note.

### 3. Client-name `<span>` className — 30 lines → 8 lines (−22)

**`apps/app/src/routes/obligations.tsx`**

Two adjacent blocks each had stacked dates documenting the same
back-and-forth between text-base/text-sm and font-medium/font-normal
across multiple Yuqi-feedback iterations. Live code uses
`text-base` + selective `font-medium`. Trimmed to a single tight
explanation of the cross-table-unify "why" + the active-row
font-medium signal.

### 4. ClientActiveAlertsActionStrip banner styling — 12 lines → 5 lines (−7)

**`apps/app/src/features/clients/ClientFactsWorkspace.tsx`**

Block 1: `bg-background-subtle` was too close to page gray, switched
to `bg-background-default` (white). Block 2: `rounded-md` → `rounded-
full`. Both still describe live behavior, but the iteration narrative
was longer than necessary. Consolidated to one "why white +
rounded-full" comment.

### 5. StatsBar progress-bar counts — 15 lines → 6 lines (−9)

**`apps/app/src/routes/rules.library.tsx`**

Three stacked dates: (1) "retired sourceCounts + totalGaps", (2)
"restored totalActive + totalPendingReview", (3) "progress bar is
multi-color stacked breakdown driven by statusCounts". The first
block talks about a feature that's gone (`sourceCounts`,
`totalGaps`); the second's restoration rationale is implied by the
third. Trimmed to the final-spec description + the load-bearing
"computed against UNFILTERED rules so tab counts stay stable" note.

## Verification

```
pnpm exec tsc -p apps/app/tsconfig.json --noEmit  → clean
pnpm exec vp lint apps/app                        → 0 warnings, 0 errors
```

Net: **−76 lines** across 3 files (114 deletions, 38 additions). Pure
comment edits — no code change, no behavior change.

## File-size sweep this session

| File                       | Before tidy series | After Pass 5 |  Net |
| -------------------------- | -----------------: | -----------: | ---: |
| `obligations.tsx`          |             11,812 |       10,942 | −870 |
| `ClientFactsWorkspace.tsx` |              5,514 |        5,507 |   −7 |
| `rules.library.tsx`        |              3,857 |        3,835 |  −22 |

obligations.tsx has lost **7.4%** of its lines across the 6 tidy
commits so far.

## Out of scope

- The remaining ~33 stacked-comment blocks that need per-block
  judgment (not all "stacked" comments are stale supersessions —
  many document genuinely complementary decisions made on the same
  day for different reasons).
- "Why we chose X" comments with non-obvious rationale — these are
  the load-bearing parts of the comment-to-code ratio. They stay.
- Comments referencing now-extracted primitives (AssigneeAvatar,
  CompletedKeyDates, etc.) — already cleaned up during the Pass 3
  extractions.

## Files

- `apps/app/src/routes/obligations.tsx`
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
- `apps/app/src/routes/rules.library.tsx`
- `docs/dev-log/2026-05-26-eighty-seventh-pass-tidy-5-comment-consolidation.md` (this file)
