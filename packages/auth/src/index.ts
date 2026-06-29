import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { drizzleAdapter, type DB as BetterAuthDrizzleDb } from 'better-auth/adapters/drizzle'
import {
  stripe,
  type AuthorizeReferenceAction,
  type StripePlan,
  type Subscription,
} from '@better-auth/stripe'
import { genericOAuth, microsoftEntraId } from 'better-auth/plugins/generic-oauth'
import { organization } from 'better-auth/plugins/organization'
import { twoFactor } from 'better-auth/plugins/two-factor'
import { emailOTP, oneTap } from 'better-auth/plugins'
import { APIError } from 'better-auth/api'
import {
  isBillingPlan,
  planSeatLimit as corePlanSeatLimit,
  type BillingPlan,
} from '@duedatehq/core/plan-entitlements'
import StripeClient from 'stripe'
import type { AuthEmailSender } from './email'
import { accessControl, roles } from './permissions'

export { planSeatLimit } from '@duedatehq/core/plan-entitlements'

export const SIGN_IN_OTP_EXPIRES_IN_SECONDS = 300
export const SIGN_IN_OTP_EXPIRES_IN_MINUTES = SIGN_IN_OTP_EXPIRES_IN_SECONDS / 60
export const EMAIL_OTP_RATE_LIMIT_CUSTOM_RULES = {
  '/email-otp/send-verification-otp': {
    window: 60,
    max: 3,
  },
  '/sign-in/email-otp': {
    window: 60,
    max: 5,
  },
} as const

export type AuthEnv = {
  AUTH_SECRET: string
  AUTH_URL: string
  APP_URL: string
  EMAIL_FROM: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  MICROSOFT_CLIENT_ID?: string | undefined
  MICROSOFT_CLIENT_SECRET?: string | undefined
  MICROSOFT_TENANT_ID?: string | undefined
  STRIPE_SECRET_KEY?: string | undefined
  STRIPE_WEBHOOK_SECRET?: string | undefined
  STRIPE_PRICE_FIRM_MONTHLY?: string | undefined
  STRIPE_PRICE_FIRM_YEARLY?: string | undefined
  STRIPE_PRICE_SOLO_MONTHLY?: string | undefined
  STRIPE_PRICE_SOLO_YEARLY?: string | undefined
  STRIPE_PRICE_PRO_MONTHLY?: string | undefined
  STRIPE_PRICE_PRO_YEARLY?: string | undefined
  STRIPE_PRICE_TEAM_MONTHLY?: string | undefined
  STRIPE_PRICE_TEAM_YEARLY?: string | undefined
  ENV: 'development' | 'staging' | 'production'
}

/**
 * Organization plugin hooks shape. Derived via Parameters<> so we never have
 * to chase a named export across better-auth minor versions; the inferred
 * type stays correct as long as the organization() signature is stable.
 */
export type OrganizationHooks = NonNullable<
  NonNullable<Parameters<typeof organization>[0]>['organizationHooks']
>
type OrganizationPluginOptions = NonNullable<Parameters<typeof organization>[0]>

export interface CreateAuthPluginsOptions {
  email?: AuthEmailSender
  /**
   * Hook closures are owned by the server layer (apps/server/src/auth.ts) so
   * that packages/auth never has to import @duedatehq/db (the dep-direction
   * DAG in scripts/check-dep-direction.mjs forbids it). When omitted, the
   * organization plugin runs without lifecycle side effects — useful for
   * tests that don't care about firm_profile bookkeeping.
   */
  organizationHooks?: OrganizationHooks
  allowUserToCreateOrganization?: OrganizationPluginOptions['allowUserToCreateOrganization']
  organizationMembershipLimit?: OrganizationPluginOptions['membershipLimit']
  organizationInvitationLimit?: OrganizationPluginOptions['invitationLimit']
  stripeBilling?: StripeBillingOptions
}

/**
 * Core `databaseHooks` shape (user / session / account lifecycle). Derived
 * via better-auth's exported options type so it stays correct across minor
 * versions without us chasing a named re-export.
 */
export type DatabaseHooks = NonNullable<BetterAuthOptions['databaseHooks']>

// `free` and `firm` are not self-serve: free has no checkout, firm is custom/sales.
export type SelfServeBillingPlan = Exclude<BillingPlan, 'firm' | 'free'>

export type BillingCheckoutConfig = {
  stripeConfigured: boolean
  plans: Record<SelfServeBillingPlan, { monthly: boolean; yearly: boolean }>
}

export interface StripeSubscriptionSyncInput {
  referenceId: string
  plan: BillingPlan
  seatLimit: number
  stripeCustomerId: string | undefined
  stripeSubscriptionId: string | undefined
  status: Subscription['status']
}

