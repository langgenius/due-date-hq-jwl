import { expect, test } from '../fixtures/test'

// Feature: Audit log
// PRD: Firm-wide audit trail
// AC: E2E-AUDIT-OBLIGATIONS-STATUS-DETAIL

test.skip(
  Boolean(process.env.E2E_BASE_URL),
  'local e2e auth seed is not available on external targets',
)

test.describe('seeded audit trail', () => {
  test.use({ authSeed: 'obligations' })

  test('AC: E2E-AUDIT-OBLIGATIONS-STATUS-DETAIL traces a Deadlines write into audit detail', async ({
    auditPage,
    authenticatedPage,
    obligationQueuePage,
  }) => {
    await obligationQueuePage.goto()

    await obligationQueuePage.statusSelectFor('Arbor & Vale LLC').click()
    await obligationQueuePage.statusChangeOption('Filed').click()

    await expect(authenticatedPage.getByText('Status updated')).toBeVisible()

    await auditPage.goto()
    await expect(auditPage.heading).toBeVisible()
    await auditPage.selectAction('obligation.status.updated')

    await expect(authenticatedPage).toHaveURL(/\/audit\?action=obligation\.status\.updated$/)
    await expect(auditPage.eventRowFor('obligation.status.updated')).toBeVisible()

    await auditPage.eventRowFor('obligation.status.updated').click()

    await expect(auditPage.detailDrawer).toBeVisible()
    await expect(
      auditPage.detailDrawer.getByText('Deadline status changed', { exact: true }),
    ).toBeVisible()
    await expect(
      auditPage.detailDrawer.getByRole('heading', { name: 'What changed', level: 3 }),
    ).toBeVisible()
    await expect(auditPage.detailDrawer.getByText('Status', { exact: true })).toBeVisible()
    await expect(auditPage.detailDrawer.getByText('Not started', { exact: true })).toBeVisible()
    await expect(auditPage.detailDrawer.getByText('Filed', { exact: true })).toBeVisible()
    await expect(auditPage.detailDrawer.getByText('"status": "pending"')).toHaveCount(0)
  })
})
