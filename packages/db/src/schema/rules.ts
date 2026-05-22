import { relations, sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { user } from './auth'
import { firmProfile } from './firm'

export const RULE_REVIEW_DECISION_STATUSES = ['verified', 'rejected'] as const
export type RuleReviewDecisionStatus = (typeof RULE_REVIEW_DECISION_STATUSES)[number]
export const RULE_TEMPLATE_STATUSES = ['available', 'deprecated'] as const
export type RuleTemplateStatus = (typeof RULE_TEMPLATE_STATUSES)[number]
export const PRACTICE_RULE_STATUSES = ['pending_review', 'active', 'rejected', 'archived'] as const
export type PracticeRuleStatus = (typeof PRACTICE_RULE_STATUSES)[number]
export const PRACTICE_RULE_REVIEW_TASK_STATUSES = [
  'open',
  'accepted',
  'rejected',
  'superseded',
] as const
export type PracticeRuleReviewTaskStatus = (typeof PRACTICE_RULE_REVIEW_TASK_STATUSES)[number]
export const PRACTICE_RULE_REVIEW_TASK_REASONS = [
  'new_template',
  'source_changed',
  'pulse_signal',
  'custom_edit',
  'annual_review',
] as const
export type PracticeRuleReviewTaskReason = (typeof PRACTICE_RULE_REVIEW_TASK_REASONS)[number]

export const RULE_REGISTRY_RECONCILE_RUN_STATUSES = ['running', 'completed', 'failed'] as const
export type RuleRegistryReconcileRunStatus = (typeof RULE_REGISTRY_RECONCILE_RUN_STATUSES)[number]

export const RULE_REGISTRY_CHANGE_PROPOSAL_TYPES = [
  'no_rule_change',
  'existing_rule_update',
  'new_rule',
  'manual_check_due',
  'analyzer_failed',
] as const
export type RuleRegistryChangeProposalType = (typeof RULE_REGISTRY_CHANGE_PROPOSAL_TYPES)[number]

export const RULE_REGISTRY_CHANGE_PROPOSAL_STATUSES = [
  'open',
  'accepted',
  'dismissed',
  'superseded',
] as const
export type RuleRegistryChangeProposalStatus =
  (typeof RULE_REGISTRY_CHANGE_PROPOSAL_STATUSES)[number]

/**
 * rule_source_template / rule_template — global catalog rows. They are
 * product-provided templates and source metadata, not production approval.
 * A practice must still accept a template into practice_rule before any
 * obligation/reminder write path can use it.
 */
export const ruleSourceTemplate = sqliteTable(
  'rule_source_template',
  {
    id: text('id').primaryKey(),
    jurisdiction: text('jurisdiction').notNull(),
    title: text('title').notNull(),
    url: text('url').notNull(),
    sourceType: text('source_type').notNull(),
    acquisitionMethod: text('acquisition_method').notNull(),
    cadence: text('cadence').notNull(),
    priority: text('priority').notNull(),
    healthStatus: text('health_status').notNull(),
    isEarlyWarning: integer('is_early_warning', { mode: 'boolean' }).notNull().default(false),
    notificationChannelsJson: text('notification_channels_json', { mode: 'json' }).$type<
      string[]
    >(),
    lastReviewedOn: text('last_reviewed_on').notNull(),
    status: text('status', { enum: RULE_TEMPLATE_STATUSES }).notNull().default('available'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index('idx_rule_source_template_jurisdiction').on(table.jurisdiction),
    index('idx_rule_source_template_status').on(table.status),
  ],
)

export const ruleTemplate = sqliteTable(
  'rule_template',
  {
    id: text('id').primaryKey(),
    jurisdiction: text('jurisdiction').notNull(),
    title: text('title').notNull(),
    version: integer('version').notNull(),
    status: text('status', { enum: RULE_TEMPLATE_STATUSES }).notNull().default('available'),
    ruleJson: text('rule_json', { mode: 'json' }).$type<unknown>().notNull(),
    sourceIdsJson: text('source_ids_json', { mode: 'json' }).$type<string[]>(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index('idx_rule_template_jurisdiction').on(table.jurisdiction),
    index('idx_rule_template_status').on(table.status),
  ],
)

/**
 * practice_rule — the only production runtime rule source. Rows are scoped to
 * one firm/practice and reviewed by that practice's owner or manager.
 */
export const practiceRule = sqliteTable(
  'practice_rule',
  {
    id: text('id').primaryKey(),
    firmId: text('firm_id')
      .notNull()
      .references(() => firmProfile.id, { onDelete: 'cascade' }),
    ruleId: text('rule_id').notNull(),
    templateId: text('template_id').references(() => ruleTemplate.id, { onDelete: 'set null' }),
    templateVersion: integer('template_version').notNull(),
    status: text('status', { enum: PRACTICE_RULE_STATUSES }).notNull(),
    ruleJson: text('rule_json', { mode: 'json' }).$type<unknown>(),
    reviewNote: text('review_note'),
    reviewedBy: text('reviewed_by').references(() => user.id, { onDelete: 'set null' }),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    uniqueIndex('uq_practice_rule_firm_rule').on(table.firmId, table.ruleId),
    index('idx_practice_rule_firm_status').on(table.firmId, table.status),
    index('idx_practice_rule_template').on(table.templateId),
  ],
)

export const practiceRuleReviewTask = sqliteTable(
  'practice_rule_review_task',
  {
    id: text('id').primaryKey(),
    firmId: text('firm_id')
      .notNull()
      .references(() => firmProfile.id, { onDelete: 'cascade' }),
    ruleId: text('rule_id').notNull(),
    templateVersion: integer('template_version').notNull(),
    status: text('status', { enum: PRACTICE_RULE_REVIEW_TASK_STATUSES }).notNull().default('open'),
    reason: text('reason', { enum: PRACTICE_RULE_REVIEW_TASK_REASONS })
      .notNull()
      .default('new_template'),
    reviewNote: text('review_note'),
    reviewedBy: text('reviewed_by').references(() => user.id, { onDelete: 'set null' }),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    uniqueIndex('uq_practice_rule_task_firm_rule_version').on(
      table.firmId,
      table.ruleId,
      table.templateVersion,
    ),
    index('idx_practice_rule_task_firm_status').on(table.firmId, table.status),
    index('idx_practice_rule_task_rule').on(table.ruleId),
  ],
)

export const ruleRegistryReconcileRun = sqliteTable(
  'rule_registry_reconcile_run',
  {
    id: text('id').primaryKey(),
    runKey: text('run_key').notNull(),
    status: text('status', { enum: RULE_REGISTRY_RECONCILE_RUN_STATUSES })
      .notNull()
      .default('running'),
    triggeredBy: text('triggered_by').notNull().default('weekly_cron'),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
    completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
    sourceCount: integer('source_count').notNull().default(0),
    checkedCount: integer('checked_count').notNull().default(0),
    unchangedCount: integer('unchanged_count').notNull().default(0),
    changedCount: integer('changed_count').notNull().default(0),
    proposalCount: integer('proposal_count').notNull().default(0),
    failureCount: integer('failure_count').notNull().default(0),
    errorText: text('error_text'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('uq_rule_registry_reconcile_run_key').on(table.runKey),
    index('idx_rule_registry_reconcile_run_status').on(table.status, table.startedAt),
  ],
)

export const ruleRegistryChangeProposal = sqliteTable(
  'rule_registry_change_proposal',
  {
    id: text('id').primaryKey(),
    runId: text('run_id')
      .notNull()
      .references(() => ruleRegistryReconcileRun.id, { onDelete: 'cascade' }),
    sourceId: text('source_id').notNull(),
    sourceSnapshotId: text('source_snapshot_id'),
    contentHash: text('content_hash'),
    rawR2Key: text('raw_r2_key'),
    proposalType: text('proposal_type', {
      enum: RULE_REGISTRY_CHANGE_PROPOSAL_TYPES,
    }).notNull(),
    status: text('status', { enum: RULE_REGISTRY_CHANGE_PROPOSAL_STATUSES })
      .notNull()
      .default('open'),
    affectedRuleIdsJson: text('affected_rule_ids_json', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    proposedRuleIdsJson: text('proposed_rule_ids_json', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    normalizedRuleJson: text('normalized_rule_json', { mode: 'json' }).$type<unknown>(),
    diffSummary: text('diff_summary'),
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
    index('idx_rule_registry_proposal_run').on(table.runId),
    index('idx_rule_registry_proposal_status').on(table.status, table.createdAt),
    index('idx_rule_registry_proposal_source').on(table.sourceId, table.createdAt),
  ],
)

/**
 * rule_review_decision — legacy firm-scoped candidate decisions. New runtime
 * code writes practice_rule / practice_rule_review_task instead; this table is
 * retained so old rows can be migrated/read without data loss.
 */
export const ruleReviewDecision = sqliteTable(
  'rule_review_decision',
  {
    id: text('id').primaryKey(),
    firmId: text('firm_id')
      .notNull()
      .references(() => firmProfile.id, { onDelete: 'cascade' }),
    ruleId: text('rule_id').notNull(),
    baseVersion: integer('base_version').notNull(),
    status: text('status', { enum: RULE_REVIEW_DECISION_STATUSES }).notNull(),
    ruleJson: text('rule_json', { mode: 'json' }).$type<unknown>(),
    reviewNote: text('review_note'),
    reviewedBy: text('reviewed_by')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    uniqueIndex('uq_rule_review_firm_rule').on(table.firmId, table.ruleId),
    index('idx_rule_review_firm_status_time').on(table.firmId, table.status, table.reviewedAt),
    index('idx_rule_review_rule_id').on(table.ruleId),
  ],
)

export const ruleReviewDecisionRelations = relations(ruleReviewDecision, ({ one }) => ({
  firm: one(firmProfile, {
    fields: [ruleReviewDecision.firmId],
    references: [firmProfile.id],
  }),
  reviewer: one(user, {
    fields: [ruleReviewDecision.reviewedBy],
    references: [user.id],
  }),
}))

export const ruleTemplateRelations = relations(ruleTemplate, ({ many }) => ({
  practiceRules: many(practiceRule),
}))

export const practiceRuleRelations = relations(practiceRule, ({ one }) => ({
  firm: one(firmProfile, {
    fields: [practiceRule.firmId],
    references: [firmProfile.id],
  }),
  template: one(ruleTemplate, {
    fields: [practiceRule.templateId],
    references: [ruleTemplate.id],
  }),
  reviewer: one(user, {
    fields: [practiceRule.reviewedBy],
    references: [user.id],
  }),
}))

export const practiceRuleReviewTaskRelations = relations(practiceRuleReviewTask, ({ one }) => ({
  firm: one(firmProfile, {
    fields: [practiceRuleReviewTask.firmId],
    references: [firmProfile.id],
  }),
  reviewer: one(user, {
    fields: [practiceRuleReviewTask.reviewedBy],
    references: [user.id],
  }),
}))

export const ruleRegistryChangeProposalRelations = relations(
  ruleRegistryChangeProposal,
  ({ one }) => ({
    run: one(ruleRegistryReconcileRun, {
      fields: [ruleRegistryChangeProposal.runId],
      references: [ruleRegistryReconcileRun.id],
    }),
  }),
)

export type RuleReviewDecision = typeof ruleReviewDecision.$inferSelect
export type NewRuleReviewDecision = typeof ruleReviewDecision.$inferInsert
export type RuleSourceTemplate = typeof ruleSourceTemplate.$inferSelect
export type NewRuleSourceTemplate = typeof ruleSourceTemplate.$inferInsert
export type RuleTemplate = typeof ruleTemplate.$inferSelect
export type NewRuleTemplate = typeof ruleTemplate.$inferInsert
export type PracticeRule = typeof practiceRule.$inferSelect
export type NewPracticeRule = typeof practiceRule.$inferInsert
export type PracticeRuleReviewTask = typeof practiceRuleReviewTask.$inferSelect
export type NewPracticeRuleReviewTask = typeof practiceRuleReviewTask.$inferInsert
export type RuleRegistryReconcileRun = typeof ruleRegistryReconcileRun.$inferSelect
export type NewRuleRegistryReconcileRun = typeof ruleRegistryReconcileRun.$inferInsert
export type RuleRegistryChangeProposal = typeof ruleRegistryChangeProposal.$inferSelect
export type NewRuleRegistryChangeProposal = typeof ruleRegistryChangeProposal.$inferInsert
