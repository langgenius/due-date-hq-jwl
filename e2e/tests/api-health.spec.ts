import { expect, test } from '../fixtures/test'

// Feature: Worker liveness
// PRD: Platform smoke
// AC: E2E-SMOKE-HEALTH

test('AC: E2E-SMOKE-HEALTH returns the Hono health response', async ({ request }) => {
  const response = await request.get('/api/health')

  expect(response.ok()).toBe(true)
  expect(response.headers()['content-type']).toMatch(/application\/json/)

  const body = await response.json()
  expect(body).toMatchObject({
    status: 'ok',
    env: 'development',
  })
  expect(body.requestId).toEqual(expect.any(String))
})

test('AC: E2E-SMOKE-ROBOTS keeps the app workspace out of public indexing', async ({ request }) => {
  const response = await request.get('/robots.txt')

  expect(response.ok()).toBe(true)
  expect(response.headers()['content-type']).toMatch(/text\/plain/)
  await expect(response.text()).resolves.toBe('User-agent: *\nDisallow: /\n')
})
