import { expect, test } from '../fixtures/test'

// Feature: Marketing pricing to billing checkout
// PRD: Pricing + Stripe payment loop
// AC: E2E-BILLING-PRICING-DEEPLINK, E2E-BILLING-PRICING-LOCALE

const localWorkerPort = process.env.E2E_WORKER_PORT ?? '8787'
const appBaseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${localWorkerPort}`
const marketingBaseURL = process.env.E2E_MARKETING_BASE_URL ?? 'http://127.0.0.1:4321'

test.skip(
  Boolean(process.env.E2E_BASE_URL) && !process.env.E2E_MARKETING_BASE_URL,
  'external app targets must provide E2E_MARKETING_BASE_URL for marketing pricing coverage',
)

test('AC: E2E-BILLING-PRICING-DEEPLINK sends Pro CTA to protected checkout', async ({ page }) => {
  await page.goto(`${marketingBaseURL}/pricing`)

  await expect(page.getByRole('link', { name: 'Start Solo' })).toHaveAttribute(
    'href',
    checkoutHrefPattern('solo'),
  )
  await expect(page.getByRole('link', { name: 'Upgrade to Team' })).toHaveAttribute(
    'href',
    checkoutHrefPattern('team'),
  )

  const proCta = page.getByRole('link', { name: 'Upgrade to Pro' })
  await expect(proCta).toHaveAttribute('href', checkoutHrefPattern())

  await page.getByRole('button', { name: /Yearly/ }).click()
  await expect(page.getByText('Save $192/year')).toBeVisible()
  await expect(proCta).toHaveAttribute('href', checkoutHrefPattern('pro', undefined, 'yearly'))

  await proCta.click()
  await page.waitForURL('**/login?**')

  const url = new URL(page.url())
  expect(url.origin).toBe(new URL(appBaseURL).origin)
  expect(url.pathname).toBe('/login')
  expect(url.searchParams.get('redirectTo')).toBe('/billing/checkout?plan=pro&interval=yearly')
})

test('AC: E2E-BILLING-PRICING-LOCALE preserves zh-CN handoff before auth redirect', async ({
  page,
}) => {
  await page.goto(`${marketingBaseURL}/zh-CN/pricing`)

  const proCta = page.getByRole('link', { name: '升级到 Pro' })
  await expect(proCta).toHaveAttribute('href', checkoutHrefPattern('pro', 'zh-CN'))

  await proCta.click()
  await page.waitForURL('**/login?**')

  const url = new URL(page.url())
  expect(url.origin).toBe(new URL(appBaseURL).origin)
  expect(url.pathname).toBe('/login')
  expect(url.searchParams.get('redirectTo')).toBe('/billing/checkout?plan=pro&interval=monthly')
  await expect(page.evaluate(() => window.localStorage.getItem('lng'))).resolves.toBe('zh-CN')
})

function checkoutHrefPattern(
  plan: 'solo' | 'pro' | 'team' = 'pro',
  locale?: 'zh-CN',
  interval: 'monthly' | 'yearly' = 'monthly',
): RegExp {
  const escapedOrigin = escapeRegExp(new URL(appBaseURL).origin)
  const localePart = locale ? '&lng=zh-CN' : ''
  return new RegExp(
    `^${escapedOrigin}/billing/checkout\\?plan=${plan}&interval=${interval}${localePart}$`,
  )
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
