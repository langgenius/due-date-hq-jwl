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

    const actions = authenticatedPage.getByRole('region', { name: 'Priorities' })
    await expect(actions.getByRole('heading', { name: /Priorities/ })).toBeVisible()
    await expect(actions.getByText('Arbor & Vale LLC')).toBeVisible()
    await expect(actions.getByText('Northstar Dental Group')).toBeVisible()

    // 2026-06-11 (merged-brief redesign): the "Today" page renders the
    // MergedBriefCard "Priorities" region; its footer "See all deadlines"
    // link navigates to the full queue.
    await actions.getByRole('link', { name: 'See all deadlines' }).click()
    await expect(authenticatedPage).toHaveURL(/\/deadlines$/, { timeout: 15_000 })
    await expect(authenticatedPage.getByRole('heading', { name: 'Deadlines' })).toBeVisible({
      timeout: 15_000,
    })
  })

  test('AC: E2E-DASHBOARD-FILTERS opens action rows in the deadline drawer', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/')

    const actions = authenticatedPage.getByRole('region', { name: 'Priorities' })
    // Priority actions are table rows with click handlers; match the stable
    // client + action text without depending on the rest of the row summary.
    const arborAction = actions.getByRole('row', {
      name: /Attach the source document for Arbor & Vale LLC/,
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
    await expect(obligationQueuePage.rowFor('Arbor & Vale LLC')).toBeVisible()
    await expect(obligationQueuePage.rowFor('Northstar Dental Group')).toBeVisible()

    await obligationQueuePage.search('Arbor')
    await expect(authenticatedPage).toHaveURL(/\/deadlines\?q=Arbor$/)
    await expect(obligationQueuePage.rowFor('Arbor & Vale LLC')).toBeVisible()
    await expect(obligationQueuePage.rowFor('Northstar Dental Group')).toBeHidden()

    await obligationQueuePage.clearSearch()
    await expect(authenticatedPage).toHaveURL(/\/deadlines$/)
    // 2026-06-16 (queue toolbar): the status scope is a collapsed dropdown.
    // Choosing "In review" still maps to the full review-ish status set.
    await obligationQueuePage.selectStatusScope('In review')
    await expect
      .poll(() => new URL(authenticatedPage.url()).searchParams.get('status'))
      .toBe('in_progress,review,extended')
    await expect(obligationQueuePage.rowFor('Northstar Dental Group')).toBeVisible()
    await expect(obligationQueuePage.rowFor('Arbor & Vale LLC')).toBeHidden()
    await expect(obligationQueuePage.statusFilterButton).toContainText('In review')

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
    // 2026-06-29 (detail drawer IA): on the page/panel surface the section nav is
    // a real ARIA tablist (roving tabindex) — its items are tabs, not buttons.
    const sectionNav = deadlineDrawer.getByRole('tablist', { name: 'Deadline sections' })
    await expect(sectionNav.getByRole('tab', { name: 'Status' })).toBeVisible()
    await expect(sectionNav.getByRole('tab', { name: /^Materials\b/ })).toBeVisible()
    await expect(sectionNav.getByRole('tab', { name: /^Record\b/ })).toBeVisible()
    await expect(sectionNav.getByRole('tab', { name: /^Activity\b/ })).toBeVisible()

    await sectionNav.getByRole('tab', { name: /^Materials\b/ }).click()
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

    const notifications = authenticatedPage.getByRole('region', { name: /Notifications/ })
    await expect(notifications.getByText('Status changed to Filed', { exact: true })).toBeVisible()
    await expect(notifications.getByText(/Audit [a-f0-9-]{8}/)).toBeVisible()
    await expect(obligationQueuePage.statusSelectFor('Arbor & Vale LLC')).toContainText('Filed')

    await authenticatedPage.keyboard.press('P')
    await expect(obligationQueuePage.statusSelectFor('Arbor & Vale LLC')).toContainText('Filed')
  })

  test('AC: E2E-OBLIGATIONS-COMPLETE hides columns and bulk updates rows', async ({
    authenticatedPage,
    obligationQueuePage,
  }) => {
    test.setTimeout(60_000)

    // The Compact/Comfortable density tabs were removed in the obligations
    // header polish (PR #4). Density is still persisted in saved views and
    // URL, but there's no UI control to toggle it anymore — drop the density
    // toggle from this test.
    await obligationQueuePage.goto()

    await obligationQueuePage.setColumnVisible('Assignee', false)
    await obligationQueuePage.dismissMenus()
    await expect(authenticatedPage).toHaveURL(/hide=[^&]*assigneeName/)

    await obligationQueuePage.setColumnVisible('Assignee', true)
    await obligationQueuePage.dismissMenus()
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

    // No force — if something intercepts the pointer again (e.g. a lingering
    // menu backdrop) the failure should name the interceptor instead of
    // silently clicking through to a dead overlay.
    await bulkActions.getByRole('button', { name: 'Clear selection' }).click()
    await expect(bulkActions).toBeHidden()
    await obligationQueuePage.selectRow('Arbor & Vale LLC').click()
    await obligationQueuePage.selectRow('Northstar Dental Group').click()
    // The count renders in its own node, so textContent carries no space
    // between "2" and "deadlines selected".
    await expect(bulkActions).toContainText(/2\s*deadlines selected/)

    // "Export" moved into the bulk bar's "More" overflow menu (page-feedback
    // #12) and reads "Export selected" there.
    await bulkActions.getByRole('button', { name: 'More bulk actions' }).click()
    await authenticatedPage.getByRole('menuitem', { name: 'Export selected' }).click()
    let exportDialog = authenticatedPage.getByRole('dialog', { name: 'Export deadlines' })
    await exportDialog.getByRole('radio', { name: /CSV/ }).click()
    const [csvDownload] = await Promise.all([
      authenticatedPage.waitForEvent('download'),
      exportDialog.getByRole('button', { name: 'Export' }).click(),
    ])
    expect(csvDownload.suggestedFilename()).toMatch(/^obligations-\d{4}-\d{2}-\d{2}\.csv$/)

    await bulkActions.getByRole('button', { name: 'More bulk actions' }).click()
    await authenticatedPage.getByRole('menuitem', { name: 'Export selected' }).click()
    exportDialog = authenticatedPage.getByRole('dialog', { name: 'Export deadlines' })
    await exportDialog.getByRole('radio', { name: /PDF report/ }).click()
    const [zipDownload] = await Promise.all([
      authenticatedPage.waitForEvent('download', { timeout: 45_000 }),
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
