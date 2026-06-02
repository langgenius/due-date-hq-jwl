import { and, asc, eq, lte } from 'drizzle-orm'
import { Resend } from 'resend'
import { createDb } from '@duedatehq/db'
import { auditEvent } from '@duedatehq/db/schema/audit'
import { emailOutbox, notificationDigestRun, reminder } from '@duedatehq/db/schema/notifications'
import type { EmailOutbox } from '@duedatehq/db/schema/notifications'
import { reminderLinkageByOutboxId } from '@duedatehq/db/reminder-linkage'
import type { Env } from '../../env'
import { recordPulseMetric } from '../pulse/metrics'

export interface EmailFlushQueueMessage {
  type: 'email.flush'
}

type FlushRowResult = 'sent' | 'failed' | 'skipped'
type PulseDigestEvent = 'pulse_approved' | 'pulse_applied'
const STALE_SENDING_MS = 15 * 60 * 1000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readRecipients(payload: unknown): string[] {
  if (!isRecord(payload) || !Array.isArray(payload.recipients)) return []
  return payload.recipients.filter((value): value is string => typeof value === 'string')
}

function readPulseDigestEvent(payload: unknown): PulseDigestEvent {
  if (!isRecord(payload)) return 'pulse_applied'
  return payload.event === 'pulse_approved' ? 'pulse_approved' : 'pulse_applied'
}

function pulseDigestSubject(payload: unknown): string {
  return readPulseDigestEvent(payload) === 'pulse_approved'
    ? 'Pulse deadline update available'
    : 'Pulse deadline update applied'
}

function genericSubject(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback
  return typeof payload.subject === 'string' && payload.subject.trim()
    ? payload.subject.trim()
    : fallback
}

function genericText(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback
  return typeof payload.text === 'string' && payload.text.trim() ? payload.text.trim() : fallback
}

function readDigestRunId(payload: unknown): string | null {
  if (!isRecord(payload)) return null
  return typeof payload.digestRunId === 'string' && payload.digestRunId.trim()
    ? payload.digestRunId.trim()
    : null
}

function pulseDigestText(payload: unknown): string {
  if (!isRecord(payload)) return 'Pulse digest'
  const summary = typeof payload.summary === 'string' ? payload.summary : 'Pulse digest'
  const obligations = Array.isArray(payload.obligations) ? payload.obligations : []
  const event = readPulseDigestEvent(payload)
  const lines = obligations.filter(isRecord).map((item) => {
    const clientName = typeof item.clientName === 'string' ? item.clientName : 'Client'
    const before =
      typeof item.beforeDueDate === 'string'
        ? item.beforeDueDate
        : typeof item.currentDueDate === 'string'
          ? item.currentDueDate
          : 'previous date'
    const after =
      typeof item.afterDueDate === 'string'
        ? item.afterDueDate
        : typeof item.newDueDate === 'string'
          ? item.newDueDate
          : 'new date'
    const reviewSuffix =
      event === 'pulse_approved' && item.matchStatus === 'needs_review' ? ' (needs review)' : ''
    return `- ${clientName}: ${before} -> ${after}${reviewSuffix}`
  })
  return [summary, '', ...lines].join('\n')
}

// Audit the send outcome of a CLIENT-facing reminder against its deadline, so
// a CPA sees "reminder sent / couldn't be sent to this client" in the log.
// Internal member reminders + digests/pulse/audit emails (no client reminder
// linked) are skipped. System actor — no human pressed send.
async function auditClientReminderOutcome(
  db: ReturnType<typeof createDb>,
  outboxId: string,
  outcome: 'sent' | 'failed',
  failureReason: string | null,
): Promise<void> {
  const links = await reminderLinkageByOutboxId(db, outboxId)
  for (const link of links) {
    if (link.recipientKind !== 'client') continue
    await db.insert(auditEvent).values({
      id: crypto.randomUUID(),
      firmId: link.firmId,
      actorId: null,
      actorType: 'system',
      entityType: 'obligation_instance',
      entityId: link.obligationInstanceId,
      action: outcome === 'sent' ? 'reminder.sent' : 'reminder.failed',
      afterJson: {
        clientId: link.clientId,
        channel: link.channel,
        offsetDays: link.offsetDays,
        ...(link.recipientEmail ? { recipientEmail: link.recipientEmail } : {}),
        ...(failureReason ? { failureReason } : {}),
      },
    })
  }
}

