import { oc } from '@orpc/contract'
import * as z from 'zod'
import { EntityIdSchema, TenantIdSchema } from './shared/ids'

export const NotificationTypeSchema = z.enum([
  'deadline_reminder',
  'overdue',
  'client_reminder',
  'pulse_alert',
  'audit_package_ready',
  'catalog_release',
  'internal_request',
  'system',
])
export type NotificationType = z.infer<typeof NotificationTypeSchema>

export const NotificationStatusFilterSchema = z.enum(['unread', 'read', 'all'])
export const MorningDigestDaySchema = z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])
export type MorningDigestDay = z.infer<typeof MorningDigestDaySchema>

export const NotificationDigestRunStatusSchema = z.enum([
  'queued',
  'sent',
  'skipped_quiet',
  'failed',
])
export type NotificationDigestRunStatus = z.infer<typeof NotificationDigestRunStatusSchema>

export const InAppNotificationPublicSchema = z.object({
  id: EntityIdSchema,
  firmId: TenantIdSchema,
  userId: z.string().min(1),
  type: NotificationTypeSchema,
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  href: z.string().nullable(),
  metadataJson: z.unknown().nullable(),
  readAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
})
export type InAppNotificationPublic = z.infer<typeof InAppNotificationPublicSchema>

export const NotificationPreferencePublicSchema = z.object({
  emailEnabled: z.boolean(),
  inAppEnabled: z.boolean(),
  remindersEnabled: z.boolean(),
  pulseEnabled: z.boolean(),
  unassignedRemindersEnabled: z.boolean(),
  morningDigestEnabled: z.boolean(),
  morningDigestHour: z.number().int().min(0).max(23),
  morningDigestDays: z.array(MorningDigestDaySchema).min(1),
})
export type NotificationPreferencePublic = z.infer<typeof NotificationPreferencePublicSchema>

export const NotificationDigestRunPublicSchema = z.object({
  id: EntityIdSchema,
  firmId: TenantIdSchema,
  userId: z.string().min(1),
  localDate: z.string().min(1),
  status: NotificationDigestRunStatusSchema,
  urgentCount: z.number().int().min(0),
  pulseCount: z.number().int().min(0),
  failedReminderCount: z.number().int().min(0),
  unassignedCount: z.number().int().min(0),
  emailOutboxId: EntityIdSchema.nullable(),
  failureReason: z.string().nullable(),
  createdAt: z.iso.datetime(),
  sentAt: z.iso.datetime().nullable(),
})
export type NotificationDigestRunPublic = z.infer<typeof NotificationDigestRunPublicSchema>

export const MorningDigestPreviewOutputSchema = z.object({
  status: NotificationDigestRunStatusSchema,
  urgentCount: z.number().int().min(0),
  pulseCount: z.number().int().min(0),
  failedReminderCount: z.number().int().min(0),
  unassignedCount: z.number().int().min(0),
})
export type MorningDigestPreviewOutput = z.infer<typeof MorningDigestPreviewOutputSchema>

export const NotificationListInputSchema = z
  .object({
    status: NotificationStatusFilterSchema.default('all').optional(),
    type: NotificationTypeSchema.optional(),
    cursor: z.string().nullable().optional(),
    limit: z.number().int().min(1).max(100).default(50).optional(),
  })
  .optional()

export const notificationsContract = oc.router({
  list: oc.input(NotificationListInputSchema).output(
    z.object({
      notifications: z.array(InAppNotificationPublicSchema),
      nextCursor: z.string().nullable(),
    }),
  ),
  unreadCount: oc.input(z.undefined()).output(z.object({ count: z.number().int().min(0) })),
  markRead: oc.input(z.object({ id: EntityIdSchema })).output(z.object({ ok: z.literal(true) })),
  markAllRead: oc.input(z.undefined()).output(z.object({ count: z.number().int().min(0) })),
  getPreferences: oc.input(z.undefined()).output(NotificationPreferencePublicSchema),
  updatePreferences: oc
    .input(NotificationPreferencePublicSchema.partial())
    .output(NotificationPreferencePublicSchema),
  listMorningDigestRuns: oc.input(z.undefined()).output(
    z.object({
      runs: z.array(NotificationDigestRunPublicSchema),
    }),
  ),
  previewMorningDigest: oc.input(z.undefined()).output(MorningDigestPreviewOutputSchema),
})

export type NotificationsContract = typeof notificationsContract
