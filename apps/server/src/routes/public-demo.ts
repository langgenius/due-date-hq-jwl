import { Hono } from 'hono'
import { setCookie } from 'hono/cookie'
import { makeSignature } from 'better-auth/crypto'
import { authSchema, createDb } from '@duedatehq/db'
import type { ContextVars, Env } from '../env'
import { PUBLIC_DEMO_ACCOUNT, ensureDemoIdentities, pickSafeDemoRedirect } from './e2e'

const COOKIE_NAME = 'duedatehq.session_token'
// Short TTL: bounds how many demo session rows accumulate (the endpoint is also
// IP rate-limited). A visitor who lingers past this just re-clicks the button.
const DEMO_SESSION_TTL_SECONDS = 60 * 60 * 2

export const publicDemoRoute = new Hono<{ Bindings: Env; Variables: ContextVars }>()

/**
 * GET /api/demo — public, no-signup product tour.
 *
 * Mints a short-lived session for the read-only demo visitor
 * (`PUBLIC_DEMO_ACCOUNT`) in the shared, pre-seeded demo firm, then bounces to
 * the app. ALL writes from this session are blocked downstream by the
 * `isReadOnlyDemo` gate (keyed on the `public_demo_` user-id prefix — see
 * middleware/tenant.ts + procedures/_permissions.ts), so the shared demo data
 * is never mutated and no reset is needed.
 *
 * Gated by `ENABLE_PUBLIC_DEMO=true` (always on in development). IP rate-limited
 * via `rateLimitMiddleware` (mounted in app.ts).
 */
publicDemoRoute.get('/', async (c) => {
  const enabled = c.env.ENV === 'development' || c.env.ENABLE_PUBLIC_DEMO === 'true'
  if (!enabled) return c.notFound()

  const db = createDb(c.env.DB)
  // Idempotent: ensures the shared demo firm + the read-only visitor exist.
  await ensureDemoIdentities(db, [PUBLIC_DEMO_ACCOUNT])

  const now = new Date()
  const expiresAt = new Date(now.getTime() + DEMO_SESSION_TTL_SECONDS * 1000)
  const token = `public_demo_token_${crypto.randomUUID().replaceAll('-', '')}`
  await db.insert(authSchema.session).values({
    id: `public_demo_session_${crypto.randomUUID().replaceAll('-', '')}`,
    token,
    userId: PUBLIC_DEMO_ACCOUNT.userId,
    activeOrganizationId: PUBLIC_DEMO_ACCOUNT.firmId,
    twoFactorVerified: true,
    expiresAt,
    createdAt: now,
    updatedAt: now,
    ipAddress: c.req.header('cf-connecting-ip') ?? '0.0.0.0',
    userAgent: 'DueDateHQ public demo',
  })

  const requestUrl = new URL(c.req.url)
  const signedToken = `${token}.${await makeSignature(token, c.env.AUTH_SECRET)}`
  setCookie(c, COOKIE_NAME, signedToken, {
    path: '/',
    httpOnly: true,
    secure: requestUrl.protocol === 'https:',
    sameSite: 'Lax',
    maxAge: DEMO_SESSION_TTL_SECONDS,
  })
  c.header('Cache-Control', 'no-store')

  const redirectTo = pickSafeDemoRedirect(requestUrl.searchParams.get('redirectTo'), '/today')
  return c.redirect(redirectTo, 302)
})
