import { createEnv } from '@t3-oss/env-core'
import type { ServerSession } from '@duedatehq/auth'
import type { ScopedRepo } from '@duedatehq/ports/scoped'
import type { FirmsRepo, MembersRepo, TenantContext } from '@duedatehq/ports/tenants'
import type { AuthSessionsRepo } from './auth-sessions'
import * as z from 'zod'

const serverEnvSchema = z.object({
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.url(),
  APP_URL: z.url(),
  ENV: z.enum(['development', 'staging', 'production']).default('development'),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_WEBHOOK_SECRET: z.string().min(1).optional(),
  PULSE_BROWSERLESS_URL: z.url().optional(),
  PULSE_BROWSERLESS_TOKEN: z.string().min(1).optional(),
  PULSE_BROWSERLESS_SOURCE_IDS: z.string().min(1).optional(),
  E2E_SEED_TOKEN: z.string().min(16).optional(),
  EMAIL_FROM: z.email(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  MICROSOFT_CLIENT_ID: z.string().min(1).optional(),
  MICROSOFT_CLIENT_SECRET: z.string().min(1).optional(),
  MICROSOFT_TENANT_ID: z.string().min(1).optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_PRICE_FIRM_MONTHLY: z.string().min(1).optional(),
  STRIPE_PRICE_FIRM_YEARLY: z.string().min(1).optional(),
  STRIPE_PRICE_SOLO_MONTHLY: z.string().min(1).optional(),
  STRIPE_PRICE_SOLO_YEARLY: z.string().min(1).optional(),
  STRIPE_PRICE_PRO_MONTHLY: z.string().min(1).optional(),
  STRIPE_PRICE_PRO_YEARLY: z.string().min(1).optional(),
  STRIPE_PRICE_TEAM_MONTHLY: z.string().min(1).optional(),
  STRIPE_PRICE_TEAM_YEARLY: z.string().min(1).optional(),
})

function assertMicrosoftOAuthPair(env: ServerEnv) {
  const hasMicrosoftClientId = Boolean(env.MICROSOFT_CLIENT_ID)
  const hasMicrosoftClientSecret = Boolean(env.MICROSOFT_CLIENT_SECRET)
  if (hasMicrosoftClientId === hasMicrosoftClientSecret) return

  throw new Error('MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET must be configured together.')
}

export type ServerEnv = z.infer<typeof serverEnvSchema>
export type ServerEnvInput = Partial<ServerEnv> &
  Pick<
    ServerEnv,
    | 'AUTH_SECRET'
    | 'AUTH_URL'
    | 'APP_URL'
    | 'EMAIL_FROM'
    | 'GOOGLE_CLIENT_ID'
    | 'GOOGLE_CLIENT_SECRET'
  >

export interface WorkerBindings {
  DB: D1Database
  CACHE: KVNamespace
  RATE_LIMIT: RateLimit
  R2_PDF: R2Bucket
  R2_MIGRATION: R2Bucket
  R2_AUDIT: R2Bucket
  R2_PULSE: R2Bucket
  EMAIL_QUEUE: Queue
  PULSE_QUEUE: Queue
  DASHBOARD_QUEUE: Queue
  AUDIT_QUEUE: Queue
  ASSETS: Fetcher
}

export interface Env extends WorkerBindings, ServerEnv {
  AI_GATEWAY_ACCOUNT_ID: string
  AI_GATEWAY_SLUG: string
  AI_GATEWAY_API_KEY: string
  AI_GATEWAY_PROVIDER: string
  AI_GATEWAY_PROVIDER_API_KEY: string
  AI_GATEWAY_MODEL_FAST_JSON: string
  AI_GATEWAY_MODEL_QUALITY_JSON: string
  AI_GATEWAY_MODEL_REASONING: string
  AI_GATEWAY_QUALITY_REASONING_EFFORT: string
  AI_GATEWAY_FAST_REASONING_EFFORT: string
  /** Optional override for the global daily ceiling on system (no-firmId) AI calls. */
  AI_SYSTEM_DAILY_LIMIT?: string
  /**
   * Recipient for operator-grade alerts (cron branch failures, stale-source
   * watchdog, queue dead-letters, extraction canary). Unset/empty disables the
   * email sink — alerts then only reach Workers Logs, which nobody watches.
   */
  OPS_ALERT_EMAIL?: string
  /**
   * Inbound email attribution gate: unless set to "false", a matched official
   * email source additionally requires a passing DKIM/SPF verdict (and no
   * DMARC failure) from the Authentication-Results header before its mail can
   * queue extraction. Failing mail demotes to the unmatched (ignored) bucket.
   */
  PULSE_EMAIL_REQUIRE_AUTH?: string
  /** "true" enables the public no-signup demo (`GET /api/demo`). Off unless set; always on in development. */
  ENABLE_PUBLIC_DEMO?: string
  VAPID_PUBLIC_KEY: string
  VAPID_PRIVATE_KEY: string
  VAPID_SUBJECT: string
}

export function validateServerEnv(runtimeEnv: ServerEnvInput): ServerEnv {
  const env = createEnv({
    server: serverEnvSchema.shape,
    runtimeEnv: {
      AUTH_SECRET: runtimeEnv.AUTH_SECRET,
      AUTH_URL: runtimeEnv.AUTH_URL,
      APP_URL: runtimeEnv.APP_URL,
      ENV: runtimeEnv.ENV,
      RESEND_API_KEY: runtimeEnv.RESEND_API_KEY,
      RESEND_WEBHOOK_SECRET: runtimeEnv.RESEND_WEBHOOK_SECRET,
      PULSE_BROWSERLESS_URL: runtimeEnv.PULSE_BROWSERLESS_URL,
      PULSE_BROWSERLESS_TOKEN: runtimeEnv.PULSE_BROWSERLESS_TOKEN,
      PULSE_BROWSERLESS_SOURCE_IDS: runtimeEnv.PULSE_BROWSERLESS_SOURCE_IDS,
      E2E_SEED_TOKEN: runtimeEnv.E2E_SEED_TOKEN,
      EMAIL_FROM: runtimeEnv.EMAIL_FROM,
      GOOGLE_CLIENT_ID: runtimeEnv.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: runtimeEnv.GOOGLE_CLIENT_SECRET,
      MICROSOFT_CLIENT_ID: runtimeEnv.MICROSOFT_CLIENT_ID,
      MICROSOFT_CLIENT_SECRET: runtimeEnv.MICROSOFT_CLIENT_SECRET,
      MICROSOFT_TENANT_ID: runtimeEnv.MICROSOFT_TENANT_ID,
      STRIPE_SECRET_KEY: runtimeEnv.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: runtimeEnv.STRIPE_WEBHOOK_SECRET,
      STRIPE_PRICE_FIRM_MONTHLY: runtimeEnv.STRIPE_PRICE_FIRM_MONTHLY,
      STRIPE_PRICE_FIRM_YEARLY: runtimeEnv.STRIPE_PRICE_FIRM_YEARLY,
      STRIPE_PRICE_SOLO_MONTHLY: runtimeEnv.STRIPE_PRICE_SOLO_MONTHLY,
      STRIPE_PRICE_SOLO_YEARLY: runtimeEnv.STRIPE_PRICE_SOLO_YEARLY,
      STRIPE_PRICE_PRO_MONTHLY: runtimeEnv.STRIPE_PRICE_PRO_MONTHLY,
      STRIPE_PRICE_PRO_YEARLY: runtimeEnv.STRIPE_PRICE_PRO_YEARLY,
      STRIPE_PRICE_TEAM_MONTHLY: runtimeEnv.STRIPE_PRICE_TEAM_MONTHLY,
      STRIPE_PRICE_TEAM_YEARLY: runtimeEnv.STRIPE_PRICE_TEAM_YEARLY,
    },
    emptyStringAsUndefined: true,
  })

  assertMicrosoftOAuthPair(env)

  return env
}

export interface ContextVars {
  requestId: string
  session?: ServerSession['session']
  user?: ServerSession['user']
  responseHeaders?: Headers
  firmId?: string
  userId?: string
  firms?: FirmsRepo
  members?: MembersRepo
  authSessions?: AuthSessionsRepo
  scoped?: ScopedRepo
  /**
   * Resolved business-tenant view for the request. Composed by
   * `middleware/tenant.ts` from `firm_profile` (read or lazy-created).
   * Procedures gate on `plan` / `seatLimit` / `status` via this object
   * instead of re-querying. See ADR 0010.
   */
  tenantContext?: TenantContext
}
