import { onError } from '@orpc/server'
import { RPCHandler } from '@orpc/server/fetch'
import { splitSetCookieHeader } from 'better-auth/cookies'
import type { Env, ContextVars } from './env'
import { logServerError } from './middleware/logger'
import { router } from './procedures/index'

// oRPC RPCHandler wired against the root router.
// Contract stays in @duedatehq/contracts; implementation lives under ./procedures.
const handler = new RPCHandler(router, {
  clientInterceptors: [
    onError((error, options) => {
      // 2026-06-05 TEMP debug — swallowed `/rpc/obligations/list` 500.
      // ORPC's default error envelope hides the original cause; dump
      // the raw error here so wrangler dev surfaces it. REMOVE once the
      // root cause is identified and fixed.
      console.error('[ORPC ERROR DEBUG]', {
        path: options.path.join('/'),
        name: error instanceof Error ? error.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 15).join('\n') : undefined,
        firmId: options.context.vars.firmId,
        userId: options.context.vars.userId,
      })
      logServerError({
        boundary: 'orpc',
        error,
        requestId: options.context.vars.requestId,
        path: `/rpc/${options.path.join('/')}`,
        procedure: options.path.join('.'),
        firmId: options.context.vars.firmId,
        userId: options.context.vars.userId,
      })
    }),
  ],
})

export function appendResponseHeaders(target: Headers, source: Headers): void {
  source.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie') {
      target.set(key, value)
      return
    }

    for (const cookie of splitSetCookieHeader(value)) {
      target.append('set-cookie', cookie)
    }
  })
}

export async function rpcHandler(
  request: Request,
  env: Env,
  meta: { vars: ContextVars },
): Promise<Response> {
  const { matched, response } = await handler.handle(request, {
    prefix: '/rpc',
    context: { env, request, vars: meta.vars },
  })

  if (!matched) {
    return new Response('Not Found', { status: 404 })
  }
  if (meta.vars.responseHeaders) {
    const headers = new Headers(response.headers)
    appendResponseHeaders(headers, meta.vars.responseHeaders)
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }
  return response
}
