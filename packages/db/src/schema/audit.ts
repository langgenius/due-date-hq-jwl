import { relations, sql } from 'drizzle-orm'
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { user } from './auth'
import { firmProfile } from './firm'
import { obligationInstance } from './obligations'

/**
 * audit_event — append-only compliance log. HARD CONSTRAINT (PRD §13,
 * docs/dev-file/03-Data-Model.md §2.5, docs/dev-file/06 §6.1):
 *
 *   - NO `deleted_at` column.
 *   - NO soft-delete flag.
 *   - Repo layer (packages/db/src/repo/audit.ts) and writer
 *     (packages/db/src/audit-writer.ts) only expose INSERT — UPDATE /
 *     DELETE are physically absent from the repo surface.
 *
 * `action` is a free `text` column on purpose: enum constraints would
 * prevent appending new action strings in Phase 1 without a disruptive
 * migration. Consumers get TypeScript-level safety via the exported union
 * constants below (imported by packages/contracts/src/shared/audit-actions.ts).
 *
 * `before_json` / `after_json` are typed `text({mode:'json'})` — Drizzle
 * serialises transparently; D1 stores as TEXT.
 */
export const AUDIT_ACTOR_TYPES = ['user', 'system', 'ai', 'ai_assisted'] as const
export type AuditActorType = (typeof AUDIT_ACTOR_TYPES)[number]

export const auditEvent = sqliteTable(
  'audit_event',
  {
    id: text('id').primaryKey(),
    firmId: text('firm_id')
      .notNull()
      .references(() => firmProfile.id, { onDelete: 'restrict' }),
    // NULL for system actors (Cron, Queues, webhook handlers).
    actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),

    // 2026-05-27 (audit drain — η — F-035 / F-036): the AI-actor type lives
    // here, not in `actorId`, because an AI write often has BOTH a human
    // actor (the CPA who pressed "Apply") AND an AI source (the model that
    // produced the value). Treating "AI" as a synthetic user_id loses the
    // human-in-the-loop signal; treating it as NULL collides with cron /
    // system events (F-036). The taxonomy is:
    //   - 'user'         human-authored, no AI involvement.
    //   - 'system'       cron / webhook / queue worker; no human, no AI.
    //   - 'ai'           AI is the sole author (autonomous job).
    //   - 'ai_assisted'  AI produced the value, a human pressed apply.
    // Default 'user' is the safe backfill — see migration 0030.
    actorType: text('actor_type', { enum: AUDIT_ACTOR_TYPES }).notNull().default('user'),
    // F-023: when a user EDITS an AI-sourced value, the resulting event
    // records what the previous origin was, so "Andy overrode an AI suggestion"
    // is one query, not a multi-event reconstruction.
    previousActorType: text('previous_actor_type', { enum: AUDIT_ACTOR_TYPES }),
    // F-037: AI metadata for the audit drawer disclosure section
    // (model, prompt version, token counts, latency, guard status).
    // JSON-encoded to keep the column count below D1's 100-bind budget;
    // shape is `AiEventMetadata` (see packages/contracts/src/audit.ts).
    aiEventMetadataJson: text('ai_event_metadata_json', { mode: 'json' }).$type<unknown>(),

    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    action: text('action').notNull(),

    beforeJson: text('before_json', { mode: 'json' }).$type<unknown>(),
    afterJson: text('after_json', { mode: 'json' }).$type<unknown>(),
    reason: text('reason'),

    // Anonymised per PRD §9 (SHA-256 of raw value + firm-scoped salt).
    ipHash: text('ip_hash'),
    userAgentHash: text('user_agent_hash'),

    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    // Audit drawer (PRD §5.5): firm-wide timeline, newest first.
    index('idx_audit_firm_time').on(table.firmId, table.createdAt),
    // "Show me what Actor X did" — Team settings panel + forensic review.
    index('idx_audit_firm_actor_time').on(table.firmId, table.actorId, table.createdAt),
    // "Show me migration.imported events in the last 24h" — Revert surface.
    index('idx_audit_firm_action_time').on(table.firmId, table.action, table.createdAt),
    // "Show me every AI / ai_assisted action in the last 24h" — F-035 filter.
    index('idx_audit_firm_actor_type_time').on(table.firmId, table.actorType, table.createdAt),
  ],
)

