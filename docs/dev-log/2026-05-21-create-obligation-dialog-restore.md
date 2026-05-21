# 2026-05-21 Restore manual obligation dialog

## Context

`ClientFactsWorkspace` and `DashboardRoute` both import
`@/features/obligations/CreateObligationDialog`, but the component file was missing, which caused
Vite import analysis to fail before the app could render.

## Changes

- Added `CreateObligationDialog` under `apps/app/src/features/obligations/`.
- The dialog creates one manual obligation through `orpc.obligations.createBatch`.
- Dashboard usage loads a client selector lazily when the dialog opens.
- Client workspace usage accepts `defaultClientId` and skips the selector.
- Successful creation invalidates dashboard, obligation list, obligation facets, and client-scoped
  obligation queries.
- Added Lingui messages and zh-CN translations for the new dialog copy.

## Validation

- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm check` passed with the repository's pre-existing warnings.
