import { expect, test } from '../fixtures/test'

// Feature: Opportunities
// PRD: Future business guidance
// AC: E2E-OPPORTUNITIES-PAGE, E2E-OPPORTUNITIES-CLIENT-CARD

test.skip(
  Boolean(process.env.E2E_BASE_URL),
  'local e2e auth seed is not available on external targets',
)

test.describe('seeded opportunities', () => {
  test.use({ authSeed: 'obligations' })

  test('AC: E2E-OPPORTUNITIES-PAGE surfaces real client business cues', async ({
    authenticatedPage,
    opportunitiesPage,
  }) => {
    await opportunitiesPage.goto()

    await expect(authenticatedPage).toHaveURL(/\/opportunities$/)
    await expect(opportunitiesPage.heading).toBeVisible()
    await expect(authenticatedPage.getByText('Business guidance queue')).toBeVisible()
    await expect(
      authenticatedPage.getByText(
        'Open the client to review facts before deciding whether to follow up.',
      ),
    ).toBeVisible()
    await expect(opportunitiesPage.advisorySummary).toContainText('1')
    await expect(opportunitiesPage.retentionSummary).toContainText('1')

    const advisoryRow = opportunitiesPage.rowFor('Arbor & Vale LLC')
    await expect(advisoryRow).toContainText('Consider an advisory conversation')
    await expect(advisoryRow).toContainText('Client importance: 3')
    await expect(advisoryRow).toContainText('Owner count: 2')

    const retentionRow = opportunitiesPage.rowFor('Copperline Studios')
    await expect(retentionRow).toContainText('Relationship check-in candidate')
    await expect(retentionRow).toContainText('Late filings in 12 months: 2')

    await retentionRow.getByRole('button', { name: 'Open client' }).click()
    await expect(authenticatedPage).toHaveURL(/\/clients\/[^?]+/)
    await expect(
      authenticatedPage.getByRole('heading', { name: 'Copperline Studios' }),
    ).toBeVisible()
  })

  test('AC: E2E-OPPORTUNITIES-CLIENT-CARD appears in client detail', async ({
    authenticatedPage,
    opportunitiesPage,
  }) => {
    await opportunitiesPage.goto()
    await opportunitiesPage
      .rowFor('Arbor & Vale LLC')
      .getByRole('button', { name: 'Open client' })
      .click()

    await expect(authenticatedPage.getByRole('heading', { name: 'Arbor & Vale LLC' })).toBeVisible()
    await authenticatedPage.getByRole('tab', { name: 'Suggested forms' }).click()
    const card = authenticatedPage
      .locator('section')
      .filter({
        has: authenticatedPage.getByRole('heading', { name: 'Future business cues' }),
      })
      .last()
    await expect(card).toBeVisible()
    await expect(card).toContainText('Consider an advisory conversation')
    await card.getByRole('button', { name: 'View all opportunities' }).click()
    await expect(authenticatedPage).toHaveURL(/\/opportunities$/)
  })
})
