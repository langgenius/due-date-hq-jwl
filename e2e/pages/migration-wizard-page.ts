import type { Locator, Page } from '@playwright/test'

export class MigrationWizardPage {
  readonly dialog: Locator
  readonly pasteClientData: Locator
  readonly closeButton: Locator
  readonly discardDialog: Locator
  readonly undoImportDialog: Locator

  constructor(readonly page: Page) {
    this.dialog = page.getByRole('dialog', { name: /Import clients · Step/ })
    this.pasteClientData = page.getByLabel('Paste client data')
    this.closeButton = page.getByRole('button', { name: 'Close wizard' })
    this.discardDialog = page.getByRole('alertdialog', { name: 'Discard import?' })
    this.undoImportDialog = page.getByRole('alertdialog', { name: 'Undo this import?' })
  }

  async pasteRows(rows: string) {
    await this.pasteClientData.fill(rows)
  }

  presetButton(name: string) {
    return this.page.getByRole('button', { name })
  }

  async continue() {
    await this.page.getByRole('button', { name: 'Continue' }).click()
  }

  async mapColumn(sourceHeader: string, targetLabel: string) {
    const detailsButton = this.page.getByRole('button', { name: 'Review column details' })
    if (await detailsButton.isVisible()) await detailsButton.click()
    const row = this.page.getByRole('row').filter({ hasText: sourceHeader })
    await row.getByRole('button', { name: 'Edit' }).click()
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
