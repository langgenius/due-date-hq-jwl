import { and, asc, eq, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { OPEN_OBLIGATION_STATUSES } from '@duedatehq/core/obligation-workflow'
import type {
  CalendarFeedSubscriptionRow,
  CalendarSubscriptionRow,
  CalendarUpsertInput,
} from '@duedatehq/ports/calendar'
import type { Db } from '../client'
import { user } from '../schema/auth'
import { calendarSubscription } from '../schema/calendar'
import { client } from '../schema/clients'
import { firmProfile } from '../schema/firm'
import { obligationInstance } from '../schema/obligations'
import { loadDerivedReadinessByObligation } from './readiness-derived'

const OPEN_STATUSES = [...OPEN_OBLIGATION_STATUSES]

function normalizeAssignee(value: string | null): string | null {
  const normalized = value?.trim().toLowerCase()
  return normalized ? normalized : null
}

function rowByIdentityFilter(input: Pick<CalendarUpsertInput, 'scope' | 'subjectUserId'>): SQL {
  return input.scope === 'my'
    ? and(
        eq(calendarSubscription.scope, 'my'),
        eq(calendarSubscription.subjectUserId, input.subjectUserId ?? ''),
      )!
    : and(eq(calendarSubscription.scope, 'firm'), isNull(calendarSubscription.subjectUserId))!
}

function mapSubscription(row: typeof calendarSubscription.$inferSelect): CalendarSubscriptionRow {
  return {
    id: row.id,
    firmId: row.firmId,
    scope: row.scope,
    subjectUserId: row.subjectUserId,
    privacyMode: row.privacyMode,
    tokenNonce: row.tokenNonce,
    status: row.status,
    lastAccessedAt: row.lastAccessedAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function makeCalendarRepo(db: Db, firmId: string) {
  async function findByIdentity(input: Pick<CalendarUpsertInput, 'scope' | 'subjectUserId'>) {
    const [row] = await db
      .select()
      .from(calendarSubscription)
      .where(and(eq(calendarSubscription.firmId, firmId), rowByIdentityFilter(input)))
      .limit(1)
    return row
  }

  async function findById(id: string) {
    const [row] = await db
      .select()
      .from(calendarSubscription)
      .where(and(eq(calendarSubscription.firmId, firmId), eq(calendarSubscription.id, id)))
      .limit(1)
    return row
  }

  return {
    firmId,

    async listForUser(userId: string): Promise<CalendarSubscriptionRow[]> {
      const rows = await db
        .select()
        .from(calendarSubscription)
        .where(
          and(
            eq(calendarSubscription.firmId, firmId),
            or(
              eq(calendarSubscription.scope, 'firm'),
              and(
                eq(calendarSubscription.scope, 'my'),
                eq(calendarSubscription.subjectUserId, userId),
              ),
            ),
          ),
        )
        .orderBy(asc(calendarSubscription.scope), asc(calendarSubscription.createdAt))
      return rows.map(mapSubscription)
    },

    async upsert(input: CalendarUpsertInput): Promise<CalendarSubscriptionRow> {
      const existing = await findByIdentity(input)
      const now = new Date()
      if (existing) {
        const tokenNonce = existing.status === 'active' ? existing.tokenNonce : input.tokenNonce
        await db
          .update(calendarSubscription)
          .set({
            privacyMode: input.privacyMode,
            tokenNonce,
            status: 'active',
            revokedAt: null,
            updatedAt: now,
          })
          .where(
            and(eq(calendarSubscription.firmId, firmId), eq(calendarSubscription.id, existing.id)),
          )
        const updated = await findById(existing.id)
        if (!updated) throw new Error('Calendar subscription disappeared after update.')
        return mapSubscription(updated)
      }

      const id = crypto.randomUUID()
      await db.insert(calendarSubscription).values({
        id,
        firmId,
        scope: input.scope,
        subjectUserId: input.subjectUserId,
        privacyMode: input.privacyMode,
        tokenNonce: input.tokenNonce,
        status: 'active',
      })
      const inserted = await findById(id)
      if (!inserted) throw new Error('Calendar subscription could not be read after insert.')
      return mapSubscription(inserted)
    },

    async find(id: string): Promise<CalendarSubscriptionRow | undefined> {
      const row = await findById(id)
      return row ? mapSubscription(row) : undefined
    },

    async regenerate(id: string, tokenNonce: string): Promise<CalendarSubscriptionRow | undefined> {
      await db
        .update(calendarSubscription)
        .set({
          tokenNonce,
          status: 'active',
          revokedAt: null,
          updatedAt: new Date(),
        })
        .where(and(eq(calendarSubscription.firmId, firmId), eq(calendarSubscription.id, id)))
      const row = await findById(id)
      return row ? mapSubscription(row) : undefined
    },

    async disable(id: string): Promise<CalendarSubscriptionRow | undefined> {
      await db
        .update(calendarSubscription)
        .set({
          status: 'disabled',
          revokedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(calendarSubscription.firmId, firmId), eq(calendarSubscription.id, id)))
      const row = await findById(id)
      return row ? mapSubscription(row) : undefined
    },
  }
}

export function makeCalendarFeedRepo(db: Db) {
  return {
    async getSubscription(id: string): Promise<CalendarFeedSubscriptionRow | undefined> {
      const [row] = await db
        .select({
          id: calendarSubscription.id,
          firmId: calendarSubscription.firmId,
          scope: calendarSubscription.scope,
          subjectUserId: calendarSubscription.subjectUserId,
          privacyMode: calendarSubscription.privacyMode,
          tokenNonce: calendarSubscription.tokenNonce,
          status: calendarSubscription.status,
          lastAccessedAt: calendarSubscription.lastAccessedAt,
          revokedAt: calendarSubscription.revokedAt,
          createdAt: calendarSubscription.createdAt,
          updatedAt: calendarSubscription.updatedAt,
          firmName: firmProfile.name,
          firmStatus: firmProfile.status,
          firmTimezone: firmProfile.timezone,
          subjectName: user.name,
          subjectEmail: user.email,
        })
        .from(calendarSubscription)
        .innerJoin(firmProfile, eq(firmProfile.id, calendarSubscription.firmId))
        .leftJoin(user, eq(user.id, calendarSubscription.subjectUserId))
        .where(eq(calendarSubscription.id, id))
        .limit(1)
      return row
    },

    async listFeedObligations(
      subscription: CalendarFeedSubscriptionRow,
      input: { startDate: Date; endDate: Date; limit: number },
    ) {
      const filters: SQL[] = [
        eq(obligationInstance.firmId, subscription.firmId),
        inArray(obligationInstance.status, OPEN_STATUSES),
        gte(obligationInstance.currentDueDate, input.startDate),
        lte(obligationInstance.currentDueDate, input.endDate),
        isNull(client.deletedAt),
        isNull(obligationInstance.supersededAt),
      ]

      if (subscription.scope === 'my') {
        if (!subscription.subjectUserId) return []
        const assigneeFilters: SQL[] = [eq(client.assigneeId, subscription.subjectUserId)]
        const subjectName = normalizeAssignee(subscription.subjectName)
        const subjectEmail = normalizeAssignee(subscription.subjectEmail)
        if (subjectName)
          assigneeFilters.push(sql`lower(trim(${client.assigneeName})) = ${subjectName}`)
        if (subjectEmail) {
          assigneeFilters.push(sql`lower(trim(${client.assigneeName})) = ${subjectEmail}`)
        }
        filters.push(or(...assigneeFilters)!)
      }

      const rows = await db
        .select({
          id: obligationInstance.id,
          clientId: client.id,
          clientName: client.name,
          clientState: obligationInstance.jurisdiction,
          clientCounty: client.county,
          assigneeName: client.assigneeName,
          taxType: obligationInstance.taxType,
          taxYear: obligationInstance.taxYear,
          status: obligationInstance.status,
          currentDueDate: obligationInstance.currentDueDate,
          updatedAt: obligationInstance.updatedAt,
        })
        .from(obligationInstance)
        .innerJoin(client, eq(client.id, obligationInstance.clientId))
        .where(and(...filters))
        .orderBy(asc(obligationInstance.currentDueDate), asc(obligationInstance.id))
        .limit(input.limit)
      const readinessById = await loadDerivedReadinessByObligation(
        db,
        subscription.firmId,
        new Map(rows.map((row) => [row.id, row.status])),
      )
      return rows.map((row) =>
        Object.assign({}, row, { readiness: readinessById.get(row.id) ?? 'ready' }),
      )
    },

    async markAccessed(id: string, accessedAt: Date): Promise<void> {
      await db
        .update(calendarSubscription)
        .set({ lastAccessedAt: accessedAt })
        .where(eq(calendarSubscription.id, id))
    },
  }
}

export type CalendarRepo = ReturnType<typeof makeCalendarRepo>
export type CalendarFeedRepo = ReturnType<typeof makeCalendarFeedRepo>
