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

  test('AC: E2E-DASHBOARD-TRIAGE syncs tabs to URL and opens matching Obligations view', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/')

    // The "Priority list" card heading was removed in the spec-alignment pass;
    // the priority tabs are the surviving anchor for the triage table.
    await expect(authenticatedPage.getByRole('tab', { name: /This Week/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await authenticatedPage.getByRole('tab', { name: /This Month/ }).click()
    await expect(authenticatedPage).toHaveURL(/\/\?triage=this_month$/)
    await expect(authenticatedPage.getByRole('tab', { name: /This Month/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await authenticatedPage.getByRole('button', { name: 'Open full Obligations' }).click()
    await expect(authenticatedPage).toHaveURL(/\/obligations\?daysMin=8&daysMax=30$/)
  })

  test('AC: E2E-DASHBOARD-FILTERS keeps header filters open while updating table data', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/')

    // Without the "Priority list" card title, scope the triage table to the
    // card that owns the priority tabs (the surviving stable anchor).
    const triageTable = authenticatedPage
      .locator('[data-slot="card"]')
      .filter({ has: authenticatedPage.getByRole('tab', { name: /This Week/ }) })
      .getByRole('table')
    const dashboardHeaderButton = (name: string) =>
      triageTable
        .locator('th')
        .filter({ hasText: new RegExp(`^${name}$`) })
        .locator('button')
        .first()
    const dashboardRow = (clientName: string) =>
      triageTable
        .getByRole('row', { name: new RegExp(clientName) })
        .or(
          triageTable.getByRole('button', {
            name: new RegExp(`Obligation detail: ${clientName}`),
          }),
        )
        .or(
          triageTable.getByRole('button', {
            name: new RegExp(`Open obligations: ${clientName}`),
          }),
        )

    await dashboardHeaderButton('Status').click()
    await authenticatedPage.getByRole('menuitemcheckbox', { name: /Needs review/ }).click()
    await expect(authenticatedPage).toHaveURL(/\/\?status=review$/)
    await expect(dashboardRow('Northstar Dental Group')).toBeVisible()
    await expect(dashboardRow('Arbor & Vale LLC')).toBeHidden()
    await expect(
      authenticatedPage.getByRole('menuitemcheckbox', { name: /Needs review/ }),
    ).toBeVisible()

    await authenticatedPage.goto('/')
    await dashboardHeaderButton('Deadline').click()
    await authenticatedPage.getByRole('menuitemcheckbox', { name: /Today/ }).click()
    await expect(authenticatedPage).toHaveURL(/\/\?due=today$/)
    await expect(dashboardRow('Unassigned Foundry LLC')).toBeVisible()
    await expect(dashboardRow('Arbor & Vale LLC')).toBeHidden()
    await expect(authenticatedPage.getByRole('menuitemcheckbox', { name: /Today/ })).toBeVisible()
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
    await obligationQueuePage.statusFilterOption('Needs review').click()
    await expect(authenticatedPage).toHaveURL(/\/obligations\?status=review$/)
    await expect(authenticatedPage.getByText('Northstar Dental Group')).toBeVisible()
    await expect(authenticatedPage.getByText('Arbor & Vale LLC')).toBeHidden()
    await expect(obligationQueuePage.statusFilterOption('Needs review')).toBeVisible()
    await authenticatedPage.keyboard.press('Escape')

    await obligationQueuePage.resetButton.click()
    await expect(authenticatedPage).toHaveURL(/\/obligations$/)
    await obligationQueuePage.sortSelect.click()
    await authenticatedPage.getByRole('option', { name: 'Due date — latest first' }).click()
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
    await expect(authenticatedPage.getByRole('tab', { name: 'Risk' })).toBeVisible()
    await expect(authenticatedPage.getByRole('tab', { name: 'Evidence' })).toBeVisible()
    await expect(authenticatedPage.getByRole('tab', { name: 'Audit' })).toBeVisible()

    const checklistLabels = authenticatedPage.getByLabel('Checklist item label')
    const checklistCount = await checklistLabels.count()
    await authenticatedPage.getByRole('button', { name: 'Add item' }).click()
    await expect(checklistLabels).toHaveCount(checklistCount + 1)
    await checklistLabels.last().fill('E2E removable checklist item')
    await authenticatedPage.getByRole('button', { name: 'Remove checklist item' }).last().click()
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
    await obligationQueuePage.columnVisibilityOption('County').click()
    await authenticatedPage.keyboard.press('Escape')
    await expect(authenticatedPage).toHaveURL(/hide=clientCounty/)

    await obligationQueuePage.searchInput.fill('Arbor')
    await expect(authenticatedPage).toHaveURL(/q=Arbor/)

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
    await expect(authenticatedPage).toHaveURL(/hide=clientCounty/)

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
    await authenticatedPage.getByRole('button', { name: 'Change assignee' }).click()
    await authenticatedPage.getByRole('menuitem', { name: 'E2E Owner' }).click()
    await expect(authenticatedPage.getByText('Owners updated')).toBeVisible()
    await expect(obligationQueuePage.rowFor('Arbor & Vale LLC')).toContainText('E2E Owner')

    await obligationQueuePage.selectRow('Arbor & Vale LLC').click()
    await obligationQueuePage.selectRow('Northstar Dental Group').click()
    const [csvDownload] = await Promise.all([
      authenticatedPage.waitForEvent('download'),
      authenticatedPage.getByRole('button', { name: 'CSV' }).click(),
    ])
    expect(csvDownload.suggestedFilename()).toMatch(/^obligations-\d{4}-\d{2}-\d{2}\.csv$/)
    const [zipDownload] = await Promise.all([
      authenticatedPage.waitForEvent('download'),
      authenticatedPage.getByRole('button', { name: 'PDF zip' }).click(),
    ])
    expect(zipDownload.suggestedFilename()).toMatch(/^obligations-pdfs-\d{4}-\d{2}-\d{2}\.zip$/)
    await authenticatedPage.getByRole('button', { name: 'Mark extended' }).click()
    await authenticatedPage.getByLabel('Extension memo').fill('E2E extension memo')
    await authenticatedPage
      .getByRole('dialog')
      .getByRole('button', { name: 'Mark extended' })
      .click()
    await expect(authenticatedPage.getByText('Bulk status updated')).toBeVisible()
    await expect(obligationQueuePage.statusSelectFor('Arbor & Vale LLC')).toContainText('Extended')
  })
})
