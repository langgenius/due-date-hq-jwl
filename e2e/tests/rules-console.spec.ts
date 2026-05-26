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

  await expect(authenticatedPage).toHaveURL(/\/rules\/library(?:\?view=matrix)?$/)
  await expect(authenticatedPage.getByRole('button', { name: /Start review\s+\d+/ })).toBeVisible({
    timeout: 20_000,
  })

  await authenticatedPage.goto('/rules/sources')
  await expect(authenticatedPage).toHaveURL(/\/rules\/sources$/)
  await authenticatedPage.getByRole('button', { name: /^Watched\s+\d+$/ }).click()
  await expect(
    authenticatedPage.getByText('Alabama DOR Individual Income Tax Return Filing FAQ'),
  ).toBeVisible()

  await rulesConsolePage.libraryTab.click()
  await expect(authenticatedPage).toHaveURL(/\/rules\/library$/)
  await authenticatedPage.goto('/rules/library?filter=pending')
  await expect(authenticatedPage).toHaveURL(/\/rules\/library\?filter=pending/)
  await expect(authenticatedPage.getByRole('button', { name: /Start review\s+\d+/ })).toBeVisible({
    timeout: 20_000,
  })
})

test('AC: E2E-RULES-DETAIL renders a shipped rule detail workspace', async ({
  authenticatedPage,
}) => {
  await authenticatedPage.goto(
    '/rules/library?filter=pending&q=AL&from=coverage&rule=al.individual_income_return.candidate.2026',
  )

  const ruleDetail = authenticatedPage.getByRole('dialog', {
    name: /Alabama individual income tax return applicability/,
  })
  await expect(ruleDetail).toBeVisible({ timeout: 20_000 })
  await expect(ruleDetail.getByRole('heading', { name: "When it's due" })).toBeVisible()
  await expect(ruleDetail.getByRole('heading', { name: 'Evidence' })).toBeVisible()
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
