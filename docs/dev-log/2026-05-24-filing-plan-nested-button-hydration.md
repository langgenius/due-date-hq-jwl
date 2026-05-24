---
title: 'Filing-plan row: stop nesting <button> inside <button> (hydration error)'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: audit
---

# Filing-plan row stops nesting `<button>` inside `<button>`

## Why

Smoke-testing the recent confirm-dialog batch in the browser
surfaced a pre-existing hydration error on the client-detail
filing plan:

```
In HTML, <button> cannot be a descendant of <button>.
This will cause a hydration error.
```

The filing-plan row's open-detail click target is a `<button>`. Inside
it: `<TaxCodeLabel code={obligation.taxType} />` — a tooltip-bearing
inline label that renders a `<TooltipTrigger>` (which is itself a
`<button>` by default). Two buttons, one nested inside the other,
on every visible filing-plan row. Console flooded with hydration
errors and `NotFoundError: Failed to execute 'removeChild'` /
`'insertBefore'` cascades coming from React trying to reconcile
the invalid tree.

Pre-existing — not introduced by the recent re-critique work. But
the error was loud enough that the browser smoke-test caught it
immediately on first reload, so worth fixing in the same session.

## What changed

`apps/app/src/features/clients/ClientFactsWorkspace.tsx`

`<TaxCodeLabel>` already exposes an `asChild` prop that swaps the
default `<TooltipTrigger>` button for a `<span>` (the `render`
override at `tax-code-label.tsx:39`). The filing-plan row's
TaxCodeLabel just needed `asChild`:

```tsx
;-(<TaxCodeLabel code={obligation.taxType} />) + <TaxCodeLabel code={obligation.taxType} asChild />
```

The tooltip still fires via Base UI's pointer handlers on the span
— `asChild` is exactly the escape hatch for cases like this.

## Verification

- Browser console after the fix: zero nested-button errors on the
  client-detail page.
- `document.querySelectorAll('button')` traversal: 43 buttons
  total, 0 of them contain a nested `<button>` (was 8 nested
  before — one per visible filing-plan row across the year
  sections).
- `pnpm check` → 1385 files formatted, 655 lint+type clean.

## Files touched

- M `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
