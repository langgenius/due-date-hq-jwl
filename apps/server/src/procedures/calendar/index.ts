import { ORPCError } from '@orpc/server'
import type { CalendarSubscriptionPublic } from '@duedatehq/contracts'
import type { CalendarSubscriptionRow } from '@duedatehq/ports/calendar'
import { ErrorCodes } from '@duedatehq/contracts'
import type { RpcContext } from '../_context'
import { requireTenant } from '../_context'
import { requireCurrentFirmRole } from '../_permissions'
import { os } from '../_root'
import { calendarFeedUrl, signCalendarToken } from '../../lib/calendar-token'

const FIRM_CALENDAR_ROLES = ['owner', 'partner', 'manager'] as const

function toIso(value: Date): string {
  return value.toISOString()
}

function toNullableIso(value: Date | null): string | null {
  return value ? toIso(value) : null
}

async function toPublic(ctx: RpcContext, row: CalendarSubscriptionRow) {
  const feedUrl =
    row.status === 'active'
      ? calendarFeedUrl(
          ctx.env.AUTH_URL,
          await signCalendarToken({
            secret: ctx.env.AUTH_SECRET,
            subscriptionId: row.id,
            nonce: row.tokenNonce,
          }),
        )
      : null

  return {
    id: row.id,
    firmId: row.firmId,
    scope: row.scope,
    subjectUserId: row.subjectUserId,
    privacyMode: row.privacyMode,
    status: row.status,
    feedUrl,
    lastAccessedAt: toNullableIso(row.lastAccessedAt),
    revokedAt: toNullableIso(row.revokedAt),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  } satisfies CalendarSubscriptionPublic
}

async function canManageFirmCalendar(ctx: RpcContext): Promise<boolean> {
  const { tenant, userId } = requireTenant(ctx)
  const { members } = ctx.vars
  if (!members) return false
  const actor = await members.findMembership(tenant.firmId, userId)
  return (
    actor?.status === 'active' &&
    (actor.role === 'owner' || actor.role === 'partner' || actor.role === 'manager')
  )
}

async function requireCalendarAccess(ctx: RpcContext, row: CalendarSubscriptionRow): Promise<void> {
  if (row.scope === 'firm') {
    await requireCurrentFirmRole(ctx, FIRM_CALENDAR_ROLES)
    return
  }
  const { userId } = requireTenant(ctx)
  if (row.subjectUserId !== userId) {
    throw new ORPCError('FORBIDDEN', { message: ErrorCodes.MEMBER_FORBIDDEN })
  }
}

const listSubscriptions = os.calendar.listSubscriptions.handler(async ({ context }) => {
  const { scoped, userId } = requireTenant(context)
  const firmCalendarVisible = await canManageFirmCalendar(context)
  const rows = await scoped.calendar.listForUser(userId)
  const visibleRows = rows.filter((row) => row.scope === 'my' || firmCalendarVisible)
  return Promise.all(visibleRows.map((row) => toPublic(context, row)))
})

const upsertSubscription = os.calendar.upsertSubscription.handler(async ({ input, context }) => {
  const { scoped, userId } = requireTenant(context)
  if (input.scope === 'firm') {
    await requireCurrentFirmRole(context, FIRM_CALENDAR_ROLES)
  }
  const row = await scoped.calendar.upsert({
    scope: input.scope,
    subjectUserId: input.scope === 'my' ? userId : null,
    privacyMode: input.privacyMode ?? 'redacted',
    tokenNonce: crypto.randomUUID(),
  })
  await scoped.audit.write({
    actorId: userId,
    entityType: 'calendar_subscription',
    entityId: row.id,
    action: 'calendar.subscription.created',
    after: { scope: row.scope, privacyMode: row.privacyMode, status: row.status },
  })
  return toPublic(context, row)
})

const regenerateSubscription = os.calendar.regenerateSubscription.handler(
  async ({ input, context }) => {
    const { scoped, userId } = requireTenant(context)
    const existing = await scoped.calendar.find(input.id)
    if (!existing) {
      throw new ORPCError('NOT_FOUND', { message: 'Calendar subscription not found.' })
    }
    await requireCalendarAccess(context, existing)
    const row = await scoped.calendar.regenerate(input.id, crypto.randomUUID())
    if (!row) {
      throw new ORPCError('NOT_FOUND', { message: 'Calendar subscription not found.' })
    }
    await scoped.audit.write({
      actorId: userId,
      entityType: 'calendar_subscription',
      entityId: row.id,
      action: 'calendar.subscription.regenerated',
      reason: 'Feed link rotated; the previous URL no longer works.',
      after: { scope: row.scope, status: row.status },
    })
    return toPublic(context, row)
  },
)

const disableSubscription = os.calendar.disableSubscription.handler(async ({ input, context }) => {
  const { scoped, userId } = requireTenant(context)
  const existing = await scoped.calendar.find(input.id)
  if (!existing) {
    throw new ORPCError('NOT_FOUND', { message: 'Calendar subscription not found.' })
  }
  await requireCalendarAccess(context, existing)
  const row = await scoped.calendar.disable(input.id)
  if (!row) {
    throw new ORPCError('NOT_FOUND', { message: 'Calendar subscription not found.' })
  }
  await scoped.audit.write({
    actorId: userId,
    entityType: 'calendar_subscription',
    entityId: row.id,
    action: 'calendar.subscription.disabled',
    before: { status: existing.status },
    after: { status: row.status },
  })
  return toPublic(context, row)
})

export const calendarHandlers = {
  listSubscriptions,
  upsertSubscription,
  regenerateSubscription,
  disableSubscription,
}
