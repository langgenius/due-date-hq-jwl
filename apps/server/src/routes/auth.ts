import { Hono } from 'hono'
import { createWorkerAuth } from '../auth'
import type { Env, ContextVars } from '../env'

export const authRoute = new Hono<{ Bindings: Env; Variables: ContextVars }>().on(
  ['GET', 'POST'],
  '*',
  async (c) => {
    const auth = createWorkerAuth(c.env, c.executionCtx)
    const response = await auth.handler(c.req.raw)

    // Failed sign-ins are SECURITY TELEMETRY, not a firm-scoped compliance
    // event: `audit_event.firm_id` is NOT NULL, and a failed attempt usually
    // has no firm (unknown email, or a user who hasn't joined one yet). So we
    // emit a structured Workers Log line (queryable in the CF dashboard /
    // `wrangler tail`) instead of forcing it into the audit table. Successful
    // logins ARE firm-scoped and audited in session-hooks.ts. Observe-only —
    // the response is returned unchanged.
    if (response.status >= 400) {
      const path = new URL(c.req.url).pathname
      if (path.includes('/sign-in') || path.includes('/callback')) {
        console.warn(
          JSON.stringify({
            type: 'auth.login.failed',
            at: new Date().toISOString(),
            path,
            status: response.status,
            ip: c.req.header('cf-connecting-ip') ?? null,
            userAgent: c.req.header('user-agent') ?? null,
          }),
        )
      }
    }

    return response
  },
)