export interface StripeBillingHooks {
  authorizeReference(input: {
    userId: string
    sessionId: string
    activeOrganizationId?: string
    referenceId: string
    action: AuthorizeReferenceAction
  }): Promise<boolean>
  syncSubscription(input: StripeSubscriptionSyncInput): Promise<void>
}

export interface StripeBillingOptions {
  hooks: StripeBillingHooks
}

export interface CreateAuthDeps {
  db: BetterAuthDrizzleDb
  schema: Record<string, unknown>
  env: AuthEnv
  email?: AuthEmailSender
  /**
   * Hook closures injected by the server layer; forwarded to
   * `createAuthPlugins`. We expose this as a deps field instead of letting
   * callers replace the entire plugin array, because the organization
   * plugin's strongly-typed return is what gives `session.activeOrganizationId`
   * its type — losing that inference (e.g. via `readonly AuthPlugin[]`) would
   * cascade into every downstream `auth.api.getSession()` call.
   */
  organizationHooks?: OrganizationHooks
  allowUserToCreateOrganization?: OrganizationPluginOptions['allowUserToCreateOrganization']
  organizationMembershipLimit?: OrganizationPluginOptions['membershipLimit']
  organizationInvitationLimit?: OrganizationPluginOptions['invitationLimit']
  stripeBilling?: StripeBillingOptions
  /**
   * `databaseHooks` escape hatch. Server uses `session.create.before` to
   * auto-restore `activeOrganizationId` on new sessions for returning users
   * whose session is missing an active firm. See ADR 0010 FU and
   * apps/server/src/auth.ts.
   */
  databaseHooks?: DatabaseHooks
  waitUntil?: (promise: Promise<unknown>) => void
}

function toOrigin(value: string): string | undefined {
  try {
    return new URL(value).origin
  } catch {
    return undefined
  }
}

function isString(value: string | undefined): value is string {
  return typeof value === 'string'
}

function trustedOrigins(env: AuthEnv): string[] {
  const origins = [toOrigin(env.AUTH_URL), toOrigin(env.APP_URL)].filter(isString)
  // Local dev runs the app on many localhost ports (launch.json cycles
  // 5173/5177/5188/5193/5199/…), so a fixed APP_URL can't cover the port a
  // given session happens to be on — origin-guarded POSTs like /sign-out then
  // 403 on the "wrong" port. Trust any localhost origin in development only;
  // staging/production stay pinned to AUTH_URL + APP_URL.
  if (env.ENV === 'development') origins.push('http://localhost:*')
  return Array.from(new Set(origins))
}

export function isStripeConfigured(env: AuthEnv): env is AuthEnv & {
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  STRIPE_PRICE_PRO_MONTHLY: string
} {
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.STRIPE_PRICE_PRO_MONTHLY)
}

function isMicrosoftConfigured(env: AuthEnv): env is AuthEnv & {
  MICROSOFT_CLIENT_ID: string
  MICROSOFT_CLIENT_SECRET: string
} {
  return Boolean(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET)
}

export function stripeBillingPlans(env: AuthEnv): StripePlan[] {
  const plans: StripePlan[] = []

  if (env.STRIPE_PRICE_SOLO_MONTHLY || env.STRIPE_PRICE_SOLO_YEARLY) {
    plans.push({
      name: 'solo',
      priceId: env.STRIPE_PRICE_SOLO_MONTHLY,
      annualDiscountPriceId: env.STRIPE_PRICE_SOLO_YEARLY,
      limits: { seats: corePlanSeatLimit('solo') },
      freeTrial: { days: 14 },
    })
  }

  plans.push({
    name: 'pro',
    priceId: env.STRIPE_PRICE_PRO_MONTHLY,
    annualDiscountPriceId: env.STRIPE_PRICE_PRO_YEARLY,
    limits: { seats: corePlanSeatLimit('pro') },
    freeTrial: { days: 14 },
  })

  if (env.STRIPE_PRICE_TEAM_MONTHLY || env.STRIPE_PRICE_TEAM_YEARLY) {
    plans.push({
      name: 'team',
      priceId: env.STRIPE_PRICE_TEAM_MONTHLY,
      annualDiscountPriceId: env.STRIPE_PRICE_TEAM_YEARLY,
      limits: { seats: corePlanSeatLimit('team') },
    })
  }

  if (env.STRIPE_PRICE_FIRM_MONTHLY || env.STRIPE_PRICE_FIRM_YEARLY) {
    plans.push({
      name: 'firm',
      priceId: env.STRIPE_PRICE_FIRM_MONTHLY,
      annualDiscountPriceId: env.STRIPE_PRICE_FIRM_YEARLY,
      limits: { seats: corePlanSeatLimit('firm') },
    })
  }

  return plans
}

