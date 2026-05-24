---
title: 'Dashboard actions: fix button-in-button DOM nesting'
date: 2026-05-24
author: 'Codex'
area: dashboard
---

# Dashboard actions: stop nesting `<button>` inside `<button>`

## Bug

The expanded "Actions this week" detail panel was itself a `<button>`
because the whole panel opens the obligation drawer. Its form row also rendered
`<TaxCodeLabel>`, whose tooltip trigger can be a button by default. React
reported invalid button nesting and warned that it could cause hydration errors.

## Fix

Two changes keep the same visible behavior without real button nesting:

- The expanded detail target is now a role-backed `<div>` with Enter / Space
  key handling instead of a real `<button>`.
- The dashboard form-code label passes `asChild`, so the tooltip trigger
  renders as a `<span>`.

```diff
-<TaxCodeLabel code={row.taxType} />
+<TaxCodeLabel code={row.taxType} asChild />
```

This matches the earlier `ClientSummaryStrip` fix and keeps the visible UI and
drawer-open behavior unchanged.

## Verification

- `pnpm --filter @duedatehq/app test`
- `pnpm --filter @duedatehq/app build`

Added `actions-list.test.tsx` coverage that focuses a dashboard row to render
the expanded detail panel and asserts the panel is not an `HTMLButtonElement`
and has no descendant `<button>`. No DESIGN.md or product-design update was
required because the interaction and visual spec did not change.
