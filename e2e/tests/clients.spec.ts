import { expect, test } from '../fixtures/test'

// Feature: Clients management
// PRD: P1 client directory
// AC: E2E-CLIENTS-NAV, E2E-CLIENTS-CREATE, E2E-CLIENTS-FACTS-SEED,
// E2E-CLIENTS-FILTERS, E2E-CLIENTS-DETAIL

test.skip(
  Boolean(process.env.E2E_BASE_URL),
  'local e2e auth seed is not available on external targets',
)

test('AC: E2E-CLIENTS-NAV opens the Clients directory from the shell', async ({
  appShellPage,
  authenticatedPage,
  clientsPage,
}) => {
  await appShellPage.goto()
  await appShellPage.clientsLink.click()

  await expect(authenticatedPage).toHaveURL(/\/clients$/)
  await expect(appShellPage.clientsLink).toHaveAttribute('aria-current', 'page')
  await expect(clientsPage.directoryTitle).toBeVisible()
  await expect(clientsPage.clientFilter).toBeVisible()
  await expect(clientsPage.entityFilter).toBeVisible()
  await expect(clientsPage.stateFilter).toBeVisible()
})

test('AC: E2E-CLIENTS-CREATE creates a manual client through oRPC', async ({
  authenticatedPage,
  clientsPage,
}) => {
  const clientName = 'E2E Harbor Advisory LLC'

  await clientsPage.goto()
  await clientsPage.createClient({
    name: clientName,
    ein: '23-4567890',
    state: 'CA',
    county: 'Alameda',
    email: 'harbor@example.com',
  })

  await expect(authenticatedPage.getByText('Client created')).toBeVisible()
  await expect(clientsPage.clientDetailHeading(clientName)).toBeVisible()
  // A freshly created client lands on the default `work` tab, relabelled
  // "Filing plan" in the IA redesign — `ClientWorkPlanPanel` renders the
  // `TabSection` heading <h2>Filing plan</h2>
  // (apps/app/src/features/clients/ClientWorkPlanPanel.tsx:383).
  await expect(clientsPage.detailSection('Filing plan')).toBeVisible()
  // The `info` tab key was relabelled "Client info" → "Setup"
  // (apps/app/src/features/clients/ClientDetailWorkspace.tsx:1048,
  // `<Trans>Setup</Trans>`). Substring match tolerates the trailing
  // "N required fact(s) missing" count badge baked into the tab's
  // accessible name when the client still has gaps (line 1063-1072).
  await authenticatedPage.getByRole('tab', { name: 'Setup' }).click()
  await expect(clientsPage.detailSection('Filing jurisdictions')).toBeVisible()
  await expect(clientsPage.detailSection('Compliance posture')).toBeVisible()
})

