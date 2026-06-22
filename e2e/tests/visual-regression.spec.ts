import type { Locator, Page } from '@playwright/test'

import { expect, test } from '../fixtures/test'

// Feature: Visual regression (design polish stays a conserved quantity)
// PRD: n/a — CI infrastructure, not product behavior
// AC: E2E-VISUAL-SNAPSHOTS
//
// Full-page screenshot snapshots of the key design surfaces. Any visual
// drift (spacing, type, color, layout) shows up as a pixel diff in CI.
//
// ── Baselines are LINUX-generated ───────────────────────────────────────
// Screenshots are font/OS-sensitive, so baselines committed under
// e2e/__screenshots__/visual/ MUST come from the same Linux environment CI
// uses (ubuntu runner / mcr.microsoft.com/playwright Docker image). Do NOT
// generate baselines on macOS — the platform guard below stops you.
//
// Bootstrap (two steps, see e2e/README.md "Visual regression"):
//   1. With no baselines committed, the CI `visual` job (non-blocking,
//      continue-on-error) fails with "snapshot doesn't exist" and uploads
//      the freshly-written actuals in the `visual-regression-report`
//      artifact (test-results/).
//   2. Download the artifact, copy the actuals into
//      e2e/__screenshots__/visual/visual-regression.spec.ts/, review, and
//      commit. Alternatively regenerate inside the CI Linux image:
//        E2E_VISUAL=1 pnpm exec playwright test --project=visual --update-snapshots
//
// Run locally (Linux only, or E2E_VISUAL_FORCE=1 to peek on macOS):
//   E2E_VISUAL=1 pnpm exec playwright test --project=visual

test.skip(
  Boolean(process.env.E2E_BASE_URL),
  'local e2e auth seed is not available on external targets',
)
test.skip(
  process.platform !== 'linux' && !process.env.E2E_VISUAL_FORCE,
  'visual baselines are Linux-generated — run in CI or the Playwright Linux Docker image (E2E_VISUAL_FORCE=1 to override)',
)

// Freeze the page clock so client-rendered relative times ("2h ago",
// "in 3d", countdown chips) are deterministic. The seeded data uses fixed
// 2026 dates, so a fixed "now" pins every client-side date computation.
// Server-side `createdAt` rows are still wall-clock — those leak through
// <time> elements, which are masked below.
const FROZEN_NOW = new Date('2026-06-15T12:00:00.000Z')

async function gotoFrozen(page: Page, path: string): Promise<void> {
  await page.clock.setFixedTime(FROZEN_NOW)
  await page.goto(path)
  await settle(page)
}

async function settle(page: Page): Promise<void> {
  // networkidle is best-effort: background polling (React Query refetch)
  // can keep the wire warm forever. The per-shot anchor assertions plus
  // toHaveScreenshot's own stabilization (two consecutive matching shots)
  // do the real determinism work.
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
}

// Inherently-volatile regions. The canonical <RelativeTime> primitive
// renders a <time> element, and server-written timestamps (seed-run
// wall-clock) surface through it — mask all <time> leaves rather than
// skipping whole pages.
function volatileMasks(page: Page): Locator[] {
  return [page.locator('time')]
}

function shotOptions(page: Page) {
  return {
    fullPage: true,
    mask: volatileMasks(page),
  }
}

