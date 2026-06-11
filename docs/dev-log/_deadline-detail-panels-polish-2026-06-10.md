# /deadlines detail panels polish batch (2026-06-10)

Design tweaks from Yuqi on the `/deadlines/[id]` detail page. All changes
in `apps/app/src/features/obligations/queue/components/panels.tsx`. Tokens,
radii, and i18n (`<Trans>`) rules preserved. Page-specific work stays in the
`cards`/page-only components (`DeadlineDateCard`, `PathToFilingSummary`,
`ActiveStageDetailCard`); the `/clients` flat `divide-x` variant of
`PrimaryDeadlineStrip` and the panel/sheet modes are untouched.

## Changes

- **#4 — DeadlineDateCard date too big.** The date dropped one step from
  `text-sm` to `text-caption-xs` so it no longer dominates the column.

- **#5 — DeadlineDateCard no background.** Removed the card chrome
  (`rounded-xl border border-divider-subtle`, `bg-background-subtle` /
  `bg-state-warning-hover`, padding). The three dates now render as plain
  flat columns separated only by the grid gap. Overdue is now a pure
  text-colour cue (`text-text-warning` on the icon + date), never a filled
  card.

- **#8 — PathToFilingSummary active status indicator smaller.** The
  active-stage sub-status annotation dropped from `text-caption-xs` (10px)
  to `text-[9px]` so it reads as a quiet annotation beneath the now-larger
  stage label + date instead of competing with them.

- **#9 — Stepper stage labels bigger.** Stage labels lifted from
  `text-caption-xs` (10px) to `text-xs` (12px) for AA legibility, and the
  ghosted non-active labels lifted from `text-text-tertiary` to
  `text-text-secondary`. Active keeps `font-medium` + `text-text-primary`.
  Stepper stays compact.

- **#10 — Stepper per-stage dates bigger.** Dates lifted from `text-[9px]`
  to `text-caption-xs` (10px) — one step up, still a tier below the
  `text-xs` label so the label keeps primacy.

- **#11 — ActiveStageDetailCard gaps chaotic.** The card root now owns one
  vertical rhythm via `flex flex-col gap-3`; every per-section `mt-3` on the
  direct children was removed. Previously the header/signature/overdue
  banner had no gap while later sections used `mt-3`, which read as
  inconsistent. Now one 12px rhythm across header → banners → stage context
  → steps → history.

- **#12 — "what does this mean?" `.mt-3` block.** The flagged block was the
  **auto-unblock context banner** (shown on a Not-started row that a parent
  cascade just cleared). It was a bare floating sentence —
  "Resumed from blocked on DATE after the upstream deadline was completed." —
  with no label, so the box's purpose was unclear. Per the auto-unblock
  destination contract this banner is the canonical place to record WHY the
  row moved, so it was clarified, not removed: added an "Auto-unblocked"
  eyebrow + reworded the body to "This return moved itself out of Blocked on
  DATE once the upstream deadline it was waiting on was completed."

- **#13 — "Blocking" `ul` messy / not left-aligned.** The list items used
  `gap-3` + `text-base` on the label, which over-indented the text and made
  it an odd tier larger than its eyebrow. Normalized to `gap-2` dot gutter +
  `text-sm` label + `gap-1` between rows so every label starts on the same x
  and the rows share one spacing rhythm.

## Verification

- `tsgo --noEmit` clean.
- `vitest run obligations` — 7 files / 89 tests passing.
- `vp fmt --write` applied to the file.
