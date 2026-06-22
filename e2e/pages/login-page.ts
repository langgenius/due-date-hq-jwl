import type { Locator, Page } from '@playwright/test'

export class LoginPage {
  readonly heading: Locator
  readonly emailInput: Locator
  readonly emailButton: Locator
  readonly googleButton: Locator
  readonly microsoftButton: Locator
  readonly reassurance: Locator

  constructor(readonly page: Page) {
    // 2026-06-21 (login split preview): the entry now leads with the
    // product-scoped sign-in heading.
    this.heading = page.getByRole('heading', { name: /Sign in to DueDateHQ|登录 DueDateHQ/ })

    this.emailInput = page.getByLabel(/Work email|工作邮箱/)

    // The email flow sends a one-time sign-in link first ("Send
    // sign-in link"); the 6-digit code entry appears after submit.
    this.emailButton = page.getByRole('button', {
      name: /Send sign-in link|发送登录链接/,
    })

    this.googleButton = page.getByRole('button', {
      name: /Continue with Google|使用 Google 继续/,
    })

    this.microsoftButton = page.getByRole('button', {
      name: /Continue with Microsoft|使用 Microsoft 继续/,
    })

    // 2026-06-21 (login split preview): the stable reassurance copy sits
    // below the provider buttons.
    this.reassurance = page.getByText(/No password|无需密码/)
  }

  async goto(path = '/login') {
    await this.page.goto(path)
  }
}
