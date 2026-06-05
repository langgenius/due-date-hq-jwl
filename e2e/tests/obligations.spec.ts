import { expect, test } from '../fixtures/test'

// Feature: Deadlines list
// PRD: S1 protected Deadlines entry
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

    await actions.getByRole('link', { name: 'View all' }).click()
    await expect(authenticatedPage).toHaveURL(/\/deadlines$/)
  })

  test('AC: E2E-DASHBOARD-FILTERS opens action rows in the deadline drawer', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/')

    const actions = authenticatedPage.getByRole('region', { name: 'Actions this week' })
    const arborAction = actions.getByRole('row', {
      name: /Open Attach the source document for Arbor & Vale LLC/,
    })
    await arborAction.click()

    await expect(authenticatedPage).toHaveURL(/\/deadlines\/[0-9a-f]{12}$/)
    await expect(
      authenticatedPage.getByRole('complementary', { name: /Arbor & Vale LLC/ }),
    ).toBeVisible()
  })

  test('AC: E2E-OBLIGATIONS-FILTERS searches, filters, and sorts real obligation rows', async ({
    authenticatedPage,
    obligationQueuePage,
  }) => {
    await obligationQueuePage.goto()

    await expect(obligationQueuePage.heading).toBeVisible()
    // Calendar sync is now a popover button (not a route link) — verify the
    // trigger is visible; the /deadlines/calendar destination is exercised
    // separately by the command-palette test in authenticated-shell.spec.ts.
    await expect(obligationQueuePage.calendarSyncButton).toBeVisible()
    await expect(authenticatedPage.getByText('Arbor & Vale LLC')).toBeVisible()
    await expect(authenticatedPage.getByText('Northstar Dental Group')).toBeVisible()

    await obligationQueuePage.search('Arbor')
    await expect(authenticatedPage).toHaveURL(/\/deadlines\?q=Arbor$/)
    await expect(authenticatedPage.getByText('Arbor & Vale LLC')).toBeVisible()
    await expect(authenticatedPage.getByText('Northstar Dental Group')).toBeHidden()

    await obligationQueuePage.clearSearchButton.click()
    await expect(authenticatedPage).toHaveURL(/\/deadlines$/)
    await obligationQueuePage.openStatusFilter()
    await obligationQueuePage.statusFilterOption('In review').click()
    await expect(authenticatedPage).toHaveURL(/\/deadlines\?status=review$/)
    await expect(authenticatedPage.getByText('Northstar Dental Group')).toBeVisible()
    await expect(authenticatedPage.getByText('Arbor & Vale LLC')).toBeHidden()
    await expect(obligationQueuePage.statusFilterOption('In review')).toBeVisible()
    await authenticatedPage.keyboard.press('Escape')

    await obligationQueuePage.goto()
    await expect(authenticatedPage).toHaveURL(/\/deadlines$/)
    await obligationQueuePage.dueSortButton.click()
    await expect(authenticatedPage).toHaveURL(/\/deadlines\?sort=due_desc$/)
  })

  test('AC: E2E-OBLIGATIONS-DETAIL opens the deadline drawer from a row click', async ({
    authenticatedPage,
    obligationQueuePage,
  }) => {
    await obligationQueuePage.goto()

    await obligationQueuePage.openDetailFor('Arbor & Vale LLC')
    await expect(authenticatedPage).toHaveURL(/\/deadlines\/[0-9a-f]{12}$/)
    const detailUrl = new URL(authenticatedPage.url())
    expect(detailUrl.searchParams.has('drawer')).toBe(false)
    expect(detailUrl.searchParams.has('id')).toBe(false)
    expect(detailUrl.searchParams.has('row')).toBe(false)
    expect(detailUrl.searchParams.has('tab')).toBe(false)
    const deadlineDrawer = authenticatedPage.getByRole('complementary', {
      name: /Arbor & Vale LLC/,
    })
    await expect(deadlineDrawer).toBeVisible()
    await expect(deadlineDrawer.getByRole('tab', { name: 'Summary' })).toBeVisible()
    await expect(deadlineDrawer.getByRole('tab', { name: /^Materials\b/ })).toBeVisible()
    await expect(deadlineDrawer.getByRole('tab', { name: 'Extension' })).toBeVisible()
    await expect(deadlineDrawer.getByRole('tab', { name: /^Evidence\b/ })).toBeVisible()

    await deadlineDrawer.getByRole('tab', { name: /^Materials\b/ }).click()
    const checklistItems = deadlineDrawer.getByRole('checkbox', {
      name: /^Select document .* for batch action$/,
    })
    await expect.poll(async () => checklistItems.count(), { timeout: 15_000 }).toBeGreaterThan(0)
    const checklistCount = await checklistItems.count()
    await deadlineDrawer.getByRole('button', { name: 'Add item' }).click()
    await expect(authenticatedPage.getByText('Document item added')).toBeVisible()
    await expect(checklistItems).toHaveCount(checklistCount + 1)
    await expect(deadlineDrawer.getByText('Custom document')).toBeVisible()
    await deadlineDrawer.getByRole('button', { name: 'More actions for Custom document' }).click()
    await authenticatedPage.getByRole('menuitem', { name: 'Remove' }).click()
    await expect(authenticatedPage.getByText('Document item removed')).toBeVisible()
    await expect(checklistItems).toHaveCount(checklistCount)
  })

  test('AC: E2E-OBLIGATIONS-STATUS updates status through oRPC and audit toast', async ({
    authenticatedPage,
    obligationQueuePage,
  }) => {
    await obligationQueuePage.goto()

    await obligationQueuePage.statusSelectFor('Arbor & Vale LLC').click()
    await obligationQueuePage.statusChangeOption('Filed').click()

    // 2026-05-27 (α #156): per-status toast labels.
    await expect(
      authenticatedPage.getByText(/Status (?:updated|changed to)|Marked as/),
    ).toBeVisible()
    await expect(authenticatedPage.getByText(/Audit [a-f0-9-]{8}/)).toBeVisible()
    await expect(obligationQueuePage.statusSelectFor('Arbor & Vale LLC')).toContainText('Filed')

    await authenticatedPage.keyboard.press('P')
    await expect(obligationQueuePage.statusSelectFor('Arbor & Vale LLC')).toContainText('Filed')
  })

  test('AC: E2E-OBLIGATIONS-COMPLETE hides columns and bulk updates rows', async ({
    authenticatedPage,
    obligationQueuePage,
  }) => {
    // The Compact/Comfortable density tabs were removed in the obligations
    // header polish (PR #4). Density is still persisted in saved views and
    // URL, but there's no UI control to toggle it anymore — drop the density
    // toggle from this test.
    await obligationQueuePage.goto()

    await obligationQueuePage.columnsButton.click()
    await obligationQueuePage.columnVisibilityOption('Assignee').click()
    await authenticatedPage.keyboard.press('Escape')
    await expect(authenticatedPage).toHaveURL(/hide=[^&]*assigneeName/)

    await obligationQueuePage.columnsButton.click()
    await obligationQueuePage.columnVisibilityOption('Assignee').click()
    await authenticatedPage.keyboard.press('Escape')
    await expect(authenticatedPage).not.toHaveURL(/hide=[^&]*assigneeName/)

    await obligationQueuePage.search('Arbor')
    await expect(authenticatedPage).toHaveURL(/q=Arbor/)
    await expect(obligationQueuePage.rowFor('Arbor & Vale LLC')).toBeVisible({ timeout: 15_000 })

    await obligationQueuePage.goto()
    await expect(authenticatedPage).toHaveURL(/\/deadlines$/)
    await obligationQueuePage.selectRow('Arbor & Vale LLC').click()
    const bulkActions = authenticatedPage.getByRole('region', { name: 'Bulk actions' })
    await bulkActions.getByRole('button', { name: 'Assign owner' }).click()
    await authenticatedPage.getByRole('menuitem', { name: 'E2E Owner' }).click()
    await expect(authenticatedPage.getByText('Owner assigned')).toBeVisible()
    await expect(
      authenticatedPage.getByRole('cell', { name: 'Assigned to you (E2E Owner)' }),
    ).toBeVisible()

    await bulkActions.getByRole('button', { name: 'Clear selection' }).click({ force: true })
    await expect(bulkActions).toBeHidden()
    await obligationQueuePage.selectRow('Arbor & Vale LLC').click()
    await obligationQueuePage.selectRow('Northstar Dental Group').click()
    await expect(bulkActions).toContainText('2 deadlines selected')

    await bulkActions.getByRole('button', { name: 'Export' }).click()
    let exportDialog = authenticatedPage.getByRole('dialog', { name: 'Export deadlines' })
    await exportDialog.getByRole('radio', { name: /CSV/ }).click()
    const [csvDownload] = await Promise.all([
      authenticatedPage.waitForEvent('download'),
      exportDialog.getByRole('button', { name: 'Export' }).click(),
    ])
    expect(csvDownload.suggestedFilename()).toMatch(/^obligations-\d{4}-\d{2}-\d{2}\.csv$/)

    await bulkActions.getByRole('button', { name: 'Export' }).click()
    exportDialog = authenticatedPage.getByRole('dialog', { name: 'Export deadlines' })
    await exportDialog.getByRole('radio', { name: /PDF report/ }).click()
    const [zipDownload] = await Promise.all([
      authenticatedPage.waitForEvent('download'),
      exportDialog.getByRole('button', { name: 'Export' }).click(),
    ])
    expect(zipDownload.suggestedFilename()).toMatch(/^obligations-pdfs-\d{4}-\d{2}-\d{2}\.zip$/)

    await bulkActions.getByRole('button', { name: 'Set status' }).click()
    await authenticatedPage.getByRole('menuitem', { name: 'Filed' }).click()
    await expect(obligationQueuePage.statusSelectFor('Arbor & Vale LLC')).toContainText('Filed')
    await expect(obligationQueuePage.statusSelectFor('Northstar Dental Group')).toContainText(
      'Filed',
    )
  })
})
