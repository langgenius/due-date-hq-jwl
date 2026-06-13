import type { Page } from '@playwright/test'
import { seedBillingSubscription } from '../fixtures/billing'
import { expect, test } from '../fixtures/test'

// Feature: Billing success and portal
// PRD: Pricing + Stripe payment loop
// AC: E2E-BILLING-WEBHOOK-STATE, E2E-BILLING-PORTAL, E2E-BILLING-CANCEL-RECOVERY

test.skip(
  Boolean(process.env.E2E_BASE_URL),
  'local e2e auth seed is not available on external targets',
)

test('AC: E2E-BILLING-WEBHOOK-STATE shows activation only after subscription state exists', async ({
  request,
  authSession,
  billingPage,
}) => {
  await billingPage.gotoSuccess()

  await expect(billingPage.successHeading).toBeVisible()
  await expect(billingPage.stillWaitingHeading).toBeVisible()

  await seedBillingSubscription(request, { firmId: authSession.firmId })
  await billingPage.gotoSuccess()

  await expect(billingPage.subscriptionActiveHeading).toBeVisible()
  await expect(billingPage.page.getByRole('alert')).toContainText('E2E Practice is on Pro')
  await expect(billingPage.page.getByRole('main').getByText('Pro', { exact: true })).toBeVisible()
})

test('AC: E2E-BILLING-PORTAL reads webhook-backed state and opens portal by contract', async ({
  request,
  authSession,
  authenticatedPage,
  billingPage,
}) => {
  await seedBillingSubscription(request, { firmId: authSession.firmId })
  const portal = await interceptBillingPortal(authenticatedPage)

  await billingPage.gotoBilling()

  await expect(billingPage.billingHeading).toBeVisible()
  await expect(authenticatedPage.getByText('Pro', { exact: true }).first()).toBeVisible()
  await expect(authenticatedPage.getByRole('group', { name: 'Seat limit: 3' })).toBeVisible()
  await expect(billingPage.manageBillingButton).toBeEnabled()

  await billingPage.manageBillingButton.click()

  const payload = await portal.nextPayload()
  expect(payload).toMatchObject({
    referenceId: authSession.firmId,
    customerType: 'organization',
    disableRedirect: true,
  })
  const returnUrl = new URL(String(payload.returnUrl))
  expect(returnUrl.pathname).toBe('/billing')
})

test('AC: E2E-BILLING-CANCEL-RECOVERY keeps selected plan available after cancel', async ({
  billingPage,
}) => {
  await billingPage.gotoCancel()

  await expect(billingPage.cancelHeading).toBeVisible()
  await billingPage.restartCheckoutButton.click()
  await expect(billingPage.page).toHaveURL(/\/billing\/checkout\?plan=pro&interval=monthly$/)
})

async function interceptBillingPortal(
  page: Page,
): Promise<{ nextPayload(): Promise<Record<string, unknown>> }> {
  const payloads: Record<string, unknown>[] = []

  await page.route('**/api/auth/subscription/billing-portal', async (route) => {
    const payload: unknown = route.request().postDataJSON()
    assertJsonObject(payload)
    payloads.push(payload)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url: '/billing?portal=returned', redirect: false }),
    })
  })

  return {
    async nextPayload() {
      await expect.poll(() => payloads.length).toBeGreaterThan(0)
      return payloads.shift() ?? {}
    },
  }
}

function assertJsonObject(value: unknown): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Expected a JSON object.')
  }
}
