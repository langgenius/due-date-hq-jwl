import type { Locator, Page } from '@playwright/test'

export class WorkloadPage {
  readonly upgradeHeading: Locator
  readonly ownerWorkloadHeading: Locator
  readonly upgradePlanButton: Locator
  readonly openObligationQueueButton: Locator

  constructor(readonly page: Page) {
    this.upgradeHeading = page.getByText('Team workload is available on Pro and above', {
      exact: true,
    })
    this.ownerWorkloadHeading = page.getByText('Owner workload', { exact: true })
    this.upgradePlanButton = page.getByRole('button', { name: 'Upgrade plan' })
    this.openObligationQueueButton = page.getByRole('button', { name: 'Open deadlines' })
  }

  async goto(path = '/workload') {
    await this.page.goto(path)
  }

  rowFor(ownerLabel: string) {
    return this.page.getByRole('row').filter({ hasText: ownerLabel }).first()
  }
}