test.describe('today + deadlines surfaces', () => {
  test.use({ authSeed: 'obligations' })

  test('VISUAL: /today dashboard', async ({ authenticatedPage }) => {
    await gotoFrozen(authenticatedPage, '/today')
    const priorities = authenticatedPage.getByRole('region', { name: 'Priorities' })
    await expect(priorities).toBeVisible()
    await expect(priorities.getByText('Arbor & Vale LLC')).toBeVisible()

    await expect(authenticatedPage).toHaveScreenshot('today.png', shotOptions(authenticatedPage))
  })

  test('VISUAL: /deadlines list', async ({ authenticatedPage }) => {
    await gotoFrozen(authenticatedPage, '/deadlines')
    await expect(authenticatedPage.getByRole('heading', { name: 'Deadlines' })).toBeVisible()
    await expect(authenticatedPage.getByText('Arbor & Vale LLC').first()).toBeVisible()

    await expect(authenticatedPage).toHaveScreenshot(
      'deadlines-list.png',
      shotOptions(authenticatedPage),
    )
  })

  test('VISUAL: deadline detail page — Status and Materials tabs', async ({
    authenticatedPage,
  }) => {
    // Seeded obligation ids are random UUIDs (the /deadlines/:ref slug is
    // the last 12 hex chars of the id), so there is no stable literal ref
    // to deep-link. Navigate the same way a user does: list row → detail
    // page. Content is fully deterministic; only the URL slug varies.
    await gotoFrozen(authenticatedPage, '/deadlines')
    await authenticatedPage
      .getByRole('button', { name: /^Open deadline for Arbor & Vale LLC$/ })
      .click()
    await expect(authenticatedPage).toHaveURL(/\/deadlines\/[0-9a-f]{12}(?:$|\?)/)

    const deadlineDrawer = authenticatedPage.getByRole('complementary', {
      name: /Arbor & Vale LLC/,
    })
    const sectionNav = deadlineDrawer.getByRole('navigation', { name: 'Deadline sections' })
    await expect(sectionNav.getByRole('button', { name: 'Status' })).toBeVisible()
    await settle(authenticatedPage)
    await expect(authenticatedPage).toHaveScreenshot(
      'deadline-detail-status.png',
      shotOptions(authenticatedPage),
    )

    await sectionNav.getByRole('button', { name: /^Materials\b/ }).click()
    await expect
      .poll(
        async () =>
          deadlineDrawer
            .getByRole('checkbox', { name: /^Select document .* for batch action$/ })
            .count(),
        { timeout: 15_000 },
      )
      .toBeGreaterThan(0)
    await settle(authenticatedPage)
    await expect(authenticatedPage).toHaveScreenshot(
      'deadline-detail-materials.png',
      shotOptions(authenticatedPage),
    )
  })

  test('VISUAL: /rules/library', async ({ authenticatedPage }) => {
    await gotoFrozen(authenticatedPage, '/rules/library')
    // The stats band "Total rules" tile is the always-rendered anchor that
    // confirms the library console finished loading (see rules-console.spec).
    await expect(authenticatedPage.getByText('Total rules')).toBeVisible({ timeout: 20_000 })

    await expect(authenticatedPage).toHaveScreenshot(
      'rules-library.png',
      shotOptions(authenticatedPage),
    )
  })
})

test.describe('alerts surfaces', () => {
  test.use({ authSeed: 'pulse' })

  test('VISUAL: /alerts list', async ({ authenticatedPage }) => {
    await gotoFrozen(authenticatedPage, '/alerts')
    // 2026-06-22: the Review/Active toggle is gone — wait on the triage list's
    // "Needs action" zone band to confirm the list hydrated before the shot.
    await expect(authenticatedPage.getByText('Needs action').first()).toBeVisible()

    await expect(authenticatedPage).toHaveScreenshot(
      'alerts-list.png',
      shotOptions(authenticatedPage),
    )
  })

  test('VISUAL: /alerts?alert=<id> detail drawer open', async ({
    authenticatedPage,
    authSession,
  }) => {
    // The pulse seed returns its alert ids through the session fixture —
    // pulseAlerts[0] is the high-confidence "IRS CA storm relief" alert.
    const alertId = authSession.seeded.pulseAlerts[0]?.alertId
    if (!alertId) throw new Error('pulse seed returned no alerts')

    await gotoFrozen(authenticatedPage, `/alerts?alert=${alertId}`)
    const drawer = authenticatedPage.getByRole('complementary', { name: 'Alert detail' })
    await expect(drawer).toBeVisible()
    await expect(drawer.getByRole('heading', { name: /IRS CA storm relief/ })).toBeVisible()

    await expect(authenticatedPage).toHaveScreenshot(
      'alert-detail-drawer.png',
      shotOptions(authenticatedPage),
    )
  })
})
