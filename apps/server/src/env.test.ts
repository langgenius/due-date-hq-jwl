import { describe, expect, it } from 'vitest'
import { validateServerEnv, type ServerEnvInput } from './env'

function runtimeEnv(overrides: Partial<ServerEnvInput> = {}): ServerEnvInput {
  return {
    AUTH_SECRET: '0123456789abcdefghijklmnopqrstuvwxyz',
    AUTH_URL: 'https://api.duedatehq.test',
    APP_URL: 'https://app.duedatehq.test',
    ENV: 'production',
    EMAIL_FROM: 'noreply@duedatehq.test',
    GOOGLE_CLIENT_ID: 'google-client-id',
    GOOGLE_CLIENT_SECRET: 'google-client-secret',
    ...overrides,
  }
}

describe('validateServerEnv', () => {
  it('keeps the Resend key optional outside development', () => {
    const env = validateServerEnv(runtimeEnv())

    expect(env.ENV).toBe('production')
    expect(env.RESEND_API_KEY).toBeUndefined()
  })

  it('preserves the Resend key when email sending is configured', () => {
    const env = validateServerEnv(runtimeEnv({ RESEND_API_KEY: 're_test_key' }))

    expect(env.RESEND_API_KEY).toBe('re_test_key')
  })

  it('preserves the Resend webhook secret when delivery callbacks are configured', () => {
    const env = validateServerEnv(runtimeEnv({ RESEND_WEBHOOK_SECRET: 'whsec_test' }))

    expect(env.RESEND_WEBHOOK_SECRET).toBe('whsec_test')
  })

  it('preserves configurable Browserless Pulse fetcher settings', () => {
    const env = validateServerEnv(
      runtimeEnv({
        PULSE_BROWSERLESS_URL: 'https://production-sfo.browserless.io/content',
        PULSE_BROWSERLESS_TOKEN: 'browserless-token',
        PULSE_BROWSERLESS_SOURCE_IDS: 'fl.dor.tips,wa.dor.news,wa.dor.whats_new',
      }),
    )

    expect(env.PULSE_BROWSERLESS_URL).toBe('https://production-sfo.browserless.io/content')
    expect(env.PULSE_BROWSERLESS_TOKEN).toBe('browserless-token')
    expect(env.PULSE_BROWSERLESS_SOURCE_IDS).toBe('fl.dor.tips,wa.dor.news,wa.dor.whats_new')
  })

  it('preserves Stripe billing settings when checkout is configured', () => {
    const env = validateServerEnv(
      runtimeEnv({
        STRIPE_SECRET_KEY: 'sk_test_123',
        STRIPE_WEBHOOK_SECRET: 'whsec_stripe',
        STRIPE_PRICE_SOLO_MONTHLY: 'price_solo_monthly',
        STRIPE_PRICE_PRO_MONTHLY: 'price_pro_monthly',
        STRIPE_PRICE_TEAM_MONTHLY: 'price_team_monthly',
      }),
    )

    expect(env.STRIPE_SECRET_KEY).toBe('sk_test_123')
    expect(env.STRIPE_WEBHOOK_SECRET).toBe('whsec_stripe')
    expect(env.STRIPE_PRICE_SOLO_MONTHLY).toBe('price_solo_monthly')
    expect(env.STRIPE_PRICE_PRO_MONTHLY).toBe('price_pro_monthly')
    expect(env.STRIPE_PRICE_TEAM_MONTHLY).toBe('price_team_monthly')
  })

  it('keeps Microsoft OAuth optional but validates paired credentials', () => {
    const env = validateServerEnv(
      runtimeEnv({
        MICROSOFT_CLIENT_ID: 'microsoft-client-id',
        MICROSOFT_CLIENT_SECRET: 'microsoft-client-secret',
        MICROSOFT_TENANT_ID: 'organizations',
      }),
    )

    expect(env.MICROSOFT_CLIENT_ID).toBe('microsoft-client-id')
    expect(env.MICROSOFT_CLIENT_SECRET).toBe('microsoft-client-secret')
    expect(env.MICROSOFT_TENANT_ID).toBe('organizations')
    expect(() =>
      validateServerEnv(runtimeEnv({ MICROSOFT_CLIENT_ID: 'microsoft-client-id' })),
    ).toThrow(/MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET/)
  })

  it('defaults X publishing to draft and preserves explicit social settings', () => {
    expect(validateServerEnv(runtimeEnv()).X_POSTING_MODE).toBe('draft')

    const env = validateServerEnv(
      runtimeEnv({
        X_POSTING_MODE: 'live',
        X_SOCIAL_START_AT: '2026-07-21T00:00:00.000Z',
        X_API_KEY: 'x-key',
        X_API_SECRET: 'x-secret',
        X_ACCESS_TOKEN: 'x-token',
        X_ACCESS_TOKEN_SECRET: 'x-token-secret',
        SOCIAL_OPS_TOKEN: 'social-ops-token-1234',
      }),
    )

    expect(env.X_POSTING_MODE).toBe('live')
    expect(env.X_SOCIAL_START_AT).toBe('2026-07-21T00:00:00.000Z')
    expect(env.X_API_KEY).toBe('x-key')
    expect(env.X_ACCESS_TOKEN).toBe('x-token')
    expect(env.SOCIAL_OPS_TOKEN).toBe('social-ops-token-1234')
  })

  it('requires complete X OAuth credentials and refuses an unconfigured live mode', () => {
    expect(() => validateServerEnv(runtimeEnv({ X_API_KEY: 'x-key' }))).toThrow(
      /must be configured together/,
    )
    expect(() => validateServerEnv(runtimeEnv({ X_POSTING_MODE: 'live' }))).toThrow(
      /requires all four X OAuth credentials/,
    )
    expect(() =>
      validateServerEnv(
        runtimeEnv({
          X_POSTING_MODE: 'live',
          X_API_KEY: 'x-key',
          X_API_SECRET: 'x-secret',
          X_ACCESS_TOKEN: 'x-token',
          X_ACCESS_TOKEN_SECRET: 'x-token-secret',
        }),
      ),
    ).toThrow(/requires SOCIAL_OPS_TOKEN/)
  })
})
