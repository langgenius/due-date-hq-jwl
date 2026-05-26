# Deadlines panel width lock

**Date:** 2026-05-26
**Scope:** `/deadlines` right-side obligation detail panel.

Yuqi feedback: after moving a deadline from Waiting to In review, the detail
surface looked narrower even though the drawer should keep the same width.

## Finding

The outer motion slot was correctly fixed at `600px`, but the panel-mode
`<aside>` inside it did not have `w-full`. As a flex item it used its own
content width, so when the In review summary content became narrower the
visible white detail surface shrank inside the still-600px slot.

## Change

- Added `w-full flex-none` to the panel-mode aside.
- The visible detail surface now fills the fixed `600px` slot regardless of
  status, tab, or summary-card content.

## Verification

- `pnpm --filter @duedatehq/app exec tsc -p tsconfig.json --noEmit` — clean.
- `git diff --check` — clean.
- Browser check on `/deadlines/be0705712eb9/summary`: before the fix, the
  outer slot stayed `600px` but the aside shrank to ~`488px` after `Waiting →
In review`. After the fix, the slot, aside, and header stay at `600px` /
  `600px` / `599px` through `In review → Waiting → In review`.
