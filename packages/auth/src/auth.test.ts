import { describe, expect, it } from 'vitest'
import {
  billingCheckoutConfig,
  createAuthPlugins,
  EMAIL_OTP_RATE_LIMIT_CUSTOM_RULES,
  isStripeConfigured,
  planSeatLimit,
  SIGN_IN_OTP_EXPIRES_IN_SECONDS,
  stripeBillingPlans,
  type AuthEnv,
} from './index'
import { roles, statement } from './permissions'

function authEnv(overrides: Partial<AuthEnv> = {}): AuthEnv {
  return {
    AUTH_SECRET: '0123456789abcdefghijklmnopqrstuvwxyz',
    AUTH_URL: 'https://api.duedatehq.test',
    APP_URL: 'https://app.duedatehq.test',
    EMAIL_FROM: 'noreply@duedatehq.test',
    GOOGLE_CLIENT_ID: 'google-client-id',
    GOOGLE_CLIENT_SECRET: 'google-client-secret',
    ENV: 'production',
    ...overrides,
  }
}

type RateLimitRule = {
  pathMatcher: (path: string) => boolean
  window: number
  max: number
}

function isRateLimitRule(value: unknown): value is RateLimitRule {
  return (
    typeof value === 'object' &&
    value !== null &&
    'pathMatcher' in value &&
    typeof Reflect.get(value, 'pathMatcher') === 'function' &&
    typeof Reflect.get(value, 'window') === 'number' &&
    typeof Reflect.get(value, 'max') === 'number'
  )
}

