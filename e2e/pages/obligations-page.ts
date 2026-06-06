import type { Locator, Page } from '@playwright/test'

export class ObligationQueuePage {
  readonly heading: Locator
  readonly searchInput: Locator
  readonly dueSortButton: Locator
  readonly statusFilterTrigger: Locator
  // Calendar sync is now an in-place popover button on the Deadlines page
  // (it used to be a link to /deadlines/calendar). The dedicated route
  // still exists and is reachable via ⌘K → "Calendar sync".
  readonly calendarSyncButton: Locator
  readonly columnsButton: Locator

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Deadlines' })
    // 2026-06-05 (page-feedback #5): the collapsible "Filter deadlines"
    // icon-button was removed — the toolbar now renders a single fixed
    // search field (`<input type="search" aria-label="Search deadlines">`)
    // in the filter row above the table. It's always visible, so there is
    // no expand button and no dedicated "Clear search" button anymore.
    this.searchInput = page.getByRole('searchbox', { name: 'Search deadlines' })
    this.dueSortButton = page.getByRole('button', { name: 'Sort Internal Due' })
    this.statusFilterTrigger = page.getByRole('button', { name: /^Status(?:\s+\d+)?$/ })
    this.calendarSyncButton = page.getByRole('button', { name: 'Calendar sync' })
    this.columnsButton = page.getByRole('button', { name: 'Columns' })
  }

  async goto(path = '/deadlines') {
    await this.page.goto(path)
  }

  async search(query: string) {
    // Fixed search field — always visible; fill() auto-waits for it.
    await this.searchInput.fill(query)
  }

  async clearSearch() {
    // No dedicated clear button on this field — emptying it drops the
    // `?q=` param (obligations.tsx onChange sets `q: value || null`).
    await this.searchInput.fill('')
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

  columnVisibilityOption(name: string) {
    return this.page.getByRole('menuitemcheckbox', { name })
  }

  rowFor(clientName: string) {
    const escapedName = escapeRegex(clientName)
    return this.page
      .getByRole('row', { name: new RegExp(escapedName) })
      .or(this.page.getByRole('button', { name: new RegExp(`^Select ${escapedName}\\b`) }))
      .or(this.page.getByRole('button', { name: new RegExp(`Deadline detail: ${escapedName}`) }))
      .or(this.page.getByRole('button', { name: new RegExp(`Open deadlines: ${escapedName}`) }))
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
