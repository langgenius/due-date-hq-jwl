# CI, E2E, and Lingui stabilization

**Date:** 2026-06-17
**Surface:** `packages/ingest/src/ingest.test.ts`, CI verification, Playwright E2E,
Lingui catalogs, `apps/app/src/features/obligations/status-control.tsx`

The current green-up pass found Lingui already healthy: strict app catalog
compilation completed without missing translations. The local CI failure was in
`pnpm test`, where the first ingest PDF text extraction test could exceed
Vitest's default 5s test timeout during a cold, workspace-parallel run. The PDF
behavior itself was correct; targeted reruns passed, and the failure timing
matched PDF.js cold-start overhead rather than a functional regression.

The fix keeps the default timeout everywhere else and gives only PDF text
extraction cases a `15_000ms` budget. Those tests exercise PDF.js worker setup
and text extraction paths, so they are the right place to absorb cold-start
variance without weakening the rest of the suite.

After that commit was pushed, GitHub Actions still exposed two hard failures:
the `Lingui Catalog Drift` workflow extracted two untranslated Rule Library
bulk-review labels (`AI draft ready`, `Review individually`), and the `CI`
workflow failed on `typescript(no-floating-promises)` for the read-only
obligation status badge animation. The follow-up keeps the new catalog entries,
adds the missing `zh-CN` translations, and marks the motion animation promise as
an intentional fire-and-forget call with `void`.

## Verification

- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm check` (0 errors; pre-existing warnings remain)
- `pnpm test`
- `pnpm build`
- `E2E_WORKER_PORT=8788 E2E_MARKETING_BASE_URL=http://127.0.0.1:4322 pnpm exec playwright test --workers=1 --reporter=list` (68 passed)

Notes: the first sandboxed E2E attempt failed before tests because local
`wrangler dev` could not listen on `127.0.0.1`; the same command passed after
running outside the sandbox. GitHub Actions log inspection was blocked by an
invalid local `gh` token, so this pass used the repository's local CI and E2E
commands as the source of truth.
