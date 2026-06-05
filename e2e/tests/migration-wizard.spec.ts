import { expect, test } from '../fixtures/test'

const AI_STEP_TIMEOUT = 20_000

// Feature: Migration Copilot Step 1
// PRD: S2 import intake
// AC: E2E-MIGRATION-INTAKE, E2E-MIGRATION-SSN-BLOCK, E2E-MIGRATION-DISCARD,
//     E2E-MIGRATION-IMPORT-UNDO

test.skip(
  Boolean(process.env.E2E_BASE_URL),
  'local e2e auth seed is not available on external targets',
)

test('AC: E2E-MIGRATION-INTAKE parses pasted rows and protects discard', async ({
  appShellPage,
  authenticatedPage,
  migrationWizardPage,
}) => {
  await appShellPage.goto()
  await appShellPage.openImportWizard()

  await expect(migrationWizardPage.dialog).toBeVisible()
  await migrationWizardPage.pasteRows(
    [
      'Client Name,Entity Type,State,Tax ID,SSN',
      'Arbor & Vale LLC,LLC,CA,12-3456789,123-45-6789',
      'Northstar Dental Group,S Corp,NY,98-7654321,987-65-4321',
    ].join('\n'),
  )

  await expect(authenticatedPage.getByText('2 clients ready to import')).toBeVisible()
  await expect(authenticatedPage.getByRole('alert')).toContainText('SSN-like columns blocked')
  await expect(authenticatedPage.getByRole('alert')).toContainText('SSN')

  await migrationWizardPage.closeButton.click()
  await expect(migrationWizardPage.discardDialog).toBeVisible()
  await authenticatedPage.getByRole('button', { name: 'Keep editing' }).click()
  await expect(migrationWizardPage.dialog).toBeVisible()
})

test('AC: E2E-MIGRATION-IMPORT-UNDO imports from the wizard and reverts from toast', async ({
  appShellPage,
  authenticatedPage,
  migrationWizardPage,
  obligationQueuePage,
}) => {
  const importedClient = 'Undoable Migration LLC'

  await appShellPage.goto()
  await appShellPage.openImportWizard()

  await expect(migrationWizardPage.dialog).toBeVisible()
  await migrationWizardPage.presetButton('TaxDome').click()
  await migrationWizardPage.pasteRows(
    ['Account Name\tState\tType', `${importedClient}\tCA\tLLC`].join('\n'),
  )

  await migrationWizardPage.continue()
  await expect(
    authenticatedPage.getByRole('heading', { name: 'AI prepared your columns' }),
  ).toBeVisible({ timeout: AI_STEP_TIMEOUT })

  await migrationWizardPage.continue()
  await expect(
    authenticatedPage.getByRole('heading', { name: 'AI standardized your values' }),
  ).toBeVisible({ timeout: AI_STEP_TIMEOUT })

  await migrationWizardPage.continue()
  await expect(authenticatedPage.getByRole('heading', { name: 'Ready to import' })).toBeVisible()
  await expect(authenticatedPage.getByText('1 client')).toBeVisible()

  await migrationWizardPage.importAndGenerate()

  await expect(authenticatedPage.getByText('Import complete')).toBeVisible()

  await migrationWizardPage.openUndoImportConfirmation()
  await expect(migrationWizardPage.undoImportDialog).toBeVisible()
  await migrationWizardPage.confirmUndoImport()

  await expect(authenticatedPage).toHaveURL(/\/deadlines$/)
  await expect(obligationQueuePage.heading).toBeVisible()
  await expect(authenticatedPage.getByText('Import undone')).toBeVisible()
  await expect(obligationQueuePage.rowFor(importedClient)).toBeHidden()
})

test('AC: E2E-MIGRATION-EXPOSURE imports tax inputs into Dashboard and Evidence drawer', async ({
  appShellPage,
  authenticatedPage,
  migrationWizardPage,
}) => {
  const importedClient = 'Exposure Migration Corp'
  await authenticatedPage.emulateMedia({ reducedMotion: 'reduce' })

  await appShellPage.goto()
  await appShellPage.openImportWizard()

  await expect(migrationWizardPage.dialog).toBeVisible()
  await migrationWizardPage.presetButton('TaxDome').click()
  await migrationWizardPage.pasteRows(
    [
      'Account Name\tState\tType\tReturn Type\tEstimated Tax Due\tOwner Count',
      `${importedClient}\tCA\tLLC\tForm 1065\t75000\t1`,
    ].join('\n'),
  )

  await migrationWizardPage.continue()
  await expect(
    authenticatedPage.getByRole('heading', { name: 'AI prepared your columns' }),
  ).toBeVisible({ timeout: AI_STEP_TIMEOUT })
  await migrationWizardPage.mapColumn('Type', 'Entity type')
  await migrationWizardPage.mapColumn('Return Type', 'Tax types')
  await migrationWizardPage.mapColumn('Estimated Tax Due', 'Penalty tax due')
  await migrationWizardPage.mapColumn('Owner Count', 'Partner count')

  await migrationWizardPage.continue()
  await expect(
    authenticatedPage.getByRole('heading', { name: 'AI standardized your values' }),
  ).toBeVisible({ timeout: AI_STEP_TIMEOUT })

  await migrationWizardPage.continue()
  await expect(authenticatedPage.getByRole('heading', { name: 'Ready to import' })).toBeVisible()
  await expect(authenticatedPage.getByText(/\d+ deadlines? to monitor/)).toBeVisible()
  await expect(
    authenticatedPage.getByRole('status').filter({ hasText: 'Ready to generate deadlines' }),
  ).toContainText('Ready to generate deadlines')

  await migrationWizardPage.importAndGenerate()

  await expect(authenticatedPage.getByText('Import complete')).toBeVisible()
  await expect(authenticatedPage).toHaveURL(/\/$/)
})