describe('@duedatehq/auth permissions', () => {
  it('keeps business-domain resources on the statement', () => {
    expect(statement.client).toContain('read')
    expect(statement.audit).toContain('read')
    expect(statement.member).toContain('change_role')
  })

  // The Better Auth organization plugin checks these resources/actions from
  // its own endpoints (`organization.update`, `organization.inviteMember`,
  // `organization.cancelInvitation`, `organization.removeMember`, etc.). If
  // they go missing from our statement, even owner roles will see 403s once
  // Settings wires `organization.update` — regression-lock the shape here.
  it('includes Better Auth organization-plugin resources and actions', () => {
    expect(statement.organization).toEqual(['update', 'delete'])
    expect(statement.invitation).toEqual(['create', 'cancel'])
    expect(statement.team).toEqual(['create', 'update', 'delete'])
    expect(statement.ac).toEqual(['create', 'read', 'update', 'delete'])

    // member merges plugin defaults with our P1 lifecycle verbs.
    expect(statement.member).toEqual(
      expect.arrayContaining([
        'create',
        'update',
        'delete',
        'invite',
        'suspend',
        'remove',
        'change_role',
      ]),
    )
  })

  it('declares every configured role', () => {
    expect(Object.keys(roles).toSorted()).toEqual(
      ['coordinator', 'manager', 'owner', 'partner', 'preparer'].toSorted(),
    )
  })

  it('grants partner workflow control without account-owner billing powers', () => {
    const partner = roles.partner.statements as Record<string, readonly string[] | undefined>
    expect(partner.obligation).toEqual(expect.arrayContaining(['read', 'update:status']))
    expect(partner.pulse).toEqual(expect.arrayContaining(['read', 'approve', 'revert']))
    expect(partner.billing).toBeUndefined()
    expect(partner.member).toBeUndefined()
  })

  // Hierarchy invariant (Owner > Partner >= Manager): manager must not hold
  // any grant partner lacks. billing:read and audit:export both regressed
  // this way once — keep them owner-only here and in core's matrix.
  it('keeps manager grants inside the partner surface', () => {
    const manager = roles.manager.statements as Record<string, readonly string[] | undefined>
    expect(manager.billing).toBeUndefined()
    expect(manager.audit).toEqual(['read'])
  })

  it('lets preparers reassign work while coordinators stay read-only (dev-file §3.2)', () => {
    const preparer = roles.preparer.statements as Record<string, readonly string[] | undefined>
    const coord = roles.coordinator.statements as Record<string, readonly string[] | undefined>
    expect(preparer.obligation).toEqual(
      expect.arrayContaining(['read', 'update:status', 'update:assignee']),
    )
    expect(coord.obligation).toEqual(['read'])
  })

  it('hides dollars:read from the coordinator role (PRD §3.6 RBAC)', () => {
    const coord = roles.coordinator.statements as Record<string, readonly string[] | undefined>
    expect(coord.dollars).toBeUndefined()
  })

  it('allows owner and manager to revert Pulse and migration batches', () => {
    const manager = roles.manager.statements as Record<string, readonly string[] | undefined>
    const owner = roles.owner.statements as Record<string, readonly string[]>

    expect(manager.pulse).toEqual(
      expect.arrayContaining(['read', 'approve', 'batch_apply', 'revert']),
    )
    expect(manager.migration).toEqual(expect.arrayContaining(['run', 'revert']))
    expect(owner.pulse).toContain('revert')
    expect(owner.migration).toContain('revert')
  })

  it('grants owner the full member/organization/invitation surface', () => {
    const owner = roles.owner.statements as Record<string, readonly string[]>
    expect(owner.organization).toEqual(expect.arrayContaining(['update', 'delete']))
    expect(owner.invitation).toEqual(expect.arrayContaining(['create', 'cancel']))
    expect(owner.member).toEqual(expect.arrayContaining(['create', 'update', 'delete']))
  })

  it('keeps member administration owner-only for Members v1', () => {
    const manager = roles.manager.statements as Record<string, readonly string[] | undefined>
    expect(manager.member).toBeUndefined()
    expect(manager.invitation).toBeUndefined()
  })

  it('keeps billing seat limits aligned with public plans', () => {
    expect(planSeatLimit('solo')).toBe(1)
    expect(planSeatLimit('pro')).toBe(3)
    expect(planSeatLimit('team')).toBe(10)
    expect(planSeatLimit('firm')).toBe(10)
  })

  it('requires Pro checkout config and registers optional Solo and Team prices', () => {
    const env = authEnv({
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_WEBHOOK_SECRET: 'whsec_123',
      STRIPE_PRICE_SOLO_MONTHLY: 'price_solo_monthly',
      STRIPE_PRICE_SOLO_YEARLY: 'price_solo_yearly',
      STRIPE_PRICE_PRO_MONTHLY: 'price_pro_monthly',
      STRIPE_PRICE_PRO_YEARLY: 'price_pro_yearly',
      STRIPE_PRICE_TEAM_MONTHLY: 'price_team_monthly',
      STRIPE_PRICE_TEAM_YEARLY: 'price_team_yearly',
    })

    expect(isStripeConfigured(env)).toBe(true)
    expect(
      stripeBillingPlans(env).map((plan) => ({
        name: plan.name,
        monthly: plan.priceId,
        yearly: plan.annualDiscountPriceId,
        seats: plan.limits?.seats,
      })),
    ).toEqual([
      { name: 'solo', monthly: 'price_solo_monthly', yearly: 'price_solo_yearly', seats: 1 },
      { name: 'pro', monthly: 'price_pro_monthly', yearly: 'price_pro_yearly', seats: 3 },
      { name: 'team', monthly: 'price_team_monthly', yearly: 'price_team_yearly', seats: 10 },
    ])
    expect(billingCheckoutConfig(env).plans).toEqual({
      solo: { monthly: true, yearly: true },
      pro: { monthly: true, yearly: true },
      team: { monthly: true, yearly: true },
    })
  })

  it('registers Google One Tap without adding auth schema requirements', () => {
    expect(createAuthPlugins({}, authEnv()).map((plugin) => plugin.id)).toContain('one-tap')
  })

  it('registers Email OTP sign-in with self-serve signup and scoped rate limits', () => {
    const emailOtp = createAuthPlugins({}, authEnv()).find((plugin) => plugin.id === 'email-otp')
    const options = emailOtp && 'options' in emailOtp ? Reflect.get(emailOtp, 'options') : undefined
    const rateLimit =
      emailOtp && 'rateLimit' in emailOtp ? Reflect.get(emailOtp, 'rateLimit') : undefined
    const signInRule = Array.isArray(rateLimit)
      ? rateLimit.find((rule) => isRateLimitRule(rule) && rule.pathMatcher('/sign-in/email-otp'))
      : undefined

    expect(emailOtp).toBeTruthy()
    expect(options).toMatchObject({
      otpLength: 6,
      expiresIn: SIGN_IN_OTP_EXPIRES_IN_SECONDS,
      disableSignUp: false,
    })
    expect(signInRule).toEqual(
      expect.objectContaining({
        window: 60,
        max: 5,
      }),
    )
    expect(EMAIL_OTP_RATE_LIMIT_CUSTOM_RULES).toMatchObject({
      '/email-otp/send-verification-otp': {
        window: 60,
        max: 3,
      },
      '/sign-in/email-otp': {
        window: 60,
        max: 5,
      },
    })
  })

  it('leaves Solo and Team checkout disabled when their price ids are absent', () => {
    const env = authEnv({
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_WEBHOOK_SECRET: 'whsec_123',
      STRIPE_PRICE_PRO_MONTHLY: 'price_pro_monthly',
    })

    expect(stripeBillingPlans(env).map((plan) => plan.name)).toEqual(['pro'])
    expect(billingCheckoutConfig(env)).toEqual({
      stripeConfigured: true,
      plans: {
        solo: { monthly: false, yearly: false },
        pro: { monthly: true, yearly: false },
        team: { monthly: false, yearly: false },
      },
    })
  })
})
