import type { Page } from '@playwright/test'
import { expect, test } from '../fixtures/test'

// Feature: Unified role permission gates
// PRD: DueDateHQ visible-but-restricted RBAC surfaces
// AC: E2E-RBAC-MANAGER, E2E-RBAC-PREPARER, E2E-RBAC-COORDINATOR

test.skip(
  Boolean(process.env.E2E_BASE_URL) && !process.env.E2E_SEED_TOKEN,
  'remote RBAC canary requires E2E_SEED_TOKEN',
)

test.describe('role permission surfaces', () => {
  test.describe('manager role', () => {
    test.use({ authRole: 'manager' })

    test('AC: E2E-RBAC-MANAGER blocks Members but allows read-only billing overview', async ({
      authenticatedPage,
      billingPage,
      membersPage,
    }) => {
      await membersPage.goto()

      await expect(
        authenticatedPage.getByRole('heading', { name: 'Owner permission required' }),
      ).toBeVisible({ timeout: 20_000 })
      await expect(authenticatedPage.getByText('Current role: Manager')).toBeVisible()

      await billingPage.gotoBilling()
      await expect(billingPage.billingHeading).toBeVisible()
      await expect(billingPage.manageBillingButton).toBeDisabled()

      await billingPage.gotoCheckout()
      await expect(billingPage.checkoutHeading).toBeVisible()
      await expect(billingPage.ownerPermissionAlert).toBeVisible()
      await expect(billingPage.continueToSecureCheckoutButton).toBeDisabled()
    })
  })

  test.describe('preparer role', () => {
    test.use({ authRole: 'preparer', authSeed: 'pulse' })

    test('AC: E2E-RBAC-PREPARER can read Audit and Pulse but cannot export or apply', async ({
      appShellPage,
      authenticatedPage,
      auditPage,
    }) => {
      await auditPage.goto()

      await expect(auditPage.heading).toBeVisible()
      await expect(authenticatedPage.getByRole('button', { name: 'Export' })).toBeDisabled()

      await appShellPage.goto()
      await openPulseAlert(authenticatedPage)
      const drawer = authenticatedPage.getByRole('complementary', { name: 'Alert detail' })

      await expect(drawer.getByText('Read-only view')).toBeVisible()
      await expect(drawer.getByRole('button', { name: 'Apply Deadline Exception' })).toBeDisabled()
    })
  })

  test.describe('coordinator role', () => {
    test.use({ authRole: 'coordinator', authSeed: 'obligations' })

    test('AC: E2E-RBAC-COORDINATOR hides dollars and blocks Audit/Migration actions', async ({
      appShellPage,
      authenticatedPage,
      auditPage,
    }) => {
      await appShellPage.goto()

      await expect(authenticatedPage.getByRole('heading', { name: /^Today/ })).toBeVisible()
      await expect(appShellPage.importClientsButton).toBeDisabled()

      await auditPage.goto()
      await expect(
        authenticatedPage.getByRole('heading', { name: 'Permission required' }),
      ).toBeVisible({ timeout: 20_000 })
      await expect(authenticatedPage.getByText('Current role: Coordinator')).toBeVisible()

      await appShellPage.goto('/clients')
      await expect(authenticatedPage.getByRole('button', { name: 'New client' })).toBeVisible()
      await expect(authenticatedPage.getByRole('button', { name: 'Import clients' })).toHaveCount(0)
    })
  })
})

function pulseListAlertButton(page: Page) {
  return page.getByRole('button', {
    name: /Alert: IRS CA storm relief extends selected filing deadlines/,
  })
}

async function openPulseAlert(page: Page) {
  const dashboardButton = page.getByRole('button', {
    name: /Open Alert details: IRS CA storm relief extends selected filing deadlines/,
  })
  if (await dashboardButton.isVisible().catch(() => false)) {
    await dashboardButton.click()
    return
  }

  await page.goto('/alerts')
  await expect(pulseListAlertButton(page)).toBeVisible()
  await pulseListAlertButton(page).click()
}
