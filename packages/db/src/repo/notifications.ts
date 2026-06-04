import { and, count, desc, eq, isNotNull, isNull, lt } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type {
  MorningDigestDay,
  NotificationListInput,
  NotificationPreferencePatch,
  NotificationPreferenceRow,
  NotificationType,
} from '@duedatehq/ports/notifications'
import type { Db } from '../client'
import {
  emailOutbox,
  inAppNotification,
  notificationDigestRun,
  notificationPreference,
} from '../schema/notifications'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100
const DEFAULT_MORNING_DIGEST_DAYS: MorningDigestDay[] = ['mon', 'tue', 'wed', 'thu', 'fri']

function normalizeDigestDays(value: unknown): MorningDigestDay[] {
  if (!Array.isArray(value)) return DEFAULT_MORNING_DIGEST_DAYS
  const days = value.filter((day): day is MorningDigestDay =>
    ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(String(day)),
  )
  return days.length > 0 ? Array.from(new Set(days)) : DEFAULT_MORNING_DIGEST_DAYS
}

function toPreferenceRow(
  row: typeof notificationPreference.$inferSelect,
): NotificationPreferenceRow {
  return {
    id: row.id,
    firmId: row.firmId,
    userId: row.userId,
    emailEnabled: row.emailEnabled,
    inAppEnabled: row.inAppEnabled,
    remindersEnabled: row.remindersEnabled,
    pulseEnabled: row.pulseEnabled,
    unassignedRemindersEnabled: row.unassignedRemindersEnabled,
    morningDigestEnabled: row.morningDigestEnabled,
    morningDigestHour: row.morningDigestHour,
    morningDigestDays: normalizeDigestDays(row.morningDigestDaysJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function encodeCursor(row: { createdAt: Date; id: string }): string {
  return Buffer.from(`${row.createdAt.toISOString()}|${row.id}`, 'utf8').toString('base64url')
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8')
    const [iso, id] = raw.split('|')
    if (!iso || !id) return null
    const createdAt = new Date(iso)
    if (Number.isNaN(createdAt.getTime())) return null
    return { createdAt, id }
  } catch {
    return null
  }
}

export function makeNotificationsRepo(db: Db, firmId: string) {
  async function ensurePreference(userId: string) {
    const [existing] = await db
      .select()
      .from(notificationPreference)
      .where(
        and(eq(notificationPreference.firmId, firmId), eq(notificationPreference.userId, userId)),
      )
      .limit(1)
    if (existing) return existing

    const id = crypto.randomUUID()
    await db
      .insert(notificationPreference)
      .values({ id, firmId, userId })
      .onConflictDoNothing({
        target: [notificationPreference.firmId, notificationPreference.userId],
      })
    const [row] = await db
      .select()
      .from(notificationPreference)
      .where(
        and(eq(notificationPreference.firmId, firmId), eq(notificationPreference.userId, userId)),
      )
      .limit(1)
    if (!row) throw new Error('Notification preference could not be read.')
    return row
  }

  return {
    firmId,

    async listForUser(userId: string, input: NotificationListInput = {}) {
      const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT)
      const filters: SQL[] = [
        eq(inAppNotification.firmId, firmId),
        eq(inAppNotification.userId, userId),
      ]
      if (input.status === 'unread') filters.push(isNull(inAppNotification.readAt))
      if (input.status === 'read') filters.push(isNotNull(inAppNotification.readAt))
      if (input.type) filters.push(eq(inAppNotification.type, input.type))
      if (input.cursor) {
        const decoded = decodeCursor(input.cursor)
        if (decoded) filters.push(lt(inAppNotification.createdAt, decoded.createdAt))
      }

      const rows = await db
        .select()
        .from(inAppNotification)
        .where(and(...filters))
        .orderBy(desc(inAppNotification.createdAt), desc(inAppNotification.id))
        .limit(limit + 1)
      const hasMore = rows.length > limit
      const page = hasMore ? rows.slice(0, limit) : rows
      const lastRow = page[page.length - 1]
      return {
        rows: page,
        nextCursor: hasMore && lastRow ? encodeCursor(lastRow) : null,
      }
    },

    async unreadCount(userId: string): Promise<number> {
      const [row] = await db
        .select({ value: count() })
        .from(inAppNotification)
        .where(
          and(
            eq(inAppNotification.firmId, firmId),
            eq(inAppNotification.userId, userId),
            isNull(inAppNotification.readAt),
          ),
        )
      return row?.value ?? 0
    },

    async markRead(userId: string, id: string): Promise<void> {
      await db
        .update(inAppNotification)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(inAppNotification.firmId, firmId),
            eq(inAppNotification.userId, userId),
            eq(inAppNotification.id, id),
            isNull(inAppNotification.readAt),
          ),
        )
    },

    async markAllRead(userId: string): Promise<number> {
      const rows = await db
        .select({ id: inAppNotification.id })
        .from(inAppNotification)
        .where(
          and(
            eq(inAppNotification.firmId, firmId),
            eq(inAppNotification.userId, userId),
            isNull(inAppNotification.readAt),
          ),
        )
      if (rows.length === 0) return 0
      await db
        .update(inAppNotification)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(inAppNotification.firmId, firmId),
            eq(inAppNotification.userId, userId),
            isNull(inAppNotification.readAt),
          ),
        )
      return rows.length
    },

    async getPreference(userId: string) {
      return toPreferenceRow(await ensurePreference(userId))
    },

    async updatePreference(userId: string, patch: NotificationPreferencePatch) {
      await ensurePreference(userId)
      const update: Partial<typeof notificationPreference.$inferInsert> = {}
      if (patch.emailEnabled !== undefined) update.emailEnabled = patch.emailEnabled
      if (patch.inAppEnabled !== undefined) update.inAppEnabled = patch.inAppEnabled
      if (patch.remindersEnabled !== undefined) update.remindersEnabled = patch.remindersEnabled
      if (patch.pulseEnabled !== undefined) update.pulseEnabled = patch.pulseEnabled
      if (patch.unassignedRemindersEnabled !== undefined) {
        update.unassignedRemindersEnabled = patch.unassignedRemindersEnabled
      }
      if (patch.morningDigestEnabled !== undefined) {
        update.morningDigestEnabled = patch.morningDigestEnabled
      }
      if (patch.morningDigestHour !== undefined) {
        update.morningDigestHour = patch.morningDigestHour
      }
      if (patch.morningDigestDays !== undefined) {
        update.morningDigestDaysJson = patch.morningDigestDays
      }
      if (Object.keys(update).length > 0) {
        update.updatedAt = new Date()
        await db
          .update(notificationPreference)
          .set(update)
          .where(
            and(
              eq(notificationPreference.firmId, firmId),
              eq(notificationPreference.userId, userId),
            ),
          )
      }
      return toPreferenceRow(await ensurePreference(userId))
    },

    async listDigestRuns(userId: string, input: { limit?: number } = {}) {
      const limit = Math.min(Math.max(input.limit ?? 14, 1), 30)
      return db
        .select()
        .from(notificationDigestRun)
        .where(
          and(eq(notificationDigestRun.firmId, firmId), eq(notificationDigestRun.userId, userId)),
        )
        .orderBy(desc(notificationDigestRun.createdAt))
        .limit(limit)
    },

    async create(input: {
      userId: string
      type: NotificationType
      entityType: string
      entityId: string
      title: string
      body: string
      href?: string | null
      metadataJson?: unknown
    }): Promise<{ id: string }> {
      const id = crypto.randomUUID()
      await db.insert(inAppNotification).values({
        id,
        firmId,
        userId: input.userId,
        type: input.type,
        entityType: input.entityType,
        entityId: input.entityId,
        title: input.title,
        body: input.body,
        href: input.href ?? null,
        metadataJson: input.metadataJson ?? null,
      })
      return { id }
    },

    async enqueueEmail(input: {
      externalId: string
      type:
        | 'pulse_digest'
        | 'pulse_review_request'
        | 'morning_digest'
        | 'deadline_reminder'
        | 'client_deadline_reminder'
        | 'audit_evidence_package_ready'
        | 'readiness_request'
        | 'signature_reminder'
      payloadJson: unknown
    }): Promise<{ id: string; created: boolean }> {
      const id = crypto.randomUUID()
      await db
        .insert(emailOutbox)
        .values({
          id,
          firmId,
          externalId: input.externalId,
          type: input.type,
          payloadJson: input.payloadJson,
        })
        .onConflictDoNothing({ target: emailOutbox.externalId })
      const rows = await db
        .select({ id: emailOutbox.id })
        .from(emailOutbox)
        .where(eq(emailOutbox.externalId, input.externalId))
        .limit(1)
      return { id: rows[0]?.id ?? id, created: rows[0]?.id === id }
    },
  }
}

export type NotificationsRepo = ReturnType<typeof makeNotificationsRepo>
