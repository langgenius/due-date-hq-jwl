import type { Locator, Page } from '@playwright/test'

export class ObligationQueuePage {
  readonly heading: Locator
  readonly searchInput: Locator
  readonly dueSortButton: Locator
  // Calendar sync is now an in-place popover button on the Deadlines page
  // (it used to be a link to /deadlines/calendar). The dedicated route
  // still exists and is reachable via ⌘K → "Calendar sync".
  readonly calendarSyncButton: Locator
  readonly viewMenuButton: Locator
  readonly statusFilterButton: Locator

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Deadlines' })
    // 2026-06-05 (page-feedback #5): the collapsible "Filter deadlines"
    // icon-button was removed — the toolbar now renders a single fixed
    // search field in the filter row above the table. It's always
    // visible, so there is no expand button and no dedicated "Clear
    // search" button anymore.
    // 2026-06-10 (queue toolbar redesign): the field's accessible name
    // now spells out the searchable axes ("Search client, form, or
    // assignee"); the navigator rail keeps its own "Search deadlines".
    this.searchInput = page.getByRole('searchbox', { name: 'Search client, form, or assignee' })
    // The sortable header renders a button with aria-label `Sort ${columnLabel}`
    // (ObligationQueueSortableHeader). The active /deadlines queue (obligations
    // .tsx) labels the internal-due column t`Internal due` — verified against
    // the live a11y snapshot (`button "Sort Internal due"`). exact:true so it
    // can't loosely substring-match a longer "…due date" label from the other
    // (lifecycle-v2) column code path.
    this.dueSortButton = page.getByRole('button', { name: 'Sort Internal due', exact: true })
    this.calendarSyncButton = page.getByRole('button', { name: 'Calendar sync' })
    // 2026-06-10 (queue toolbar redesign): the standalone "Columns" button
    // folded into a single "View" dropdown (aria-label "View, columns, and
    // actions") whose Columns SUBMENU carries the visibility checklist.
    this.viewMenuButton = page.getByRole('button', { name: 'View, columns, and actions' })
    // Status filter — single dropdown pill replacing the scope-tab bar. The
    // trigger's visible text is the active scope label + facet count
    // ("All Status 4" → "In review 1" once filtered).
    this.statusFilterButton = page.getByRole('button', {
      name: /^(?:All Status|Not started|Waiting on client|Blocked|In review|Filed|Completed)\s*\d*$/,
    })
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

  // 2026-06-10 (queue toolbar redesign): the scope-tab bar consolidated into
  // the "All Status" dropdown — pick a status via its menuitemradio. The
  // trigger re-labels to the active scope (see `statusFilterButton`).
  async selectStatusScope(name: string) {
    await this.statusFilterButton.click()
    await this.page
      .getByRole('menuitemradio', { name: new RegExp(`^${escapeRegex(name)}\\b`) })
      .click()
  }

  // Opens View ▸ Columns so callers can toggle `columnVisibilityOption`s.
  async openColumnsMenu() {
    await this.viewMenuButton.click()
    await this.page.getByRole('menuitem', { name: /^Columns\b/ }).click()
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
