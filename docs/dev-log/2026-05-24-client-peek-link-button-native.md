---
title: 'Client peek: silence Base UI Link-backed button warning'
date: 2026-05-24
author: 'Codex'
area: clients
---

# Client peek: Link-backed buttons use non-native button mode

## Bug

`ClientPeekHoverCard` rendered two shared `Button` instances with
`render={<Link />}`. Base UI's button primitive defaults
`nativeButton` to `true`, so it warned that the rendered element was an
anchor instead of a native `<button>`.

## Fix

Set `nativeButton={false}` on both Link-backed escape hatches:

- `Open full page`
- `All deadlines`

The rendered elements remain anchors, and Base UI no longer applies the native
button expectation to them.

## Verification

- `pnpm --filter @duedatehq/app test -- ClientPeekHoverCard.test.tsx`
- `pnpm --filter @duedatehq/app test`
- `pnpm --filter @duedatehq/app build`

Added `ClientPeekHoverCard.test.tsx` coverage for the peek body links and the
absence of the Base UI native-button warning. No DESIGN.md update was required
because the visible interaction did not change.

## Follow-up

Pre-commit surfaced that the new test used narrowed `as unknown as` fixtures and
a nullable `QueryClient` where `QueryClientProvider` requires a concrete client.
The test now parses complete public client and obligation fixtures through the
contract schemas before mocking RPC responses, and the render helper passes a
local non-null query client into the provider.

Additional verification:

- `pnpm exec vp check apps/app/src/features/clients/ClientPeekHoverCard.test.tsx`
- `pnpm --filter @duedatehq/app test -- src/features/clients/ClientPeekHoverCard.test.tsx src/routes/rules.library.test.tsx`
- `pnpm check`
- `pnpm exec vp check --fix <staged-files>`
