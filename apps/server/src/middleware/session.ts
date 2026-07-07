import { createMiddleware } from 'hono/factory'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { authSchema, createDb, firmSchema, type Db } from '@duedatehq/db'
import { createWorkerAuth } from '../auth'
import type { Env, ContextVars } from '../env'

export async function restoreSessionActiveFirm(input: {
  db: Db
  sessionId: string
  userId: string
  activeOrganizationId?: string | null
}): Promise<string | null> {
  const activeOrganizationId = input.activeOrganizationId ?? null

  if (activeOrganizationId) {
    const [current] = await input.db
      .select({ id: authSchema.member.organizationId })
      .from(authSchema.member)
      .innerJoin(
        firmSchema.firmProfile,
        eq(firmSchema.firmProfile.id, authSchema.member.organizationId),
      )
      .where(
        and(
          eq(authSchema.member.organizationId, activeOrganizationId),
          eq(authSchema.member.userId, input.userId),
          eq(authSchema.member.status, 'active'),
          eq(firmSchema.firmProfile.status, 'active'),
          isNull(firmSchema.firmProfile.deletedAt),
        ),
      )
      .limit(1)

    if (current) return activeOrganizationId
  }

  const [fallback] = await input.db
    .select({ id: authSchema.member.organizationId })
    .from(authSchema.member)
    .innerJoin(
      firmSchema.firmProfile,
      eq(firmSchema.firmProfile.id, authSchema.member.organizationId),
    )
    .where(
      and(
        eq(authSchema.member.userId, input.userId),
        eq(authSchema.member.status, 'active'),
        eq(firmSchema.firmProfile.status, 'active'),
        isNull(firmSchema.firmProfile.deletedAt),
      ),
    )
    .orderBy(asc(authSchema.member.createdAt))
    .limit(1)

  const nextFirmId = fallback?.id ?? null
  if (nextFirmId !== activeOrganizationId) {
    await input.db
      .update(authSchema.session)
      .set({ activeOrganizationId: nextFirmId, updatedAt: new Date() })
      .where(
        and(
          eq(authSchema.session.id, input.sessionId),
          eq(authSchema.session.userId, input.userId),
        ),
      )
  }

  return nextFirmId
}

/**
 * Reads the better-auth session from the incoming cookie.
 *
 * Layering (docs/dev-file/06 §4.1):
 *   - 401 if no session
 *   - Sets c.var.userId and c.var.firmId from activeOrganizationId
 *
 */
export const sessionMiddleware = createMiddleware<{ Bindings: Env; Variables: ContextVars }>(
  async (c, next) => {
    let executionCtx: Parameters<typeof createWorkerAuth>[1]
    try {
      executionCtx = c.executionCtx
    } catch {
      executionCtx = undefined
    }

    const auth = createWorkerAuth(c.env, executionCtx)
    const sessionData = await auth.api.getSession({ headers: c.req.raw.headers })

    if (!sessionData?.session || !sessionData.user) {
      return c.json({ error: 'UNAUTHORIZED' }, 401)
    }

    const db = createDb(c.env.DB)
    const restoreInput: Parameters<typeof restoreSessionActiveFirm>[0] = {
      db,
      sessionId: sessionData.session.id,
      userId: sessionData.user.id,
    }
    if (sessionData.session.activeOrganizationId !== undefined) {
      restoreInput.activeOrganizationId = sessionData.session.activeOrganizationId
    }
    const firmId = await restoreSessionActiveFirm(restoreInput)
    const session = { ...sessionData.session, activeOrganizationId: firmId }

    c.set('session', session)
    c.set('user', sessionData.user)
    c.set('userId', sessionData.user.id)

    if (firmId) {
      c.set('firmId', firmId)
    }

    return next()
  },
)
