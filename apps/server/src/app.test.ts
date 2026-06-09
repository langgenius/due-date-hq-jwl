import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createApp } from './app'
import {
  DEMO_ACCOUNTS,
  pickSafeDemoRedirect,
  readDemoAccountParam,
  readDemoRoleParam,
  resolveDemoLoginRedirect,
  shouldRenderDemoLoginHtml,
} from './routes/e2e'

describe('@duedatehq/server app', () => {
  it('serves the public health route', async () => {
    const app = createApp()
    const response = await app.request('/api/health', {}, { ENV: 'development' })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      status: 'ok',
      env: 'development',
      requestId: expect.any(String),
    })
  })

  it('exposes public auth capabilities without leaking OAuth secrets', async () => {
    const app = createApp()
    const response = await app.request(
      '/api/auth-capabilities',
      {},
      {
        ENV: 'development',
        GOOGLE_CLIENT_ID: 'google-client-id',
        GOOGLE_CLIENT_SECRET: 'google-client-secret',
      },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      providers: {
        google: true,
        microsoft: false,
        emailOtp: true,
      },
      publicClientIds: {
        google: 'google-client-id',
      },
    })
  })

  it('does not expose the e2e session route outside development', async () => {
    const app = createApp()
    const response = await app.request('/api/e2e/session', { method: 'POST' }, { ENV: 'staging' })

    expect(response.status).toBe(404)
  })

  it('does not expose the demo login route outside development', async () => {
    const app = createApp()
    const response = await app.request('/api/e2e/demo-login', {}, { ENV: 'staging' })

    expect(response.status).toBe(404)
  })

  it('does not expose the demo accounts route outside development', async () => {
    const app = createApp()
    const response = await app.request('/api/e2e/demo-accounts', {}, { ENV: 'staging' })

    expect(response.status).toBe(404)
  })

  it('does not expose the e2e role switch route outside development', async () => {
    const app = createApp()
    const response = await app.request(
      '/api/e2e/switch-role',
      {
        method: 'POST',
        body: JSON.stringify({ firmId: 'e2e_firm_1', role: 'owner' }),
      },
      { ENV: 'staging' },
    )

    expect(response.status).toBe(404)
  })

  it('does not expose demo routes in production even with the seed token', async () => {
    const app = createApp()
    const env = {
      ENV: 'production',
      E2E_SEED_TOKEN: 'seed-token-seed-token',
    }
    const init = { headers: { authorization: 'Bearer seed-token-seed-token' } }

    const login = await app.request('/api/e2e/demo-login', init, env)
    const accounts = await app.request('/api/e2e/demo-accounts', init, env)
    const switchRole = await app.request(
      '/api/e2e/switch-role',
      {
        ...init,
        method: 'POST',
        body: JSON.stringify({ firmId: 'e2e_firm_1', role: 'owner' }),
      },
      env,
    )

    expect(login.status).toBe(404)
    expect(accounts.status).toBe(404)
    expect(switchRole.status).toBe(404)
  })

  it('rejects unknown demo login roles before touching demo data', async () => {
    const app = createApp()
    const response = await app.request('/api/e2e/demo-login?role=admin', {}, { ENV: 'development' })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Invalid demo role.' })
  })

  it('rejects unknown demo login accounts before touching demo data', async () => {
    const app = createApp()
    const response = await app.request(
      '/api/e2e/demo-login?account=enterprise',
      {},
      { ENV: 'development' },
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Invalid demo account.' })
  })

  it('parses supported demo roles and defaults missing role to owner', () => {
    expect(readDemoRoleParam(null)).toBe('owner')
    expect(readDemoRoleParam('')).toBe('owner')
    expect(readDemoRoleParam('owner')).toBe('owner')
    expect(readDemoRoleParam('partner')).toBe('partner')
    expect(readDemoRoleParam('manager')).toBe('manager')
    expect(readDemoRoleParam('preparer')).toBe('preparer')
    expect(readDemoRoleParam('coordinator')).toBe('coordinator')
    expect(readDemoRoleParam('admin')).toBeNull()
  })

  it('parses supported demo account ids without defaulting', () => {
    expect(readDemoAccountParam(null)).toBeNull()
    expect(readDemoAccountParam('')).toBeNull()
    expect(readDemoAccountParam('plan-solo')).toBe('plan-solo')
    expect(readDemoAccountParam('plan-pro')).toBe('plan-pro')
    expect(readDemoAccountParam('plan-team')).toBe('plan-team')
    expect(readDemoAccountParam('enterprise')).toBeNull()
  })

  it('keeps live-demo account contracts aligned with the mock seed SQL', () => {
    const seedSql = readFileSync(new URL('../../../mock/demo.sql', import.meta.url), 'utf8')

    // The public-demo visitor is created at runtime (ensureDemoIdentities on
    // GET /api/demo), not pre-seeded — so it's intentionally absent from demo.sql.
    for (const account of DEMO_ACCOUNTS.filter((a) => a.id !== 'public-demo')) {
      expect(seedSql).toContain(`('${account.userId}',`)
      expect(seedSql).toMatch(
        new RegExp(`'[^']+',\\s*'${account.firmId}',\\s*'${account.userId}',\\s*'${account.role}'`),
      )
    }
  })

  it('keeps demo login redirects inside the app', () => {
    expect(pickSafeDemoRedirect('/obligations?owner=unassigned#row')).toBe(
      '/obligations?owner=unassigned#row',
    )
    expect(pickSafeDemoRedirect('https://example.com')).toBe('/')
    expect(pickSafeDemoRedirect('//example.com')).toBe('/')
    expect(pickSafeDemoRedirect(null)).toBe('/')
    expect(
      resolveDemoLoginRedirect(
        new URL('http://127.0.0.1:8787/api/e2e/demo-login'),
        'http://localhost:5173',
        null,
      ),
    ).toBe('http://127.0.0.1:5173/')
    expect(
      resolveDemoLoginRedirect(
        new URL('http://localhost:8787/api/e2e/demo-login'),
        'http://localhost:5173',
        '/deadlines',
      ),
    ).toBe('/deadlines')
  })

  it('uses html handoff only for browser demo login requests', () => {
    expect(
      shouldRenderDemoLoginHtml(
        new Request('http://localhost/api/e2e/demo-login', {
          headers: { accept: 'text/html,application/xhtml+xml' },
        }),
      ),
    ).toBe(true)
    expect(
      shouldRenderDemoLoginHtml(
        new Request('http://localhost/api/e2e/demo-login?format=json', {
          headers: { accept: 'text/html,application/xhtml+xml' },
        }),
      ),
    ).toBe(false)
    expect(
      shouldRenderDemoLoginHtml(
        new Request('http://localhost/api/e2e/demo-login', {
          headers: { accept: 'application/json' },
        }),
      ),
    ).toBe(false)
  })
})
