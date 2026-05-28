import { relations, sql } from 'drizzle-orm'
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { user } from './auth'
import { client } from './clients'
import { firmProfile } from './firm'
import { obligationInstance } from './obligations'

export const PULSE_STATUSES = [
  'pending_review',
  'approved',
  'rejected',
  'quarantined',
  'source_revoked',
] as const
export type PulseStatus = (typeof PULSE_STATUSES)[number]

export const PULSE_FIRM_ALERT_STATUSES = [
  'matched',
  'dismissed',
  'snoozed',
  'partially_applied',
  'applied',
  'reverted',
  'reviewed',
] as const
export type PulseFirmAlertStatus = (typeof PULSE_FIRM_ALERT_STATUSES)[number]

export const PULSE_CHANGE_KINDS = [
  'deadline_shift',
  'filing_requirement',
  'applicability_scope',
  'form_instruction',
  'source_status',
  'new_obligation',
  'other',
] as const
export type PulseChangeKind = (typeof PULSE_CHANGE_KINDS)[number]

export const PULSE_ACTION_MODES = ['due_date_overlay', 'review_only'] as const
export type PulseActionMode = (typeof PULSE_ACTION_MODES)[number]

export const PULSE_PRIORITY_REVIEW_STATUSES = ['open', 'reviewed', 'applied', 'dismissed'] as const
export type PulsePriorityReviewStatus = (typeof PULSE_PRIORITY_REVIEW_STATUSES)[number]

export const PULSE_SOURCE_SNAPSHOT_STATUSES = [
  'pending_extract',
  'extracting',
  'extracted',
  'duplicate',
  'failed',
  'ignored',
] as const
export type PulseSourceSnapshotStatus = (typeof PULSE_SOURCE_SNAPSHOT_STATUSES)[number]

export const PULSE_SOURCE_HEALTH_STATUSES = ['healthy', 'degraded', 'failing', 'paused'] as const
export type PulseSourceHealthStatus = (typeof PULSE_SOURCE_HEALTH_STATUSES)[number]

/**
 * pulse — source-backed regulatory announcement routed to practice review.
 *
 * Tenant state lives in pulse_firm_alert / pulse_application. Never infer a
 * firm's applied state from this table's `status`.
 */
