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

    test('AC: E2E-RBAC-MANAGER blocks Members and owner-only billing surfaces', async ({
      authenticatedPage,
      billingPage,
      membersPage,
    }) => {
      await membersPage.goto()

      await expect(
        authenticatedPage.getByRole('heading', { name: 'Owner permission required' }),
      ).toBeVisible({ timeout: 20_000 })
      await expect(authenticatedPage.getByText('Current role: Manager')).toBeVisible()

      // billing.read returned to owner-only (2026-06-11): the overview and
      // checkout both render the permission gate for managers now.
      await billingPage.gotoBilling()
      await expect(
        authenticatedPage.getByRole('heading', { name: 'Owner permission required' }),
      ).toBeVisible()
      await expect(billingPage.billingHeading).toHaveCount(0)
      await expect(billingPage.manageBillingButton).toHaveCount(0)

      await billingPage.gotoCheckout()
      await expect(
        authenticatedPage.getByRole('heading', { name: 'Owner permission required' }),
      ).toBeVisible()
      await expect(billingPage.checkoutHeading).toHaveCount(0)
      await expect(billingPage.continueToSecureCheckoutButton).toHaveCount(0)
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
      // 2026-06-04 the Today-header "Import clients" button no longer uses
      // a native `disabled` attribute: it stays clickable and surfaces a
      // permission toast on click, exposing the gate via its accessible
      // name instead. So a coordinator (lacking `migration.run`) sees the
      // button enabled but renamed to "Import clients (requires … access)".
      // See apps/app/src/routes/dashboard.tsx:351-371.
      const importEntry = appShellPage.importClientsButton
      await expect(importEntry).toBeVisible()
      await expect(importEntry).toBeEnabled()
      await expect(importEntry).toHaveAccessibleName(/Import clients \(requires .* access\)/)

      await auditPage.goto()
      await expect(
        authenticatedPage.getByRole('heading', { name: 'Permission required' }),
      ).toBeVisible({ timeout: 20_000 })
      await expect(authenticatedPage.getByText('Current role: Coordinator')).toBeVisible()

      await appShellPage.goto('/clients')
      // /clients header is now a "New client" split button (primary create +
      // a chevron dropdown whose only alt action is "Import from CSV…").
      // A coordinator lacks `client.write`, so the primary button renders
      // visible-but-disabled with a permission-explaining accessible name.
      // See apps/app/src/features/clients/ClientsCreateSplitButton.tsx:71-82.
      const newClientButton = authenticatedPage.getByRole('button', { name: /^New client/ })
      await expect(newClientButton).toBeVisible()
      await expect(newClientButton).toBeDisabled()
      // The standalone "Import clients" header button was retired in the
      // /clients redesign (import is now the gated "Import from CSV…" item
      // inside the split-button dropdown), so no such button should exist.
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
  // The alerts list splits into "Review" and "Active" work queues (the
  // "Alert work queue" Segmented control) and defaults to one; the seeded alert
  // can sit under either. Try each toggle until the alert button shows.
  const alert = pulseListAlertButton(page)
  if (!(await alert.isVisible().catch(() => false))) {
    const queue = page.getByRole('group', { name: 'Alert work queue' })
    for (const label of [/^Active/, /^Review/]) {
      const toggle = queue.getByRole('button', { name: label })
      if ((await toggle.count()) === 0) continue
      await toggle.click()
      // Switching queue refetches asynchronously — wait for the alert to render
      // before falling through (a bare isVisible() check races the query).
      const shown = await alert.waitFor({ state: 'visible', timeout: 4000 }).then(
        () => true,
        () => false,
      )
      if (shown) break
    }
  }
  await expect(pulseListAlertButton(page)).toBeVisible()
  await pulseListAlertButton(page).click()
}
