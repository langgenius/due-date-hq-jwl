import type { Locator, Page } from '@playwright/test'

export class LoginPage {
  readonly heading: Locator
  readonly emailInput: Locator
  readonly emailButton: Locator
  readonly googleButton: Locator
  readonly microsoftButton: Locator
  readonly reassurance: Locator

  constructor(readonly page: Page) {
    // 2026-06-10 (login redesign): the entry heading is a plain
    // "Welcome back" — the split marketing panel carries the product
    // pitch ("Every CPA deadline. One source of truth.") instead.
    this.heading = page.getByRole('heading', { name: /Welcome back|欢迎回来/ })

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

    // 2026-06-10 (login redesign): the "All systems operational"
    // footer + the Language menu button are gone. The reassurance
    // card under the form is the stable always-rendered footer copy.
    this.reassurance = page.getByText(/Secured by one-time link|一次性链接安全保障/)
  }

  async goto(path = '/login') {
    await this.page.goto(path)
  }
}
