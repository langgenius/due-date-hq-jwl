# 2026-05-25 — Phase 8 (batch 4): search affordance + row badge cleanup

## Why

Continued Deadlines polish. Three Yuqi items closed.

## Shipped

### Deadlines #2 — Search button more dominant

Search icon button was rendering as `variant="ghost"` (no border,
no bg) — it disappeared into the toolbar. Promoted to
`variant="outline"` so the icon has a visible bordered chip
border. Still icon-only (the input expands on click) but the
collapsed state is now legible as an affordance.

### Deadlines #7, #8 — Internal-due badge ≠ Status pill

`DueDaysCell` (the Internal due column's "25 days late" badge)
used `variant="destructive"` / `variant="warning"` to render a
filled-tint pill. The Status pill ("In review", "Blocked")
right next to it ALSO renders as a filled-tint pill — two
identical-looking badges with different meanings.

Now the Internal-due badge:

- Always renders `variant="outline"` (calm outline chip,
  regardless of urgency).
- Carries the urgency signal via the dot tone + tinted text
  color only (red `text-text-destructive` for very-late,
  amber `text-text-warning` for soon, neutral for future).

Status pill stays filled — workflow state is allowed to shout.
Internal due is the deadline anchor — it stays a quiet
reference chip. Two distinct visual classes, two distinct
semantic roles.

This also takes care of #8 (red overload): blocked rows used to
show three red things at once (red row tint via destructive pill

- red days-late badge + red "blocked" reason chip). With the
  days-late badge now outlined-with-red-text, only ONE pill stays
  red — the eye lands on what's blocked, not on a wall of red.

## Verification

- `pnpm exec tsc --noEmit` clean
- `vp lint apps/app/src/routes/obligations.tsx` 0/0

## Closes Yuqi review items

- Deadlines: **#2, #7, #8** (3 items)

Combined with prior commits the review is at **61 / 89**.

## Still open

- Today: **#28, #30** (design decisions — documented in prior log)
- Today (dialog): **#42-#45** (Field/Dialog primitive audit)
- Alerts: **#9** (US map filter — design exploration)
- Deadlines: **#6** (multi-deadline grouping), **#10** (status
  color audit — needs status taxonomy review), **#11** (column
  layout when drawer open), **#9** (sticky filter), **#16**
  (drawer alignment — viewport replay), **#23, #24, #25**
  (PathToFilingSummary skipped/upcoming dates — designed-as-is),
  **#30** (Summary tab — separate commit)
- Wizard: **#37, #40, #41** (audits / viewport)

28 items remain open — most blocked on design system review,
new feature build, or viewport replay (i.e. need Yuqi's input).
