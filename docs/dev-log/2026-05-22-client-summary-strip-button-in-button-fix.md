---
title: 'ClientSummaryStrip: fix button-in-button DOM nesting on the Next-due tile'
date: 2026-05-22
author: 'Claude (Yuqi pairing)'
area: clients
---

# ClientSummaryStrip: stop nesting `<button>` inside `<button>`

## Bug

`ClientSummaryStrip`'s "Next due" tile is a `TileShell` rendered as a
`<button>` (clicking the tile opens the obligation drawer). The tile's
value cell rendered a `<TaxCodeLabel>`, whose `TooltipTrigger` renders
as a `<button>` by default. The result was a `<button>` inside a
`<button>` — invalid HTML and a React hydration warning in the console.

## Fix

Pass `asChild` to `TaxCodeLabel` so its `TooltipTrigger` adopts the
parent span's tag instead of rendering its own button. The tooltip
still works (the trigger element is whatever child you slot in); the
DOM is now a single `<button>` containing a `<span>` containing the
label content.

```diff
-<TaxCodeLabel code={nextDue.taxType} />
+<TaxCodeLabel code={nextDue.taxType} asChild />
```

## Misc, riding along

- `use-current-user-name.ts` — dropped a redundant `as` cast on
  `useRouteLoaderData`; the inferred type was already correct after
  a recent router type tightening.
- `.claude/launch.json` — adds a port-5188 dev profile next to 5183
  so two app instances can run in parallel for V2↔V3 design comparison.

## Test plan

- Open any route that renders `ClientSummaryStrip` (e.g. the obligation
  drawer's client peek, or `/clients/[id]` when the drawer is mounted)
  with the dev console open; verify no "validateDOMNesting" warning.
- Hover the tax-type label on the Next-due tile; verify the tooltip
  still opens.
