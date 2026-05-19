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
    appShellPage,
    authenticatedPage,
    opportunitiesPage,
  }) => {
    await appShellPage.goto()
    await appShellPage.opportunitiesLink.click()

    await expect(authenticatedPage).toHaveURL(/\/opportunities$/)
    await expect(opportunitiesPage.heading).toBeVisible()
    await expect(
      authenticatedPage.getByText(
        'Lightweight client conversation cues for future service, retention, and engagement scope.',
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

    await retentionRow.getByRole('link', { name: 'Open client' }).click()
    await expect(authenticatedPage).toHaveURL(/\/clients\/[^?]+/)
    await expect(
      authenticatedPage.getByRole('heading', { name: 'Copperline Studios' }),
    ).toBeVisible()
  })

  test('AC: E2E-OPPORTUNITIES-CLIENT-CARD appears in client detail', async ({
    authenticatedPage,
    clientsPage,
  }) => {
    await clientsPage.goto()
    await clientsPage.rowFor('Arbor & Vale LLC').click()

    await expect(authenticatedPage.getByRole('heading', { name: 'Arbor & Vale LLC' })).toBeVisible()
    const card = authenticatedPage.locator('[data-slot="card"]').filter({
      has: authenticatedPage.getByText('Future business cues', { exact: true }),
    })
    await expect(card).toBeVisible()
    await expect(card).toContainText('Consider an advisory conversation')
    await expect(card.getByRole('link', { name: 'View all opportunities' })).toHaveAttribute(
      'href',
      '/opportunities',
    )
  })
})
