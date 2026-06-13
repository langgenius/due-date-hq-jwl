# 2026-06-13 CI, E2E, and Lingui stabilization

## What changed

- Fixed a malformed Lingui plural macro in the obligations route and completed the
  zh-CN catalog entries required by strict compile.
- Let Playwright's local Worker port follow `E2E_WORKER_PORT`, so E2E can run on
  an alternate port when an existing dev server owns `8787`.
- Updated E2E page objects and specs for the current UI roles, labels, and route
  query contracts across migration, billing, destructive confirms, pulse,
  members, route errors, obligations, and workload flows.
- Preserved dashboard button click handlers when tooltip trigger props are
  composed, which restored the import wizard entry point used by E2E.
- Reconciled Vitest expectations for alert structured fields and obligations
  default hidden columns with the current implementation.

## Verification

- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm check`
- `pnpm test`
- `pnpm build`
- `E2E_WORKER_PORT=8788 E2E_MARKETING_BASE_URL=http://127.0.0.1:4322 pnpm exec playwright test --workers=1 --reporter=list`

The full Playwright run passed 68 tests. `pnpm test` still prints sandboxed
localhost permission noise from the server tests before exiting successfully, and
`pnpm build` still prints a Wrangler log-write permission warning while the
dry-run build completes successfully.
