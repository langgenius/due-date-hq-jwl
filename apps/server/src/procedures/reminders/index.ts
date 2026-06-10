import type { ReminderRecentSend, ReminderTemplatePublic } from '@duedatehq/contracts'
import type { ReminderRecentSendRow, ReminderTemplateRow } from '@duedatehq/ports/reminders'
import { requireTenant } from '../_context'
import { requireCurrentFirmRole } from '../_permissions'
import { os } from '../_root'

const REMINDER_READ_ROLES = ['owner', 'partner', 'manager', 'preparer', 'coordinator'] as const
const REMINDER_MANAGE_ROLES = ['owner', 'partner', 'manager'] as const

function requireRemindersRepo(scoped: ReturnType<typeof requireTenant>['scoped']) {
  if (!scoped.reminders) {
    throw new Error('Reminders repo methods are not available.')
  }
  return scoped.reminders
}

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null
}

function toTemplatePublic(row: ReminderTemplateRow): ReminderTemplatePublic {
  return {
    ...row,
    lastSentAt: iso(row.lastSentAt),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  }
}

function toRecentSendPublic(row: ReminderRecentSendRow): ReminderRecentSend {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    sentAt: iso(row.sentAt),
  }
}

const listTemplates = os.reminders.listTemplates.handler(async ({ context }) => {
  await requireCurrentFirmRole(context, REMINDER_READ_ROLES)
  const { scoped } = requireTenant(context)
  const reminders = requireRemindersRepo(scoped)
  return (await reminders.listTemplates()).map(toTemplatePublic)
})

const updateTemplate = os.reminders.updateTemplate.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, REMINDER_MANAGE_ROLES)
  const { scoped, userId } = requireTenant(context)
  const reminders = requireRemindersRepo(scoped)
  const updated = await reminders.updateTemplate(input.templateKey, {
    ...(input.subject !== undefined ? { subject: input.subject } : {}),
    ...(input.bodyText !== undefined ? { bodyText: input.bodyText } : {}),
    ...(input.active !== undefined ? { active: input.active } : {}),
  })
  // A partner editing the content that goes out under the firm's name to
  // clients is reviewable. Record which fields changed + the new values
  // (the body text itself can be long, so log only that it changed).
  await scoped.audit.write({
    actorId: userId,
    entityType: 'reminder_template',
    entityId: input.templateKey,
    action: 'reminder.template.updated',
    after: {
      templateKey: input.templateKey,
      ...(input.subject !== undefined ? { subject: input.subject } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      bodyTextChanged: input.bodyText !== undefined,
    },
  })
  return toTemplatePublic(updated)
})

const listRecentSends = os.reminders.listRecentSends.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, REMINDER_READ_ROLES)
  const { scoped } = requireTenant(context)
  const reminders = requireRemindersRepo(scoped)
  const listInput = input?.limit === undefined ? {} : { limit: input.limit }
  return {
    reminders: (await reminders.listRecentSends(listInput)).map(toRecentSendPublic),
  }
})

export const remindersHandlers = {
  listTemplates,
  updateTemplate,
  listRecentSends,
}
