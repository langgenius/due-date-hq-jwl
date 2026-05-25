import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'
import { OPEN_OBLIGATION_STATUSES } from '@duedatehq/core/obligation-workflow'
import { createDb, authSchema, firmSchema } from '@duedatehq/db'
import { client } from '@duedatehq/db/schema/clients'
import { obligationInstance, type ObligationStatus } from '@duedatehq/db/schema/obligations'
import {
  emailOutbox,
  notificationDigestRun,
  notificationPreference,
  reminder,
} from '@duedatehq/db/schema/notifications'
import { pulse, pulseFirmAlert } from '@duedatehq/db/schema/pulse'
import type { MorningDigestDay, NotificationDigestRunStatus } from '@duedatehq/ports/notifications'
import type { Env } from '../../env'

const OPEN_STATUSES = [...OPEN_OBLIGATION_STATUSES] satisfies ObligationStatus[]
const DEFAULT_DIGEST_DAYS: MorningDigestDay[] = ['mon', 'tue', 'wed', 'thu', 'fri']

type DigestRecipient = {
  firmId: string
  firmName: string
  timezone: string
  userId: string
  userName: string
  email: string
  role: string
  emailEnabled: boolean
  morningDigestEnabled: boolean
  morningDigestHour: number
  morningDigestDays: MorningDigestDay[]
}

type DigestCounts = {
  urgentCount: number
  pulseCount: number
  failedReminderCount: number
  unassignedCount: number
}

type DigestPayload = DigestCounts & {
  subject: string
  text: string
}

function normalizeDigestDays(value: unknown): MorningDigestDay[] {
  if (!Array.isArray(value)) return DEFAULT_DIGEST_DAYS
  const days = value.filter((day): day is MorningDigestDay =>
    ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(String(day)),
  )
  return days.length > 0 ? Array.from(new Set(days)) : DEFAULT_DIGEST_DAYS
}

function localTimeParts(
  timezone: string,
  date: Date,
): { hour: number; minute: number; weekday: MorningDigestDay } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0')
  const weekdayValue = (parts.find((part) => part.type === 'weekday')?.value ?? 'Mon')
    .toLowerCase()
    .slice(0, 3)
  const weekday =
    weekdayValue === 'tue' ||
    weekdayValue === 'wed' ||
    weekdayValue === 'thu' ||
    weekdayValue === 'fri' ||
    weekdayValue === 'sat' ||
    weekdayValue === 'sun'
      ? weekdayValue
      : 'mon'
  return { hour, minute, weekday }
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

export function shouldSendMorningDigest(input: {
  timezone: string
  now: Date
  hour: number
  days: MorningDigestDay[]
}): boolean {
  const { hour, minute, weekday } = localTimeParts(input.timezone, input.now)
  if (hour !== input.hour || minute >= 30) return false
  return input.days.includes(weekday)
}

function canSeeFirmWide(role: string): boolean {
  return role === 'owner' || role === 'partner' || role === 'manager'
}

function isAssignedToRecipient(
  row: { assigneeId: string | null; assigneeName: string | null },
  recipient: DigestRecipient,
): boolean {
  if (row.assigneeId === recipient.userId) return true
  const assignee = row.assigneeName?.trim().toLowerCase()
  if (!assignee) return false
  return assignee === recipient.userName.toLowerCase() || assignee === recipient.email.toLowerCase()
}

async function loadRecipients(env: Env): Promise<DigestRecipient[]> {
  const db = createDb(env.DB)
  const rows = await db
    .select({
      firmId: firmSchema.firmProfile.id,
      firmName: firmSchema.firmProfile.name,
      timezone: firmSchema.firmProfile.timezone,
      userId: authSchema.user.id,
      userName: authSchema.user.name,
      email: authSchema.user.email,
      role: authSchema.member.role,
      emailEnabled: notificationPreference.emailEnabled,
      morningDigestEnabled: notificationPreference.morningDigestEnabled,
      morningDigestHour: notificationPreference.morningDigestHour,
      morningDigestDaysJson: notificationPreference.morningDigestDaysJson,
    })
    .from(firmSchema.firmProfile)
    .innerJoin(authSchema.member, eq(authSchema.member.organizationId, firmSchema.firmProfile.id))
    .innerJoin(authSchema.user, eq(authSchema.user.id, authSchema.member.userId))
    .leftJoin(
      notificationPreference,
      and(
        eq(notificationPreference.firmId, firmSchema.firmProfile.id),
        eq(notificationPreference.userId, authSchema.user.id),
      ),
    )
    .where(and(eq(firmSchema.firmProfile.status, 'active'), eq(authSchema.member.status, 'active')))

  return rows.map((row) => ({
    firmId: row.firmId,
    firmName: row.firmName,
    timezone: row.timezone,
    userId: row.userId,
    userName: row.userName,
    email: row.email,
    role: row.role,
    emailEnabled: row.emailEnabled ?? true,
    morningDigestEnabled: row.morningDigestEnabled ?? true,
    morningDigestHour: row.morningDigestHour ?? 7,
    morningDigestDays: normalizeDigestDays(row.morningDigestDaysJson),
  }))
}

