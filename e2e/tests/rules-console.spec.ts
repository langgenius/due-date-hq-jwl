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
  // After the sidebar tidy + rules library merge, only "Rule library" remains
  // as a direct sidebar entry. Coverage and Sources are reachable as their
  // own routes (and from "View …" strips inside `/rules/library`), but they
  // no longer appear as sidebar links. Navigate directly to verify each
  // dedicated route renders the expected content.
  await rulesConsolePage.goto()

  await expect(authenticatedPage).toHaveURL(/\/rules\/coverage$/)
  // The Coverage KPI strip uses canonical terminology: "Active rules" and
  // "Needs review" (renamed from "Pending review" in the rules library merge).
  await expect(authenticatedPage.getByText('Active rules', { exact: true })).toBeVisible()
  await expect(authenticatedPage.getByText('Needs review', { exact: true })).toBeVisible()

  await authenticatedPage.goto('/rules/sources')
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
