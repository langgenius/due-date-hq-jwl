# Screenshot-regression CI — design polish as a conserved quantity

**Date:** 2026-06-11
**Surface:** `e2e/tests/visual-regression.spec.ts` (new), `playwright.config.ts`,
`.github/workflows/e2e.yml`, `e2e/README.md`

Visual drift on the key design surfaces now shows up as a CI pixel diff instead
of relying on someone noticing. Full-page `toHaveScreenshot()` snapshots of:

- `/today` (dashboard, obligations seed)
- `/deadlines` (list) and the deadline detail page — Status tab + Materials tab
- `/alerts` (list, pulse seed) and `/alerts?alert=<seeded-id>` (detail drawer)
- `/rules/library`

## How it's wired

- **Own Playwright project.** A `visual` project gated behind `E2E_VISUAL=1`
  (`testMatch` on the spec); the functional `chromium` project `testIgnore`s it.
  Default `pnpm test:e2e` and the existing CI `e2e` job are untouched — 68
  functional tests before and after.
- **Determinism stack:** config-level `expect.toHaveScreenshot` defaults
  (`animations: 'disabled'`, `caret: 'hide'`, `scale: 'css'`,
  `maxDiffPixelRatio: 0.01`); `contextOptions.reducedMotion: 'reduce'` so
  framer-motion JS springs settle (CSS animations are already auto-frozen);
  `page.clock.setFixedTime('2026-06-15T12:00Z')` pins every client-rendered
  relative date against the fixed 2026 seed dates; all `<time>` elements are
  masked because server-side `createdAt` rows are seed-run wall-clock (the
  canonical `<RelativeTime>` primitive renders `<time>`, so the mask is a small
  leaf region, not a skipped page).
- **Reused, not rebuilt:** the existing `/api/e2e/session` auth fixture
  (`authenticatedPage` + `authSeed: 'obligations' | 'pulse'`) and the existing
  wrangler-dev webServer wiring. The alert detail deep-link id comes from
  `authSession.seeded.pulseAlerts[0].alertId`.
- **`/deadlines/:ref` has no stable literal.** Seeded obligation ids are
  `crypto.randomUUID()` and the ref slug is the id's last 12 hex chars, so the
  spec reaches the detail page the way a user does (list row link → detail
  page → Materials tab) instead of deep-linking a hardcoded ref like
  `/deadlines/000000000003` (that id only exists in `mock/demo.sql`, which the
  e2e worker never loads).

## Linux-only baselines + bootstrap

`snapshotPathTemplate` puts baselines under `e2e/__screenshots__/{projectName}/…`
with no `{platform}` token — baselines are Linux-generated only (fonts/AA differ
per OS). The spec hard-skips on non-Linux (`E2E_VISUAL_FORCE=1` to override).
No baselines are committed yet; macOS can't produce valid ones. Bootstrap:

1. The new `visual` CI job (separate from `e2e`, so it can't slow the
   functional suite) is **non-blocking** (`continue-on-error: true`). First
   runs fail with "snapshot doesn't exist" and upload the actuals in the
   `visual-regression-report` artifact.
2. Commit the reviewed actuals as baselines (or regenerate via
   `E2E_VISUAL=1 pnpm exec playwright test --project=visual --update-snapshots`
   inside the Playwright Linux image), then delete `continue-on-error` —
   marked with `TODO(visual-baselines)` in the workflow.

## Notes

- Playwright 1.60: `reducedMotion` is not a top-level test option here — it
  must go through `use.contextOptions`. tsgo catches it; worth remembering.
- Verified: `--list` parses (6 tests), default suite unaffected, root tsgo
  error count unchanged (18 pre-existing lines, none in touched files).
