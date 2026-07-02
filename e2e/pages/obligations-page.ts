import { expect, type Locator, type Page } from '@playwright/test'

export class ObligationQueuePage {
  readonly heading: Locator
  readonly searchInput: Locator
  readonly dueSortButton: Locator
  readonly statusFilterButton: Locator
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
    // 2026-06-18 (queue toolbar wording): the field is now the page-level
    // filter control, and the SearchInput primitive uses the visible
    // placeholder as its accessible name.
    // 2026-06-11: the toolbar adopted the canonical <SearchInput> primitive,
    // which renders <input type="text"> (role=textbox), not a type=search box.
    this.searchInput = page.getByRole('textbox', { name: 'Filter by client, form, or assignee' })
    // The sortable header renders a button with aria-label `Sort ${columnLabel}`
    // (ObligationQueueSortableHeader). The active /deadlines queue (obligations
    // .tsx) labels the internal-due column t`Internal due` — verified against
    // the live a11y snapshot (`button "Sort Internal due"`). exact:true so it
    // can't loosely substring-match a longer "…due date" label from the other
    // (lifecycle-v2) column code path.
    this.dueSortButton = page.getByRole('button', { name: 'Sort Internal due', exact: true })
    this.statusFilterButton = page.getByRole('button', { name: 'Filter by status' })
    this.calendarSyncButton = page.getByRole('button', { name: 'Calendar sync' })
    // 2026-06-22 (queue toolbar wording): the View dropdown now exposes the
    // live column count in its accessible name ("View options — 7 of 11
    // columns shown"). Match the stable prefix so the helper follows the
    // current UI without coupling to the count.
    this.viewMenuButton = page.getByRole('button', { name: /^View options\b/ })
  }

  // 2026-06-16 (queue toolbar): the status scope is now a collapsed dropdown
  // trigger ("Status | All"). The menu still carries the same facet labels and
  // writes the same `status` URL param as the old segmented-control pills.
  statusScopeButton(name: string) {
    return this.page.getByRole('menuitemradio', {
      name: new RegExp(`^${escapeRegex(name)}\\b`),
    })
  }

  async goto(path = '/deadlines') {
    await this.page.goto(path)
    await this.heading.waitFor({ state: 'visible', timeout: 15_000 })
    await this.waitForTable()
  }

  async waitForTable() {
    // 2026-06-24: /deadlines is table-only. The old Table/Card segmented
    // view toggle was removed, so the stable readiness signal is the sortable
    // table header itself.
    await this.dueSortButton.waitFor({ state: 'visible', timeout: 15_000 })
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

  // 2026-06-16 (queue toolbar): pick a status from the collapsed status filter.
  async selectStatusScope(name: string) {
    await this.statusFilterButton.click()
    await this.statusScopeButton(name).click()
  }

  columnsSubmenuTrigger() {
    return this.page.getByRole('menuitem', { name: /^Columns\b/ })
  }

  // Opens View so callers can work with the Columns submenu trigger.
  // Base UI submenus can briefly open and then close on slower CI runners, so
  // column helpers own keeping the target option visible through the action.
  async openColumnsMenu() {
    await this.viewMenuButton.click()
    const columnsTrigger = this.columnsSubmenuTrigger()
    await columnsTrigger.waitFor({ state: 'visible' })
  }

  async revealColumnOption(option: Locator) {
    if (await option.isVisible().catch(() => false)) {
      return
    }

    const columnsTrigger = this.columnsSubmenuTrigger()
    await columnsTrigger.hover().catch(() => undefined)
    if (await option.isVisible().catch(() => false)) {
      return
    }

    await columnsTrigger.press('ArrowRight').catch(() => undefined)
    if (await option.isVisible().catch(() => false)) {
      return
    }

    await columnsTrigger.press('Enter').catch(() => undefined)
    if (await option.isVisible().catch(() => false)) {
      return
    }

    await columnsTrigger.click().catch(() => undefined)
    if (await option.isVisible().catch(() => false)) {
      return
    }

    await this.page.keyboard.press('ArrowRight').catch(() => undefined)
  }

  async columnOptionChecked(option: Locator) {
    await option.waitFor({ state: 'visible', timeout: 1_000 })
    const checked = await option.getAttribute('aria-checked', { timeout: 1_000 })
    if (checked !== 'true' && checked !== 'false') {
      throw new Error(`Expected column option to expose aria-checked, received ${checked}`)
    }
    return checked === 'true'
  }

  // Toggle one column checkbox inside View -> Columns. Keep submenu reveal and
  // click in one retry block so CI cannot pass on a transiently visible submenu.
  async toggleColumn(name: string) {
    const option = this.columnVisibilityOption(name)
    await expect(async () => {
      if (
        !(await this.columnsSubmenuTrigger()
          .isVisible()
          .catch(() => false))
      ) {
        await this.openColumnsMenu()
      }
      await this.revealColumnOption(option)
      const checked = await this.columnOptionChecked(option)
      await option.dispatchEvent('click')
      await expect.poll(() => this.columnOptionChecked(option), { timeout: 1_000 }).toBe(!checked)
    }).toPass({ timeout: 10_000 })
  }

  async setColumnVisible(name: string, visible: boolean) {
    const option = this.columnVisibilityOption(name)
    await expect(async () => {
      if (
        !(await this.columnsSubmenuTrigger()
          .isVisible()
          .catch(() => false))
      ) {
        await this.openColumnsMenu()
      }
      await this.revealColumnOption(option)
      const checked = await this.columnOptionChecked(option)
      if (checked === visible) {
        return
      }
      await option.dispatchEvent('click')
      await expect.poll(() => this.columnOptionChecked(option), { timeout: 1_000 }).toBe(visible)
    }).toPass({ timeout: 10_000 })
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
      .getByRole('button', { name: new RegExp(`^Open deadline for ${escapedName}\\b`) })
      .or(this.page.getByRole('row', { name: new RegExp(escapedName) }))
      .or(this.page.getByRole('button', { name: new RegExp(`Deadline detail: ${escapedName}`) }))
      .or(this.page.getByRole('button', { name: new RegExp(`Open deadlines: ${escapedName}`) }))
      .or(this.page.getByRole('button', { name: new RegExp(`^Open ${escapedName} .* deadline$`) }))
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