export const pulse = sqliteTable(
  'pulse',
  {
    id: text('id').primaryKey(),
    source: text('source').notNull(),
    sourceUrl: text('source_url').notNull(),
    rawR2Key: text('raw_r2_key'),
    publishedAt: integer('published_at', { mode: 'timestamp_ms' }).notNull(),

    changeKind: text('change_kind', { enum: PULSE_CHANGE_KINDS })
      .notNull()
      .default('deadline_shift'),
    actionMode: text('action_mode', { enum: PULSE_ACTION_MODES })
      .notNull()
      .default('due_date_overlay'),

    aiSummary: text('ai_summary').notNull(),
    verbatimQuote: text('verbatim_quote').notNull(),

    parsedJurisdiction: text('parsed_jurisdiction').notNull(),
    parsedCounties: text('parsed_counties', { mode: 'json' }).$type<string[]>().notNull(),
    parsedForms: text('parsed_forms', { mode: 'json' }).$type<string[]>().notNull(),
    parsedEntityTypes: text('parsed_entity_types', { mode: 'json' }).$type<string[]>().notNull(),
    parsedOriginalDueDate: integer('parsed_original_due_date', {
      mode: 'timestamp_ms',
    }),
    parsedNewDueDate: integer('parsed_new_due_date', { mode: 'timestamp_ms' }),
    parsedEffectiveFrom: integer('parsed_effective_from', { mode: 'timestamp_ms' }),
    parsedEffectiveUntil: integer('parsed_effective_until', { mode: 'timestamp_ms' }),
    affectedRuleIdsJson: text('affected_rule_ids_json', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    structuredChangeJson: text('structured_change_json', { mode: 'json' }).$type<unknown>(),

    confidence: real('confidence').notNull(),
    status: text('status', { enum: PULSE_STATUSES }).notNull().default('pending_review'),
    reviewedBy: text('reviewed_by').references(() => user.id, { onDelete: 'set null' }),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp_ms' }),
    requiresHumanReview: integer('requires_human_review', { mode: 'boolean' })
      .notNull()
      .default(true),
    isSample: integer('is_sample', { mode: 'boolean' }).notNull().default(false),

    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('idx_pulse_status_pub').on(table.status, table.publishedAt),
    index('idx_pulse_jurisdiction_pub').on(table.parsedJurisdiction, table.publishedAt),
  ],
)

export const pulseSourceSnapshot = sqliteTable(
  'pulse_source_snapshot',
  {
    id: text('id').primaryKey(),
    sourceId: text('source_id').notNull(),
    externalId: text('external_id').notNull(),
    title: text('title').notNull(),
    officialSourceUrl: text('official_source_url').notNull(),
    publishedAt: integer('published_at', { mode: 'timestamp_ms' }).notNull(),
    fetchedAt: integer('fetched_at', { mode: 'timestamp_ms' }).notNull(),
    contentHash: text('content_hash').notNull(),
    rawR2Key: text('raw_r2_key').notNull(),
    parseStatus: text('parse_status', {
      enum: PULSE_SOURCE_SNAPSHOT_STATUSES,
    })
      .notNull()
      .default('pending_extract'),
    pulseId: text('pulse_id').references(() => pulse.id, { onDelete: 'set null' }),
    aiOutputId: text('ai_output_id'),
    failureReason: text('failure_reason'),

    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('uq_pss_source_external_hash').on(
      table.sourceId,
      table.externalId,
      table.contentHash,
    ),
    index('idx_pss_status_time').on(table.parseStatus, table.createdAt),
    index('idx_pss_source_time').on(table.sourceId, table.publishedAt),
  ],
)

export const pulseSourceState = sqliteTable(
  'pulse_source_state',
  {
    sourceId: text('source_id').primaryKey(),
    tier: text('tier').notNull(),
    jurisdiction: text('jurisdiction').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    cadenceMs: integer('cadence_ms').notNull(),
    healthStatus: text('health_status', {
      enum: PULSE_SOURCE_HEALTH_STATUSES,
    })
      .notNull()
      .default('healthy'),
    lastCheckedAt: integer('last_checked_at', { mode: 'timestamp_ms' }),
    lastSuccessAt: integer('last_success_at', { mode: 'timestamp_ms' }),
    lastChangeDetectedAt: integer('last_change_detected_at', { mode: 'timestamp_ms' }),
    nextCheckAt: integer('next_check_at', { mode: 'timestamp_ms' }),
    consecutiveFailures: integer('consecutive_failures').notNull().default(0),
    lastError: text('last_error'),
    etag: text('etag'),
    lastModified: text('last_modified'),

    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('idx_pss_health_next').on(table.healthStatus, table.nextCheckAt),
    index('idx_pss_enabled_next').on(table.enabled, table.nextCheckAt),
  ],
)

export const pulseFirmAlert = sqliteTable(
  'pulse_firm_alert',
  {
    id: text('id').primaryKey(),
    pulseId: text('pulse_id')
      .notNull()
      .references(() => pulse.id, { onDelete: 'cascade' }),
    firmId: text('firm_id')
      .notNull()
      .references(() => firmProfile.id, { onDelete: 'cascade' }),
    status: text('status', { enum: PULSE_FIRM_ALERT_STATUSES }).notNull().default('matched'),
    matchedCount: integer('matched_count').notNull().default(0),
    needsReviewCount: integer('needs_review_count').notNull().default(0),
    dismissedBy: text('dismissed_by').references(() => user.id, { onDelete: 'set null' }),
    dismissedAt: integer('dismissed_at', { mode: 'timestamp_ms' }),
    snoozedUntil: integer('snoozed_until', { mode: 'timestamp_ms' }),

    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('uq_pulse_firm_alert').on(table.firmId, table.pulseId),
    index('idx_pfa_firm_status_time').on(table.firmId, table.status, table.updatedAt),
    index('idx_pfa_pulse').on(table.pulseId),
  ],
)

export const pulsePriorityReview = sqliteTable(
  'pulse_priority_review',
  {
    id: text('id').primaryKey(),
    firmId: text('firm_id')
      .notNull()
      .references(() => firmProfile.id, { onDelete: 'cascade' }),
    alertId: text('alert_id')
      .notNull()
      .references(() => pulseFirmAlert.id, { onDelete: 'cascade' }),
    pulseId: text('pulse_id')
      .notNull()
      .references(() => pulse.id, { onDelete: 'cascade' }),
    status: text('status', { enum: PULSE_PRIORITY_REVIEW_STATUSES }).notNull().default('open'),
    priorityScore: integer('priority_score').notNull().default(0),
    priorityReasonsJson: text('priority_reasons_json', { mode: 'json' })
      .$type<Array<{ key: string; points: number; label: string }>>()
      .notNull()
      .default(sql`'[]'`),
    selectedObligationIdsJson: text('selected_obligation_ids_json', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    confirmedObligationIdsJson: text('confirmed_obligation_ids_json', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    excludedObligationIdsJson: text('excluded_obligation_ids_json', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    note: text('note'),
    requestedBy: text('requested_by').references(() => user.id, { onDelete: 'set null' }),
    reviewedBy: text('reviewed_by').references(() => user.id, { onDelete: 'set null' }),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('uq_pulse_priority_review_firm_alert').on(table.firmId, table.alertId),
    index('idx_pulse_priority_review_firm_status_score').on(
      table.firmId,
      table.status,
      table.priorityScore,
    ),
    index('idx_pulse_priority_review_alert').on(table.alertId),
    index('idx_pulse_priority_review_pulse').on(table.pulseId),
  ],
)

export const pulseApplication = sqliteTable(
  'pulse_application',
  {
    id: text('id').primaryKey(),
    pulseId: text('pulse_id')
      .notNull()
      .references(() => pulse.id, { onDelete: 'restrict' }),
    obligationInstanceId: text('obligation_instance_id')
      .notNull()
      .references(() => obligationInstance.id, { onDelete: 'restrict' }),
    clientId: text('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'restrict' }),
    firmId: text('firm_id')
      .notNull()
      .references(() => firmProfile.id, { onDelete: 'cascade' }),
    appliedBy: text('applied_by')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    appliedAt: integer('applied_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    revertedBy: text('reverted_by').references(() => user.id, { onDelete: 'set null' }),
    revertedAt: integer('reverted_at', { mode: 'timestamp_ms' }),
    beforeDueDate: integer('before_due_date', { mode: 'timestamp_ms' }).notNull(),
    afterDueDate: integer('after_due_date', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('uq_pulse_application_obligation').on(
      table.firmId,
      table.pulseId,
      table.obligationInstanceId,
    ),
    index('idx_pa_firm_pulse').on(table.firmId, table.pulseId),
    index('idx_pa_obligation').on(table.obligationInstanceId),
  ],
)

export const pulseRelations = relations(pulse, ({ many, one }) => ({
  firmAlerts: many(pulseFirmAlert),
  applications: many(pulseApplication),
  sourceSnapshots: many(pulseSourceSnapshot),
  reviewer: one(user, {
    fields: [pulse.reviewedBy],
    references: [user.id],
  }),
}))

export const pulseSourceSnapshotRelations = relations(pulseSourceSnapshot, ({ one }) => ({
  pulse: one(pulse, {
    fields: [pulseSourceSnapshot.pulseId],
    references: [pulse.id],
  }),
}))

export const pulseSourceStateRelations = relations(pulseSourceState, () => ({}))

export const pulseFirmAlertRelations = relations(pulseFirmAlert, ({ one }) => ({
  pulse: one(pulse, {
    fields: [pulseFirmAlert.pulseId],
    references: [pulse.id],
  }),
  firm: one(firmProfile, {
    fields: [pulseFirmAlert.firmId],
    references: [firmProfile.id],
  }),
  dismisser: one(user, {
    fields: [pulseFirmAlert.dismissedBy],
    references: [user.id],
  }),
}))

export const pulsePriorityReviewRelations = relations(pulsePriorityReview, ({ one }) => ({
  firm: one(firmProfile, {
    fields: [pulsePriorityReview.firmId],
    references: [firmProfile.id],
  }),
  alert: one(pulseFirmAlert, {
    fields: [pulsePriorityReview.alertId],
    references: [pulseFirmAlert.id],
  }),
  pulse: one(pulse, {
    fields: [pulsePriorityReview.pulseId],
    references: [pulse.id],
  }),
  requester: one(user, {
    fields: [pulsePriorityReview.requestedBy],
    references: [user.id],
  }),
  reviewer: one(user, {
    fields: [pulsePriorityReview.reviewedBy],
    references: [user.id],
  }),
}))

export const pulseApplicationRelations = relations(pulseApplication, ({ one }) => ({
  pulse: one(pulse, {
    fields: [pulseApplication.pulseId],
    references: [pulse.id],
  }),
  obligationInstance: one(obligationInstance, {
    fields: [pulseApplication.obligationInstanceId],
    references: [obligationInstance.id],
  }),
  client: one(client, {
    fields: [pulseApplication.clientId],
    references: [client.id],
  }),
  firm: one(firmProfile, {
    fields: [pulseApplication.firmId],
    references: [firmProfile.id],
  }),
  applier: one(user, {
    fields: [pulseApplication.appliedBy],
    references: [user.id],
  }),
  reverter: one(user, {
    fields: [pulseApplication.revertedBy],
    references: [user.id],
  }),
}))

export type Pulse = typeof pulse.$inferSelect
export type NewPulse = typeof pulse.$inferInsert
export type PulseSourceSnapshot = typeof pulseSourceSnapshot.$inferSelect
export type NewPulseSourceSnapshot = typeof pulseSourceSnapshot.$inferInsert
export type PulseSourceState = typeof pulseSourceState.$inferSelect
export type NewPulseSourceState = typeof pulseSourceState.$inferInsert
export type PulseFirmAlert = typeof pulseFirmAlert.$inferSelect
export type NewPulseFirmAlert = typeof pulseFirmAlert.$inferInsert
export type PulsePriorityReview = typeof pulsePriorityReview.$inferSelect
export type NewPulsePriorityReview = typeof pulsePriorityReview.$inferInsert
export type PulseApplication = typeof pulseApplication.$inferSelect
export type NewPulseApplication = typeof pulseApplication.$inferInsert
