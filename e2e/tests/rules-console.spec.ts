import { expect, test } from '../fixtures/test'

// Feature: Rules
// PRD: Rules source registry and rule pack
// AC: E2E-RULES-TABS, E2E-RULES-DETAIL, E2E-RULES-PREVIEW

test.skip(
  Boolean(process.env.E2E_BASE_URL),
  'local e2e auth seed is not available on external targets',
)

test.use({ authSeed: 'obligations' })

test('AC: E2E-RULES-TABS each former rules tab is now a dedicated route', async ({
  authenticatedPage,
  rulesConsolePage,
}) => {
  await rulesConsolePage.goto()

  await expect(authenticatedPage).toHaveURL(/\/rules\/coverage$/)
  await expect(authenticatedPage.getByText('Active rules', { exact: true })).toBeVisible()
  await expect(authenticatedPage.getByText('Pending review', { exact: true })).toBeVisible()

  await rulesConsolePage.sourcesTab.click()
  await expect(authenticatedPage).toHaveURL(/\/rules\/sources$/)
  await authenticatedPage.getByRole('button', { name: /^Healthy\s+\d+$/ }).click()
  await expect(
    authenticatedPage.getByText('IRS Publication 509 (2026), Tax Calendars'),
  ).toBeVisible()

  await rulesConsolePage.libraryTab.click()
  await expect(authenticatedPage).toHaveURL(/\/rules\/library$/)
  await authenticatedPage.getByRole('button', { name: /^Needs review\s+\d+$/ }).click()
  await expect(
    authenticatedPage.getByText('al.individual_income_return.candidate.2026'),
  ).toBeVisible()
})

test('AC: E2E-RULES-DETAIL opens a shipped rule detail drawer', async ({
  authenticatedPage,
  rulesConsolePage,
}) => {
  await rulesConsolePage.goto()
  await rulesConsolePage.libraryTab.click()
  await authenticatedPage.getByRole('button', { name: /^Needs review\s+\d+$/ }).click()
  await authenticatedPage
    .getByRole('button', {
      name: /Open rule detail: Alabama individual income tax return applicability/,
    })
    .click()

  await expect(
    authenticatedPage.getByRole('heading', {
      name: 'Alabama individual income tax return applicability',
    }),
  ).toBeVisible()
  await expect(authenticatedPage.getByText('Due date logic')).toBeVisible()
  await expect(authenticatedPage.getByText('Evidence', { exact: true })).toBeVisible()
})

test('AC: E2E-RULES-PREVIEW runs the implemented obligation preview', async ({
  authenticatedPage,
  rulesConsolePage,
}) => {
  await rulesConsolePage.gotoPreview()

  await expect(authenticatedPage).toHaveURL(/\/rules\/preview$/)
  const obligationPreviewForm = authenticatedPage.locator('form').filter({
    has: authenticatedPage.getByRole('button', { name: /Run preview/ }),
  })
  await obligationPreviewForm.getByRole('combobox').first().click()
  await authenticatedPage.getByRole('option', { name: /Arbor & Vale LLC/ }).click()
  await authenticatedPage.getByRole('button', { name: /Run preview/ }).click()

  await expect(authenticatedPage.getByText(/REMINDER READY/)).toBeVisible()
  await expect(authenticatedPage.getByText(/REQUIRES REVIEW/)).toBeVisible()
  await expect(
    authenticatedPage.getByText('Federal Form 1065 return for partnerships'),
  ).toBeVisible()
})