async function processOutboxRow(
  db: ReturnType<typeof createDb>,
  resend: Resend | null,
  env: Pick<Env, 'EMAIL_FROM'>,
  row: EmailOutbox,
): Promise<FlushRowResult> {
  const recipients = readRecipients(row.payloadJson)
  if (!resend || recipients.length === 0) {
    const failureReason = !resend
      ? 'RESEND_API_KEY is not configured.'
      : 'No recipients were present in the outbox payload.'
    await db
      .update(emailOutbox)
      .set({
        status: 'failed',
        failedAt: new Date(),
        failureReason,
      })
      .where(eq(emailOutbox.id, row.id))
    await db
      .update(reminder)
      .set({ status: 'failed', failureReason })
      .where(eq(reminder.emailOutboxId, row.id))
    const digestRunId = readDigestRunId(row.payloadJson)
    if (digestRunId) {
      await db
        .update(notificationDigestRun)
        .set({ status: 'failed', failureReason })
        .where(eq(notificationDigestRun.id, digestRunId))
    }
    await auditClientReminderOutcome(db, row.id, 'failed', failureReason)
    return 'failed'
  }

  await db.update(emailOutbox).set({ status: 'sending' }).where(eq(emailOutbox.id, row.id))

  try {
    const { error } = await resend.emails.send(
      {
        from: env.EMAIL_FROM,
        to: recipients,
        subject:
          row.type === 'pulse_digest'
            ? pulseDigestSubject(row.payloadJson)
            : genericSubject(row.payloadJson, 'DueDateHQ notification'),
        text:
          row.type === 'pulse_digest'
            ? pulseDigestText(row.payloadJson)
            : genericText(row.payloadJson, 'You have a new DueDateHQ notification.'),
        tags: [
          { name: 'outbox_id', value: row.id },
          { name: 'external_id', value: row.externalId },
        ],
      },
      { idempotencyKey: `email-outbox/${row.id}` },
    )
    if (error) throw new Error(error.message)
    await db
      .update(emailOutbox)
      .set({ status: 'sent', sentAt: new Date(), failureReason: null })
      .where(eq(emailOutbox.id, row.id))
    await db
      .update(reminder)
      .set({ status: 'sent', sentAt: new Date(), failureReason: null })
      .where(eq(reminder.emailOutboxId, row.id))
    const digestRunId = readDigestRunId(row.payloadJson)
    if (digestRunId) {
      await db
        .update(notificationDigestRun)
        .set({ status: 'sent', sentAt: new Date(), failureReason: null })
        .where(eq(notificationDigestRun.id, digestRunId))
    }
    await auditClientReminderOutcome(db, row.id, 'sent', null)
    return 'sent'
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : 'Resend send failed.'
    await db
      .update(emailOutbox)
      .set({
        status: 'failed',
        failedAt: new Date(),
        failureReason,
      })
      .where(eq(emailOutbox.id, row.id))
    await db
      .update(reminder)
      .set({ status: 'failed', failureReason })
      .where(eq(reminder.emailOutboxId, row.id))
    const digestRunId = readDigestRunId(row.payloadJson)
    if (digestRunId) {
      await db
        .update(notificationDigestRun)
        .set({ status: 'failed', failureReason })
        .where(eq(notificationDigestRun.id, digestRunId))
    }
    await auditClientReminderOutcome(db, row.id, 'failed', failureReason)
    return 'failed'
  }
}

export async function flushEmailOutbox(
  env: Pick<Env, 'DB' | 'EMAIL_FROM' | 'RESEND_API_KEY'>,
): Promise<{ sent: number; failed: number; skipped: number }> {
  const db = createDb(env.DB)
  const staleSendingCutoff = new Date(Date.now() - STALE_SENDING_MS)
  await db
    .update(emailOutbox)
    .set({ status: 'pending', failureReason: 'Recovered stale sending row for retry.' })
    .where(and(eq(emailOutbox.status, 'sending'), lte(emailOutbox.createdAt, staleSendingCutoff)))
  const rows = await db
    .select()
    .from(emailOutbox)
    .where(eq(emailOutbox.status, 'pending'))
    .orderBy(asc(emailOutbox.createdAt))
    .limit(10)
  if (rows.length === 0) return { sent: 0, failed: 0, skipped: 0 }

  const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null
  const results = await Promise.all(rows.map((row) => processOutboxRow(db, resend, env, row)))

  const output = {
    sent: results.filter((result) => result === 'sent').length,
    failed: results.filter((result) => result === 'failed').length,
    skipped: results.filter((result) => result === 'skipped').length,
  }
  recordPulseMetric('pulse.email_outbox.flush_result', output)
  return output
}
