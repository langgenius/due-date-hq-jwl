import type { Locator, Page } from '@playwright/test'

export class ObligationQueuePage {
  readonly heading: Locator
  readonly searchInput: Locator
  readonly resetButton: Locator
  readonly dueSortButton: Locator
  readonly statusFilterTrigger: Locator
  readonly savedViewsButton: Locator
  // Calendar sync is now an in-place popover button on the Deadlines page
  // (it used to be a link to /deadlines/calendar). The dedicated route
  // still exists and is reachable via ⌘K → "Calendar sync".
  readonly calendarSyncButton: Locator
  readonly columnsButton: Locator

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Deadlines' })
    this.searchInput = page.getByLabel('Search obligations')
    this.resetButton = page.getByRole('button', { name: 'Reset' })
    this.dueSortButton = page.getByRole('button', { name: 'Sort Due' })
    this.statusFilterTrigger = page.getByRole('button', { name: /^Status(?:\s+\d+)?$/ })
    this.savedViewsButton = page.getByRole('button', { name: 'Saved views' })
    this.calendarSyncButton = page.getByRole('button', { name: 'Calendar sync' })
    this.columnsButton = page.getByRole('button', { name: 'Columns' })
  }

  async goto(path = '/deadlines') {
    await this.page.goto(path)
  }

  async openStatusFilter() {
    await this.statusFilterTrigger.click()
  }

  statusFilterOption(name: string) {
    return this.page.getByRole('menuitemcheckbox', {
      name: new RegExp(`^${escapeRegex(name)}(?:\\s+\\d+)?$`),
    })
  }

  async selectStatusFilter(name: string) {
    await this.openStatusFilter()
    await this.statusFilterOption(name).click()
    await this.page.keyboard.press('Escape')
  }

  statusSelectFor(clientName: string) {
    return this.page.getByLabel(`Change status for ${clientName}`)
  }

  statusChangeOption(name: string) {
    return this.page.getByRole('menuitemradio', { name })
  }

  selectRow(clientName: string) {
    return this.page.getByLabel(`Select ${clientName}`)
  }

  savedViewMenuItem(name: string) {
    return this.page.getByRole('menuitem', { name })
  }

  columnVisibilityOption(name: string) {
    return this.page.getByRole('menuitemcheckbox', { name })
  }

  rowFor(clientName: string) {
    const escapedName = escapeRegex(clientName)
    return this.page
      .getByRole('row', { name: new RegExp(escapedName) })
      .or(this.page.getByRole('button', { name: new RegExp(`^Select ${escapedName}\\b`) }))
      .or(this.page.getByRole('button', { name: new RegExp(`Obligation detail: ${escapedName}`) }))
      .or(this.page.getByRole('button', { name: new RegExp(`Open obligations: ${escapedName}`) }))
  }

  async openDetailFor(clientName: string) {
    const row = this.rowFor(clientName)
    await row.waitFor({ state: 'visible', timeout: 15_000 })
    await row.click({ position: { x: 120, y: 16 }, force: true })
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