/**
 * evidence_link — the provenance chain backing every AI decision, matrix
 * inference, and user-visible "why this due date?" answer (PRD §5.5).
 *
 * Exactly one of `obligation_instance_id` or `ai_output_id` is set. Demo
 * Sprint does not materialise `ai_output` yet (that belongs to Brief +
 * Pulse); the column is present so the Pulse owner can backfill without
 * touching this schema.
 *
 * `source_type` is `text` (not enum) for the same append-freedom reason as
 * `audit.action`. The TypeScript union below enumerates Demo Sprint values.
 */
export const evidenceLink = sqliteTable(
  'evidence_link',
  {
    id: text('id').primaryKey(),
    firmId: text('firm_id')
      .notNull()
      .references(() => firmProfile.id, { onDelete: 'restrict' }),

    // XOR with aiOutputId. Not enforced at the DB level because D1 lacks
    // CHECK constraint expressions on nullable FKs; repo layer enforces.
    obligationInstanceId: text('obligation_instance_id').references(() => obligationInstance.id, {
      onDelete: 'set null',
    }),
    aiOutputId: text('ai_output_id'),

    sourceType: text('source_type').notNull(),
    sourceId: text('source_id'),
    sourceUrl: text('source_url'),
    verbatimQuote: text('verbatim_quote'),

    rawValue: text('raw_value'),
    normalizedValue: text('normalized_value'),

    confidence: real('confidence'),
    model: text('model'),
    matrixVersion: text('matrix_version'),

    verifiedAt: integer('verified_at', { mode: 'timestamp_ms' }),
    verifiedBy: text('verified_by').references(() => user.id, { onDelete: 'set null' }),
    appliedAt: integer('applied_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    appliedBy: text('applied_by').references(() => user.id, { onDelete: 'set null' }),
  },
  (table) => [
    index('idx_evidence_firm_time').on(table.firmId, table.appliedAt),
    index('idx_evidence_oi').on(table.obligationInstanceId),
    index('idx_evidence_source').on(table.sourceType, table.sourceId),
  ],
)

export const AUDIT_EVIDENCE_PACKAGE_STATUSES = [
  'pending',
  'running',
  'ready',
  'failed',
  'expired',
] as const
export type AuditEvidencePackageStatus = (typeof AUDIT_EVIDENCE_PACKAGE_STATUSES)[number]

export const AUDIT_EVIDENCE_PACKAGE_SCOPES = ['firm', 'client', 'obligation', 'migration'] as const
export type AuditEvidencePackageScope = (typeof AUDIT_EVIDENCE_PACKAGE_SCOPES)[number]

export const auditEvidencePackage = sqliteTable(
  'audit_evidence_package',
  {
    id: text('id').primaryKey(),
    firmId: text('firm_id')
      .notNull()
      .references(() => firmProfile.id, { onDelete: 'cascade' }),
    exportedByUserId: text('exported_by_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    scope: text('scope', { enum: AUDIT_EVIDENCE_PACKAGE_SCOPES }).notNull().default('firm'),
    scopeEntityId: text('scope_entity_id'),
    rangeStart: integer('range_start', { mode: 'timestamp_ms' }),
    rangeEnd: integer('range_end', { mode: 'timestamp_ms' }),
    fileCount: integer('file_count').notNull().default(0),
    fileManifestJson: text('file_manifest_json', { mode: 'json' }).$type<unknown>(),
    sha256Hash: text('sha256_hash'),
    r2Key: text('r2_key'),
    status: text('status', { enum: AUDIT_EVIDENCE_PACKAGE_STATUSES }).notNull().default('pending'),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
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
    index('idx_audit_package_firm_time').on(table.firmId, table.createdAt),
    index('idx_audit_package_status').on(table.status, table.createdAt),
  ],
)

export const auditEventRelations = relations(auditEvent, ({ one }) => ({
  firm: one(firmProfile, {
    fields: [auditEvent.firmId],
    references: [firmProfile.id],
  }),
  actor: one(user, {
    fields: [auditEvent.actorId],
    references: [user.id],
  }),
}))

export const evidenceLinkRelations = relations(evidenceLink, ({ one }) => ({
  firm: one(firmProfile, {
    fields: [evidenceLink.firmId],
    references: [firmProfile.id],
  }),
  obligationInstance: one(obligationInstance, {
    fields: [evidenceLink.obligationInstanceId],
    references: [obligationInstance.id],
  }),
  verifier: one(user, {
    fields: [evidenceLink.verifiedBy],
    references: [user.id],
  }),
  applier: one(user, {
    fields: [evidenceLink.appliedBy],
    references: [user.id],
  }),
}))

export const auditEvidencePackageRelations = relations(auditEvidencePackage, ({ one }) => ({
  firm: one(firmProfile, {
    fields: [auditEvidencePackage.firmId],
    references: [firmProfile.id],
  }),
  exporter: one(user, {
    fields: [auditEvidencePackage.exportedByUserId],
    references: [user.id],
  }),
}))

export type AuditEvent = typeof auditEvent.$inferSelect
export type NewAuditEvent = typeof auditEvent.$inferInsert
export type EvidenceLink = typeof evidenceLink.$inferSelect
export type NewEvidenceLink = typeof evidenceLink.$inferInsert
export type AuditEvidencePackage = typeof auditEvidencePackage.$inferSelect
export type NewAuditEvidencePackage = typeof auditEvidencePackage.$inferInsert

/**
 * Compliance audit action strings (docs/dev-file/06-Security-Compliance.md §6.1).
 * Consumers should import from packages/contracts/src/shared/audit-actions.ts;
 * this local copy keeps the DB package standalone.
 */
export const MIGRATION_AUDIT_ACTIONS = [
  'migration.batch.created',
  'migration.raw_uploaded',
  'migration.discarded',
  'migration.imported',
  'migration.reverted',
  'migration.single_undo',
  'migration.mapper.confirmed',
  'migration.normalizer.confirmed',
  'migration.matrix.applied',
] as const
export type MigrationAuditAction = (typeof MIGRATION_AUDIT_ACTIONS)[number]

export const PULSE_AUDIT_ACTIONS = [
  // `pulse.ingest` / `pulse.extract` removed — operational telemetry, not
  // firm-facing audit (see packages/contracts/src/shared/audit-actions.ts).
  'pulse.approve',
  'pulse.reject',
  'pulse.dismiss',
  'pulse.quarantine',
  'pulse.source_revoked',
  'pulse.snooze',
  'pulse.apply',
  'pulse.revert',
  'pulse.reactivate',
  'pulse.review_requested',
  'pulse.reviewed',
] as const
export type PulseAuditAction = (typeof PULSE_AUDIT_ACTIONS)[number]

export const PENALTY_AUDIT_ACTIONS = ['penalty.override'] as const
export type PenaltyAuditAction = (typeof PENALTY_AUDIT_ACTIONS)[number]

export const RULES_AUDIT_ACTIONS = [
  'rules.accepted',
  'rules.bulk_accepted',
  'rules.onboarding_activated',
  'rules.rejected',
  'rules.created',
  'rules.updated',
  'rules.archived',
  'rules.published',
  'rules.review.rejected',
] as const
export type RulesAuditAction = (typeof RULES_AUDIT_ACTIONS)[number]

export const OBLIGATION_AUDIT_ACTIONS = [
  'obligation.batch_created',
  'obligation.annual_rollover.created',
  'obligation.confirmed',
  'obligation.reprojected',
  'obligation.status.updated',
  'obligation.status.auto_unblocked',
  'obligation.due_date.updated',
  'obligation.tax_year_profile.updated',
  'obligation.blocked_by.set',
  'obligation.blocked_by.cleared',
  'obligation.prep_stage.updated',
  'obligation.review_stage.updated',
  'obligation.efile.state.updated',
  'obligation.efile.rejected',
  'obligation.extension.decided',
  'obligation.input_requested',
  'obligation.signature.reminded',
  'obligations.saved_view.created',
  'obligations.saved_view.updated',
  'obligations.saved_view.deleted',
  'obligations.exported',
] as const
export type ObligationAuditAction = (typeof OBLIGATION_AUDIT_ACTIONS)[number]

export const READINESS_AUDIT_ACTIONS = [
  'readiness.request.sent',
  'readiness.request.revoked',
  'readiness.checklist.regenerated',
  'readiness.checklist_item.created',
  'readiness.checklist_item.updated',
  'readiness.checklist_item.deleted',
  'readiness.checklist_item.ai_overridden',
  'readiness.materials_received',
  'readiness.portal.opened',
  'readiness.client_response',
] as const
export type ReadinessAuditAction = (typeof READINESS_AUDIT_ACTIONS)[number]

export const MEMBER_AUDIT_ACTIONS = [
  'member.invited',
  'member.invitation.canceled',
  'member.invitation.resent',
  'member.accepted',
  'member.role.updated',
  'member.suspended',
  'member.reactivated',
  'member.removed',
] as const
export type MemberAuditAction = (typeof MEMBER_AUDIT_ACTIONS)[number]

export const FIRM_AUDIT_ACTIONS = [
  'firm.created',
  'firm.updated',
  'firm.switched',
  'firm.deleted',
] as const
export type FirmAuditAction = (typeof FIRM_AUDIT_ACTIONS)[number]

export const OPPORTUNITY_AUDIT_ACTIONS = [
  'opportunity.dismissed',
  'opportunity.snoozed',
  'opportunity.restored',
] as const
export type OpportunityAuditAction = (typeof OPPORTUNITY_AUDIT_ACTIONS)[number]

export const CALENDAR_AUDIT_ACTIONS = [
  'calendar.subscription.created',
  'calendar.subscription.regenerated',
  'calendar.subscription.disabled',
] as const
export type CalendarAuditAction = (typeof CALENDAR_AUDIT_ACTIONS)[number]

export const REMINDER_AUDIT_ACTIONS = [
  'reminder.template.updated',
  'reminder.sent',
  'reminder.failed',
  'reminder.bounced',
  'reminder.opened',
  'reminder.unsubscribed',
] as const
export type ReminderAuditAction = (typeof REMINDER_AUDIT_ACTIONS)[number]

export const CLIENT_AUDIT_ACTIONS = [
  'client.assignee.updated',
  'client.batch_created',
  'client.classification.updated',
  'client.created',
  'client.deleted',
  'client.filing_profiles.replaced',
  'client.jurisdiction.updated',
  'client.obligations.reclassified',
  'client.risk_profile.updated',
  'client.source_details.updated',
  'client.tax_year_profile.updated',
] as const
export type ClientAuditAction = (typeof CLIENT_AUDIT_ACTIONS)[number]

export const AUTH_AUDIT_ACTIONS = [
  'auth.denied',
  'auth.login.success',
  'auth.login.failed',
  'auth.mfa.setup.started',
  'auth.mfa.enabled',
  'auth.mfa.challenge.verified',
  'auth.mfa.disabled',
  'auth.session.revoked',
] as const
export type AuthAuditAction = (typeof AUTH_AUDIT_ACTIONS)[number]

export const EXPORT_AUDIT_ACTIONS = [
  'export.audit_package.requested',
  'export.audit_package.ready',
  'export.audit_package.failed',
  'export.audit_package.downloaded',
] as const
export type ExportAuditAction = (typeof EXPORT_AUDIT_ACTIONS)[number]

export const AUDIT_ACTIONS = [
  ...MIGRATION_AUDIT_ACTIONS,
  ...PULSE_AUDIT_ACTIONS,
  ...PENALTY_AUDIT_ACTIONS,
  ...RULES_AUDIT_ACTIONS,
  ...OBLIGATION_AUDIT_ACTIONS,
  ...READINESS_AUDIT_ACTIONS,
  ...CLIENT_AUDIT_ACTIONS,
  ...MEMBER_AUDIT_ACTIONS,
  ...FIRM_AUDIT_ACTIONS,
  ...OPPORTUNITY_AUDIT_ACTIONS,
  ...CALENDAR_AUDIT_ACTIONS,
  ...REMINDER_AUDIT_ACTIONS,
  ...AUTH_AUDIT_ACTIONS,
  ...EXPORT_AUDIT_ACTIONS,
] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

/**
 * Evidence source_type strings. AI Mapper / Normalizer write one evidence_link
 * per cell (docs/product-design/migration-copilot/04-ai-prompts.md §2.5 / §3.5);
 * Pulse apply/revert writes provenance for regulatory date changes.
 */
export const EVIDENCE_SOURCE_TYPES = [
  'default_inference_by_entity_state',
  'migration_revert',
  'ai_mapper',
  'ai_normalizer',
  'verified_rule',
  'pulse_apply',
  'pulse_revert',
  'user_override',
  'penalty_override',
  'migration_raw_upload',
] as const
export type EvidenceSourceType = (typeof EVIDENCE_SOURCE_TYPES)[number]
