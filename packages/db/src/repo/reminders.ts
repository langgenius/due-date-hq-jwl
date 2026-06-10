import { and, desc, eq, isNull, or } from 'drizzle-orm'
import type {
  ReminderChannel,
  ReminderDeliveryStatus,
  ReminderRecipientKind,
  ReminderTemplateKind,
  ReminderTemplatePatch,
  ReminderTemplateRow,
} from '@duedatehq/ports/reminders'
import type { Db } from '../client'
import { client } from '../schema/clients'
import { obligationInstance } from '../schema/obligations'
import { emailOutbox, reminder, reminderTemplate } from '../schema/notifications'

export { renderReminderTemplate } from '@duedatehq/ports/reminders'

const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100
const CLIENT_30_DAY_TEMPLATE_KEY = 'client-deadline-30-day-reminder'
const CLIENT_7_DAY_TEMPLATE_KEY = 'client-deadline-7-day-reminder'
const MATERIALS_REQUEST_TEMPLATE_KEY = 'client-materials-request'
const EDITABLE_REMINDER_TEMPLATE_KEYS = new Set([
  CLIENT_30_DAY_TEMPLATE_KEY,
  CLIENT_7_DAY_TEMPLATE_KEY,
  MATERIALS_REQUEST_TEMPLATE_KEY,
])

type TemplateDefault = Omit<
  ReminderTemplateRow,
  'id' | 'firmId' | 'usageCount' | 'lastSentAt' | 'createdAt' | 'updatedAt'
>

export const DEFAULT_REMINDER_TEMPLATES: readonly TemplateDefault[] = [
  {
    templateKey: 'member-deadline-reminder',
    kind: 'deadline_reminder',
    name: 'Team deadline countdown email',
    subject: 'Action needed in {{offset_days}} days: {{client_name}} {{tax_type}}',
    bodyText: [
      'Team,',
      '',
      '{{client_name}} has a {{tax_type}} deadline due {{due_date}}. Please review the file, ' +
        'confirm the current owner, and clear any open client-materials or review blockers ' +
        'before the countdown reaches the due date.',
      '',
      'Deadline workspace:',
      '{{obligation_url}}',
      '',
      'Suggested next steps:',
      '- Confirm the deadline is assigned and the return status is current.',
      '- Review outstanding materials, extension decisions, and payment readiness.',
      '- Update the deadline notes if the client or reviewer needs follow-up.',
      '',
      'Thank you.',
    ].join('\n'),
    active: true,
    isSystem: true,
  },
  {
    templateKey: CLIENT_30_DAY_TEMPLATE_KEY,
    kind: 'client_deadline_reminder',
    name: '30-day client deadline countdown email',
    subject: '{{client_name}}: {{tax_type}} deadline in 30 days',
    bodyText: [
      'Hello {{client_name}},',
      '',
      'Our office is tracking your upcoming {{tax_type}} deadline on {{due_date}}, which is ' +
        'now 30 days away.',
      '',
      'We are reviewing the file and will follow up through the secure client portal if any ' +
        'documents, signatures, or payment information are needed. Please watch for those ' +
        'requests so we can keep the filing on schedule.',
      '',
      'Thank you,',
      'Your tax team',
      '',
      'Unsubscribe from deadline reminder emails: {{unsubscribe_url}}',
    ].join('\n'),
    active: true,
    isSystem: true,
  },
  {
    templateKey: CLIENT_7_DAY_TEMPLATE_KEY,
    kind: 'client_deadline_reminder',
    name: '7-day client deadline countdown email',
    subject: '{{client_name}}: {{tax_type}} deadline in 7 days',
    bodyText: [
      'Hello {{client_name}},',
      '',
      'This is a reminder that your {{tax_type}} deadline is 7 days away on {{due_date}}.',
      '',
      'If you have received a secure materials request from our office, please complete it as ' +
        'soon as practical so our team can finish review and filing steps before the deadline.',
      '',
      'Thank you,',
      'Your tax team',
      '',
      'Unsubscribe from deadline reminder emails: {{unsubscribe_url}}',
    ].join('\n'),
    active: true,
    isSystem: true,
  },
  {
    templateKey: MATERIALS_REQUEST_TEMPLATE_KEY,
    kind: 'readiness_request',
    name: 'Client checklist collection email',
    subject: '{{client_name}}: secure materials request for {{tax_type}}',
    bodyText: [
      'Hello {{client_name}},',
      '',
      'Our office is preparing your {{tax_type}} work for the {{due_date}} deadline. Please use ' +
        'the secure link below to review the materials checklist and upload or confirm the ' +
        'items still outstanding:',
      '',
      '{{request_url}}',
      '',
      'Outstanding items:',
      '{{outstanding_checklist}}',
      '',
      'Items we have already received:',
      '{{received_checklist}}',
      '',
      'If an item is not available yet, please note that in the portal so our team can plan ' +
        'the next step. We will review your responses and follow up if we need clarification.',
      '',
      'Thank you,',
      'Your tax team',
    ].join('\n'),
    active: true,
    isSystem: true,
  },
]