test.describe('seeded client facts', () => {
  test.use({ authSeed: 'obligations' })

  test('AC: E2E-CLIENTS-FACTS-SEED summarizes ready seeded clients', async ({ clientsPage }) => {
    await clientsPage.goto()

    await expect(clientsPage.rowFor('Arbor & Vale LLC')).toContainText('LLC')
    await expect(clientsPage.rowFor('Arbor & Vale LLC')).toContainText('CA')
    await expect(clientsPage.rowFor('Arbor & Vale LLC')).toContainText('MC')
    await expect(clientsPage.rowFor('Unassigned Foundry LLC')).toContainText('Unassigned')
  })

  test('AC: E2E-CLIENTS-FILTERS persists client, entity, state, and empty results', async ({
    authenticatedPage,
    clientsPage,
  }) => {
    await clientsPage.goto()

    await clientsPage.selectEntityFilter('S corp')
    await expect(authenticatedPage).toHaveURL(/\/clients\?entity=s_corp$/)
    await expect(clientsPage.rowFor('Northstar Dental Group')).toBeVisible()
    await expect(clientsPage.rowFor('Arbor & Vale LLC')).toBeHidden()

    await clientsPage.selectStateFilter('NY')
    await expect(authenticatedPage).toHaveURL(/entity=s_corp/)
    await expect(authenticatedPage).toHaveURL(/state=NY/)
    await expect(clientsPage.rowFor('Northstar Dental Group')).toBeVisible()

    await clientsPage.selectClientFilter('Arbor & Vale LLC')
    await expect(authenticatedPage).toHaveURL(/clients=/)
    await expect(clientsPage.filteredEmptyState).toBeVisible()
    await expect(
      authenticatedPage.getByText(
        'Clear search or filters to return to the full practice directory.',
      ),
    ).toBeVisible()
  })

  test('AC: E2E-CLIENTS-DETAIL opens seeded client detail from the table', async ({
    authenticatedPage,
    clientsPage,
  }) => {
    await clientsPage.goto()

    await clientsPage.rowFor('Unassigned Foundry LLC').click()

    await expect(clientsPage.clientDetailHeading('Unassigned Foundry LLC')).toBeVisible()
    await expect(
      authenticatedPage.getByRole('button', { name: 'Change owner — currently unassigned' }),
    ).toBeVisible()
    // The open-filing count surfaces on the detail header chip — a button
    // labelled "View open filings for this client". The chip renders status-
    // first now: "Open" over the count "1" over a status sub-line ("In
    // progress"), concatenating to "Open1In progress", so assert "Open" + count.
    await expect(
      authenticatedPage.getByRole('button', { name: 'View open filings for this client' }),
    ).toContainText(/Open\s*1/i)
    // IA redesign renamed the three detail tabs (URL keys unchanged):
    //   work → "Filings" tab (its section header is still "Filing plan"),
    //   info → "Setup", activity → "History"
    // (apps/app/src/features/clients/ClientDetailWorkspace.tsx).
    await authenticatedPage.getByRole('tab', { name: 'Filings' }).click()
    await expect(clientsPage.detailSection('Filing plan')).toBeVisible()
    await authenticatedPage.getByRole('tab', { name: 'Setup' }).click()
    await expect(clientsPage.detailSection('Filing jurisdictions')).toBeVisible()
    await expect(authenticatedPage.getByText('Entity type')).toBeVisible()
    await expect(authenticatedPage.getByText('Federal EIN')).toBeVisible()
    await expect(authenticatedPage).toHaveURL(/\/clients\/[^?]+/)
  })

  test('AC: E2E-CLIENTS-ADD-DEADLINE shows readable category and form pickers', async ({
    authenticatedPage,
    clientsPage,
  }) => {
    await clientsPage.goto()

    await clientsPage.rowFor('Unassigned Foundry LLC').click()
    await expect(clientsPage.clientDetailHeading('Unassigned Foundry LLC')).toBeVisible()

    await authenticatedPage.getByRole('button', { name: 'Add deadline' }).first().click()

    const dialog = authenticatedPage.getByRole('dialog', { name: 'Add deadline' })
    await expect(dialog).toBeVisible()

    await expect(dialog.getByText('Base due date')).toHaveCount(0)
    await expect(dialog.getByText('YYYY-MM-DD')).toHaveCount(0)
    await expect(dialog.getByText(/年|月|日/)).toHaveCount(0)
    const taxYearPicker = dialog.locator('#obligation-tax-year')
    await expect(taxYearPicker).toBeVisible()
    await expect(taxYearPicker).toContainText(/\d{4}/)

    const categoryPicker = dialog.locator('#obligation-tax-type')
    await expect(categoryPicker).toHaveAttribute('role', 'combobox')
    await categoryPicker.click()
    await expect(authenticatedPage.getByText('Recommended for this client')).toHaveCount(0)
    await expect(authenticatedPage.getByText('Other common deadlines')).toHaveCount(0)
    await expect(authenticatedPage.getByText('Partnership income tax return')).toBeVisible()
    await expect(authenticatedPage.getByText('Business return extension')).toBeVisible()
    await expect(authenticatedPage.getByText('Franchise or annual tax payment')).toBeVisible()
    await expect(authenticatedPage.getByText('Schedule K-1 dependency')).toHaveCount(0)
    await expect(authenticatedPage.getByText('federal_1120s')).toHaveCount(0)
    await expect(authenticatedPage.getByText('ca_llc_annual_tax')).toHaveCount(0)
    await expect(authenticatedPage.getByText('California LLC annual tax')).toHaveCount(0)
    await expect(authenticatedPage.getByText('taxType')).toHaveCount(0)
    await authenticatedPage.getByText('S corporation income tax return').click()
    await expect(categoryPicker).toContainText('S corporation income tax return')
    await categoryPicker.click()
    await expect(authenticatedPage.getByPlaceholder('Search deadline categories…')).toHaveCount(0)
    await expect(authenticatedPage.getByText('federal_1120s')).toHaveCount(0)
    await authenticatedPage.keyboard.press('Escape')

    const formPicker = dialog.locator('#obligation-form-names')
    await expect(formPicker).toHaveAttribute('role', 'combobox')
    await expect(formPicker).toContainText('Form 1120-S')
    await formPicker.click()
    const suggestedForms = authenticatedPage.getByLabel('Suggested forms and vouchers')
    await expect(suggestedForms).toBeVisible()
    await expect(suggestedForms.getByText('Form 1120-S', { exact: true })).toBeVisible()
    await authenticatedPage.getByPlaceholder('Search forms and vouchers…').fill('7004')
    await expect(suggestedForms.getByText('Form 7004', { exact: true })).toBeVisible()
    await expect(suggestedForms.getByText('Schedule K-1', { exact: true })).toHaveCount(0)
  })
})
