import type { Locator, Page } from '@playwright/test'

export class OpportunitiesPage {
  readonly heading: Locator
  readonly queue: Locator
  readonly advisorySummary: Locator
  readonly retentionSummary: Locator

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Opportunities' })
    this.queue = page.locator('section').filter({
      has: page.getByText('Business guidance queue', { exact: true }),
    })
    this.advisorySummary = page
      .getByText('Advisory conversations', { exact: true })
      .locator('xpath=../..')
    this.retentionSummary = page
      .getByText('Retention check-ins', { exact: true })
      .locator('xpath=../..')
  }

  async goto() {
    await this.page.goto('/opportunities')
  }

  rowFor(clientName: string) {
    return this.queue.getByRole('article').filter({ hasText: clientName })
  }
}
