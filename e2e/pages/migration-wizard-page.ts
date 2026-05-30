import type { Locator, Page } from '@playwright/test'

export class MigrationWizardPage {
  readonly dialog: Locator
  readonly pasteClientData: Locator
  readonly pasteListButton: Locator
  readonly closeButton: Locator
  readonly discardDialog: Locator
  readonly undoImportDialog: Locator

  constructor(readonly page: Page) {
    this.dialog = page.getByRole('dialog', { name: /Import clients · Step/ })
    // 2026-05-27 (Yuqi Step 1 bold-IA redesign): textarea label
    // changed from "Paste client data" → "Paste client rows", and
    // it's now hidden behind a "Paste a list instead →" toggle in
    // the empty state. Tests must click the toggle before they can
    // fill — see `pasteRows()` below.
    this.pasteClientData = page.getByLabel('Paste client rows')
    this.pasteListButton = page.getByRole('button', { name: /Paste a list instead/ })
    this.closeButton = page.getByRole('button', { name: 'Close wizard' })
    this.discardDialog = page.getByRole('alertdialog', { name: 'Leave without importing?' })
    this.undoImportDialog = page.getByRole('alertdialog', { name: 'Undo this import?' })
  }

  async revealPasteRows() {
    if (await this.pasteListButton.isVisible().catch(() => false)) {
      await this.pasteListButton.click()
    }
  }

  async pasteRows(rows: string) {
    // 2026-05-27 (Yuqi Step 1 bold-IA redesign): Click the
    // "Paste a list instead →" toggle to reveal the textarea
    // (empty state shows the dropzone by default). If the textarea
    // is already visible (e.g. the page just reloaded with content),
    // the toggle won't be there — fall through to fill().
    await this.revealPasteRows()
    await this.pasteClientData.fill(rows)
  }

  presetButton(name: string) {
    return this.page.getByRole('button', { name })
  }

  async continue() {
    await this.page.getByRole('button', { name: 'Continue' }).click()
  }

  async mapColumn(sourceHeader: string, targetLabel: string) {
    // 2026-05-27 (Yuqi Step 2 bold-IA redesign): "Review column
    // details" toggle button removed — every row is now a clickable
    // banner that expands inline. The row-actions menu is gone too;
    // the Edit affordance is now an inline "Change →" text link
    // next to the DueDateHQ field name.
    const row = this.page.getByRole('listitem').filter({ hasText: sourceHeader })
    const changeLink = row.getByRole('button', { name: /^Change/ }).first()
    await changeLink.click()
    await this.page.getByRole('menuitemradio', { name: targetLabel }).click()
  }

  async importAndGenerate() {
    await this.page.getByRole('button', { name: 'Import & Generate' }).click()
  }

  async openUndoImportConfirmation() {
    await this.page.getByRole('button', { name: 'Undo import' }).click()
  }

  async confirmUndoImport() {
    await this.undoImportDialog.getByRole('button', { name: 'Undo import' }).click()
  }
}
