import { Hono } from 'hono'
import { Resend } from 'resend'
import { eq } from 'drizzle-orm'
import { createDb } from '@duedatehq/db'
import { auditEvent } from '@duedatehq/db/schema/audit'
import { emailOutbox } from '@duedatehq/db/schema/notifications'
import type { Env, ContextVars } from '../env'
import {
  markRemindersOpened,
  reminderLinkageByOutboxId,
  type ReminderLinkage,
} from '@duedatehq/db/reminder-linkage'

type ResendWebhookEnv = Pick<Env, 'DB' | 'RESEND_API_KEY' | 'RESEND_WEBHOOK_SECRET'>

type OutboxWebhookUpdate =
  | { kind: 'status'; outboxId: string; status: 'sent' | 'failed'; failureReason: string | null }
  // `opened` does not change the send status — it records first-open on the
  // linked reminder(s). Resend fires this per device / proxy prefetch, so the
  // linkage helper dedups to first-open.
  | { kind: 'opened'; outboxId: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function failureReasonFor(type: string, data: Record<string, unknown>): string {
  if (isRecord(data.failed)) {
    return readString(data.failed.reason) ?? type
  }
  if (isRecord(data.bounce)) {
    return readString(data.bounce.message) ?? type
  }
  if (isRecord(data.suppressed)) {
    return readString(data.suppressed.message) ?? type
  }
  return type
}

function parseWebhookUpdate(payload: string): OutboxWebhookUpdate | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(payload)
  } catch {
    return null
  }
  if (!isRecord(parsed) || !isRecord(parsed.data)) return null

  const type = readString(parsed.type)
  const tags = isRecord(parsed.data.tags) ? parsed.data.tags : null
  const outboxId = tags ? readString(tags.outbox_id) : null
  if (!type || !outboxId) return null

  if (type === 'email.sent' || type === 'email.delivered') {
    return { kind: 'status', outboxId, status: 'sent', failureReason: null }
  }
  if (
    type === 'email.failed' ||
    type === 'email.bounced' ||
    type === 'email.complained' ||
    type === 'email.suppressed'
  ) {
    return {
      kind: 'status',
      outboxId,
      status: 'failed',
      failureReason: failureReasonFor(type, parsed.data),
    }
  }
  if (type === 'email.opened' || type === 'email.clicked') {
    return { kind: 'opened', outboxId }
  }
  return null
}

// Audit a delivery-feedback event against the client reminder's deadline. The
// "sent" side is already audited at dispatch (outbox.ts → reminder.sent), so
// the webhook only records bounces and first-opens. System actor.
async function auditReminderDeliveryEvent(
  db: ReturnType<typeof createDb>,
  links: ReminderLinkage[],
  action: 'reminder.bounced' | 'reminder.opened',
  reason: string | null,
): Promise<void> {
  for (const link of links) {
    if (link.recipientKind !== 'client') continue
    await db.insert(auditEvent).values({
      id: crypto.randomUUID(),
      firmId: link.firmId,
      actorId: null,
      actorType: 'system',
      entityType: 'obligation_instance',
      entityId: link.obligationInstanceId,
      action,
      afterJson: { clientId: link.clientId, ...(reason ? { reason } : {}) },
    })
  }
}

async function updateOutboxFromWebhook(env: ResendWebhookEnv, payload: string): Promise<boolean> {
  const update = parseWebhookUpdate(payload)
  if (!update) return false

  const db = createDb(env.DB)
  if (update.kind === 'opened') {
    // Stamp first-open on the linked reminder(s); leave the send status alone.
    // markRemindersOpened returns only the freshly-opened rows (first-open dedup).
    const opened = await markRemindersOpened(db, update.outboxId, new Date())
    await auditReminderDeliveryEvent(db, opened, 'reminder.opened', null)
    return true
  }
  await db
    .update(emailOutbox)
    .set({
      status: update.status,
      ...(update.status === 'sent'
        ? { sentAt: new Date(), failureReason: null }
        : { failedAt: new Date(), failureReason: update.failureReason }),
    })
    .where(eq(emailOutbox.id, update.outboxId))
  if (update.status === 'failed') {
    const links = await reminderLinkageByOutboxId(db, update.outboxId)
    await auditReminderDeliveryEvent(db, links, 'reminder.bounced', update.failureReason)
  }
  return true
}

// /api/webhook/resend · Resend delivery events (bounce / spam / open).
export const resendWebhook = new Hono<{
  Bindings: ResendWebhookEnv
  Variables: ContextVars
}>().post('/', async (c) => {
  const webhookSecret = c.env.RESEND_WEBHOOK_SECRET
  if (!webhookSecret) {
    return c.text('Resend webhook secret is not configured', 503)
  }

  const id = c.req.header('svix-id')
  const timestamp = c.req.header('svix-timestamp')
  const signature = c.req.header('svix-signature')
  if (!id || !timestamp || !signature) {
    return c.text('Missing Resend webhook signature headers', 400)
  }

  const payload = await c.req.text()
  const resend = new Resend(c.env.RESEND_API_KEY ?? 're_webhook_signature_only')

  try {
    resend.webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret,
    })
  } catch {
    return c.text('Invalid Resend webhook signature', 400)
  }

  const updatedOutbox = await updateOutboxFromWebhook(c.env, payload)
  return c.json({ ok: true, updatedOutbox })
})
