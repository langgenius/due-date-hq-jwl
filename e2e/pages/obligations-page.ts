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
    // 2026-06-11: the toolbar adopted the canonical <SearchInput> primitive,
    // which renders <input type="text"> (role=textbox), not a type=search box.
    this.searchInput = page.getByRole('textbox', { name: 'Search client, form, or assignee' })
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
  }

  // 2026-06-11 (queue toolbar): the status filter is a segmented control — one
  // pill button per present status ("All N", "In review N", …), each writing the
  // `status` URL param and carrying `data-active` when selected. The label is
  // followed by a facet count, so anchor on "<label> <digit>" to avoid matching
  // a row's status-badge dropdown ("In review · Change status for …"), which
  // also starts with the label.
  statusScopeButton(name: string) {
    return this.page.getByRole('button', { name: new RegExp(`^${escapeRegex(name)} \\d`) })
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

  // 2026-06-11 (queue toolbar): pick a status by clicking its segmented-control
  // pill directly (no dropdown). The clicked pill becomes `data-active`.
  async selectStatusScope(name: string) {
    await this.statusScopeButton(name).click()
  }

  // Opens View ▸ Columns so callers can toggle `columnVisibilityOption`s.
  // The Columns entry is a Base UI submenu trigger that opens on hover; its
  // popup re-renders enough while opening that Playwright's actionability
  // check never sees it stable ("element is not stable" → "detached").
  // Dispatch the hover pointer event directly instead of a real hover.
  async openColumnsMenu() {
    await this.viewMenuButton.click()
    const columnsTrigger = this.page.getByRole('menuitem', { name: /^Columns\b/ })
    await columnsTrigger.waitFor({ state: 'visible' })
    await columnsTrigger.dispatchEvent('pointermove')
    await columnsTrigger.dispatchEvent('mousemove')
    await this.page
      .getByRole('menuitemcheckbox')
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 })
  }

  // Toggle one column checkbox inside the open Columns submenu. Same
  // stability story as `openColumnsMenu` — dispatch the click directly.
  async toggleColumn(name: string) {
    const option = this.columnVisibilityOption(name)
    await option.waitFor({ state: 'visible' })
    await option.dispatchEvent('click')
  }

  // Close whatever menu/submenu is open with an outside click. Escape is
  // unreliable here: the submenu was opened with synthetic pointer events,
  // so real keyboard focus may have never entered it and the Base UI inert
  // backdrop would otherwise linger and swallow every later pointer
  // interaction. Raw-click at the H1's coordinates: when a menu is open the
  // topmost element there is the backdrop (a locator click would refuse to
  // click "through" it), and the pointer parks over inert header text —
  // not the viewport corner, where hover expands the sidebar over the
  // table's leading checkbox column.
  async dismissMenus() {
    const box = await this.heading.boundingBox()
    if (box) {
      await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    }
    await this.page
      .locator('[data-base-ui-inert]')
      .waitFor({ state: 'detached', timeout: 5_000 })
      .catch(() => undefined)
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
