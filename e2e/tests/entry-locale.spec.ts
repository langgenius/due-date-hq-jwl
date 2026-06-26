import { expect, test } from '../fixtures/test'

// Feature: Entry locale switch
// PRD: Marketing-to-app locale handoff
// AC: E2E-SMOKE-I18N

// 2026-06-10 (login redesign): the on-page Language menu button was
// removed with the new split-panel entry, so the locale switch UI can
// no longer be exercised here. The persisted-choice path (explicit
// user choice in localStorage — detectLocale()'s second priority) is
// what that button used to write; assert it still drives the entry.
test('AC: E2E-SMOKE-I18N renders the login entry in the persisted locale', async ({
  loginPage,
  page,
}) => {
  await page.addInitScript(() => window.localStorage.setItem('lng', 'zh-CN'))
  await loginPage.goto()

  await expect(loginPage.googleButton).toHaveText(/使用 Google 继续/)
  await expect(page.getByRole('heading', { name: '登录' })).toBeVisible()
  await expect(page.getByText('每个申报截止日期的唯一事实来源。')).toBeVisible()
  await expect(page).toHaveURL(/\/login$/)
})

test('AC: E2E-SMOKE-I18N consumes the marketing locale handoff query', async ({
  loginPage,
  page,
}) => {
  await loginPage.goto('/login?lng=zh-CN')

  await expect(loginPage.googleButton).toHaveText(/使用 Google 继续/)
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.evaluate(() => window.localStorage.getItem('lng'))).resolves.toBe('zh-CN')
})

test('AC: E2E-SMOKE-I18N consumes locale before protected-route redirects', async ({
  loginPage,
  page,
}) => {
  await loginPage.goto('/deadlines?lng=zh-CN&status=review')

  await expect(loginPage.googleButton).toHaveText(/使用 Google 继续/)

  const url = new URL(page.url())
  expect(url.pathname).toBe('/login')
  expect(url.searchParams.get('redirectTo')).toBe('/deadlines?status=review')
  await expect(page.evaluate(() => window.localStorage.getItem('lng'))).resolves.toBe('zh-CN')
})
