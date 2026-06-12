import { ORPCError } from '@orpc/server'
import { splitSetCookieHeader } from 'better-auth/cookies'
import { createWorkerAuth } from '../../auth'
import { sha256Hex } from '../../lib/readiness-token'
import { requireTenant, type RpcContext } from '../_context'
import { os } from '../_root'

type AuthSessionRow = {
  id: string
  token: string
  userAgent?: string | null
  ipAddress?: string | null
  createdAt: Date | string
  updatedAt: Date | string
  expiresAt: Date | string
}

type AuthWithHeaders<T> = {
  headers: Headers
  response: T
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function isAuthSessionRow(value: unknown): value is AuthSessionRow {
  if (!value || typeof value !== 'object') return false
  return (
    'id' in value &&
    typeof value.id === 'string' &&
    'token' in value &&
    typeof value.token === 'string' &&
    'createdAt' in value &&
    'updatedAt' in value &&
    'expiresAt' in value
  )
}

function toAuthSessionRows(value: unknown): AuthSessionRow[] {
  if (!Array.isArray(value)) return []
  return value.filter(isAuthSessionRow)
}

async function hashHeader(secret: string, value: string | null): Promise<string | undefined> {
  if (!value) return undefined
  return sha256Hex(`${secret}:${value}`)
}

async function auditSecurityEvent(input: {
  context: RpcContext
  action: string
  after?: unknown
  reason?: string
}) {
  const { scoped, userId } = requireTenant(input.context)
  const headers = input.context.request.headers
  const ipHash = await hashHeader(input.context.env.AUTH_SECRET, headers.get('cf-connecting-ip'))
  const userAgentHash = await hashHeader(input.context.env.AUTH_SECRET, headers.get('user-agent'))
  await scoped.audit.write({
    actorId: userId,
    entityType: 'auth_session',
    entityId: input.context.vars.session?.id ?? userId,
    action: input.action,
    ...(input.after === undefined ? {} : { after: input.after }),
    ...(input.reason === undefined ? {} : { reason: input.reason }),
    ...(ipHash ? { ipHash } : {}),
    ...(userAgentHash ? { userAgentHash } : {}),
  })
}

function authErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Authentication service rejected the request.'
}

async function callAuth<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise
  } catch (err) {
    throw new ORPCError('FORBIDDEN', { message: authErrorMessage(err) })
  }
}

function captureAuthHeaders(context: RpcContext, headers: Headers): void {
  const responseHeaders = context.vars.responseHeaders ?? new Headers()
  headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie') {
      responseHeaders.set(key, value)
      return
    }

    for (const cookie of splitSetCookieHeader(value)) {
      responseHeaders.append('set-cookie', cookie)
    }
  })
  context.vars.responseHeaders = responseHeaders
}

function requestHeadersWithAuthCookies(requestHeaders: Headers, responseHeaders: Headers): Headers {
  const headers = new Headers(requestHeaders)
  const cookies = new Map<string, string>()

  for (const cookie of headers.get('cookie')?.split(';') ?? []) {
    const [name, ...valueParts] = cookie.trim().split('=')
    const value = valueParts.join('=')
    if (name && value) cookies.set(name, value)
  }

  responseHeaders.forEach((headerValue, key) => {
    if (key.toLowerCase() !== 'set-cookie') return
    for (const cookie of splitSetCookieHeader(headerValue)) {
      const [nameValue, ...attributes] = cookie.split(';')
      if (!nameValue) continue
      const [name, ...valueParts] = nameValue.trim().split('=')
      const cookieValue = valueParts.join('=')
      const expiresCookie = attributes.some((attribute) => {
        const normalized = attribute.trim().toLowerCase()
        return normalized === 'max-age=0' || normalized.startsWith('expires=thu, 01 jan 1970')
      })
      if (!name) continue
      if (!cookieValue || expiresCookie) {
        cookies.delete(name)
      } else {
        cookies.set(name, cookieValue)
      }
    }
  })

  headers.set('cookie', Array.from(cookies, ([name, value]) => `${name}=${value}`).join('; '))
  return headers
}

