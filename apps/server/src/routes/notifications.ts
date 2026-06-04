import { Hono } from 'hono'
import { auditSchema, createDb, notificationSchema } from '@duedatehq/db'
import type { Env, ContextVars } from '../env'
import { verifyClientUnsubscribeToken } from '../lib/client-unsubscribe-token'

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export const notificationsRoute = new Hono<{
  Bindings: Env
  Variables: ContextVars
}>().get('/unsubscribe', async (c) => {
  const token = c.req.query('t')
  if (!token) return c.text('Missing unsubscribe token.', 400)
  const payload = await verifyClientUnsubscribeToken({
    secret: c.env.AUTH_SECRET,
    token,
  })
  if (!payload) return c.text('This unsubscribe link is no longer valid.', 404)

  const db = createDb(c.env.DB)
  const tokenHash = await sha256Hex(token)
  const suppressionId = crypto.randomUUID()
  const inserted = await db
    .insert(notificationSchema.clientEmailSuppression)
    .values({
      id: suppressionId,
      firmId: payload.firmId,
      email: payload.email,
      tokenHash,
      reason: 'unsubscribe',
    })
    .onConflictDoNothing({
      target: [
        notificationSchema.clientEmailSuppression.firmId,
        notificationSchema.clientEmailSuppression.email,
      ],
    })
    .returning({ id: notificationSchema.clientEmailSuppression.id })

  // Audit only a genuinely new suppression — a repeat click hits
  // onConflictDoNothing and must not log a second "unsubscribed". Anonymous
  // public link → system actor.
  if (inserted.length > 0) {
    await db.insert(auditSchema.auditEvent).values({
      id: crypto.randomUUID(),
      firmId: payload.firmId,
      actorId: null,
      actorType: 'system',
      entityType: 'client_email_suppression',
      entityId: suppressionId,
      action: 'reminder.unsubscribed',
      afterJson: { email: payload.email, reason: 'unsubscribe' },
    })
  }
  return c.text('You are unsubscribed from client deadline reminders.')
})