function clampLimit(limit: number | undefined): number {
  return Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT)
}

function deliveryStatus(input: {
  reminderStatus: ReminderDeliveryStatus
  outboxStatus?: string | null
}): ReminderDeliveryStatus {
  if (input.outboxStatus === 'sent') return 'sent'
  if (input.outboxStatus === 'failed') return 'failed'
  if (input.outboxStatus === 'pending' || input.outboxStatus === 'sending') return 'queued'
  return input.reminderStatus
}

function emptyTemplateRow(template: TemplateDefault): ReminderTemplateRow {
  return {
    ...template,
    id: null,
    firmId: null,
    usageCount: 0,
    lastSentAt: null,
    createdAt: null,
    updatedAt: null,
  }
}

function defaultTemplateForKey(templateKey: string): TemplateDefault | undefined {
  return DEFAULT_REMINDER_TEMPLATES.find((template) => template.templateKey === templateKey)
}

export function makeRemindersRepo(db: Db, firmId: string) {
  async function readAllTemplates(): Promise<ReminderTemplateRow[]> {
    const rows = await db
      .select()
      .from(reminderTemplate)
      .where(or(eq(reminderTemplate.firmId, firmId), isNull(reminderTemplate.firmId)))

    const reminderRows = await db
      .select({
        templateId: reminder.templateId,
        sentAt: reminder.sentAt,
        createdAt: reminder.createdAt,
      })
      .from(reminder)
      .where(and(eq(reminder.firmId, firmId), eq(reminder.status, 'sent')))

    const stats = new Map<string, { usageCount: number; lastSentAt: Date | null }>()
    for (const row of reminderRows) {
      if (!row.templateId) continue
      const current = stats.get(row.templateId) ?? { usageCount: 0, lastSentAt: null }
      const sentAt = row.sentAt ?? row.createdAt
      current.usageCount += 1
      if (!current.lastSentAt || sentAt > current.lastSentAt) current.lastSentAt = sentAt
      stats.set(row.templateId, current)
    }

    const byKey = new Map<string, ReminderTemplateRow>()
    for (const row of rows) {
      const current = byKey.get(row.templateKey)
      const shouldReplace = !current || (current.firmId === null && row.firmId === firmId)
      if (!shouldReplace) continue
      const rowStats = stats.get(row.id) ?? { usageCount: 0, lastSentAt: null }
      const defaultTemplate = defaultTemplateForKey(row.templateKey)
      const isSystemDefault = row.firmId === null && row.isSystem
      byKey.set(row.templateKey, {
        id: row.id,
        firmId: row.firmId,
        templateKey: row.templateKey,
        kind: row.kind,
        name: defaultTemplate?.name ?? row.name,
        subject: isSystemDefault && defaultTemplate ? defaultTemplate.subject : row.subject,
        bodyText: isSystemDefault && defaultTemplate ? defaultTemplate.bodyText : row.bodyText,
        active: row.active,
        isSystem: row.isSystem,
        usageCount: rowStats.usageCount,
        lastSentAt: rowStats.lastSentAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })
    }

    for (const template of DEFAULT_REMINDER_TEMPLATES) {
      if (!byKey.has(template.templateKey))
        byKey.set(template.templateKey, emptyTemplateRow(template))
    }

    return Array.from(byKey.values()).toSorted((left, right) =>
      left.templateKey.localeCompare(right.templateKey),
    )
  }

  async function readEditableTemplates(): Promise<ReminderTemplateRow[]> {
    return (await readAllTemplates()).filter((template) =>
      EDITABLE_REMINDER_TEMPLATE_KEYS.has(template.templateKey),
    )
  }

  async function writeFirmTemplate(
    templateKey: string,
    patch: ReminderTemplatePatch,
  ): Promise<ReminderTemplateRow> {
    const current = (await readEditableTemplates()).find(
      (template) => template.templateKey === templateKey,
    )
    if (!current) throw new Error('Reminder template was not found.')

    const update = {
      subject: patch.subject ?? current.subject,
      bodyText: patch.bodyText ?? current.bodyText,
      active: patch.active ?? current.active,
      updatedAt: new Date(),
    }

    if (current.firmId === firmId && current.id) {
      await db.update(reminderTemplate).set(update).where(eq(reminderTemplate.id, current.id))
    } else {
      await db.insert(reminderTemplate).values({
        id: crypto.randomUUID(),
        firmId,
        templateKey: current.templateKey,
        kind: current.kind,
        name: current.name,
        subject: update.subject,
        bodyText: update.bodyText,
        active: update.active,
        isSystem: false,
      })
    }

    const updated = (await readEditableTemplates()).find(
      (template) => template.templateKey === templateKey,
    )
    if (!updated) throw new Error('Reminder template could not be read after update.')
    return updated
  }

  return {
    firmId,

    listTemplates: readEditableTemplates,

    updateTemplate: writeFirmTemplate,

    async resolveTemplate(kind: ReminderTemplateKind) {
      const templates = await readAllTemplates()
      return templates.find((template) => template.kind === kind && template.active) ?? null
    },

    async resolveTemplateByKey(templateKey: string) {
      const templates = await readAllTemplates()
      return (
        templates.find((template) => template.templateKey === templateKey && template.active) ??
        null
      )
    },

    async listRecentSends(input: { limit?: number } = {}) {
      const rows = await db
        .select({
          id: reminder.id,
          obligationId: reminder.obligationInstanceId,
          clientId: client.id,
          clientName: client.name,
          taxType: obligationInstance.taxType,
          recipientKind: reminder.recipientKind,
          recipientEmail: reminder.recipientEmail,
          channel: reminder.channel,
          offsetDays: reminder.offsetDays,
          scheduledFor: reminder.scheduledFor,
          reminderStatus: reminder.status,
          outboxStatus: emailOutbox.status,
          templateName: reminderTemplate.name,
          failureReason: reminder.failureReason,
          outboxFailureReason: emailOutbox.failureReason,
          createdAt: reminder.createdAt,
          sentAt: reminder.sentAt,
          outboxSentAt: emailOutbox.sentAt,
        })
        .from(reminder)
        .innerJoin(client, eq(client.id, reminder.clientId))
        .innerJoin(obligationInstance, eq(obligationInstance.id, reminder.obligationInstanceId))
        .leftJoin(emailOutbox, eq(emailOutbox.id, reminder.emailOutboxId))
        .leftJoin(reminderTemplate, eq(reminderTemplate.id, reminder.templateId))
        .where(eq(reminder.firmId, firmId))
        .orderBy(desc(reminder.createdAt))
        .limit(clampLimit(input.limit))

      return rows.map((row) => ({
        id: row.id,
        obligationId: row.obligationId,
        clientId: row.clientId,
        clientName: row.clientName,
        taxType: row.taxType,
        recipientKind: row.recipientKind as ReminderRecipientKind,
        recipientEmail: row.recipientEmail,
        channel: row.channel as ReminderChannel,
        offsetDays: row.offsetDays,
        scheduledFor: row.scheduledFor,
        deliveryStatus: deliveryStatus({
          reminderStatus: row.reminderStatus,
          outboxStatus: row.outboxStatus,
        }),
        templateName: row.templateName,
        failureReason: row.failureReason ?? row.outboxFailureReason,
        createdAt: row.createdAt,
        sentAt: row.sentAt ?? row.outboxSentAt,
      }))
    },
  }
}

export type RemindersRepo = ReturnType<typeof makeRemindersRepo>
