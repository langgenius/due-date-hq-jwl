import { seedBillingSubscription } from '../fixtures/billing'
import { expect, test } from '../fixtures/test'

// Feature: Members
// PRD: Firm team management
// AC: E2E-MEMBERS-INVITE-CANCEL-AUDIT

test.skip(
  Boolean(process.env.E2E_BASE_URL),
  'local e2e auth seed is not available on external targets',
)

test('AC: E2E-MEMBERS-INVITE-CANCEL-AUDIT invites, cancels, and exposes audit history', async ({
  auditPage,
  authSession,
  membersPage,
  request,
}) => {
  await seedBillingSubscription(request, { firmId: authSession.firmId })
  const email = `member-${authSession.user.id.slice(-8)}@e2e.duedatehq.test`

  await membersPage.goto()

  await expect(membersPage.heading).toBeVisible()
  await expect(membersPage.page.getByText(/2 available/)).toBeVisible()

  await membersPage.invite({ email, role: 'Preparer' })

  await expect(membersPage.inviteDialog).toBeHidden()
  await expect(membersPage.invitationRowFor(email)).toBeVisible()
  await expect(membersPage.invitationRowFor(email)).toContainText('Pending')
  await expect(membersPage.invitationRowFor(email)).toContainText('Preparer')

  // 2026-05-24: cancel-invitation is now gated through an AlertDialog
  // confirm. The page-object helper handles the two-step click (inline
  // Cancel link → AlertDialog "Cancel invitation" button).
  await membersPage.cancelInvitation(email)

  await expect(membersPage.invitationRowFor(email)).toBeHidden()

  await auditPage.goto('/audit?action=member.invited&range=all')

  await expect(auditPage.eventRowFor('member.invited')).toBeVisible()
  await auditPage.goto('/audit?action=member.invitation.canceled&range=all')
  await expect(auditPage.eventRowFor('member.invitation.canceled')).toBeVisible()
})
