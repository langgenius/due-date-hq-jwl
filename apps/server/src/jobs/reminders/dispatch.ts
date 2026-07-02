import { and, eq, inArray, isNull } from 'drizzle-orm'
import { OPEN_OBLIGATION_STATUSES } from '@duedatehq/core/obligation-workflow'
import {
  createDb,
  authSchema,
  firmSchema,
  makeRemindersRepo,
  renderReminderTemplate,
} from '@duedatehq/db'
import type { ReminderTemplateRow } from '@duedatehq/ports/reminders'
import { client } from '@duedatehq/db/schema/clients'
import { obligationInstance, type ObligationStatus } from '@duedatehq/db/schema/obligations'
import {
  clientEmailSuppression,
  emailOutbox,
  inAppNotification,
  notificationPreference,
  reminder,
} from '@duedatehq/db/schema/notifications'
import { signClientUnsubscribeToken } from '../../lib/client-unsubscribe-token'
import type { Env } from '../../env'

const OPEN_STATUSES = [...OPEN_OBLIGATION_STATUSES] satisfies ObligationStatus[]
const CLIENT_30_DAY_TEMPLATE_KEY = 'client-deadline-30-day-reminder'
const CLIENT_7_DAY_TEMPLATE_KEY = 'client-deadline-7-day-reminder'

type MemberRecipient = {
  userId: string
  email: string
  name: string
  role: string
  emailEnabled: boolean
  inAppEnabled: boolean
  remindersEnabled: boolean
  unassignedRemindersEnabled: boolean
}

type ObligationRow = {
  obligationId: string
  clientId: string
  clientName: string
  clientEmail: string | null
  assigneeName: string | null
  taxType: string
  status: string
  currentDueDate: Date
}

function localTimeParts(timezone: string, date: Date): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  return {
    hour: Number(parts.find((part) => part.type === 'hour')?.value ?? '0'),
    minute: Number(parts.find((part) => part.type === 'minute')?.value ?? '0'),
  }
}

function dateInTimezone(timezone: string, date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return `${year}-${month}-${day}`
}

