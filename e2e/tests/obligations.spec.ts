import { expect, test } from '../fixtures/test'

// Feature: Obligations list
// PRD: S1 protected Obligations entry
// AC: E2E-OBLIGATIONS-FILTERS, E2E-OBLIGATIONS-STATUS

test.skip(
  Boolean(process.env.E2E_BASE_URL),
  'local e2e auth seed is not available on external targets',
)

test.describe('seeded obligations', () => {
  test.use({ authSeed: 'obligations' })

  test('AC: E2E-DASHBOARD-TRIAGE opens the current weekly Actions queue', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/')

    const actions = authenticatedPage.getByRole('region', { name: 'Actions this week' })
    await expect(actions.getByRole('heading', { name: /Actions this week/ })).toBeVisible()
    await expect(actions.getByText('Arbor & Vale LLC')).toBeVisible()
    await expect(actions.getByText('Northstar Dental Group')).toBeVisible()

    await actions.getByRole('link', { name: 'All obligations' }).click()
    await expect(authenticatedPage).toHaveURL(/\/obligations$/)
  })

  test('AC: E2E-DASHBOARD-FILTERS opens action rows in the obligation drawer', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/')

    const actions = authenticatedPage.getByRole('region', { name: 'Actions this week' })
    const arborAction = actions.getByRole('group', {
      name: /Attach a source before review for Arbor & Vale LLC/,
    })
    await arborAction.hover()
    await actions
      .getByRole('button', { name: 'Review Arbor & Vale LLC in obligation drawer' })
      .click()

    await expect(authenticatedPage).toHaveURL(/\/$/)
    await expect(authenticatedPage.getByRole('dialog', { name: /Arbor & Vale LLC/ })).toBeVisible()
  })

  test('AC: E2E-OBLIGATIONS-FILTERS searches, filters, and sorts real obligation rows', async ({
    authenticatedPage,
    obligationQueuePage,
  }) => {
    await obligationQueuePage.goto()

    await expect(obligationQueuePage.heading).toBeVisible()
    // Calendar sync is now a popover button (not a route link) — verify the
    // trigger is visible; the /obligations/calendar destination is exercised
    // separately by the command-palette test in authenticated-shell.spec.ts.
    await expect(obligationQueuePage.calendarSyncButton).toBeVisible()
    await expect(authenticatedPage.getByText('Arbor & Vale LLC')).toBeVisible()
    await expect(authenticatedPage.getByText('Northstar Dental Group')).toBeVisible()

    await obligationQueuePage.searchInput.fill('Arbor')
    await expect(authenticatedPage).toHaveURL(/\/obligations\?q=Arbor$/)
    await expect(authenticatedPage.getByText('Arbor & Vale LLC')).toBeVisible()
    await expect(authenticatedPage.getByText('Northstar Dental Group')).toBeHidden()

    await obligationQueuePage.resetButton.click()
    await expect(authenticatedPage).toHaveURL(/\/obligations$/)
    await obligationQueuePage.openStatusFilter()
    await obligationQueuePage.statusFilterOption('In review').click()
    await expect(authenticatedPage).toHaveURL(/\/obligations\?status=review$/)
    await expect(authenticatedPage.getByText('Northstar Dental Group')).toBeVisible()
    await expect(authenticatedPage.getByText('Arbor & Vale LLC')).toBeHidden()
    await expect(obligationQueuePage.statusFilterOption('In review')).toBeVisible()
    await authenticatedPage.keyboard.press('Escape')

    await obligationQueuePage.resetButton.click()
    await expect(authenticatedPage).toHaveURL(/\/obligations$/)
    await obligationQueuePage.dueSortButton.click()
    await expect(authenticatedPage).toHaveURL(/\/obligations\?sort=due_desc$/)
  })

  test('AC: E2E-OBLIGATIONS-DETAIL opens the obligation drawer from a row click', async ({
    authenticatedPage,
    obligationQueuePage,
  }) => {
    await obligationQueuePage.goto()

    await obligationQueuePage.openDetailFor('Arbor & Vale LLC')
    await expect(authenticatedPage).toHaveURL(/drawer=obligation/)
    await expect(authenticatedPage).toHaveURL(/tab=readiness/)
    await expect(authenticatedPage.getByRole('dialog', { name: /Arbor & Vale LLC/ })).toBeVisible()
    await expect(authenticatedPage.getByRole('tab', { name: 'Readiness' })).toBeVisible()
    await expect(authenticatedPage.getByRole('tab', { name: 'Extension' })).toBeVisible()
    await expect(authenticatedPage.getByRole('tab', { name: 'Evidence' })).toBeVisible()
    await expect(authenticatedPage.getByRole('tab', { name: 'Timeline' })).toBeVisible()

    const checklistLabels = authenticatedPage.getByLabel('Document item label')
    await expect.poll(async () => checklistLabels.count(), { timeout: 15_000 }).toBeGreaterThan(0)
    const checklistCount = await checklistLabels.count()
    await authenticatedPage.getByRole('button', { name: 'Add item' }).click()
    await expect(checklistLabels).toHaveCount(checklistCount + 1)
    await checklistLabels.last().fill('E2E removable checklist item')
    await checklistLabels.last().blur()
    await authenticatedPage.getByRole('button', { name: 'Expand' }).last().click()
    await authenticatedPage.getByRole('button', { name: 'Remove' }).last().click()
    await expect(checklistLabels).toHaveCount(checklistCount)
  })

  test('AC: E2E-OBLIGATIONS-STATUS updates status through oRPC and audit toast', async ({
    authenticatedPage,
    obligationQueuePage,
  }) => {
    await obligationQueuePage.goto()

    await obligationQueuePage.statusSelectFor('Arbor & Vale LLC').click()
    await obligationQueuePage.statusChangeOption('Filed').click()

    await expect(authenticatedPage.getByText('Status updated')).toBeVisible()
    await expect(authenticatedPage.getByText(/Audit [a-f0-9-]{8}/)).toBeVisible()
    await expect(obligationQueuePage.statusSelectFor('Arbor & Vale LLC')).toContainText('Filed')

    await authenticatedPage.keyboard.press('P')
    await expect(obligationQueuePage.statusSelectFor('Arbor & Vale LLC')).toContainText('Paid')
  })

  test('AC: E2E-OBLIGATIONS-COMPLETE saves a view, hides columns, and bulk updates rows', async ({
    authenticatedPage,
    obligationQueuePage,
  }) => {
    // The Compact/Comfortable density tabs were removed in the obligations
    // header polish (PR #4). Density is still persisted in saved views and
    // URL, but there's no UI control to toggle it anymore — drop the density
    // toggle from this test.
    await obligationQueuePage.goto()

    await obligationQueuePage.columnsButton.click()
    await obligationQueuePage.columnVisibilityOption('Owner').click()
    await authenticatedPage.keyboard.press('Escape')
    await expect(authenticatedPage).toHaveURL(/hide=assigneeName/)

    await obligationQueuePage.searchInput.fill('Arbor')
    await expect(authenticatedPage).toHaveURL(/q=Arbor/)
    await expect(obligationQueuePage.rowFor('Arbor & Vale LLC')).toBeVisible({ timeout: 15_000 })

    await obligationQueuePage.savedViewsButton.click()
    await obligationQueuePage.savedViewMenuItem('Save current view').click()
    await authenticatedPage.getByLabel('Saved view name').fill('E2E Arbor compact')
    await authenticatedPage.getByRole('button', { name: 'Save view' }).click()
    await expect(authenticatedPage.getByText('Saved view created')).toBeVisible()

    await obligationQueuePage.resetButton.click()
    await expect(authenticatedPage).toHaveURL(/\/obligations$/)
    await obligationQueuePage.savedViewsButton.click()
    await obligationQueuePage.savedViewMenuItem('Apply view').click()
    await expect(authenticatedPage).toHaveURL(/q=Arbor/)
    await expect(authenticatedPage).toHaveURL(/hide=assigneeName/)

    await obligationQueuePage.savedViewsButton.click()
    await obligationQueuePage.savedViewMenuItem('Rename view').click()
    await authenticatedPage.getByLabel('Saved view name').fill('E2E renamed view')
    await authenticatedPage.getByRole('button', { name: 'Save view' }).click()
    await expect(authenticatedPage.getByText('Saved view updated')).toBeVisible()

    await obligationQueuePage.savedViewsButton.click()
    await obligationQueuePage.savedViewMenuItem('Delete view').click()
    await expect(authenticatedPage.getByText('Saved view deleted')).toBeVisible()

    await obligationQueuePage.resetButton.click()
    await obligationQueuePage.selectRow('Arbor & Vale LLC').click()
    await authenticatedPage.getByRole('button', { name: 'Assign owner' }).click()
    await authenticatedPage.getByRole('menuitem', { name: 'E2E Owner' }).click()
    await expect(authenticatedPage.getByText('Owners updated')).toBeVisible()
    await expect(obligationQueuePage.rowFor('Arbor & Vale LLC')).toContainText('E2E Owner')

    await obligationQueuePage.selectRow('Arbor & Vale LLC').click()
    await obligationQueuePage.selectRow('Northstar Dental Group').click()
    const bulkActions = authenticatedPage.getByRole('region', { name: 'Bulk actions' })

    await bulkActions.getByRole('button', { name: 'Export' }).click()
    let exportDialog = authenticatedPage.getByRole('dialog', { name: 'Export obligations' })
    await exportDialog.getByRole('radio', { name: /CSV/ }).click()
    const [csvDownload] = await Promise.all([
      authenticatedPage.waitForEvent('download'),
      exportDialog.getByRole('button', { name: 'Export' }).click(),
    ])
    expect(csvDownload.suggestedFilename()).toMatch(/^obligations-\d{4}-\d{2}-\d{2}\.csv$/)

    await bulkActions.getByRole('button', { name: 'Export' }).click()
    exportDialog = authenticatedPage.getByRole('dialog', { name: 'Export obligations' })
    await exportDialog.getByRole('radio', { name: /PDF report/ }).click()
    const [zipDownload] = await Promise.all([
      authenticatedPage.waitForEvent('download'),
      exportDialog.getByRole('button', { name: 'Export' }).click(),
    ])
    expect(zipDownload.suggestedFilename()).toMatch(/^obligations-pdfs-\d{4}-\d{2}-\d{2}\.zip$/)

    await bulkActions.getByRole('button', { name: 'Set status' }).click()
    await authenticatedPage.getByRole('menuitem', { name: 'Extended' }).click()
    await authenticatedPage.getByLabel('Extension memo').fill('E2E extension memo')
    await authenticatedPage
      .getByRole('dialog')
      .getByRole('button', { name: 'Mark extended' })
      .click()
    await expect(authenticatedPage.getByText('Bulk status updated')).toBeVisible()
    await expect(obligationQueuePage.statusSelectFor('Arbor & Vale LLC')).toContainText('Extended')
  })
})
