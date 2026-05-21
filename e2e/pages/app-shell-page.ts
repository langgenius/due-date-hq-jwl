import type { Locator, Page } from '@playwright/test'

export class AppShellPage {
  readonly primaryNavigation: Locator
  readonly todayLink: Locator
  readonly obligationQueueLink: Locator
  readonly clientsLink: Locator
  readonly opportunitiesLink: Locator
  readonly rulesLink: Locator
  readonly importClientsButton: Locator
  readonly commandDialog: Locator
  readonly commandPaletteHeading: Locator
  readonly shortcutDialog: Locator

  constructor(readonly page: Page) {
    this.primaryNavigation = page.getByRole('navigation', { name: 'Primary navigation' })
    this.todayLink = page.getByRole('link', { name: /^Today$/ })
    this.obligationQueueLink = page.getByRole('link', { name: /Obligations/ })
    this.clientsLink = page.getByRole('link', { name: 'Clients' })
    this.opportunitiesLink = page.getByRole('link', { name: 'Opportunities' })
    this.rulesLink = page.getByRole('link', { name: /^Rule library(?:\s+\d+)?$/ })
    this.importClientsButton = page
      .getByRole('button', { name: /^(Import clients|Run migration)$/ })
      .first()
    this.commandDialog = page.getByRole('dialog', { name: 'Command palette' })
    this.commandPaletteHeading = this.commandDialog.getByRole('heading', {
      name: 'Command palette',
    })
    this.shortcutDialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' })
  }

  async goto(path = '/') {
    await this.page.goto(path)
  }

  async openCommandPalette() {
    if (await this.tryOpenCommandPalette('Meta+K')) return
    await this.tryOpenCommandPalette('Control+K')
  }

  commandItem(name: string) {
    return this.commandDialog.getByText(name, { exact: true })
  }

  async openShortcutHelp() {
    await this.primaryNavigation.waitFor({ state: 'visible' })
    await this.page.keyboard.press('?')
    if (await this.shortcutDialog.isVisible()) return

    try {
      await this.page.keyboard.down('Shift')
      await this.page.keyboard.press('/')
    } finally {
      await this.page.keyboard.up('Shift')
    }
    await this.shortcutDialog.waitFor({ state: 'visible' })
  }

  private async tryOpenCommandPalette(shortcut: string) {
    if (await this.commandDialog.isVisible()) return true
    await this.page.keyboard.press(shortcut)

    try {
      await this.commandDialog.waitFor({ state: 'visible', timeout: 1_000 })
      return true
    } catch {
      return this.commandDialog.isVisible()
    }
  }
}
