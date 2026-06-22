import type { APIRequestContext, Cookie, Page } from '@playwright/test'
import { expect, test } from '../fixtures/test'
import { seedBillingSubscription } from '../fixtures/billing'

// Feature: Pulse regulatory alert loop
// PRD: Phase 0 Pulse MVP
// AC: E2E-PULSE-APPLY-UNDO, E2E-PULSE-RBAC

test.skip(
  Boolean(process.env.E2E_BASE_URL) && !process.env.E2E_SEED_TOKEN,
  'remote Pulse canary requires E2E_SEED_TOKEN',
)

test.describe('seeded Pulse alerts', () => {
  test.describe.configure({ mode: 'serial' })
  test.use({ authSeed: 'pulse' })

  test('AC: E2E-PULSE-APPLY-UNDO applies, audits, links evidence, and reverts', async ({
    appShellPage,
    auditPage,
    authenticatedPage,
    obligationQueuePage,
  }) => {
    await appShellPage.goto()

    await openDashboardPulseAlert(authenticatedPage)

    const drawer = pulseDetailDrawer(authenticatedPage)
    await expect(drawer.getByRole('heading', { name: /Affected clients/ })).toBeVisible()
    await expect(drawer.getByText('Arbor & Vale LLC')).toBeVisible()
    await expect(drawer.getByText('Bright Studio S-Corp')).toBeVisible()

    await drawer.getByRole('button', { name: /^Apply to \d+ clients?$/ }).click()
    const verificationDialog = authenticatedPage.getByRole('dialog', {
      name: 'Verify the new deadline before applying',
    })
    await expect(verificationDialog).toBeVisible()
    await verificationDialog
      .getByRole('checkbox', {
        name: 'I have read the official source and verified the new deadline date.',
      })
      .check()
    await verificationDialog.getByRole('button', { name: 'Apply deadline shift' }).click()
    await expect(authenticatedPage.getByText(/Applied to 1 clients?/)).toBeVisible()

    await obligationQueuePage.goto('/deadlines?asOf=2026-05-26')
    const arborRow = obligationQueuePage.rowFor('Arbor & Vale LLC')
    await expect(arborRow).toBeVisible({ timeout: 20_000 })
    await expect(arborRow).toContainText('in 128d', { timeout: 20_000 })
    await obligationQueuePage.openColumnsMenu()
    const evidenceColumnOption = obligationQueuePage.columnVisibilityOption('Evidence')
    if ((await evidenceColumnOption.getAttribute('aria-checked')) !== 'true') {
      await obligationQueuePage.toggleColumn('Evidence')
    }
    await obligationQueuePage.dismissMenus()
    const arborEvidenceButton = obligationQueuePage.rowFor('Arbor & Vale LLC').getByRole('button', {
      name: 'Open 1 evidence sources for Arbor & Vale LLC',
    })
    await expect(arborEvidenceButton).toBeVisible()
    await arborEvidenceButton.click()
    const evidenceDrawer = authenticatedPage.getByRole('dialog', {
      name: 'Evidence for this deadline',
    })
    await expect(evidenceDrawer).toContainText('Rule update')
    // Copy polish (commit b8da3ba) rephrased the evidence description.
    await expect(evidenceDrawer).toContainText('Applied a rule change.')
    await expect(evidenceDrawer).toContainText('Individuals and businesses in Los Angeles County')
    await evidenceDrawer.getByRole('button', { name: 'Close' }).click()
    await expect(obligationQueuePage.rowFor('Bright Studio S-Corp')).toContainText('72d late', {
      timeout: 20_000,
    })

    await appShellPage.goto('/audit?action=pulse.apply&range=all')
    // The apply writes a `pulse.apply` audit event (verified by the row's
    // presence). Its rendered label copy is owned by the audit redesign and
    // asserted in unit coverage; the E2E just confirms the event was recorded.
    await expect(auditPage.eventRowFor('pulse.apply')).toBeVisible()

    await appShellPage.goto('/?asOfDate=2026-05-03')
    await expect(authenticatedPage.getByRole('region', { name: 'Priorities' })).toBeVisible()

    // The Alerts page is `/alerts` now (previously `/rules/pulse`, `/rules?tab=pulse`).
    await appShellPage.goto('/alerts')
    await revealSeededAlert(authenticatedPage)
    const appliedAlert = authenticatedPage.getByRole('button', {
      name: /Alert: IRS CA storm relief/,
    })
    await appliedAlert.click()
    const appliedDrawer = pulseDetailDrawer(authenticatedPage)
    await expect(
      appliedDrawer.getByRole('heading', {
        name: 'IRS CA storm relief extends selected filing deadlines for Los Angeles County.',
      }),
    ).toBeVisible()
    await appliedDrawer.getByRole('button', { name: 'Undo (24h)' }).click()
    await expect(authenticatedPage.getByText(/Reverted 1 clients?/)).toBeVisible()

    await obligationQueuePage.goto('/deadlines?asOf=2026-05-26')
    await expect(obligationQueuePage.rowFor('Arbor & Vale LLC')).toContainText('72d late', {
      timeout: 20_000,
    })
  })

  test('AC: legacy /rules/pulse redirects to /alerts, preserving ?alert deep links', async ({
    appShellPage,
    authenticatedPage,
  }) => {
    await appShellPage.goto('/rules/pulse')
    await expect(authenticatedPage).toHaveURL(/\/alerts(?:$|\?|#)/)

    await appShellPage.goto('/rules/pulse/history')
    await expect(authenticatedPage).toHaveURL(/\/alerts\/history(?:$|\?|#)/)
  })

  test('AC: E2E-PULSE-PRIORITY-QUEUE keeps the MVP priority queue UI hidden', async ({
    appShellPage,
    authSession,
    authenticatedPage,
    request,
  }) => {
    await seedBillingSubscription(request, { firmId: authSession.firmId, plan: 'team' })
    await appShellPage.goto('/alerts')
    await revealSeededAlert(authenticatedPage)

    await expect(authenticatedPage.getByRole('button', { name: 'Priority Queue' })).toHaveCount(0)
    await expect(authenticatedPage.getByRole('button', { name: 'All Pulse' })).toHaveCount(0)
    await expect(
      authenticatedPage.getByText(
        'IRS CA storm relief extends selected filing deadlines for Los Angeles County.',
      ),
    ).toBeVisible()
    // The alert card is itself `role="button"` (aria-label `Alert: {title}`,
    // AlertCard.tsx:171-175) and its onClick opens the detail drawer — the same
    // handler the inner "Review →" link fires. We click the card directly via
    // the existing helper instead of the inner link, which (a) renders as
    // `Review →` not `Review` (AlertCard.tsx:484, so the old exact-name match
    // never resolved) and (b) is hover/focus-gated `opacity-0 pointer-events-none`
    // until the card is active (AlertCard.tsx:477-482), so it isn't clickable cold.
    await pulseListAlertButton(authenticatedPage).first().click()
    const drawer = pulseDetailDrawer(authenticatedPage)
    await expect(drawer.getByText('Manager review')).toHaveCount(0)
    await expect(drawer.getByRole('button', { name: 'Apply reviewed set' })).toHaveCount(0)
  })

  test.describe('coordinator role', () => {
    test.use({ authRole: 'coordinator' })

    test('AC: E2E-PULSE-RBAC keeps Pulse mutations read-only', async ({
      appShellPage,
      authenticatedPage,
    }) => {
      await appShellPage.goto()

      await openDashboardPulseAlert(authenticatedPage)
      const drawer = pulseDetailDrawer(authenticatedPage)

      await expect(drawer.getByText('Read-only view')).toBeVisible()
      const readOnlyAlert = drawer.getByRole('alert').filter({ hasText: 'Read-only view' })
      await expect(readOnlyAlert).toContainText('Current role: Coordinator')
      await expect(readOnlyAlert).toContainText('Required: Owner, Partner, Manager')
      await expect(drawer.getByRole('button', { name: /^Apply to \d+ clients?$/ })).toBeDisabled()
    })
  })

  test.describe('preparer role', () => {
    test.use({ authRole: 'preparer' })

    test('AC: E2E-PULSE-REQUEST-REVIEW notifies Partner/Manager without applying', async ({
      appShellPage,
      authSession,
      authenticatedPage,
      request,
    }) => {
      await appShellPage.goto()

      await openDashboardPulseAlert(authenticatedPage)
      const drawer = pulseDetailDrawer(authenticatedPage)

      await expect(drawer.getByText('Read-only view')).toBeVisible()
      await expect(drawer.getByRole('button', { name: /^Apply to \d+ clients?$/ })).toBeDisabled()
      const requestReviewButton = drawer.getByRole('button', { name: 'Request review' }).first()
      await expect(requestReviewButton).toBeVisible()

      await requestReviewButton.click()
      const requestDialog = authenticatedPage.getByRole('dialog', { name: 'Request alert review' })
      await requestDialog
        .getByLabel('Optional note')
        .fill('Please confirm LA County applicability.')
      await requestDialog.getByRole('button', { name: 'Send request' }).click()
      await expect(authenticatedPage.getByText('Review requested')).toBeVisible()

      await switchToE2ERole({
        request,
        page: authenticatedPage,
        firmId: authSession.firmId,
        role: 'owner',
      })
      await authenticatedPage.goto('/notifications')
      const notification = authenticatedPage
        .getByRole('article')
        .filter({ hasText: 'Review requested: IRS CA storm relief' })
      await expect(notification).toContainText('E2E Preparer requested Partner/Manager review')
      await expect(notification).toContainText('Please confirm LA County applicability.')

      await notification.getByRole('button', { name: 'Open' }).click()
      await expect(authenticatedPage).toHaveURL(/\/alerts\?alert=/)
      await expect(
        pulseDetailDrawer(authenticatedPage).getByRole('heading', { name: /IRS CA storm relief/ }),
      ).toBeVisible()
    })
  })
})

async function switchToE2ERole(input: {
  request: APIRequestContext
  page: Page
  firmId: string
  role: 'owner' | 'manager'
}) {
  const response = await input.request.post('/api/e2e/switch-role', {
    data: { firmId: input.firmId, role: input.role },
    headers: e2eSeedHeaders(),
  })
  expect(response.ok()).toBe(true)
  const body: unknown = await response.json()
  if (!isSwitchRoleResponse(body)) {
    throw new Error('Invalid e2e switch-role response.')
  }
  await input.page.context().addCookies([body.cookie])
}

function e2eSeedHeaders(): Record<string, string> {
  return process.env.E2E_SEED_TOKEN ? { Authorization: `Bearer ${process.env.E2E_SEED_TOKEN}` } : {}
}

function dashboardPulseAlertButton(page: Page) {
  return page.getByRole('button', {
    name: /Open Alert details: IRS CA storm relief extends selected filing deadlines/,
  })
}

function pulseListAlertButton(page: Page) {
  return page.getByRole('button', {
    name: /Alert: IRS CA storm relief extends selected filing deadlines/,
  })
}

// 2026-06-22: the Review/Active work-queue toggle was replaced by the unified
// triage list — a "Needs action" priority queue + a "For your awareness" digest,
// no mode toggle. The seeded "IRS CA storm relief" deadline-shift alert
// (alertNeedsAction) renders in the always-visible "Needs action" zone, so it's
// reachable without switching tabs; just wait for it to hydrate.
async function revealSeededAlert(page: Page) {
  await expect(pulseListAlertButton(page)).toBeVisible()
}

async function openDashboardPulseAlert(page: Page) {
  const dashboardButton = dashboardPulseAlertButton(page)
  if (await dashboardButton.isVisible().catch(() => false)) {
    await dashboardButton.click()
    return
  }

  await page.goto('/alerts')
  await revealSeededAlert(page)
  await expect(pulseListAlertButton(page)).toBeVisible()
  await pulseListAlertButton(page).click()
}

function pulseDetailDrawer(page: Page) {
  return page.getByRole('complementary', { name: 'Alert detail' })
}

function isSwitchRoleResponse(value: unknown): value is { cookie: Cookie } {
  if (!value || typeof value !== 'object') return false
  const cookie = (value as { cookie?: unknown }).cookie
  return Boolean(cookie && typeof cookie === 'object')
}
