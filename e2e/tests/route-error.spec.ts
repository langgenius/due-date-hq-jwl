import { expect, test } from '../fixtures/test'

// Feature: Router error boundary
// PRD: Platform smoke
// AC: E2E-SMOKE-NOT-FOUND

test.skip(
  Boolean(process.env.E2E_BASE_URL),
  'local e2e auth seed is not available on external targets',
)

test('AC: E2E-SMOKE-NOT-FOUND renders the in-shell 404 boundary', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/not-a-real-route')

  await expect(authenticatedPage.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  await expect(authenticatedPage.getByText('/not-a-real-route')).toBeVisible()
  await Promise.all([
    authenticatedPage.waitForURL(/\/$/, { timeout: 15_000 }),
    authenticatedPage.getByRole('button', { name: 'Go to Today' }).click(),
  ])
})

test('AC: E2E-SMOKE-NOT-FOUND renders localized 404 copy', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/not-a-real-route?lng=zh-CN')

  await expect(authenticatedPage.getByRole('heading', { name: '未找到页面' })).toBeVisible()
  await expect(authenticatedPage.getByText('/not-a-real-route')).toBeVisible()
  await Promise.all([
    authenticatedPage.waitForURL(/\/(?:\?lng=zh-CN)?$/, { timeout: 15_000 }),
    authenticatedPage.getByRole('button', { name: '前往今天' }).click(),
  ])
})
