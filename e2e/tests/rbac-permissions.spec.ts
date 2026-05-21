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
      ).toBeVisible()
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
      await authenticatedPage
        .getByRole('button', {
          name: /Review Pulse alert: IRS CA storm relief extends selected filing deadlines/,
        })
        .click()
      const drawer = authenticatedPage.getByRole('dialog')

      await expect(drawer.getByText('Read-only view')).toBeVisible()
      await expect(drawer.getByRole('button', { name: /Apply to 1 obligation/ })).toBeDisabled()
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
      ).toBeVisible()
      await expect(authenticatedPage.getByText('Current role: Coordinator')).toBeVisible()

      await appShellPage.goto('/clients')
      await expect(authenticatedPage.getByRole('button', { name: 'Import clients' })).toBeDisabled()
    })
  })
})
