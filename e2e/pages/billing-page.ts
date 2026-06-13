import type { Locator, Page } from '@playwright/test'

export class BillingPage {
  readonly checkoutHeading: Locator
  readonly billingHeading: Locator
  readonly successHeading: Locator
  readonly cancelHeading: Locator
  readonly continueToSecureCheckoutButton: Locator
  readonly manageBillingButton: Locator
  readonly ownerPermissionAlert: Locator
  readonly subscriptionActiveHeading: Locator
  readonly stillWaitingHeading: Locator
  readonly restartCheckoutButton: Locator
  readonly proPlanLink: Locator

  constructor(readonly page: Page) {
    // 2026-05-27 (F8-01): heading promoted from static "Confirm checkout"
    // to dynamic "Confirm {Plan} {monthly|yearly} checkout". Regex covers
    // both the old and the new forms so the locator works across builds.
    this.checkoutHeading = page.getByRole('heading', {
      name: /^Confirm (?:[A-Z][a-z]+ (?:monthly|yearly) )?checkout$/,
      level: 1,
    })
    this.billingHeading = page.getByRole('heading', { name: 'Billing', level: 1 })
    this.successHeading = page.getByRole('heading', { name: 'Payment confirmation', level: 1 })
    this.cancelHeading = page.getByRole('heading', { name: 'Checkout canceled', level: 1 })
    this.continueToSecureCheckoutButton = page.getByRole('button', {
      name: 'Continue to secure checkout',
    })
    this.manageBillingButton = page.getByRole('button', { name: 'Manage billing' })
    this.ownerPermissionAlert = page
      .getByRole('alert')
      .filter({
        hasText:
          /Owner permission required|Only the practice owner can start or change a subscription/,
      })
      .or(page.getByRole('heading', { name: 'Permission required' }))
    this.subscriptionActiveHeading = page.getByRole('heading', { name: 'Subscription active' })
    this.stillWaitingHeading = page.getByRole('alert').filter({
      hasText: 'Still waiting on confirmation',
    })
    this.restartCheckoutButton = page.getByRole('button', { name: 'Restart checkout' })
    this.proPlanLink = page.getByRole('link', { name: /Upgrade to Pro/ })
  }

  async gotoCheckout(path = '/billing/checkout?plan=pro&interval=monthly') {
    await this.page.goto(path)
  }

  async gotoBilling() {
    await this.page.goto('/billing')
  }

  async gotoSuccess(path = '/billing/success?plan=pro&interval=monthly') {
    await this.page.goto(path)
  }

  async gotoCancel(path = '/billing/cancel?plan=pro&interval=monthly') {
    await this.page.goto(path)
  }
}
