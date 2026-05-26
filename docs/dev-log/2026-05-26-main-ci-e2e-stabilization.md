# Main CI/E2E Stabilization

## Context

Main CI/E2E had drifted after recent Rule Library, Alerts, deadline calendar, and
route-copy changes. The affected checks were mostly selector and test harness drift rather than
product behavior changes.

## Changes

- Updated Rule Library test mocks for concrete draft generation and rule-impact preview queries.
- Made the coverage bulk-review drawer tolerate isolated tests without a sidebar provider.
- Re-aligned E2E page objects and specs with current navigation labels, button roles, and detail
  drawer headings.
- Re-ran Lingui extract/compile so `zh-CN` catalog output is current.

## Validation

- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm --filter @duedatehq/app test src/features/rules/coverage-tab.test.tsx src/routes/rules.library.test.tsx`
- `env CI=1 pnpm test:e2e e2e/tests/rules-console.spec.ts`
- `pnpm check:fix`
