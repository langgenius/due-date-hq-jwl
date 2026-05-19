---
title: 'Radar: wire dismiss action in /rules/pulse'
date: 2026-05-19
author: 'Claude'
area: rules
---

# Radar: wire dismiss action in /rules/pulse

## Context

Gap #4 from the [interaction map](../product-design/rules/04-rules-interaction-map.md):

> Radar dismiss not wired in /rules/pulse (only in dashboard banner).
> Verify intentional. If alerts should be dismissable here, pass
> `onDismiss` to `PulseAlertCard`.

`PulseAlertCard` already supports an optional `onDismiss` prop and
renders a Dismiss button when provided. The dashboard banner
(`PulseAlertsBanner.tsx`) wires it; the in-Rules list page
(`AlertsListPage.tsx`) did not.

Verifying with the product model: alerts are noise filtering — CPAs
should be able to dismiss from both the heads-up banner AND the
detail-view list. The list page is where someone goes to do deeper
triage; if they conclude "this isn't relevant", they should be able
to act in place, not pop back to the banner.

Decision: wire it on. Not intentional that it was missing.

## Change

`apps/app/src/features/pulse/AlertsListPage.tsx`:

### New mutation in `PulseChangesTab`

Same shape as the banner's dismiss mutation: `orpc.pulse.dismiss`
with toast + invalidation on success, toast on error.

### `onDismiss` passed conditionally per alert

```tsx
const canDismiss = alert.status === 'matched'
<PulseAlertCard
  …
  {...(canDismiss
    ? { onDismiss: () => dismissAlertMutation.mutate({ alertId: alert.id }) }
    : {})}
/>
```

Only `matched` alerts (still open / awaiting action) get a Dismiss
button. The other terminal statuses — `dismissed`, `applied`,
`partially_applied`, `reverted`, `snoozed` — would grow a misleading
"Dismiss" button if we wired it unconditionally.

### Test mock extended

`AlertsListPage.test.tsx`:

- Added `dismissMutationFn: vi.fn()` to the hoisted rpc mocks
- Added `dismiss: { mutationOptions: ... }` to the `orpc.pulse` mock

Existing tests (source-health review tests) now have the
mutation available and don't fail with `undefined.mutationOptions`.

## Why this stays durable

1. **Same plumbing as the banner.** Both surfaces use
   `orpc.pulse.dismiss` + `usePulseInvalidation`. Behavior parity by
   construction.
2. **Conditional render is honest.** Already-dismissed alerts don't
   show Dismiss. Already-applied alerts don't show Dismiss. Future
   statuses default to NO dismiss button — additive changes opt in.

## Validation

- `pnpm check` — 1056 files formatted, 576 typechecked, clean
- `pnpm test` — 203/203
- Manual: navigating to /rules/pulse with a matched alert in the
  feed shows Review + Dismiss buttons on the card; dismissed alerts
  show only Review.
