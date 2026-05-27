# Per-deadline milestone status — audit + drift fixes (Agent X3)

_Date: 2026-05-27 · Branch: `design/audit-drain-x3-milestone-audit` · Wave 7 — audit-drain stream_

## Why

Yuqi flagged the per-deadline milestone status UX logic as untrusted. Six different surfaces in the obligation drawer narrate the same row's lifecycle — the queue/header status pill, the horizontal `PathToFilingSummary` strip, the active stage detail card, the vertical `ObligationTimeline` journal, the `CompletedKeyDates` terminal stat block, and the readiness overview. Each independently maps the 10 legacy `ObligationStatus` values into the 6 canonical v2 milestones, and these maps had drifted.

The agent brief: audit every state × surface combination, identify the drift, ship mechanical fixes inline (cap of 12).

## Matrix

Authored `docs/Design/milestone-audit.md` — full state × surface matrix that becomes the source-of-truth for "what should every surface say when a row is in state X." States audited: `pending`, `not_applicable`, `waiting_on_client`, `blocked`, `in_progress`, `review`, `extended`, `done`, `paid`, `completed`. Surfaces audited: S1 pill, S2 milestone strip, S3 active stage card, S4 vertical timeline, S5 completed key-dates, S6 readiness checklist row, S7 readiness overview.

## Drift summary

- **P0: 3** (M-08, M-09, W-4) — `extended` showing live "N days late" red pill; `paid` mis-mapped to Completed milestone instead of Filed; `DUE_DAYS_TERMINAL_STATUSES` missing closed states.
- **P1: 5** (M-03, M-04, M-05, M-07, M-10) — `not_applicable` / `in_progress` / `extended` falling into "Other activity" bucket instead of canonical milestones; "Waiting" vs "Waiting on client" label mismatch; `paid`-only rows missing Filed key date.
- **P2: 3** (M-01, M-02, W-2) — three deferred items requiring design decisions, not mechanical fixes.

## Wiring issues

The audit's central finding: three independent maps in two files all answer "what canonical milestone does each legacy status belong to?" — and they disagreed.

- `MILESTONE_MAP` in `apps/app/src/features/obligations/timeline.tsx` (used by S4)
- `STAGE_STATUS_GROUPS` in `apps/app/src/routes/obligations.tsx` (used by S3 to filter audit events per stage)
- `timelineIndexForStatus` switch in `apps/app/src/routes/obligations.tsx` (used by S2 to position the active stage)

These should be one map living in `status-control.tsx` next to `LIFECYCLE_V2_STATUSES` and `useLifecycleV2StatusLabels`. Flagged as Section 8 recommendation in the audit doc — a unification task for a follow-up pass.

## Shipped (7 of 12 cap)

1. **`features/obligations/timeline.tsx`** — `MILESTONE_MAP` rewritten as an exhaustive `Record<ObligationStatus, ObligationStatus>` covering all 10 legacy values, with a comment pointing back to the canonical v2 collapse contract. Fixes M-03 (`not_applicable` → pending bucket), M-05 (`in_progress` → review), M-07 (`extended` → review), M-09 (`paid` → done, was wrongly `paid → completed`).

2. **`features/obligations/status-control.tsx`** — `useStatusLabels.review` flipped from "Needs review" to "In review". Brings the legacy 10-state label set in line with the v2 collapse: status `review` reads as work-in-progress (same family as `in_progress`), not as a "needs attention" signal. Fixes M-06.

3. **`routes/obligations.tsx`** — `DUE_DAYS_TERMINAL_STATUSES` extended to include `extended` and `not_applicable`. Both are `CLOSED_OBLIGATION_STATUSES` per `packages/core/src/obligation-workflow/index.ts`; live red lateness pills on top of their muted stage labels created a mixed signal. Fixes M-08, W-4.

4. **`routes/obligations.tsx` — `DueDaysPill`** — added a guard so the terminal-state body doesn't render "Filed N days late" for `extended` / `not_applicable` (the row was never filed in those states). Em-dash placeholder instead. Completes M-08.

5. **`routes/obligations.tsx` — `PathToFilingSummary`** — strip stage label changed from "Waiting" → "Waiting on client". Matches the pill, the v2 label hook, and the readiness overview headline. Fixes M-04 (strip).

6. **`routes/obligations.tsx` — `ActiveStageDetailCard.stageLabels.waiting_on_client`** — same "Waiting" → "Waiting on client" change. One row, one name across all milestone surfaces. Completes M-04 (card).

7. **`features/obligations/CompletedKeyDates.tsx`** — mines `paid` events alongside `done` for the Filed key date. Pre-fix, a payment-track row walking pending → paid → completed (no `done` event in between) showed a blank Filed line on the terminal stage; now it shows the paid stamp. Fixes M-10.

## Test regression locks

Added four regression tests in `apps/app/src/features/obligations/timeline.test.tsx`:

- `paid` events land in the Filed milestone (locks M-09 fix).
- `in_progress` events land in the In review milestone (locks M-05 fix).
- `not_applicable` events land in the Not started milestone (locks M-03 fix).
- `extended` events land in the In review milestone (locks M-07 fix; replaces the prior test that exercised the "Other activity" fallback for `extended`, which no longer applies).

Updated the original "renders CPA-readable labels for other audit activity" test to use a `obligation.created` event (the canonical non-status audit event) instead of `extension.decided` — the bucket still exists for non-status traffic, just not for collapsible legacy statuses.

## Deferred

- **M-01** — `not_applicable` row strip not muted (60% opacity per brief). The muted treatment shape isn't specified anywhere — needs a design call.
- **M-02** — `not_applicable` pending-stage task list is meaningless ("Confirm engagement letter / Assign preparer / Request docs"). The N/A intent is different from the active pending intent; needs discovery before guessing at the right tasks.
- **W-2** — `subStatusForActiveStage` (module-scope helper) and the in-component `subStatus` IIFE both exist because Lingui macros don't transform `t` when passed as a function argument. Unifying them is a ~60-line refactor not justified by the audit budget.

## Checks

```
TSC                          : clean (apps/app, pnpm exec tsc --noEmit)
pnpm test --run features/obligations : 27 passed
pnpm test --run routes/obligations.test : 42 passed
Lingui extract              : 0 missing (zh-CN already covered "Waiting on client" / "In review" from prior surfaces)
Lingui compile --strict      : pass
```

## Files

- `apps/app/src/features/obligations/timeline.tsx`
- `apps/app/src/features/obligations/status-control.tsx`
- `apps/app/src/features/obligations/CompletedKeyDates.tsx`
- `apps/app/src/features/obligations/timeline.test.tsx`
- `apps/app/src/routes/obligations.tsx` — only the milestone regions (DUE_DAYS_TERMINAL_STATUSES, DueDaysPill, PathToFilingSummary.stages, ActiveStageDetailCard.stageLabels)
- `docs/Design/milestone-audit.md` (new — the matrix)
- `apps/app/src/i18n/locales/zh-CN/messages.po` (file-reference prune from Lingui extract; no new translations needed)
