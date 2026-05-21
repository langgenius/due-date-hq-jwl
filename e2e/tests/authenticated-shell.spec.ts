import { expect, test } from '../fixtures/test'

// Feature: Authenticated app shell
// PRD: S1 protected workbench entry
// AC: E2E-AUTH-SHELL, E2E-AUTH-GUEST-REDIRECT, E2E-AUTH-COMMANDS

test.skip(
  Boolean(process.env.E2E_BASE_URL),
  'local e2e auth seed is not available on external targets',
)

test('AC: E2E-AUTH-GUEST-REDIRECT sends signed-in guests to their target', async ({
  authenticatedPage,
  obligationQueuePage,
}) => {
  await authenticatedPage.goto('/login?redirectTo=/obligations')

  await expect(authenticatedPage).toHaveURL(/\/obligations$/)
  await expect(obligationQueuePage.heading).toBeVisible()
})

test('AC: E2E-AUTH-SHELL renders the protected dashboard shell', async ({
  appShellPage,
  authenticatedPage,
}) => {
  await appShellPage.goto()

  await expect(authenticatedPage).toHaveURL(/\/$/)
  await expect(appShellPage.primaryNavigation).toBeVisible()
  await expect(appShellPage.todayLink).toHaveAttribute('aria-current', 'page')
  await expect(
    appShellPage.primaryNavigation.getByRole('link', { name: /^Calendar$/ }),
  ).toHaveCount(0)
  await expect(authenticatedPage.getByRole('heading', { name: /^Today/ })).toBeVisible()
  await expect(authenticatedPage.getByRole('region', { name: 'Actions this week' })).toBeVisible()
  await expect(appShellPage.importClientsButton).toBeVisible()
})

test('AC: E2E-AUTH-COMMANDS navigates and opens implemented actions', async ({
  appShellPage,
  authenticatedPage,
  migrationWizardPage,
}) => {
  await appShellPage.goto()

  await appShellPage.openCommandPalette()
  await expect(appShellPage.commandDialog).toBeVisible()
  // The Rules-tabs-to-pages refactor split the old single "Rules" entry into
  // per-area items (Coverage / Sources / Rule library / Radar / Temporary rules);
  // verify the per-area entries plus the navigation-mode items still seeded.
  await Promise.all(
    [
      'Today',
      'Obligations',
      'Reminders',
      'Calendar sync',
      'Notifications',
      'Team workload',
      'Clients',
      'Opportunities',
      'Practice profile',
      'Coverage',
      'Sources',
      'Rule library',
      'Pulse',
      'Temporary rules',
      'Members',
      'Billing',
      'Audit log',
      'Settings',
    ].map((label) => expect(appShellPage.commandItem(label)).toBeVisible()),
  )
  await expect(appShellPage.commandDialog.getByText('Calendar', { exact: true })).toHaveCount(0)
  await appShellPage.commandItem('Calendar sync').click()

  await expect(authenticatedPage).toHaveURL(/\/obligations\/calendar$/)
  await expect(authenticatedPage.getByText('Subscription notes')).toBeVisible()
  await expect(
    authenticatedPage.getByRole('link', { name: 'Back to Obligations' }),
  ).toHaveAttribute('href', '/obligations')

  await appShellPage.openCommandPalette()
  await appShellPage.commandItem('Rule library').click()

  // After the rules-tabs-to-pages refactor, the rule library is its own route
  // (`/rules/library`) and no longer renders Coverage as a tab — Coverage and
  // Sources are now separate routes reachable from the command palette.
  await expect(authenticatedPage).toHaveURL(/\/rules\/library$/)

  await appShellPage.openCommandPalette()
  await expect(appShellPage.commandDialog).toBeVisible()
  await appShellPage.commandItem('Import clients').click()

  await expect(migrationWizardPage.dialog).toBeVisible()
  await expect(migrationWizardPage.pasteClientData).toBeVisible()
})

test('AC: E2E-AUTH-SHORTCUTS opens help and navigates to workload', async ({
  appShellPage,
  authenticatedPage,
  workloadPage,
}) => {
  await appShellPage.goto()

  await appShellPage.openShortcutHelp()
  await expect(appShellPage.shortcutDialog.getByText('Go to Team workload')).toBeVisible()

  await authenticatedPage.keyboard.press('Escape')
  await authenticatedPage.keyboard.press('G')
  await authenticatedPage.keyboard.press('T')

  await expect(authenticatedPage).toHaveURL(/\/workload$/)
  await expect(workloadPage.upgradeHeading).toBeVisible()
})
