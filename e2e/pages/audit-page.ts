import type { Locator, Page } from '@playwright/test'

export class AuditPage {
  readonly heading: Locator
  readonly moreFiltersButton: Locator
  readonly actionFilterSelect: Locator
  readonly entityTypeInput: Locator
  readonly resetButton: Locator
  readonly detailDrawer: Locator

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Audit log', level: 1 })
    this.moreFiltersButton = page.getByRole('button', { name: 'More filters' })
    this.actionFilterSelect = page.getByRole('combobox', { name: 'Action', exact: true })
    this.entityTypeInput = page.getByLabel('Entity type')
    this.resetButton = page.getByRole('button', { name: 'Clear filters' })
    this.detailDrawer = page.getByRole('dialog', { name: 'Audit detail' })
  }

  async goto(path = '/audit') {
    await this.page.goto(path)
    await this.heading.waitFor({ state: 'visible', timeout: 15_000 })
  }

  async selectAction(action: string) {
    await this.moreFiltersButton.click()
    await this.actionFilterSelect.click()
    await this.page.locator(`[data-audit-filter-value="${cssAttributeValue(action)}"]`).click()
  }

  eventRowFor(action: string) {
    return this.page.locator(`[data-audit-action="${cssAttributeValue(action)}"]`).first()
  }
}

function cssAttributeValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}
