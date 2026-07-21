import { relations, sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { user } from './auth'
import { pulse, PULSE_CHANGE_KINDS } from './pulse'

export const SOCIAL_CHANNELS = ['x'] as const
export type SocialChannel = (typeof SOCIAL_CHANNELS)[number]

export const SOCIAL_ALERT_POST_STATUSES = [
  'draft',
  'ready',
  'scheduled',
  'published',
  'unknown',
  'cancelled',
] as const
export type SocialAlertPostStatus = (typeof SOCIAL_ALERT_POST_STATUSES)[number]

export const SOCIAL_ALERT_PRIORITIES = ['normal', 'urgent'] as const
export type SocialAlertPriority = (typeof SOCIAL_ALERT_PRIORITIES)[number]

export const SOCIAL_PUBLISH_RUN_STATUSES = [
  'draft_only',
  'queued',
  'sending',
  'published',
  'failed',
  'unknown',
] as const
export type SocialPublishRunStatus = (typeof SOCIAL_PUBLISH_RUN_STATUSES)[number]

/**
 * One frozen, editorially reviewed social treatment of a global Pulse.
 *
 * This is deliberately global rather than firm-scoped: X publishes one public
 * post, while the opaque `refToken` is resolved to a tenant-owned
 * pulse_firm_alert only after authentication. `postText`, `targetUrl`, and the
 * teaser labels are frozen public copy, so a later Pulse edit cannot silently
 * rewrite what was published.
 */
export const socialAlertPost = sqliteTable(
  'social_alert_post',
  {
    id: text('id').primaryKey(),
    channel: text('channel', { enum: SOCIAL_CHANNELS }).notNull().default('x'),
    pulseId: text('pulse_id')
      .notNull()
      .references(() => pulse.id, { onDelete: 'restrict' }),
    refToken: text('ref_token').notNull(),
    postText: text('post_text').notNull(),
    targetUrl: text('target_url').notNull(),
    teaser: text('teaser').notNull(),
    agency: text('agency').notNull(),
    jurisdiction: text('jurisdiction').notNull(),
    changeKind: text('change_kind', { enum: PULSE_CHANGE_KINDS }).notNull(),
    status: text('status', { enum: SOCIAL_ALERT_POST_STATUSES }).notNull().default('draft'),
    priority: text('priority', { enum: SOCIAL_ALERT_PRIORITIES }).notNull().default('normal'),
    readyAt: integer('ready_at', { mode: 'timestamp_ms' }),
    approvedBy: text('approved_by').references(() => user.id, { onDelete: 'set null' }),
    approvedAt: integer('approved_at', { mode: 'timestamp_ms' }),
    xPostId: text('x_post_id'),
    publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
    cancelledAt: integer('cancelled_at', { mode: 'timestamp_ms' }),
    cancellationReason: text('cancellation_reason'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('uq_social_alert_post_channel_pulse').on(table.channel, table.pulseId),
    uniqueIndex('uq_social_alert_post_ref_token').on(table.refToken),
    uniqueIndex('uq_social_alert_post_channel_x_post').on(table.channel, table.xPostId),
    index('idx_social_alert_post_backlog').on(
      table.channel,
      table.status,
      table.priority,
      table.readyAt,
      table.createdAt,
    ),
    index('idx_social_alert_post_pulse').on(table.pulseId),
    check('ck_social_alert_post_channel', sql`${table.channel} in ('x')`),
    check(
      'ck_social_alert_post_status',
      sql`${table.status} in ('draft', 'ready', 'scheduled', 'published', 'unknown', 'cancelled')`,
    ),
    check('ck_social_alert_post_priority', sql`${table.priority} in ('normal', 'urgent')`),
    check(
      'ck_social_alert_post_ref_token',
      sql`length(${table.refToken}) between 16 and 128 and ${table.refToken} not glob '*[^A-Za-z0-9_-]*'`,
    ),
    check('ck_social_alert_post_copy', sql`length(trim(${table.postText})) > 0`),
    check('ck_social_alert_post_target_url', sql`length(trim(${table.targetUrl})) > 0`),
    check(
      'ck_social_alert_post_ready_at',
      sql`${table.status} not in ('ready', 'scheduled') or ${table.readyAt} is not null`,
    ),
    check(
      'ck_social_alert_post_published_fields',
      sql`${table.status} <> 'published' or (${table.xPostId} is not null and ${table.publishedAt} is not null)`,
    ),
    check(
      'ck_social_alert_post_cancelled_at',
      sql`${table.status} <> 'cancelled' or ${table.cancelledAt} is not null`,
    ),
  ],
)

/**
 * One immutable ET-local daily publishing slot.
 *
 * The `(channel, localDate)` unique key is the hard daily cap. A draft-only
 * shadow run does not consume the post permanently; the post returns to draft
 * and must be explicitly approved before a future live run. The partial live
 * uniqueness guard prevents one post from being sent in two live slots while
 * still allowing that prior shadow record to remain auditable.
 */
export const socialPublishRun = sqliteTable(
  'social_publish_run',
  {
    id: text('id').primaryKey(),
    channel: text('channel', { enum: SOCIAL_CHANNELS }).notNull().default('x'),
    localDate: text('local_date').notNull(),
    postId: text('post_id')
      .notNull()
      .references(() => socialAlertPost.id, { onDelete: 'restrict' }),
    status: text('status', { enum: SOCIAL_PUBLISH_RUN_STATUSES }).notNull(),
    attemptCount: integer('attempt_count').notNull().default(0),
    lastAttemptAt: integer('last_attempt_at', { mode: 'timestamp_ms' }),
    leaseExpiresAt: integer('lease_expires_at', { mode: 'timestamp_ms' }),
    responseHttpStatus: integer('response_http_status'),
    failureReason: text('failure_reason'),
    xPostId: text('x_post_id'),
    queuedAt: integer('queued_at', { mode: 'timestamp_ms' }),
    sendingAt: integer('sending_at', { mode: 'timestamp_ms' }),
    publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
    failedAt: integer('failed_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('uq_social_publish_run_channel_date').on(table.channel, table.localDate),
    uniqueIndex('uq_social_publish_run_live_post')
      .on(table.postId)
      .where(sql`${table.status} in ('queued', 'sending', 'published', 'unknown')`),
    index('idx_social_publish_run_status_time').on(table.status, table.updatedAt),
    index('idx_social_publish_run_post').on(table.postId, table.createdAt),
    check('ck_social_publish_run_channel', sql`${table.channel} in ('x')`),
    check(
      'ck_social_publish_run_status',
      sql`${table.status} in ('draft_only', 'queued', 'sending', 'published', 'failed', 'unknown')`,
    ),
    check(
      'ck_social_publish_run_local_date',
      sql`length(${table.localDate}) = 10 and ${table.localDate} glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`,
    ),
    check('ck_social_publish_run_attempt_count', sql`${table.attemptCount} >= 0`),
    check(
      'ck_social_publish_run_queued_at',
      sql`${table.status} <> 'queued' or ${table.queuedAt} is not null`,
    ),
    check(
      'ck_social_publish_run_sending_fields',
      sql`${table.status} <> 'sending' or (${table.sendingAt} is not null and ${table.leaseExpiresAt} is not null)`,
    ),
    check(
      'ck_social_publish_run_published_fields',
      sql`${table.status} <> 'published' or (${table.xPostId} is not null and ${table.publishedAt} is not null)`,
    ),
    check(
      'ck_social_publish_run_failed_at',
      sql`${table.status} <> 'failed' or ${table.failedAt} is not null`,
    ),
  ],
)

export const socialAlertPostRelations = relations(socialAlertPost, ({ one, many }) => ({
  pulse: one(pulse, {
    fields: [socialAlertPost.pulseId],
    references: [pulse.id],
  }),
  approver: one(user, {
    fields: [socialAlertPost.approvedBy],
    references: [user.id],
  }),
  publishRuns: many(socialPublishRun),
}))

export const socialPublishRunRelations = relations(socialPublishRun, ({ one }) => ({
  post: one(socialAlertPost, {
    fields: [socialPublishRun.postId],
    references: [socialAlertPost.id],
  }),
}))

export type SocialAlertPost = typeof socialAlertPost.$inferSelect
export type NewSocialAlertPost = typeof socialAlertPost.$inferInsert
export type SocialPublishRun = typeof socialPublishRun.$inferSelect
export type NewSocialPublishRun = typeof socialPublishRun.$inferInsert
