# CI, E2E, and Lingui stabilization

_2026-06-16_

Fixed the current local CI failure set after product/UI drift:

- Lingui catalogs were refreshed with `i18n:extract` and compiled with
  `i18n:compile --strict`; `zh-CN` reports 0 missing messages.
- `pnpm check:fix` cleaned formatting/catalog drift across app, docs, and
  generated message files.
- Rule Library route coverage now asserts the current overview contract:
  review-needed count, coverage, recent changes, and last-30-days language.
- E2E page objects/tests now follow the current app chrome:
  - import wizard opens through the command palette instead of a dashboard CTA;
  - client filtering uses the `Filter clients` search control instead of the
    removed client multi-select;
  - client detail assertions target the `Filing plan` tab panel;
  - settings security starts from the `Profile` page heading;
  - Pulse apply actions match the current `Apply to N client(s)` button copy;
  - coordinator create/import gating is asserted on the Clients split button.
- E2E route helpers now wait for their destination headings after navigation
  instead of assuming the shell is ready immediately. RBAC tests that
  intentionally navigate into permission gates bypass those heading waits and
  assert the gate instead.
- The member invite helper waits for the `/rpc/members/invite` response and the
  dialog close state. The full local E2E run showed this request can take just
  over five seconds, so the previous default assertion timeout was too tight.
- Obligation dashboard navigation waits now match the route transition behavior
  seen in the full suite.
- Slow browser-level flows now carry explicit waits at the assertion that
  actually races: Pulse deadline rows wait for list data after apply/revert, the
  PDF ZIP export waits longer for the download event, and 404 recovery waits on
  the URL transition triggered by the localized CTA.
- Playwright now runs functional E2E with one worker locally as well as in CI.
  The local Wrangler/D1 stack returned intermittent 503s under fully parallel
  browser pressure, so `pnpm test:e2e` now uses the same reliability profile as
  the CI job.

## 2026-06-16 follow-up

The current failure set was narrower than the earlier same-day pass:

- Filled the remaining zh-CN translations emitted by `i18n:extract` and
  regenerated Lingui catalogs.
- Fixed check-blocking TypeScript/lint issues in shared UI and obligations queue
  surfaces.
- Updated obligations E2E locators for the current collapsed `Filter by status`
  dropdown and `Deadline sections` navigation buttons. The URL still stores the
  same raw status set for the "In review" lifecycle scope.
- Updated the member invite helper to wait for the behavior-level dialog close
  state after clicking Send, rather than racing an explicit transport response
  watcher. The test still fails if the API errors and leaves the dialog open.

## Verify

- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm check`
- `pnpm test`
- `pnpm build`
- `E2E_WORKER_PORT=8788 E2E_MARKETING_BASE_URL=http://127.0.0.1:4322 pnpm exec playwright test --workers=1 --reporter=list`
- `E2E_WORKER_PORT=8877 E2E_MARKETING_BASE_URL=http://127.0.0.1:4322 pnpm exec playwright test e2e/tests/audit-log.spec.ts e2e/tests/authenticated-shell.spec.ts e2e/tests/members.spec.ts e2e/tests/obligations.spec.ts`

Notes: `pnpm check` still reports existing warnings only. `pnpm test` exits 0;
inside the sandbox it can print a non-fatal localhost EPERM probe. `pnpm build`
exits 0; Wrangler's dry-run prints a non-fatal EPERM when it cannot write its
debug log under `~/Library/Preferences/.wrangler/logs`.
