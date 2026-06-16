import { expect, type Locator, type Page } from '@playwright/test'

export class AppShellPage {
  readonly primaryNavigation: Locator
  readonly todayLink: Locator
  readonly obligationQueueLink: Locator
  readonly clientsLink: Locator
  readonly rulesLink: Locator
  readonly commandDialog: Locator
  readonly commandPaletteHeading: Locator
  readonly shortcutDialog: Locator

  constructor(readonly page: Page) {
    this.primaryNavigation = page.getByRole('navigation', { name: 'Primary navigation' })
    this.todayLink = page.getByRole('link', { name: /^Today$/ })
    this.obligationQueueLink = page.getByRole('link', { name: /Deadlines/ })
    this.clientsLink = page.getByRole('link', { name: 'Clients' })
    this.rulesLink = page.getByRole('link', { name: /^Rule library(?:\s+\d+)?$/ })
    this.commandDialog = page.getByRole('dialog', { name: 'Command palette' })
    this.commandPaletteHeading = this.commandDialog.getByRole('heading', {
      name: 'Command palette',
    })
    this.shortcutDialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' })
  }

  async goto(path = '/') {
    await this.page.goto(path)
    await this.primaryNavigation.waitFor({ state: 'visible' })
  }

  async openImportWizard() {
    const wizardDialog = this.page.getByRole('dialog', { name: /Import clients · Step/ })

    const openWhenAllowed = async (attempt: number): Promise<void> => {
      await this.primaryNavigation.waitFor({ state: 'visible' })

      try {
        // The dashboard no longer owns a permanent import CTA; import is now a
        // command/action that can be opened from any protected route.
        await this.openCommandPalette()
        await this.commandItem('Import clients').click()
        await expect(wizardDialog).toBeVisible()
        return
      } catch (error) {
        if (attempt >= 2) {
          throw error
        }

        await this.page.reload({ waitUntil: 'domcontentloaded' })
        return openWhenAllowed(attempt + 1)
      }
    }

    await openWhenAllowed(0)
  }

  async openCommandPalette() {
    await this.primaryNavigation.waitFor({ state: 'visible' })

    await expect
      .poll(
        async () => {
          if (await this.tryOpenCommandPalette('Control+K')) return true
          if (await this.tryOpenCommandPalette('Meta+K')) return true

          await this.dispatchHotkeys([
            { key: 'k', code: 'KeyK', ctrlKey: true },
            { key: 'K', code: 'KeyK', ctrlKey: true },
            { key: 'k', code: 'KeyK', metaKey: true },
            { key: 'K', code: 'KeyK', metaKey: true },
          ])
          return this.commandDialog.isVisible()
        },
        { timeout: 10_000, intervals: [100, 250, 500] },
      )
      .toBe(true)
  }

  commandItem(name: string) {
    // Scope to the command list (the cmdk listbox). The same labels —
    // "Deadlines", "Alerts", "Clients" — also render as scope-filter pills
    // above the list, so an unscoped getByText resolves to two elements.
    return this.commandDialog.getByRole('listbox').getByText(name, { exact: true })
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
    await this.dispatchHotkeys([
      { key: '?', code: 'Slash', shiftKey: true },
      { key: '/', code: 'Slash', shiftKey: true },
    ])
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

  private async dispatchHotkeys(
    events: Array<{
      key: string
      code: string
      ctrlKey?: boolean
      metaKey?: boolean
      shiftKey?: boolean
    }>,
  ) {
    await this.page.evaluate((hotkeys) => {
      for (const hotkey of hotkeys) {
        const init: KeyboardEventInit = {
          key: hotkey.key,
          code: hotkey.code,
          bubbles: true,
          cancelable: true,
          ctrlKey: Boolean(hotkey.ctrlKey),
          metaKey: Boolean(hotkey.metaKey),
          shiftKey: Boolean(hotkey.shiftKey),
        }
        document.body.dispatchEvent(new KeyboardEvent('keydown', init))
        window.dispatchEvent(new KeyboardEvent('keydown', init))
        document.dispatchEvent(new KeyboardEvent('keydown', init))
        document.body.dispatchEvent(new KeyboardEvent('keyup', init))
        window.dispatchEvent(new KeyboardEvent('keyup', init))
        document.dispatchEvent(new KeyboardEvent('keyup', init))
      }
    }, events)
  }
}
