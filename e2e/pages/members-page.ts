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
}