function addDays(dateOnly: string, days: number): string {
  const date = new Date(`${dateOnly}T12:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function normalize(value: string | null): string {
  return (value ?? '').trim().toLowerCase()
}

function uniqueMembers(members: MemberRecipient[]): MemberRecipient[] {
  return Array.from(new Map(members.map((member) => [member.userId, member])).values())
}

function internalRecipients(
  obligation: ObligationRow,
  members: MemberRecipient[],
  offsetDays: number,
): MemberRecipient[] {
  const owners = members.filter((member) => member.role === 'owner')
  // Overdue escalation reaches the supervising roles. Partner sits above
  // manager in the hierarchy, so wherever managers are pulled in, partners
  // must be too (partners were silently skipped before 2026-06-11).
  const supervisors = members.filter(
    (member) => member.role === 'partner' || member.role === 'manager',
  )
  const assigneeKey = normalize(obligation.assigneeName)
  const assignee = assigneeKey
    ? members.find(
        (member) =>
          normalize(member.name) === assigneeKey || normalize(member.email) === assigneeKey,
      )
    : null
  if (offsetDays === 30) return uniqueMembers(assignee ? [assignee] : owners)
  if (offsetDays === 7) return uniqueMembers([...(assignee ? [assignee] : []), ...owners])
  return uniqueMembers([...(assignee ? [assignee] : []), ...owners, ...supervisors])
}

function reminderTitle(obligation: ObligationRow, offsetDays: number): string {
  if (offsetDays === 0) return `${obligation.clientName} is overdue`
  return `${obligation.clientName} due in ${offsetDays} days`
}

function reminderBody(obligation: ObligationRow, dueDate: string): string {
  return `${obligation.taxType} is due ${dueDate}.`
}

function clientTemplateKey(offsetDays: number): string | null {
  if (offsetDays === 30) return CLIENT_30_DAY_TEMPLATE_KEY
  if (offsetDays === 7) return CLIENT_7_DAY_TEMPLATE_KEY
  return null
}

async function loadMembers(env: Env, firmId: string): Promise<MemberRecipient[]> {
  const db = createDb(env.DB)
  const rows = await db
    .select({
      userId: authSchema.member.userId,
      role: authSchema.member.role,
      name: authSchema.user.name,
      email: authSchema.user.email,
      emailEnabled: notificationPreference.emailEnabled,
      inAppEnabled: notificationPreference.inAppEnabled,
      remindersEnabled: notificationPreference.remindersEnabled,
      unassignedRemindersEnabled: notificationPreference.unassignedRemindersEnabled,
    })
    .from(authSchema.member)
    .innerJoin(authSchema.user, eq(authSchema.user.id, authSchema.member.userId))
    .leftJoin(
      notificationPreference,
      and(
        eq(notificationPreference.firmId, firmId),
        eq(notificationPreference.userId, authSchema.member.userId),
      ),
    )
    .where(
      and(eq(authSchema.member.organizationId, firmId), eq(authSchema.member.status, 'active')),
    )

  return rows.map((row) => ({
    userId: row.userId,
    role: row.role,
    name: row.name,
    email: row.email,
    emailEnabled: row.emailEnabled ?? true,
    inAppEnabled: row.inAppEnabled ?? true,
    remindersEnabled: row.remindersEnabled ?? true,
    unassignedRemindersEnabled: row.unassignedRemindersEnabled ?? true,
  }))
}

async function loadOpenObligations(env: Env, firmId: string): Promise<ObligationRow[]> {
  const db = createDb(env.DB)
  return db
    .select({
      obligationId: obligationInstance.id,
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      assigneeName: client.assigneeName,
      taxType: obligationInstance.taxType,
      status: obligationInstance.status,
      currentDueDate: obligationInstance.currentDueDate,
    })
    .from(obligationInstance)
    .innerJoin(client, eq(client.id, obligationInstance.clientId))
    .where(
      and(
        eq(obligationInstance.firmId, firmId),
        inArray(obligationInstance.status, OPEN_STATUSES),
        // Projected (rolled-forward / auto-generated) deadlines stay out of the
        // reminder pipeline until a CPA confirms them — no client or internal
        // emails for an unconfirmed future-year deadline.
        eq(obligationInstance.confirmed, true),
        isNull(client.deletedAt),
        isNull(client.archivedAt),
      ),
    )
}

async function isSuppressed(env: Env, firmId: string, email: string): Promise<boolean> {
  const db = createDb(env.DB)
  const [row] = await db
    .select({ id: clientEmailSuppression.id })
    .from(clientEmailSuppression)
    .where(
      and(
        eq(clientEmailSuppression.firmId, firmId),
        eq(clientEmailSuppression.email, email.toLowerCase()),
      ),
    )
    .limit(1)
  return Boolean(row)
}

async function writeInternalReminder(input: {
  env: Env
  firmId: string
  member: MemberRecipient
  obligation: ObligationRow
  offsetDays: number
  scheduledFor: string
  dueDate: string
  memberTemplate: ReminderTemplateRow | null
}): Promise<void> {
  if (!input.member.remindersEnabled) return
  const db = createDb(input.env.DB)
  const title = reminderTitle(input.obligation, input.offsetDays)
  const body = reminderBody(input.obligation, input.dueDate)

  if (input.member.inAppEnabled && input.offsetDays !== 30) {
    const notificationId = crypto.randomUUID()
    await db
      .insert(inAppNotification)
      .values({
        id: notificationId,
        firmId: input.firmId,
        userId: input.member.userId,
        type: input.offsetDays === 0 ? 'overdue' : 'deadline_reminder',
        entityType: 'obligation_instance',
        entityId: input.obligation.obligationId,
        title,
        body,
        href: `/obligations?obligation=${input.obligation.obligationId}`,
        metadataJson: { offsetDays: input.offsetDays },
      })
      .onConflictDoNothing()
    await db
      .insert(reminder)
      .values({
        id: crypto.randomUUID(),
        firmId: input.firmId,
        obligationInstanceId: input.obligation.obligationId,
        clientId: input.obligation.clientId,
        recipientKind: 'member',
        recipientUserId: input.member.userId,
        recipientEmail: input.member.email,
        channel: 'in_app',
        offsetDays: input.offsetDays,
        scheduledFor: input.scheduledFor,
        status: 'sent',
        notificationId,
        dedupeKey: `inapp:${input.firmId}:${input.obligation.obligationId}:${input.member.userId}:${input.offsetDays}:${input.scheduledFor}`,
        sentAt: new Date(),
      })
      .onConflictDoNothing({ target: reminder.dedupeKey })
  }

  if (input.member.emailEnabled && input.offsetDays !== 0) {
    if (!input.memberTemplate) return
    const outboxId = crypto.randomUUID()
    const externalId = `reminder:${input.firmId}:${input.obligation.obligationId}:${input.member.userId}:${input.offsetDays}:${input.scheduledFor}`
    const rendered = renderReminderTemplate(input.memberTemplate, {
      client_name: input.obligation.clientName,
      tax_type: input.obligation.taxType,
      due_date: input.dueDate,
      offset_days: input.offsetDays,
      obligation_url: `/obligations?obligation=${input.obligation.obligationId}`,
    })
    await db
      .insert(emailOutbox)
      .values({
        id: outboxId,
        firmId: input.firmId,
        externalId,
        type: 'deadline_reminder',
        status: 'pending',
        payloadJson: {
          recipients: [input.member.email],
          subject: rendered.subject,
          text: rendered.text,
        },
      })
      .onConflictDoNothing({ target: emailOutbox.externalId })
    const [outboxRow] = await db
      .select({ id: emailOutbox.id })
      .from(emailOutbox)
      .where(eq(emailOutbox.externalId, externalId))
      .limit(1)
    await db
      .insert(reminder)
      .values({
        id: crypto.randomUUID(),
        firmId: input.firmId,
        obligationInstanceId: input.obligation.obligationId,
        clientId: input.obligation.clientId,
        recipientKind: 'member',
        recipientUserId: input.member.userId,
        recipientEmail: input.member.email,
        channel: 'email',
        offsetDays: input.offsetDays,
        scheduledFor: input.scheduledFor,
        status: 'queued',
        emailOutboxId: outboxRow?.id ?? outboxId,
        templateId: input.memberTemplate.id,
        dedupeKey: `email:${input.firmId}:${input.obligation.obligationId}:${input.member.userId}:${input.offsetDays}:${input.scheduledFor}`,
      })
      .onConflictDoNothing({ target: reminder.dedupeKey })
  }
}

async function writeClientReminder(input: {
  env: Env
  firmId: string
  obligation: ObligationRow
  offsetDays: number
  scheduledFor: string
  dueDate: string
  clientTemplate: ReminderTemplateRow | null
}): Promise<void> {
  const email = input.obligation.clientEmail?.trim().toLowerCase()
  if (!email || input.offsetDays === 0 || input.obligation.status === 'review') return
  if (!input.clientTemplate) return
  if (await isSuppressed(input.env, input.firmId, email)) return
  const db = createDb(input.env.DB)
  const outboxId = crypto.randomUUID()
  const unsubscribeToken = await signClientUnsubscribeToken({
    secret: input.env.AUTH_SECRET,
    firmId: input.firmId,
    email,
  })
  const unsubscribeUrl = `${input.env.APP_URL}/api/notifications/unsubscribe?t=${encodeURIComponent(unsubscribeToken)}`
  const externalId = `client-reminder:${input.firmId}:${input.obligation.obligationId}:${email}:${input.offsetDays}:${input.scheduledFor}`
  const rendered = renderReminderTemplate(input.clientTemplate, {
    client_name: input.obligation.clientName,
    tax_type: input.obligation.taxType,
    due_date: input.dueDate,
    offset_days: input.offsetDays,
    unsubscribe_url: unsubscribeUrl,
  })
  await db
    .insert(emailOutbox)
    .values({
      id: outboxId,
      firmId: input.firmId,
      externalId,
      type: 'client_deadline_reminder',
      status: 'pending',
      payloadJson: {
        recipients: [email],
        subject: rendered.subject,
        text: rendered.text,
        unsubscribeUrl,
      },
    })
    .onConflictDoNothing({ target: emailOutbox.externalId })
  const [outboxRow] = await db
    .select({ id: emailOutbox.id })
    .from(emailOutbox)
    .where(eq(emailOutbox.externalId, externalId))
    .limit(1)
  await db
    .insert(reminder)
    .values({
      id: crypto.randomUUID(),
      firmId: input.firmId,
      obligationInstanceId: input.obligation.obligationId,
      clientId: input.obligation.clientId,
      recipientKind: 'client',
      recipientEmail: email,
      channel: 'email',
      offsetDays: input.offsetDays,
      scheduledFor: input.scheduledFor,
      status: 'queued',
      emailOutboxId: outboxRow?.id ?? outboxId,
      templateId: input.clientTemplate.id,
      dedupeKey: `client-email:${input.firmId}:${input.obligation.obligationId}:${email}:${input.offsetDays}:${input.scheduledFor}`,
    })
    .onConflictDoNothing({ target: reminder.dedupeKey })
}

export async function dispatchDeadlineReminders(env: Env, now = new Date()): Promise<void> {
  const db = createDb(env.DB)
  const firms = await db
    .select({
      id: firmSchema.firmProfile.id,
      timezone: firmSchema.firmProfile.timezone,
    })
    .from(firmSchema.firmProfile)
    .where(eq(firmSchema.firmProfile.status, 'active'))

  await Promise.all(
    firms.map(async (firm) => {
      const { hour, minute } = localTimeParts(firm.timezone, now)
      if (hour !== 8 || minute >= 30) return
      const today = dateInTimezone(firm.timezone, now)
      const targets = new Map([
        [addDays(today, 30), 30],
        [addDays(today, 7), 7],
      ])
      const members = await loadMembers(env, firm.id)
      const obligations = await loadOpenObligations(env, firm.id)
      const reminders = makeRemindersRepo(db, firm.id)
      const memberTemplate = await reminders.resolveTemplate('deadline_reminder')
      await Promise.all(
        obligations.map(async (obligation) => {
          const dueDate = dateInTimezone(firm.timezone, obligation.currentDueDate)
          const offsetDays = targets.get(dueDate) ?? (dueDate < today ? 0 : null)
          if (offsetDays === null) return
          const scheduledFor = offsetDays === 0 ? today : dueDate
          await Promise.all(
            internalRecipients(obligation, members, offsetDays).map((member) =>
              writeInternalReminder({
                env,
                firmId: firm.id,
                member,
                obligation,
                offsetDays,
                scheduledFor,
                dueDate,
                memberTemplate,
              }),
            ),
          )
          const templateKey = clientTemplateKey(offsetDays)
          const clientTemplate = templateKey
            ? await reminders.resolveTemplateByKey(templateKey)
            : null
          await writeClientReminder({
            env,
            firmId: firm.id,
            obligation,
            offsetDays,
            scheduledFor,
            dueDate,
            clientTemplate,
          })
        }),
      )
    }),
  )
}
