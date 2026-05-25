---
title: 'D1 + B1 + post-merge cleanup'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: shape+audit
---

# D1 + B1 + post-merge fix

## Why

After the teammates' merge landed, three remaining items from the
deferred list:

1. **D1**: dismissed opportunity rows showed only the cue kind
   ("Retention check-in") with no client context. Needed a server
   change to resolve the client name.
2. **B1**: 19 `animate-spin` sites had no `motion-reduce` gating.
   Editing 19 call sites was the wrong shape — a one-line preset
   override slows the spin under `prefers-reduced-motion` instead.
3. Post-merge: a `<Trans>Open Billing</Trans>` button I'd flagged in
   the copy audit was actually in `billing.success.tsx`, not the
   `billing.tsx` file I edited. The earlier batch missed it.

## What changed

### D1 — Client name on dismissed-opportunities rows (3 layers)

`packages/contracts/src/opportunities.ts`,
`apps/server/src/procedures/opportunities/index.ts`,
`apps/app/src/features/opportunities/opportunities-page.tsx`.

**Contract:** added `clientName: z.string().nullable()` to
`OpportunityDismissalRowSchema`. Documented inline that the server
resolves this by parsing the `opportunityKey` and joining with the
clients table.

**Server:** the `listDismissed` handler now:

1. Calls `listActiveDetailed` for the dismissals (existing).
2. Parses `clientId` out of each `opportunityKey` (the format is
   `<kind>:client:<clientId>`).
3. Calls `scoped.clients.findManyByIds()` once with the unique set
   of client IDs (single batch query, not per-row).
4. Attaches `clientName` to each dismissal row.

A new `clientIdFromOpportunityKey()` helper does the parsing
defensively — returns `null` if the key shape doesn't match
`<kind>:client:<clientId>` so future non-client-scoped opportunity
kinds (e.g. firm-wide cues) survive without crashing.

**UI:** the dismissed row's top line now reads
`"{kind} · {clientName}"` when the server resolved a client. Falls
back to just the kind when `clientName` is null. The aria-label and
truncation behavior stay the same.

Visible result on `/opportunities` → Recently dismissed:

- Before: `Retention check-in`
- After: `Retention check-in · Lakeview Manufacturing`

### B1 — `animate-spin` respects `prefers-reduced-motion`

`packages/ui/src/styles/preset.css`.

Single preset rule inside the existing `@layer base` block:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-spin {
    animation-duration: 3s;
  }
}
```

Per WCAG 2.3.3, spinners are **functional process indicators**
(not "animation from interactions") so we KEEP them visible —
the rotation just slows from ~1s to ~3s instead of strobing.
Users who turned reduced-motion on still see "something is
happening"; they don't see a frozen spinner that looks broken.

Covers every `animate-spin` consumer at once (Loader2Icon,
LoaderCircleIcon, RefreshCwIcon during pending). No call-site
edits needed.

### Post-merge: `Open Billing` → `Open billing`

`apps/app/src/routes/billing.success.tsx`.

The earlier UX copy audit batch (`875841fb`) listed this as fixed,
but I'd edited `billing.tsx` (the main page) instead of
`billing.success.tsx` (the success page after upgrade). The actual
button on the success page still said "Open Billing". Now matches
sentence case.

## Verification

- `pnpm check` → 1410 files formatted, 661 lint+type clean.
- `pnpm --filter @duedatehq/contracts --filter @duedatehq/app test`
  → 26/26 + 308/308 green.

## Files touched

- M `packages/contracts/src/opportunities.ts`
- M `apps/server/src/procedures/opportunities/index.ts`
- M `apps/app/src/features/opportunities/opportunities-page.tsx`
- M `apps/app/src/routes/billing.success.tsx`
- M `packages/ui/src/styles/preset.css`
