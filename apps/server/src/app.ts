import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import type { Env, ContextVars } from './env'
import { localeMiddleware } from './middleware/locale'
import { logServerError, requestIdMiddleware } from './middleware/logger'
import { firmAccessMiddleware } from './middleware/firm-access'
import { sessionMiddleware } from './middleware/session'
import { tenantMiddleware } from './middleware/tenant'
import { rateLimitMiddleware } from './middleware/rate-limit'
import { authCapabilitiesRoute } from './routes/auth-capabilities'
import { authRoute } from './routes/auth'
import { auditDownloadRoute } from './routes/audit-download'
import { e2eRoute } from './routes/e2e'
import { publicDemoRoute } from './routes/public-demo'
import { leadsRoute } from './routes/leads'
import { healthRoute } from './routes/health'
import { icsRoute } from './routes/ics'
import { notificationsRoute } from './routes/notifications'
import { opsRoute } from './routes/ops'
import { readinessRoute } from './routes/readiness'
import { socialAlertsRoute } from './routes/social-alerts'
import { resendWebhook } from './webhooks/resend'
import { rpcHandler } from './rpc'

function allowedAuthOrigin(origin: string, env: Env): string | null {
  // Tolerate missing/blank APP_URL or AUTH_URL so a misconfigured .dev.vars
  // surfaces as a clear 403 from CORS rather than crashing every /api/auth/*
  // request with `TypeError: Invalid URL string`.
  const allowed = [env.APP_URL, env.AUTH_URL]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map((value) => {
      try {
        return new URL(value).origin
      } catch {
        return null
      }
    })
    .filter((value): value is string => value !== null)
  return allowed.includes(origin) ? origin : null
}

/**
 * Hono app assembly.
 *
 * Route prefix discipline (docs/dev-file/02 §3 · ADR 0008):
 *   /rpc/*            → RPCHandler (internal frontend only)
 *   /api/auth/*       → better-auth
 *   /api/webhook/*    → narrow external callbacks
 *   /api/health       → liveness
 *   /api/v1/*         → OpenAPIHandler (Phase 2, reserved; do not add here)
 *   other             → ASSETS binding + SPA fallback (wrangler.toml)
 */
export function createApp() {
  const app = new Hono<{ Bindings: Env; Variables: ContextVars }>()

  app.onError((err, c) => {
    const status = err instanceof HTTPException ? err.status : 500

    logServerError({
      boundary: 'hono',
      error: err,
      requestId: c.get('requestId'),
      method: c.req.method,
      path: c.req.path,
      status,
      firmId: c.get('firmId'),
      userId: c.get('userId'),
    })

    if (err instanceof HTTPException) {
      return err.getResponse()
    }

    return c.text('Internal Server Error', 500)
  })

  app.use('*', requestIdMiddleware)
  app.use('*', localeMiddleware)

  // /api/health — public liveness probe (no auth, no tenant).
  app.route('/api/health', healthRoute)
  app.route('/api/auth-capabilities', authCapabilitiesRoute)

  app.use(
    '/api/auth/*',
    cors({
      origin: (origin, c) => allowedAuthOrigin(origin, c.env),
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['POST', 'GET', 'OPTIONS'],
      exposeHeaders: ['Content-Length'],
      maxAge: 600,
      credentials: true,
    }),
  )

  // /api/auth/* — better-auth handler (Google/Microsoft OAuth + Organization + Access Control).
  app.route('/api/auth', authRoute)

  // /api/e2e/* — Playwright bootstrap. Development is open locally; staging
  // requires E2E_SEED_TOKEN; production always returns 404.
  app.route('/api/e2e', e2eRoute)

  // /api/ops/* — operator one-shot maintenance jobs. Pulse backfill keeps the
  // staging-only E2E-token policy; /social/* is also available in production
  // behind its separate SOCIAL_OPS_TOKEN control-plane credential.
  app.route('/api/ops', opsRoute)

  // /api/demo — public no-signup read-only product tour (gated by ENABLE_PUBLIC_DEMO;
  // always on in development). IP rate-limited; it mints its own demo session, so no
  // session/tenant middleware runs before it.
  app.use('/api/demo', rateLimitMiddleware)
  app.route('/api/demo', publicDemoRoute)

  // /api/leads — public marketing questionnaire lead capture (no credentials).
  // Permissive CORS (the form posts from the marketing origin) + IP rate-limited.
  app.use(
    '/api/leads',
    cors({
      origin: (o) => o ?? '*',
      allowMethods: ['POST', 'OPTIONS'],
      allowHeaders: ['Content-Type'],
      maxAge: 600,
    }),
  )
  app.use('/api/leads', rateLimitMiddleware)
  app.route('/api/leads', leadsRoute)

  // /api/webhook/* — external callbacks. Provider signature verification is required
  // before side effects; IP allowlists are defense-in-depth when supported.
  app.route('/api/webhook/resend', resendWebhook)

  app.route('/api/notifications', notificationsRoute)

  app.use('/api/ics/*', rateLimitMiddleware)
  app.route('/api/ics', icsRoute)

  app.use('/api/readiness/*', rateLimitMiddleware)
  app.route('/api/readiness', readinessRoute)

  // Public X acquisition teaser. The response is deliberately narrower than
  // Pulse detail and only resolves posts that have actually been published.
  app.use('/api/social-alerts/*', rateLimitMiddleware)
  app.route('/api/social-alerts', socialAlertsRoute)

  app.use(
    '/api/audit/*',
    sessionMiddleware,
    firmAccessMiddleware,
    tenantMiddleware,
    rateLimitMiddleware,
  )
  app.route('/api/audit', auditDownloadRoute)

  // /rpc/* — oRPC RPCHandler.
  // Order is load-bearing: session MUST run before tenant (tenant needs firmId from session)
  // and before rate-limit (rate-limit keys off userId when present, falls back to IP).
  app.use('/rpc/*', sessionMiddleware, firmAccessMiddleware, tenantMiddleware, rateLimitMiddleware)
  app.all('/rpc/*', async (c) => rpcHandler(c.req.raw, c.env, { vars: c.var }))

  // Reserved for Phase 2 — public OpenAPIHandler routes. Do not mount a default
  // catch-all here; undefined paths fall through to ASSETS (wrangler.toml).
  // app.all('/api/v1/*', openApiHandler)

  return app
}
