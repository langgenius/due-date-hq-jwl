---
title: 'Client detail readable URLs'
date: 2026-05-24
area: client-detail
---

# Client Detail Readable URLs

## Change

Client detail navigation now uses a readable name slug with the client UUID as the unique suffix
instead of the raw UUID segment. For example, Pacific Trust opens as
`/clients/pacific-trust-13000000-0000-4000-8000-000000000005` instead of
`/clients/13000000-0000-4000-8000-000000000005`.

## Implementation

- Added a shared client URL helper that builds stable slug-id route keys from client names and
  resolves either a legacy UUID segment, a slug-id route key, or a unique pre-suffix slug.
- Updated client-detail entry points that have a client object in hand to link directly to the
  readable path.
- Kept legacy UUID URLs working. When a UUID route loads, the detail route replaces the URL with
  the canonical readable slug while preserving query params like `?tab=info`.
- 2026-05-26 hardening: duplicate client names no longer collide. Current links include the UUID
  suffix, and old slug-only routes resolve only when that slug matches exactly one client.

No product-design doc update required: the client detail page content and workflow are unchanged;
only the route presentation changed.

## Validation

- `pnpm --filter @duedatehq/app test -- client-url.test.ts ClientPeekHoverCard.test.tsx`
- `pnpm --filter @duedatehq/app exec tsc --noEmit --pretty false`
- `pnpm exec vp check apps/app/src/features/clients/client-url.ts apps/app/src/features/clients/client-url.test.ts apps/app/src/routes/clients.$clientId.tsx apps/app/src/router.tsx apps/app/src/routes/clients.tsx apps/app/src/features/clients/ClientFactsWorkspace.tsx apps/app/src/features/clients/ClientTitleSwitcher.tsx apps/app/src/features/clients/ClientCycleArrows.tsx apps/app/src/features/clients/ClientPeekHoverCard.tsx apps/app/src/features/clients/ClientDetailDrawer.tsx apps/app/src/features/clients/FixNeedsFactsSheet.tsx docs/dev-log/2026-05-24-client-detail-readable-url.md`
- `git diff --check -- apps/app/src/features/clients/client-url.ts apps/app/src/features/clients/client-url.test.ts 'apps/app/src/routes/clients.$clientId.tsx' apps/app/src/router.tsx apps/app/src/routes/clients.tsx apps/app/src/features/clients/ClientFactsWorkspace.tsx apps/app/src/features/clients/ClientTitleSwitcher.tsx apps/app/src/features/clients/ClientCycleArrows.tsx apps/app/src/features/clients/ClientPeekHoverCard.tsx apps/app/src/features/clients/ClientDetailDrawer.tsx apps/app/src/features/clients/FixNeedsFactsSheet.tsx docs/dev-log/2026-05-24-client-detail-readable-url.md`
- Browser smoke:
  - `http://localhost:5173/clients/13000000-0000-4000-8000-000000000005` replaced to
    `http://localhost:5173/clients/pacific-trust`
  - `http://localhost:5173/clients/pacific-trust?tab=info` loaded Pacific Trust directly
  - console warnings/errors: none

## 2026-05-26 duplicate-name hardening

- `pnpm --filter @duedatehq/app test -- client-url.test.ts`
- `pnpm --filter @duedatehq/app exec tsc -p tsconfig.json --noEmit --pretty false`
- `pnpm --filter @duedatehq/app test -- ClientPeekHoverCard.test.tsx`
