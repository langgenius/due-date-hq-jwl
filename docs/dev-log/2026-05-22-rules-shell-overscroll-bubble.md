---
title: 'Rules console shell: drop overscroll-contain so wheel events bubble at edges'
date: 2026-05-22
author: 'Claude (Yuqi pairing)'
area: rules
---

# Rules console shell: drop `overscroll-contain` on the page body

## Change

`RulesPageShell` (`apps/app/src/features/rules/rules-console-primitives.tsx:80`)
is the scroll container for every page inside `/rules/*` (Rule library,
Sources, Preview, Pulse, Temporary). Its body was tagged
`min-h-0 flex-1 overflow-y-auto overscroll-contain`. Removed
`overscroll-contain` — the body now reads `min-h-0 flex-1 overflow-y-auto`.

## Why

`overscroll-behavior: contain` traps wheel/touch scroll inside the
shell once the content reaches its top or bottom edge. On the rules
surfaces this was producing a "stuck at the seam" feeling: when a
user scrolled past the end of the Rule library table, the page didn't
yield to the parent (no rubber-band, no chained scroll), so the gesture
just died at the boundary. Removing the property restores default
`auto` behavior, letting overscroll chain to the route layout.

## Scope

Only the rules shell. The same pattern was incidentally present in
`ImportHistoryDrawer.tsx:174` and `routes/settings.tsx:119`, but those
were left alone — the sheet/settings containers genuinely want to
trap overscroll so the page beneath doesn't move when the user
finishes a long scroll inside the drawer.

## Test plan

- Open `/rules/library` with enough rules to need scroll; scroll to
  the bottom of the table; verify the gesture chains to the route
  shell instead of dying at the table edge.
- Repeat on `/rules/sources` and `/rules/preview` to confirm the
  shell behavior is consistent across the rules family.