export function billingCheckoutConfig(env: AuthEnv): BillingCheckoutConfig {
  const stripeConfigured = isStripeConfigured(env)
  return {
    stripeConfigured,
    plans: {
      solo: {
        monthly: stripeConfigured && Boolean(env.STRIPE_PRICE_SOLO_MONTHLY),
        yearly: stripeConfigured && Boolean(env.STRIPE_PRICE_SOLO_YEARLY),
      },
      pro: {
        monthly: stripeConfigured && Boolean(env.STRIPE_PRICE_PRO_MONTHLY),
        yearly: stripeConfigured && Boolean(env.STRIPE_PRICE_PRO_YEARLY),
      },
      team: {
        monthly: stripeConfigured && Boolean(env.STRIPE_PRICE_TEAM_MONTHLY),
        yearly: stripeConfigured && Boolean(env.STRIPE_PRICE_TEAM_YEARLY),
      },
    },
  }
}

function activeBillingPlan(subscription: Subscription): BillingPlan {
  if (
    subscription.status === 'active' ||
    subscription.status === 'trialing' ||
    subscription.status === 'past_due' ||
    subscription.status === 'paused'
  ) {
    return isBillingPlan(subscription.plan) ? subscription.plan : 'pro'
  }
  return 'solo'
}

function syncInput(subscription: Subscription): StripeSubscriptionSyncInput {
  const plan = activeBillingPlan(subscription)
  return {
    referenceId: subscription.referenceId,
    plan,
    seatLimit: corePlanSeatLimit(plan),
    stripeCustomerId: subscription.stripeCustomerId,
    stripeSubscriptionId: subscription.stripeSubscriptionId,
    status: subscription.status,
  }
}

function isKnownFirmRole(role: string): boolean {
  return (
    role === 'owner' ||
    role === 'partner' ||
    role === 'manager' ||
    role === 'preparer' ||
    role === 'coordinator'
  )
}

function assertSignInOtpType(type: string) {
  if (type !== 'sign-in') {
    throw new APIError('BAD_REQUEST', {
      message: 'Unsupported email OTP type.',
    })
  }
}

export function createAuthPlugins(opts: CreateAuthPluginsOptions = {}, env?: AuthEnv) {
  const { email, organizationHooks } = opts
  const organizationPlugin = organization({
    ac: accessControl,
    roles,
    creatorRole: 'owner',
    allowUserToCreateOrganization: opts.allowUserToCreateOrganization ?? true,
    // Better Auth owns the identity primitives; DueDateHQ's members gateway
    // owns current-firm, seat, audit, and Owner-only business rules. Server
    // injects the plan-aware membership limit because packages/auth cannot
    // depend on @duedatehq/db.
    membershipLimit: opts.organizationMembershipLimit ?? 5,
    invitationLimit: opts.organizationInvitationLimit ?? 100,
    // org soft-delete is governed by firm_profile.status / deletedAt
    // (PRD §3.6.8 30d grace). Hard delete via the better-auth API would
    // bypass that flow, so it stays disabled.
    disableOrganizationDeletion: true,
    invitationExpiresIn: 60 * 60 * 24 * 7,
    cancelPendingInvitationsOnReInvite: true,
    organizationHooks: {
      // Default guard keeps the role vocabulary tight when tests construct
      // auth without server-owned DB hooks. Server hooks add firm/seat gates.
      ...organizationHooks,
      beforeAddMember:
        organizationHooks?.beforeAddMember ??
        (async ({ member }) => {
          if (!isKnownFirmRole(member.role)) {
            throw new APIError('FORBIDDEN', {
              message: 'Unknown firm role.',
            })
          }
        }),
    },
    schema: {
      member: {
        additionalFields: {
          status: {
            type: 'string',
            required: true,
            defaultValue: 'active',
            input: false,
          },
        },
      },
    },
    sendInvitationEmail: async (data) => {
      await email?.sendInvitationEmail({
        to: data.email,
        organizationName: data.organization.name,
        inviterName: data.inviter.user.name,
        invitationId: data.id,
        role: data.role,
        url: `/accept-invite?id=${encodeURIComponent(data.id)}`,
      })
    },
  })

  const securityPlugins = [
    twoFactor({
      issuer: 'DueDateHQ',
      allowPasswordless: true,
    }),
    oneTap(),
    emailOTP({
      otpLength: 6,
      expiresIn: SIGN_IN_OTP_EXPIRES_IN_SECONDS,
      disableSignUp: false,
      rateLimit: {
        window: 60,
        max: 5,
      },
      generateOTP: ({ type }) => {
        assertSignInOtpType(type)
        return undefined
      },
      sendVerificationOTP: async ({ email: to, otp, type }) => {
        assertSignInOtpType(type)
        await email?.sendSignInOtpEmail({
          to,
          otp,
          expiresInMinutes: SIGN_IN_OTP_EXPIRES_IN_MINUTES,
        })
      },
    }),
  ] as const

  const microsoftPlugins =
    env && isMicrosoftConfigured(env)
      ? ([
          genericOAuth({
            config: [
              microsoftEntraId({
                clientId: env.MICROSOFT_CLIENT_ID,
                clientSecret: env.MICROSOFT_CLIENT_SECRET,
                tenantId: env.MICROSOFT_TENANT_ID || 'common',
              }),
            ],
          }),
        ] as const)
      : ([] as const)

  if (env && opts.stripeBilling && isStripeConfigured(env)) {
    const stripeSecret = env.STRIPE_SECRET_KEY
    const stripeWebhookSecret = env.STRIPE_WEBHOOK_SECRET
    const stripeClient = new StripeClient(stripeSecret)
    const stripePlugin = stripe({
      stripeClient,
      stripeWebhookSecret,
      subscription: {
        enabled: true,
        plans: stripeBillingPlans(env),
        authorizeReference: async ({ user, session, referenceId, action }) =>
          opts.stripeBilling?.hooks.authorizeReference({
            userId: user.id,
            sessionId: session.id,
            activeOrganizationId: session.activeOrganizationId,
            referenceId,
            action,
          }) ?? false,
        onSubscriptionComplete: async ({ subscription }) => {
          await opts.stripeBilling?.hooks.syncSubscription(syncInput(subscription))
        },
        onSubscriptionCreated: async ({ subscription }) => {
          await opts.stripeBilling?.hooks.syncSubscription(syncInput(subscription))
        },
        onSubscriptionUpdate: async ({ subscription }) => {
          await opts.stripeBilling?.hooks.syncSubscription(syncInput(subscription))
        },
        onSubscriptionDeleted: async ({ subscription }) => {
          await opts.stripeBilling?.hooks.syncSubscription({
            ...syncInput(subscription),
            plan: 'solo',
            seatLimit: 1,
            stripeSubscriptionId: undefined,
          })
        },
      },
      organization: { enabled: true },
    })
    return [organizationPlugin, ...securityPlugins, ...microsoftPlugins, stripePlugin] as const
  }

  return [organizationPlugin, ...securityPlugins, ...microsoftPlugins] as const
}

