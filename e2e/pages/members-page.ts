import type { Locator, Page } from '@playwright/test'

export class MembersPage {
  readonly heading: Locator
  readonly inviteButton: Locator
  readonly inviteDialog: Locator
  readonly sendInviteButton: Locator

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Members', level: 1 })
    this.inviteButton = page.getByRole('button', { name: /Invite member/ })
    // Copy polish (commit b8da3ba) renamed the dialog title from "Invite a
    // teammate" to "Invite member" to match the trigger button.
    this.inviteDialog = page.getByRole('dialog', { name: 'Invite member' })
    this.sendInviteButton = this.inviteDialog.getByRole('button', { name: 'Send invite' })
  }

  async goto(path = '/members') {
    await this.page.goto(path)
  }

  invitationRowFor(email: string) {
    return this.page.getByRole('row').filter({ hasText: email }).first()
  }

  async invite(input: { email: string; role?: 'Manager' | 'Preparer' | 'Coordinator' }) {
    await this.inviteButton.click()
    await this.inviteDialog.getByLabel('Work email').fill(input.email)
    if (input.role) {
      await this.inviteDialog.getByLabel('Role').click()
      await this.page.getByRole('option', { name: input.role }).click()
    }
    await this.sendInviteButton.click()
  }

  // Confirm dialog locators. 2026-05-24: every destructive action on
  // this page is gated through an AlertDialog (Cancel invitation,
  // Remove member, Suspend access, Downgrade role). These accessors
  // expose the dialog by its title so specs can assert + interact
  // without coupling to test ids.

  cancelInvitationDialog() {
    return this.page.getByRole('alertdialog', { name: 'Cancel this invitation?' })
  }

  /**
   * Two-step cancel: click the inline "Cancel" link on the invitation
   * row, then confirm "Cancel invitation" in the AlertDialog. The
   * legacy single-click no longer works — the confirm gate landed in
   * commit 26591ad6 of design/preview-integration.
   */
  async cancelInvitation(email: string) {
    await this.invitationRowFor(email).getByRole('button', { name: 'Cancel' }).click()
    const dialog = this.cancelInvitationDialog()
    await dialog.getByRole('button', { name: 'Cancel invitation' }).click()
  }

  removeMemberDialog() {
    return this.page.getByRole('alertdialog', { name: 'Remove member?' })
  }

  suspendMemberDialog() {
    return this.page.getByRole('alertdialog', { name: 'Suspend access?' })
  }

  downgradeRoleDialog() {
    return this.page.getByRole('alertdialog', { name: 'Downgrade member?' })
  }
}