async function buildDigestPayload(
  env: Env,
  recipient: DigestRecipient,
  now: Date,
): Promise<DigestPayload> {
  const db = createDb(env.DB)
  const localDate = dateInTimezone(recipient.timezone, now)
  const nextSevenDays = addDays(localDate, 7)
  const firmWide = canSeeFirmWide(recipient.role)

  const obligationRows = await db
    .select({
      obligationId: obligationInstance.id,
      clientName: client.name,
      taxType: obligationInstance.taxType,
      dueDate: obligationInstance.currentDueDate,
      assigneeId: client.assigneeId,
      assigneeName: client.assigneeName,
    })
    .from(obligationInstance)
    .innerJoin(client, eq(client.id, obligationInstance.clientId))
    .where(
      and(
        eq(obligationInstance.firmId, recipient.firmId),
        inArray(obligationInstance.status, OPEN_STATUSES),
        isNull(client.deletedAt),
      ),
    )
    .orderBy(asc(obligationInstance.currentDueDate))
    .limit(200)

  const visibleObligations = firmWide
    ? obligationRows
    : obligationRows.filter((row) => isAssignedToRecipient(row, recipient))
  const urgent = visibleObligations
    .filter((row) => dateInTimezone(recipient.timezone, row.dueDate) <= localDate)
    .slice(0, 8)
  const unassignedCount = firmWide
    ? obligationRows.filter((row) => {
        const dueDate = dateInTimezone(recipient.timezone, row.dueDate)
        return dueDate <= nextSevenDays && !row.assigneeId && !row.assigneeName
      }).length
    : 0

  const pulseRows = firmWide
    ? await db
        .select({
          alertId: pulseFirmAlert.id,
          summary: pulse.aiSummary,
          matchedCount: pulseFirmAlert.matchedCount,
          needsReviewCount: pulseFirmAlert.needsReviewCount,
          updatedAt: pulseFirmAlert.updatedAt,
        })
        .from(pulseFirmAlert)
        .innerJoin(pulse, eq(pulse.id, pulseFirmAlert.pulseId))
        .where(
          and(
            eq(pulseFirmAlert.firmId, recipient.firmId),
            inArray(pulseFirmAlert.status, ['matched', 'partially_applied']),
          ),
        )
        .orderBy(desc(pulseFirmAlert.updatedAt))
        .limit(5)
    : []

  const failedReminderRows = await db
    .select({
      reminderId: reminder.id,
      clientName: client.name,
      taxType: obligationInstance.taxType,
      failureReason: reminder.failureReason,
      createdAt: reminder.createdAt,
    })
    .from(reminder)
    .innerJoin(client, eq(client.id, reminder.clientId))
    .innerJoin(obligationInstance, eq(obligationInstance.id, reminder.obligationInstanceId))
    .where(and(eq(reminder.firmId, recipient.firmId), eq(reminder.status, 'failed')))
    .orderBy(desc(reminder.createdAt))
    .limit(5)

  const lines = [
    `DueDateHQ morning digest for ${recipient.firmName} (${localDate})`,
    '',
    urgent.length > 0 ? 'Urgent deadlines' : 'Urgent deadlines: none',
    ...urgent.map((row) => {
      const dueDate = dateInTimezone(recipient.timezone, row.dueDate)
      return `- ${row.clientName}: ${row.taxType} due ${dueDate} (${env.APP_URL}/obligations?obligation=${row.obligationId})`
    }),
    '',
    pulseRows.length > 0 ? 'Pulse changes waiting for review' : 'Pulse changes: none',
    ...pulseRows.map(
      (row) =>
        `- ${row.summary} (${row.matchedCount} matched, ${row.needsReviewCount} need review) ${env.APP_URL}/rules?tab=pulse&alert=${row.alertId}`,
    ),
    '',
    failedReminderRows.length > 0
      ? 'Reminder delivery failures'
      : 'Reminder delivery failures: none',
    ...failedReminderRows.map(
      (row) =>
        `- ${row.clientName}: ${row.taxType}${row.failureReason ? ` — ${row.failureReason}` : ''}`,
    ),
    '',
    firmWide
      ? `Unassigned deadline pressure: ${unassignedCount} open deadlines due within 7 days`
      : 'Unassigned deadline pressure is shown to owners and managers.',
    '',
    `Manage notifications: ${env.APP_URL}/notifications`,
  ]

  return {
    subject: `DueDateHQ morning digest - ${localDate}`,
    text: lines.join('\n'),
    urgentCount: urgent.length,
    pulseCount: pulseRows.length,
    failedReminderCount: failedReminderRows.length,
    unassignedCount,
  }
}

