import { oc } from '@orpc/contract'
import * as z from 'zod'
import { EntityIdSchema, TenantIdSchema } from './shared/ids'

export const ReminderTemplateKindSchema = z.enum([
  'deadline_reminder',
  'client_deadline_reminder',
  'readiness_request',
])
export type ReminderTemplateKind = z.infer<typeof ReminderTemplateKindSchema>

export const ReminderRecipientKindSchema = z.enum(['member', 'client'])
export type ReminderRecipientKind = z.infer<typeof ReminderRecipientKindSchema>

export const ReminderChannelSchema = z.enum(['email', 'in_app'])
export type ReminderChannel = z.infer<typeof ReminderChannelSchema>

export const ReminderDeliveryStatusSchema = z.enum([
  'pending',
  'queued',
  'sent',
  'skipped',
  'failed',
])
export type ReminderDeliveryStatus = z.infer<typeof ReminderDeliveryStatusSchema>

export const ReminderTemplatePublicSchema = z.object({
  id: EntityIdSchema.nullable(),
  firmId: TenantIdSchema.nullable(),
  templateKey: z.string().min(1),
  kind: ReminderTemplateKindSchema,
  name: z.string().min(1),
  subject: z.string().min(1).max(240),
  bodyText: z.string().min(1).max(4000),
  active: z.boolean(),
  isSystem: z.boolean(),
  usageCount: z.number().int().min(0),
  lastSentAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime().nullable(),
  updatedAt: z.iso.datetime().nullable(),
})
export type ReminderTemplatePublic = z.infer<typeof ReminderTemplatePublicSchema>

export const ReminderRecentSendSchema = z.object({
  id: EntityIdSchema,
  obligationId: EntityIdSchema,
  clientId: EntityIdSchema,
  clientName: z.string().min(1),
  taxType: z.string().min(1),
  recipientKind: ReminderRecipientKindSchema,
  recipientEmail: z.string().nullable(),
  channel: ReminderChannelSchema,
  offsetDays: z.number().int(),
  scheduledFor: z.string().min(1),
  deliveryStatus: ReminderDeliveryStatusSchema,
  templateName: z.string().nullable(),
  failureReason: z.string().nullable(),
  createdAt: z.iso.datetime(),
  sentAt: z.iso.datetime().nullable(),
})
export type ReminderRecentSend = z.infer<typeof ReminderRecentSendSchema>

export const ReminderListInputSchema = z
  .object({
    limit: z.number().int().min(1).max(100).default(25).optional(),
  })
  .optional()

export const ReminderTemplateUpdateInputSchema = z.object({
  templateKey: z.string().min(1),
  subject: z.string().min(1).max(240).optional(),
  bodyText: z.string().min(1).max(4000).optional(),
  active: z.boolean().optional(),
})
export type ReminderTemplateUpdateInput = z.infer<typeof ReminderTemplateUpdateInputSchema>

export const remindersContract = oc.router({
  listTemplates: oc.input(z.undefined()).output(z.array(ReminderTemplatePublicSchema)),
  updateTemplate: oc.input(ReminderTemplateUpdateInputSchema).output(ReminderTemplatePublicSchema),
  listRecentSends: oc
    .input(ReminderListInputSchema)
    .output(z.object({ reminders: z.array(ReminderRecentSendSchema) })),
})

export type RemindersContract = typeof remindersContract