const status = os.security.status.handler(async ({ context }) => {
  requireTenant(context)
  const auth = createWorkerAuth(context.env)
  const sessions = toAuthSessionRows(
    await callAuth(auth.api.listSessions({ headers: context.request.headers })),
  )
  const currentToken = context.vars.session?.token
  return {
    twoFactorEnabled: Boolean(context.vars.user?.twoFactorEnabled),
    sessions: sessions.map((session) => ({
      id: session.id,
      userAgent: session.userAgent ?? null,
      ipAddress: session.ipAddress ?? null,
      createdAt: toIso(session.createdAt),
      updatedAt: toIso(session.updatedAt),
      expiresAt: toIso(session.expiresAt),
      isCurrent: session.token === currentToken,
    })),
  }
})

const enableTwoFactor = os.security.enableTwoFactor.handler(async ({ context }) => {
  const { userId } = requireTenant(context)
  const authSessions = context.vars.authSessions
  if (!authSessions) throw new Error('Tenant middleware did not provide auth session access.')
  await authSessions.deleteUnverifiedTwoFactorSetups(userId)
  const auth = createWorkerAuth(context.env)
  const result = await callAuth(
    auth.api.enableTwoFactor({
      body: { issuer: 'DueDateHQ' },
      headers: context.request.headers,
    }),
  )
  await auditSecurityEvent({
    context,
    action: 'auth.mfa.setup.started',
    after: { backupCodeCount: result.backupCodes.length },
  })
  return result
})

const verifyTwoFactor = os.security.verifyTwoFactor.handler(async ({ input, context }) => {
  requireTenant(context)
  const authSessions = context.vars.authSessions
  if (!authSessions) throw new Error('Tenant middleware did not provide auth session access.')
  const auth = createWorkerAuth(context.env)
  const wasEnabled = context.vars.user?.twoFactorEnabled === true
  const result: AuthWithHeaders<unknown> = await callAuth(
    auth.api.verifyTOTP({
      body: { code: input.code },
      headers: context.request.headers,
      returnHeaders: true,
    }),
  )
  captureAuthHeaders(context, result.headers)
  const refreshed = await callAuth(
    auth.api.getSession({
      headers: requestHeadersWithAuthCookies(context.request.headers, result.headers),
    }),
  )
  const verifiedToken = refreshed?.session?.token ?? context.vars.session?.token
  if (verifiedToken) await authSessions.markTwoFactorVerified(verifiedToken)
  await auditSecurityEvent({
    context,
    action: wasEnabled ? 'auth.mfa.challenge.verified' : 'auth.mfa.enabled',
  })
  return { status: true }
})

const disableTwoFactor = os.security.disableTwoFactor.handler(async ({ context }) => {
  requireTenant(context)
  const auth = createWorkerAuth(context.env)
  const result: AuthWithHeaders<{ status: boolean }> = await callAuth(
    auth.api.disableTwoFactor({
      body: {},
      headers: context.request.headers,
      returnHeaders: true,
    }),
  )
  captureAuthHeaders(context, result.headers)
  await auditSecurityEvent({ context, action: 'auth.mfa.disabled' })
  return result.response
})

const revokeSession = os.security.revokeSession.handler(async ({ input, context }) => {
  requireTenant(context)
  const auth = createWorkerAuth(context.env)
  const sessions = toAuthSessionRows(
    await callAuth(auth.api.listSessions({ headers: context.request.headers })),
  )
  const target = sessions.find((session) => session.id === input.sessionId)
  if (!target) {
    throw new ORPCError('NOT_FOUND', { message: 'Session not found.' })
  }

  const result = await callAuth(
    auth.api.revokeSession({
      body: { token: target.token },
      headers: context.request.headers,
    }),
  )
  await auditSecurityEvent({
    context,
    action: 'auth.session.revoked',
    after: { sessionId: input.sessionId, current: target.token === context.vars.session?.token },
    reason: 'single session',
  })
  return result
})

const revokeOtherSessions = os.security.revokeOtherSessions.handler(async ({ context }) => {
  requireTenant(context)
  const auth = createWorkerAuth(context.env)
  const result = await callAuth(auth.api.revokeOtherSessions({ headers: context.request.headers }))
  await auditSecurityEvent({ context, action: 'auth.session.revoked', reason: 'other sessions' })
  return result
})

export const securityHandlers = {
  status,
  enableTwoFactor,
  verifyTwoFactor,
  disableTwoFactor,
  revokeSession,
  revokeOtherSessions,
}