function isQuiet(payload: DigestCounts): boolean {
  return (
    payload.urgentCount === 0 &&
    payload.pulseCount === 0 &&
    payload.failedReminderCount === 0 &&
    payload.unassignedCount === 0
  )
}

export async function dispatchMorningDigestForRecipient(
  env: Env,
  recipient: DigestRecipient,
  now = new Date(),
  options: { force?: boolean } = {},
): Promise<DigestCounts & { status: NotificationDigestRunStatus }> {
  const db = createDb(env.DB)
  const localDate = dateInTimezone(recipient.timezone, now)

  if (!options.force) {
    const [existing] = await db
      .select({ id: notificationDigestRun.id })
      .from(notificationDigestRun)
      .where(
        and(
          eq(notificationDigestRun.userId, recipient.userId),
          eq(notificationDigestRun.localDate, localDate),
        ),
      )
      .limit(1)
    if (existing) {
      return {
        status: 'skipped_quiet',
        urgentCount: 0,
        pulseCount: 0,
        failedReminderCount: 0,
        unassignedCount: 0,
      }
    }
  }

  const payload = await buildDigestPayload(env, recipient, now)
  if (isQuiet(payload) && !options.force) {
    await db.insert(notificationDigestRun).values({
      id: crypto.randomUUID(),
      firmId: recipient.firmId,
      userId: recipient.userId,
      localDate,
      status: 'skipped_quiet',
    })
    return { status: 'skipped_quiet', ...payload }
  }

  const runId = crypto.randomUUID()
  const outboxId = crypto.randomUUID()
  const externalId = options.force
    ? `morning-digest-preview:${recipient.firmId}:${recipient.userId}:${now.getTime()}`
    : `morning-digest:${recipient.firmId}:${recipient.userId}:${localDate}`
  await db.insert(emailOutbox).values({
    id: outboxId,
    firmId: recipient.firmId,
    externalId,
    type: 'morning_digest',
    payloadJson: {
      digestRunId: options.force ? null : runId,
      recipients: [recipient.email],
      subject: options.force ? `[Preview] ${payload.subject}` : payload.subject,
      text: payload.text,
    },
  })

  if (!options.force) {
    await db.insert(notificationDigestRun).values({
      id: runId,
      firmId: recipient.firmId,
      userId: recipient.userId,
      localDate,
      status: 'queued',
      urgentCount: payload.urgentCount,
      pulseCount: payload.pulseCount,
      failedReminderCount: payload.failedReminderCount,
      unassignedCount: payload.unassignedCount,
      emailOutboxId: outboxId,
    })
  }

  await env.EMAIL_QUEUE.send({ type: 'email.flush' }).catch(() => undefined)
  return { status: 'queued', ...payload }
}

export async function previewMorningDigestForUser(
  env: Env,
  userId: string,
  firmId: string,
  now = new Date(),
): Promise<DigestCounts & { status: NotificationDigestRunStatus }> {
  const recipient = (await loadRecipients(env)).find(
    (item) => item.userId === userId && item.firmId === firmId,
  )
  if (!recipient) throw new Error('Morning digest recipient could not be resolved.')
  return dispatchMorningDigestForRecipient(env, recipient, now, { force: true })
}

export async function dispatchMorningDigests(env: Env, now = new Date()): Promise<void> {
  const recipients = await loadRecipients(env)
  await Promise.all(
    recipients.map(async (recipient) => {
      if (!recipient.emailEnabled || !recipient.morningDigestEnabled) return
      if (
        !shouldSendMorningDigest({
          timezone: recipient.timezone,
          now,
          hour: recipient.morningDigestHour,
          days: recipient.morningDigestDays,
        })
      ) {
        return
      }
      await dispatchMorningDigestForRecipient(env, recipient, now)
    }),
  )
}
