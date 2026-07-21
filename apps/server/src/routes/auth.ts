import { Hono } from 'hono'
import { createWorkerAuth } from '../auth'
import { resolveAuthContinue, runWithAuthContinue } from '../auth-continuation'
import type { Env, ContextVars } from '../env'

/**
 * better-auth's request router (better-call `getBody`) calls `request.json()`
 * whenever the Content-Type is application/json — and throws
 * "Unexpected end of JSON input" on an EMPTY body, surfacing as a 500. The
 * better-auth browser client posts input-less endpoints like `/sign-out` with a
 * JSON content-type and no body, so sign-out 500s and the session is never
 * cleared (sign-out silently does nothing). Backfill an empty `{}` body for
 * body-bearing methods that arrive empty so getBody parses cleanly; requests
 * that already carry a body are passed through untouched.
 */
async function withParseableAuthBody(request: Request): Promise<Request> {
  if (request.method === 'GET' || request.method === 'HEAD') return request
  const body = await request.clone().text()
  if (body.trim().length > 0) return request
  const headers = new Headers(request.headers)
  headers.set('content-type', 'application/json')
  return new Request(request.url, { method: request.method, headers, body: '{}' })
}

export const authRoute = new Hono<{ Bindings: Env; Variables: ContextVars }>().on(
  ['GET', 'POST'],
  '*',
  async (c) => {
    const auth = createWorkerAuth(c.env, c.executionCtx)
    const request = await withParseableAuthBody(c.req.raw)
    const response = await runWithAuthContinue(resolveAuthContinue(request.headers), () =>
      auth.handler(request),
    )

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