export function createAuth(deps: CreateAuthDeps) {
  // Build the plugin options conditionally so we don't pass explicit
  // `undefined` into optional fields — tsconfig has
  // exactOptionalPropertyTypes turned on.
  const pluginOpts: CreateAuthPluginsOptions = {}
  if (deps.email) pluginOpts.email = deps.email
  if (deps.organizationHooks) pluginOpts.organizationHooks = deps.organizationHooks
  if (deps.allowUserToCreateOrganization) {
    pluginOpts.allowUserToCreateOrganization = deps.allowUserToCreateOrganization
  }
  if (deps.organizationMembershipLimit) {
    pluginOpts.organizationMembershipLimit = deps.organizationMembershipLimit
  }
  if (deps.organizationInvitationLimit) {
    pluginOpts.organizationInvitationLimit = deps.organizationInvitationLimit
  }
  if (deps.stripeBilling) pluginOpts.stripeBilling = deps.stripeBilling
  const plugins = createAuthPlugins(pluginOpts, deps.env)

  return betterAuth({
    appName: 'DueDateHQ',
    baseURL: deps.env.AUTH_URL,
    basePath: '/api/auth',
    secret: deps.env.AUTH_SECRET,
    database: drizzleAdapter(deps.db, {
      provider: 'sqlite',
      schema: deps.schema,
    }),
    socialProviders: {
      google: {
        clientId: deps.env.GOOGLE_CLIENT_ID,
        clientSecret: deps.env.GOOGLE_CLIENT_SECRET,
      },
    },
    ...(deps.databaseHooks ? { databaseHooks: deps.databaseHooks } : {}),
    plugins: [...plugins],
    trustedOrigins: trustedOrigins(deps.env),
    rateLimit: {
      enabled: deps.env.ENV !== 'development',
      storage: 'database',
      window: 60,
      max: 100,
      customRules: EMAIL_OTP_RATE_LIMIT_CUSTOM_RULES,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      additionalFields: {
        twoFactorVerified: {
          type: 'boolean',
          required: true,
          defaultValue: false,
          input: false,
        },
      },
    },
    advanced: {
      cookiePrefix: 'duedatehq',
      useSecureCookies: deps.env.ENV !== 'development',
      ipAddress: {
        ipAddressHeaders: ['cf-connecting-ip', 'x-forwarded-for'],
      },
      ...(deps.waitUntil
        ? {
            backgroundTasks: {
              handler: deps.waitUntil,
            },
          }
        : {}),
    },
  })
}

export type AuthInstance = ReturnType<typeof createAuth>
export type ServerSession = NonNullable<Awaited<ReturnType<AuthInstance['api']['getSession']>>>
