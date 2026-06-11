import { expect, test } from '../fixtures/test'

// Feature: Entry auth gate
// PRD: S1 protected workbench entry
// AC: E2E-SMOKE-LOGIN, E2E-SMOKE-AUTH-REDIRECT

test('AC: E2E-SMOKE-LOGIN renders the login entry', async ({ loginPage, page }) => {
  await loginPage.goto()

  await expect(page).toHaveURL(/\/login$/)
  await expect(loginPage.heading).toBeVisible()
  await expect(loginPage.emailInput).toBeVisible()
  await expect(loginPage.emailButton).toBeEnabled()
  await expect(loginPage.googleButton).toBeEnabled()
  await expect(loginPage.microsoftButton).toHaveCount(0)
  await expect(loginPage.reassurance).toBeVisible()
})

test('AC: E2E-SMOKE-AUTH-REDIRECT redirects root visitors to login', async ({
  loginPage,
  page,
}) => {
  await loginPage.goto('/')

  await expect(loginPage.googleButton).toBeVisible()

  const url = new URL(page.url())
  expect(url.pathname).toBe('/login')
  expect(url.searchParams.has('redirectTo')).toBe(false)
})

test('AC: E2E-SMOKE-AUTH-REDIRECT preserves protected route query params', async ({
  loginPage,
  page,
}) => {
  await loginPage.goto('/deadlines?status=in_review&sort=due_asc')

  await expect(loginPage.googleButton).toBeVisible()

  const url = new URL(page.url())
  expect(url.pathname).toBe('/login')
  expect(url.searchParams.get('redirectTo')).toBe('/deadlines?status=in_review&sort=due_asc')
})

test('AC: E2E-SMOKE-AUTH-REDIRECT preserves the onboarding target', async ({ loginPage, page }) => {
  await loginPage.goto('/onboarding')

  await expect(loginPage.googleButton).toBeVisible()

  const url = new URL(page.url())
  expect(url.pathname).toBe('/login')
  expect(url.searchParams.get('redirectTo')).toBe('/onboarding')
})

test('AC: E2E-SMOKE-INVITE renders the invite entry error without a token', async ({ page }) => {
  await page.goto('/accept-invite')

  await expect(page.getByText(/Invite link is missing|邀请链接缺少参数/)).toBeVisible()
})

test.describe('two-factor challenge', () => {
  test.use({ authSeed: 'mfa' })

  test('AC: E2E-SMOKE-MFA renders the two-factor challenge entry', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/two-factor')

    await expect(authenticatedPage.getByText(/Check your phone|查看你的手机/)).toBeVisible()
    await expect(authenticatedPage.getByLabel(/Verification code|验证码/)).toBeVisible()
  })
})
