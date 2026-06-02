import { and, eq, isNull } from 'drizzle-orm'
import type { Db } from './client'
import { reminder } from './schema/notifications'

/**
 * The `email_outbox` row a Resend send/webhook event carries has no client or
 * deadline on it — those live on the linked `reminder` row(s)
 * (`reminder.email_outbox_id = outbox.id`). This helper recovers that linkage so
 * background email code (outbox flush, delivery webhook) can attribute an event
 * to "client X / deadline Y" for the audit log. Non-reminder outbox rows
 * (digests, pulse, audit-package) simply return no rows.
 */
export type ReminderLinkage = {
  id: string
  firmId: string
  clientId: string
  obligationInstanceId: string
  recipientKind: 'member' | 'client'
  recipientEmail: string | null
  channel: 'email' | 'in_app'
  offsetDays: number
  templateId: string | null
  clickedAt: Date | null
}

const LINKAGE_COLUMNS = {
  id: reminder.id,
  firmId: reminder.firmId,
  clientId: reminder.clientId,
  obligationInstanceId: reminder.obligationInstanceId,
  recipientKind: reminder.recipientKind,
  recipientEmail: reminder.recipientEmail,
  channel: reminder.channel,
  offsetDays: reminder.offsetDays,
  templateId: reminder.templateId,
  clickedAt: reminder.clickedAt,
}

export async function reminderLinkageByOutboxId(
  db: Db,
  outboxId: string,
): Promise<ReminderLinkage[]> {
  return db.select(LINKAGE_COLUMNS).from(reminder).where(eq(reminder.emailOutboxId, outboxId))
}

/**
 * Stamp the first-open time on the reminders tied to an outbox row and return
 * the rows that were newly marked (clickedAt was null). Returning only the
 * freshly-opened rows gives callers first-open-only dedup — Resend emits an
 * open event per device / image-proxy prefetch, so auditing every open would
 * flood the log.
 */
export async function markRemindersOpened(
  db: Db,
  outboxId: string,
  openedAt: Date,
): Promise<ReminderLinkage[]> {
  const rows = await reminderLinkageByOutboxId(db, outboxId)
  const freshly = rows.filter((row) => row.clickedAt === null)
  if (freshly.length === 0) return []
  await db
    .update(reminder)
    .set({ clickedAt: openedAt })
    .where(and(eq(reminder.emailOutboxId, outboxId), isNull(reminder.clickedAt)))
  return freshly
}
