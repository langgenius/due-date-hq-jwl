import type { Locator, Page } from '@playwright/test'

export class ObligationQueuePage {
  readonly heading: Locator
  readonly searchInput: Locator
  readonly dueSortButton: Locator
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
    // The sortable header renders a button with aria-label `Sort ${columnLabel}`
    // (ObligationQueueSortableHeader in queue/components/toolbar.tsx). The
    // internal-due column's label is t`Internal due date`
    // (use-obligation-queue-columns.tsx), so the accessible name is the full
    // "Sort Internal due date" — not the shorter "Internal Due" an earlier
    // spec assumed.
    this.dueSortButton = page.getByRole('button', { name: 'Sort Internal due date' })
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

  // 2026-06-08 (ad0f900d — filter consolidation): the per-column STATUS header
  // dropdown was removed (it conflicted with the top tabs). Status is now a
  // top-level scope-tab bar — each tab is a <button> (aria-pressed) whose
  // accessible name is the status label followed by its facet count (label and
  // count are adjacent <span>s, e.g. "In review 1"). Clicking one writes
  // ?status=<key> via setObligationQueueQuery; there is no popover to escape.
  statusScopeTab(name: string) {
    return this.page.getByRole('button', {
      name: new RegExp(`^${escapeRegex(name)}\\s*\\d*$`),
    })
  }

  async selectStatusScope(name: string) {
    await this.statusScopeTab(name).click()
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
