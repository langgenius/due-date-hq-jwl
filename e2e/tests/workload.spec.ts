import type { Locator } from '@playwright/test'
import { seedBillingSubscription } from '../fixtures/billing'
import { expect, test } from '../fixtures/test'

// Feature: Team workload
// PRD: Enterprise shared deadline operations
// AC: E2E-WORKLOAD-SOLO-UPGRADE, E2E-WORKLOAD-FIRM-METRICS, E2E-WORKLOAD-OBLIGATIONS-LINKS

test.skip(
  Boolean(process.env.E2E_BASE_URL),
  'local e2e auth seed is not available on external targets',
)

test.describe('seeded team workload', () => {
  test.use({ authSeed: 'obligations' })

  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.clock.setFixedTime(new Date('2026-04-30T12:00:00.000Z'))
  })

  test('AC: E2E-WORKLOAD-SOLO-UPGRADE keeps Solo locked but discoverable', async ({
    authenticatedPage,
    workloadPage,
  }) => {
    // Team workload moved out of the primary sidebar in the sidebar-tidy
    // pass (commit 4abdd53) — it lives behind the Settings hub now. The
    // upgrade gate on the /workload page itself is the surviving paywall
    // surface, so we test it directly instead of asserting on a sidebar
    // link that no longer exists.
    await workloadPage.goto()

    await expect(authenticatedPage).toHaveURL(/\/workload$/)
    await expect(workloadPage.upgradeHeading).toBeVisible()
    await workloadPage.upgradePlanButton.click()
    await expect(authenticatedPage).toHaveURL(/\/billing$/)

    await workloadPage.goto()
    await workloadPage.openObligationQueueButton.click()
    await expect(authenticatedPage).toHaveURL(/\/deadlines$/)
  })

  test('AC: E2E-WORKLOAD-FIRM-METRICS reads paid-plan workload from real queue rows', async ({
    authSession,
    request,
    workloadPage,
  }) => {
    await seedBillingSubscription(request, { firmId: authSession.firmId })

    await workloadPage.goto()

    await expect(workloadPage.ownerWorkloadHeading).toBeVisible()
    await expectWorkloadCells(workloadPage.rowFor('M. Chen'), ['M. Chen', '1', '0', '1', '0', '0'])
    await expectWorkloadCells(workloadPage.rowFor('A. Rivera'), [
      'A. Rivera',
      '1',
      '0',
      '1',
      '0',
      '1',
    ])
    await expectWorkloadCells(workloadPage.rowFor('Unassigned'), [
      /Unassigned/,
      '1',
      '0',
      '1',
      '0',
      '0',
      'Risk',
    ])
  })

  test('AC: E2E-WORKLOAD-OBLIGATIONS-LINKS deep-links workload triage into Deadlines', async ({
    authSession,
    authenticatedPage,
    request,
    obligationQueuePage,
    workloadPage,
  }) => {
    await seedBillingSubscription(request, { firmId: authSession.firmId })

    await workloadPage.goto()
    await workloadPage.rowFor('M. Chen').locator('td').nth(3).getByRole('link').click()

    await expect(authenticatedPage).toHaveURL(/\/deadlines\?.*assignee=M\.(?:\+|%20)Chen/)
    await expect(authenticatedPage).toHaveURL(/\/deadlines\?.*due=overdue/)
    await expect(obligationQueuePage.heading).toBeVisible()
    await expect(obligationQueuePage.rowFor('Arbor & Vale LLC')).toBeVisible()
    await expect(obligationQueuePage.rowFor('Northstar Dental Group')).toBeHidden()

    await workloadPage.goto()
    await workloadPage.rowFor('Unassigned').getByRole('button', { name: 'Open' }).click()

    await expect(authenticatedPage).toHaveURL(/\/deadlines\?/)
    await expect
      .poll(() => new URL(authenticatedPage.url()).searchParams.get('owner'))
      .toBe('unassigned')
    await expect
      .poll(() => new URL(authenticatedPage.url()).searchParams.get('status'))
      .toBe('pending,in_progress,waiting_on_client,review,blocked')
    await expect(obligationQueuePage.rowFor('Unassigned Foundry LLC')).toBeVisible()
    await expect(obligationQueuePage.rowFor('Copperline Studios')).toBeHidden()
  })
})

async function expectWorkloadCells(row: Locator, expected: Array<string | RegExp>): Promise<void> {
  await Promise.all(
    expected.map((value, index) => expect(row.locator('td').nth(index)).toContainText(value)),
  )
}
