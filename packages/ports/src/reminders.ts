export type ReminderTemplateKind =
  | 'deadline_reminder'
  | 'client_deadline_reminder'
  | 'readiness_request'
export type ReminderRecipientKind = 'member' | 'client'
export type ReminderChannel = 'email' | 'in_app'
export type ReminderDeliveryStatus = 'pending' | 'queued' | 'sent' | 'skipped' | 'failed'

export interface ReminderTemplateRow {
  id: string | null
  firmId: string | null
  templateKey: string
  kind: ReminderTemplateKind
  name: string
  subject: string
  bodyText: string
  active: boolean
  isSystem: boolean
  usageCount: number
  lastSentAt: Date | null
  createdAt: Date | null
  updatedAt: Date | null
}

export interface ReminderOverviewRow {
  practiceTimezone: string
  activeTemplateCount: number
  upcomingCount: number
  queuedTodayCount: number
  sentLast7DaysCount: number
  failedLast7DaysCount: number
  suppressedEmailCount: number
}

export interface ReminderUpcomingRow {
  id: string
  obligationId: string
  clientId: string
  clientName: string
  clientEmail: string | null
  taxType: string
  status: string
  recipientKind: ReminderRecipientKind
  channel: ReminderChannel
  offsetDays: number
  dueDate: string
  scheduledFor: string
  deliveryStatus: ReminderDeliveryStatus
  templateKey: string | null
}

export interface ReminderRecentSendRow {
  id: string
  obligationId: string
  clientId: string
  clientName: string
  taxType: string
  recipientKind: ReminderRecipientKind
  recipientEmail: string | null
  channel: ReminderChannel
  offsetDays: number
  scheduledFor: string
  deliveryStatus: ReminderDeliveryStatus
  templateName: string | null
  failureReason: string | null
  createdAt: Date
  sentAt: Date | null
}

export interface ReminderSuppressionRow {
  id: string
  email: string
  reason: 'unsubscribe' | 'bounce' | 'manual'
  createdAt: Date
}

export interface ReminderTemplatePatch {
  subject?: string
  bodyText?: string
  active?: boolean
}

export type ReminderTemplateVariables = Record<string, string | number | null | undefined>

export function renderReminderTemplate(
  template: Pick<ReminderTemplateRow, 'subject' | 'bodyText'>,
  variables: ReminderTemplateVariables,
): { subject: string; text: string } {
  const replace = (value: string) =>
    value.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, key: string) => {
      const variable = variables[key]
      return variable === null || variable === undefined ? '' : String(variable)
    })
  return {
    subject: replace(template.subject),
    text: replace(template.bodyText),
  }
}

export interface RemindersRepo {
  readonly firmId: string
  overview(): Promise<ReminderOverviewRow>
  listTemplates(): Promise<ReminderTemplateRow[]>
  updateTemplate(templateKey: string, patch: ReminderTemplatePatch): Promise<ReminderTemplateRow>
  resolveTemplate(kind: ReminderTemplateKind): Promise<ReminderTemplateRow | null>
  resolveTemplateByKey(templateKey: string): Promise<ReminderTemplateRow | null>
  listUpcoming(input?: { limit?: number }): Promise<ReminderUpcomingRow[]>
  listRecentSends(input?: { limit?: number }): Promise<ReminderRecentSendRow[]>
  listSuppressions(input?: { limit?: number }): Promise<ReminderSuppressionRow[]>
}
