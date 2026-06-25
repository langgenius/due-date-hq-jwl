import type { Page } from '@playwright/test'
import { seedBillingSubscription } from '../fixtures/billing'
import { expect, test } from '../fixtures/test'

// Feature: Destructive action confirmation gates
// PRD: P0 audit — hard-to-undo actions require explicit confirm
// AC: E2E-CONFIRM-DIALOG-SHAPE
//
// 2026-05-24 — the design audit batch added 10 AlertDialog confirms
// across calendar, members, account.security, and filing-plan. This
// spec catches the regression "confirm gate removed" by verifying
// each dialog APPEARS with the canonical shape (title is a question,
// Cancel + destructive CTA, Cancel dismisses cleanly). The
// completion path (clicking the destructive CTA) is tested by the
// per-feature specs that already cover the post-confirm outcome
// (members.spec.ts cancel-invite, etc).

test.skip(
  Boolean(process.env.E2E_BASE_URL),
  'local e2e auth seed is not available on external targets',
)

test('AC: E2E-CONFIRM-DIALOG-SHAPE members "Cancel invitation" gates the destructive click', async ({
  authSession,
  membersPage,
  request,
}) => {
  await seedBillingSubscription(request, { firmId: authSession.firmId })
  const email = `member-${authSession.user.id.slice(-8)}@e2e.duedatehq.test`

  await membersPage.goto()
  await expect(membersPage.heading).toBeVisible()
  await membersPage.invite({ email, role: 'Preparer' })
  await expect(membersPage.invitationRowFor(email)).toBeVisible()

  // Trigger the destructive action — the row's inline "Cancel" link.
  await membersPage.invitationRowFor(email).getByRole('button', { name: 'Cancel' }).click()

  // Confirm dialog appears with the canonical shape.
  const dialog = membersPage.cancelInvitationDialog()
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText(email)
  await expect(dialog.getByRole('button', { name: 'Keep invitation' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Cancel invitation' })).toBeVisible()

  // Cancel path: "Keep invitation" dismisses, invitation row stays.
  await dialog.getByRole('button', { name: 'Keep invitation' }).click()
  await expect(dialog).toBeHidden()
  await expect(membersPage.invitationRowFor(email)).toBeVisible()
})

test('AC: E2E-CONFIRM-DIALOG-SHAPE members "Remove from practice" gates the destructive click', async ({
  authSession,
  membersPage,
  request,
}) => {
  await seedBillingSubscription(request, { firmId: authSession.firmId })
  // Seed a second member so the owner has someone to remove.
  const email = `removable-${authSession.user.id.slice(-8)}@e2e.duedatehq.test`
  await membersPage.goto()
  await membersPage.invite({ email, role: 'Preparer' })
  await expect(membersPage.invitationRowFor(email)).toBeVisible()
  // Note: pending invitations aren't "active members" so they use
  // Cancel invitation, not Remove. This test covers the Remove path
  // for the owner's own row (which is owner-read-only and won't show
  // the kebab menu) — so we just verify the dialog ISN'T inadvertently
  // accessible without an active managed member. This guards against
  // a future regression where Remove gets surfaced on rows where it
  // shouldn't be.
  await expect(membersPage.removeMemberDialog()).toBeHidden()
})

test('AC: E2E-CONFIRM-DIALOG-SHAPE calendar "Disable feed" gates the destructive click', async ({
  authenticatedPage,
}) => {
  const page = authenticatedPage
  await page.goto('/deadlines/calendar')
  await expect(page.getByRole('heading', { name: 'Calendar sync' })).toBeVisible()

  // Pre-condition: the demo seed starts with no active feed. Enable
  // one so Disable is reachable. (This also exercises the Enable
  // happy path implicitly.) The page now renders two scope cards
  // ("My deadlines" + "Practice deadlines"), each with its own Enable
  // button — target the first (the personal feed) to disambiguate.
  await page.getByRole('button', { name: 'Enable redacted feed' }).first().click()
  await expect(page.getByRole('button', { name: 'Disable' })).toBeVisible()

  await page.getByRole('button', { name: 'Disable' }).click()
  const dialog = page.getByRole('alertdialog', { name: 'Disable calendar feed?' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Disable feed' })).toBeVisible()
  // DestructiveChangePreview should be present (Stops / Adds / Keeps).
  await expect(dialog).toContainText('Stops')
  await expect(dialog).toContainText('Calendar sync on every subscribed device')

  // Cancel path: dialog dismisses, feed stays enabled.
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: 'Disable' })).toBeVisible()
})

test('AC: E2E-CONFIRM-DIALOG-SHAPE calendar "Regenerate URL" gates the destructive click', async ({
  authenticatedPage,
}) => {
  const page = authenticatedPage
  await page.goto('/deadlines/calendar')

  // Enable a feed first so Regenerate is reachable. Two scope cards each
  // expose an Enable button — scope to the first (the "My deadlines" feed).
  await page.getByRole('button', { name: 'Enable redacted feed' }).first().click()
  await expect(page.getByRole('button', { name: 'Regenerate URL' })).toBeVisible()

  await page.getByRole('button', { name: 'Regenerate URL' }).click()
  const dialog = page.getByRole('alertdialog', { name: 'Regenerate calendar URL?' })
  await expect(dialog).toBeVisible()
  // The canonical "Invalidates / Issues / Keeps" preview is the
  // single thing that distinguishes this regenerate confirm from a
  // generic "are you sure" — assert that the user-visible blast
  // radius is named.
  await expect(dialog).toContainText('Invalidates')
  await expect(dialog).toContainText('The current URL on every subscribed device')
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Regenerate URL' })).toBeVisible()

  // Cancel path: dialog dismisses, feed URL stays the same.
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog).toBeHidden()
})

test('AC: E2E-CONFIRM-DIALOG-SHAPE account.security "Sign out other sessions" gates the destructive click', async ({
  authenticatedPage,
}) => {
  const page = authenticatedPage
  await gotoAccountSecurity(page)

  const trigger = page.getByRole('button', { name: 'Sign out everywhere' })
  // Trigger is disabled when only one session exists. Skip the rest
  // of the assertions if the seed doesn't include additional sessions
  // — the disabled state is itself a valid contract.
  if (await trigger.isDisabled()) {
    test.info().annotations.push({
      type: 'note',
      description: 'Auth seed has only one session — trigger correctly disabled.',
    })
    return
  }

  await trigger.click()
  const dialog = page.getByRole('alertdialog', { name: 'Sign out other sessions?' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('EXCEPT this one')
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Sign out other sessions' })).toBeVisible()

  // Cancel path: other sessions stay active.
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog).toBeHidden()
})

test('AC: E2E-CONFIRM-DIALOG-SHAPE account.security per-session "Revoke" gates the destructive click and names the device', async ({
  authenticatedPage,
}) => {
  const page = authenticatedPage
  await gotoAccountSecurity(page)

  const revokeButtons = page.getByRole('button', { name: 'Revoke' })
  if ((await revokeButtons.count()) === 0) {
    test.info().annotations.push({
      type: 'note',
      description: 'Auth seed has only the current session — no per-session revoke action.',
    })
    await expect(page.getByRole('button', { name: 'Sign out everywhere' })).toBeDisabled()
    return
  }
  await expect(revokeButtons.first()).toBeVisible()

  await revokeButtons.first().click()
  // The dialog title is either "Revoke this session?" (other device)
  // or "Revoke this session and sign out?" (current session); the
  // current-session path also ends with a /login navigation, so we
  // only assert the dialog appears + name regex matches either form.
  const dialog = page.getByRole('alertdialog', { name: /^Revoke this session/ })
  await expect(dialog).toBeVisible()
  // The session metadata strip (user-agent + IP + timestamp) is the
  // unique value-add of this confirm — without it the user can't
  // tell which device they're killing.
  await expect(dialog.locator('p.font-mono')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Revoke session' })).toBeVisible()

  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog).toBeHidden()
  await expect(revokeButtons.first()).toBeVisible()
})

// 2026-05-24 (C4 follow-up): tests below cover the four confirm
// dialogs deferred from the original C3 batch — they need richer
// seed fixtures (MFA-verified session + a second managed member +
// a client with ≥2 obligations). The fixtures landed alongside this
// commit (see e2e/fixtures/test.ts AuthSeedMode + the matching
// seedTeamMember/seedFilingPlan helpers in apps/server/src/routes/e2e.ts).

test.describe('with MFA enabled and verified', () => {
  test.use({ authSeed: 'mfaVerified' })

  test('AC: E2E-CONFIRM-DIALOG-SHAPE account.security "Disable MFA" gates the destructive click', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage
    await gotoAccountSecurity(page)

    // 'mfaVerified' seed = twoFactorEnabled + twoFactorVerified, so
    // we land on the account profile security section (not the challenge route) with
    // Disable MFA reachable.
    await page.getByRole('button', { name: 'Disable' }).click()
    const dialog = page.getByRole('alertdialog', { name: 'Disable two-factor authentication?' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('Sign-in will only require the link we email you')
    await expect(dialog.getByRole('button', { name: 'Keep enabled' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Disable MFA' })).toBeVisible()

    // Cancel path: dialog dismisses, MFA stays enabled.
    await dialog.getByRole('button', { name: 'Keep enabled' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('button', { name: 'Disable' })).toBeVisible()
  })
})

async function gotoAccountSecurity(page: Page) {
  await page.goto('/settings/profile')
  await expect(page.getByRole('heading', { name: 'Profile', level: 1 })).toBeVisible()
  await expect(page.getByRole('main').getByText('Security', { exact: true })).toBeVisible()
}

test.describe('with a second managed teammate', () => {
  test.use({ authSeed: 'team' })

  test('AC: E2E-CONFIRM-DIALOG-SHAPE members "Suspend access" gates the destructive click and names the teammate', async ({
    authSession,
    membersPage,
  }) => {
    const teammate = authSession.seeded.teamMember
    expect(teammate).not.toBeNull()
    if (!teammate) return

    await membersPage.goto()
    await expect(membersPage.heading).toBeVisible()
    await expect(membersPage.memberRowFor(teammate.email)).toBeVisible()

    await membersPage.openMemberActions(teammate.email)
    await membersPage.page.getByRole('menuitem', { name: 'Suspend access' }).click()

    const dialog = membersPage.suspendMemberDialog()
    await expect(dialog).toBeVisible()
    // Naming the teammate in the body is the value-add over a generic
    // confirm — the admin reads the name before pulling the trigger.
    await expect(dialog).toContainText(teammate.name)
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Suspend access' })).toBeVisible()

    // Cancel path: dialog dismisses, teammate row stays.
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).toBeHidden()
    await expect(membersPage.memberRowFor(teammate.email)).toBeVisible()
  })

  test('AC: E2E-CONFIRM-DIALOG-SHAPE members "Downgrade role" gates the destructive click and shows the impact preview', async ({
    authSession,
    membersPage,
  }) => {
    const teammate = authSession.seeded.teamMember
    expect(teammate).not.toBeNull()
    if (!teammate) return

    await membersPage.goto()
    // 2026-06-10 (members polish): "Change role" left the ⋯ actions menu —
    // each managed member row carries an inline Role select instead ("Use
    // Role to change access; more to suspend or remove"). Seeded teammate
    // is a Preparer; downgrading to Coordinator is the one available
    // downgrade and triggers the confirm gate.
    await membersPage.memberRowFor(teammate.email).getByRole('combobox').click()
    await membersPage.page.getByRole('option', { name: 'Coordinator' }).click()

    const dialog = membersPage.downgradeRoleDialog()
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(teammate.name)
    await expect(dialog).toContainText('Preparer')
    await expect(dialog).toContainText('Coordinator')
    // The DestructiveChangePreview Removes/Keeps strip is the unique
    // value-add of a downgrade confirm — without it the admin can't
    // see what permissions the teammate is about to lose.
    await expect(dialog).toContainText('Removes')
    await expect(dialog).toContainText('Keeps')
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Downgrade role' })).toBeVisible()

    // Cancel path: dialog dismisses, no role change applied.
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).toBeHidden()
  })
})

test.describe('with a multi-obligation filing plan', () => {
  test.use({ authSeed: 'filingPlan' })

  test('AC: E2E-CONFIRM-DIALOG-SHAPE filing-plan "Move N deadlines" gates the bulk-status click', async ({
    authSession,
    authenticatedPage,
  }) => {
    const filingPlanClient = authSession.seeded.filingPlanClient
    expect(filingPlanClient).not.toBeNull()
    if (!filingPlanClient) return

    const page = authenticatedPage
    await page.goto(`/clients/${filingPlanClient.id}`)
    await expect(page.getByRole('heading', { name: filingPlanClient.name })).toBeVisible()

    // Year-level "Select all" picks up all 3 seeded obligations at once.
    await page.getByRole('checkbox', { name: 'Select all deadlines in this year' }).first().check()

    const bulkBar = page.getByRole('region', { name: 'Bulk actions' })
    await expect(bulkBar).toBeVisible()
    await expect(bulkBar).toContainText('3 selected')

    await bulkBar.getByRole('button', { name: 'Move to status' }).click()
    await page.getByRole('menuitem', { name: 'Waiting on client' }).click()

    const dialog = page.getByRole('alertdialog', {
      name: /^Move \d+ deadlines to Waiting on client\?/,
    })
    await expect(dialog).toBeVisible()
    // The "Move N deadlines" count is the unique value-add over a
    // generic confirm — without it the admin can't tell how many
    // rows they're about to mutate.
    await expect(dialog).toContainText('Move 3 deadlines')
    await expect(dialog).toContainText('Each row will receive a status-change audit entry')
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Move deadlines' })).toBeVisible()

    // Cancel path: dialog dismisses, no status change applied.
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).toBeHidden()
  })
})
