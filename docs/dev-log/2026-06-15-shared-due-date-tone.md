# Shared due-date tone — one source for /alerts + /deadlines (deadlines polish §1)

_2026-06-15_

First batch of the deadlines↔alerts alignment: a single home for due-date
urgency colour, so "late = red" can't drift into four hand-rolled mappings.

## What

Promoted the alerts-only `features/alerts/lib/due-date-diff.ts` to a shared
**`features/_surface-vocabulary/due-date-tone.ts`** (next to `ai-confidence.ts`,
the cross-surface vocabulary home). It now owns BOTH axes:

- **Shift diff** (alerts: old→new due date) — `dueDateDiffTone` /
  `DUE_DATE_DIFF_TONE_CLASS` (sooner=red / later=green / same=neutral). Moved
  verbatim; alerts consumers just repoint the import.
- **Countdown** (deadlines: days-until-due, negative=overdue) — new
  `dueCountdownTone` (`overdue` / `soon` 0–7 / `upcoming`) +
  `DUE_COUNTDOWN_TEXT_CLASS` (prominent value, neutral=primary) and
  `DUE_COUNTDOWN_TEXT_CLASS_QUIET` (captions, neutral=muted). Urgency colours
  single-sourced; only the neutral step differs by context.

The countdown ladder maps **1:1** to the deadline queue's prior `dueDaysTone`
dot ladder (overdue→destructive, ≤7→warning, else→neutral) — so the due-days
pill is a pixel-for-pixel swap.

## Consumers repointed

- `AlertDetailDrawer.tsx`, `PulseAlertRow.tsx` — import from the shared module.
- `DueDaysPill` (`queue/components/primitives.tsx`) — colour via
  `DUE_COUNTDOWN_TEXT_CLASS[dueCountdownTone(days)]`; dropped its `dueDaysTone`
  dependency.
- `ObligationListRail` relative-due line — colour via the shared QUIET map; it
  now shows **amber for due-soon** (was muted), matching the pill + /alerts.
- Retired the now-unused `dueDaysTone` fn + `DueDaysTone` type from
  `queue/helpers.ts` + `queue/types.ts` (the `.variant` field was dead; `.dot`
  only fed the two pills).

## Deferred (parallel-session coordination)

`routes/obligations.tsx` has an *inline duplicate* of `DueDaysPill` + a local
`dueDaysTone`/`DueDaysTone` (identical output). The other session has
uncommitted work in `obligations.tsx`, so I left those local copies in place
(they still render identically) and will fold them onto the shared module in the
list-page batch via selective staging.

## Verified

- `npx tsgo --noEmit -p apps/app` — clean (confirms the deletions broke nothing).
- `npx vp check` — clean.
- `pnpm test src/features/obligations src/features/alerts` — 22 files, 148 pass.
- Pill colour is a proven pixel-identical swap; the rail gains soon=amber (the
  intended cohesion change).
