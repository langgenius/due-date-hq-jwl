import { relations, sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { user } from './auth'
import { client, clientFilingProfile } from './clients'
import { firmProfile } from './firm'

export const EXPOSURE_STATUSES = ['ready', 'needs_input', 'unsupported'] as const
export type ExposureStatus = (typeof EXPOSURE_STATUSES)[number]

export const OBLIGATION_EXTENSION_DECISIONS = ['not_considered', 'applied', 'rejected'] as const
export type ObligationExtensionDecision = (typeof OBLIGATION_EXTENSION_DECISIONS)[number]

export const OBLIGATION_TYPES = [
  'filing',
  'payment',
  'deposit',
  'information',
  'client_action',
  'internal_review',
] as const
export type ObligationType = (typeof OBLIGATION_TYPES)[number]

export const OBLIGATION_RECURRENCES = [
  'once',
  'annual',
  'quarterly',
  'monthly',
  'semiweekly',
  'event_triggered',
] as const
export type ObligationRecurrence = (typeof OBLIGATION_RECURRENCES)[number]

export const OBLIGATION_RISK_LEVELS = ['low', 'med', 'high'] as const
export type ObligationRiskLevel = (typeof OBLIGATION_RISK_LEVELS)[number]

export const TAX_PERIOD_KINDS = ['calendar', 'fiscal', 'short', '52_53_week', 'unknown'] as const
export type TaxPeriodKind = (typeof TAX_PERIOD_KINDS)[number]

export const TAX_PERIOD_SOURCES = [
  'client_default',
  'prior_obligation',
  'migration',
  'manual_cpa_confirmed',
  'unknown',
] as const
export type TaxPeriodSource = (typeof TAX_PERIOD_SOURCES)[number]

export const OBLIGATION_PREP_STAGES = [
  'not_started',
  'waiting_on_client',
  'waiting_on_third_party',
  'bookkeeping_cleanup',
  'ready_for_prep',
  'in_prep',
  'prepared',
] as const
export type ObligationPrepStage = (typeof OBLIGATION_PREP_STAGES)[number]

export const OBLIGATION_REVIEW_STAGES = [
  'not_required',
  'ready_for_review',
  'in_review',
  'notes_open',
  'approved',
  'overridden',
] as const
export type ObligationReviewStage = (typeof OBLIGATION_REVIEW_STAGES)[number]

export const OBLIGATION_EXTENSION_STATES = [
  'not_applicable',
  'not_started',
  'estimate_needed',
  'client_approval_needed',
  'ready_to_file',
  'filed',
  'accepted',
  'rejected',
] as const
export type ObligationExtensionState = (typeof OBLIGATION_EXTENSION_STATES)[number]

export const OBLIGATION_PAYMENT_STATES = [
  'not_applicable',
  'estimate_needed',
  'client_approval_needed',
  'scheduled',
  'confirmed',
] as const
export type ObligationPaymentState = (typeof OBLIGATION_PAYMENT_STATES)[number]

export const OBLIGATION_EFILE_STATES = [
  'not_applicable',
  'authorization_requested',
  'authorization_signed',
  'ready_to_submit',
  'submitted',
  'accepted',
  'rejected',
  'corrected_resubmitted',
  'paper_filed',
  'final_package_delivered',
] as const
export type ObligationEfileState = (typeof OBLIGATION_EFILE_STATES)[number]

export const OBLIGATION_DEPENDENCY_TYPES = ['k1', 'source_document', 'payment', 'review'] as const
export type ObligationDependencyType = (typeof OBLIGATION_DEPENDENCY_TYPES)[number]

export const OBLIGATION_DEPENDENCY_STATUSES = ['blocking', 'satisfied', 'waived'] as const
export type ObligationDependencyStatus = (typeof OBLIGATION_DEPENDENCY_STATUSES)[number]

/**
 * obligation_instance — a single due-date row for one client for one tax type.
 *
 * Demo Sprint subset (docs/dev-file/03-Data-Model.md §2.3):
 *   - No `rule_id` FK yet. Demo generates obligations directly from the
 *     Default Matrix v1.0 (tax_type + base_due_date). Phase 1 backfills
 *     `rule_id → obligation_rule.id` + Overlay Engine (exception_rule
 *     join) and `current_due_date` becomes a derived read.
 *   - No `obligation_rule` / `rule_source` / `rule_chunk` tables in Demo;
 *     those are Pulse Pipeline owner's responsibility.
 *
 * Base vs current due date:
 *   - `base_due_date` — the statutory/base rule date for this
 *     (tax_type, tax_year); written at create-time and never mutated.
 *   - `current_due_date` — the internal practice deadline shown by Dashboard /
 *     Obligations. It is normally `base_due_date - firm.internalDeadlineOffsetDays`.
 *     Tax authority filing/payment deadlines stay separate in `filing_due_date` and
 *     `payment_due_date`.
 *
 * status workflow: full P0-16 surface with flexible corrective transitions.
 * Readiness is derived from status plus client readiness request responses.
 */
export const obligationInstance = sqliteTable(
  'obligation_instance',
  {
    id: text('id').primaryKey(),
    firmId: text('firm_id')
      .notNull()
      .references(() => firmProfile.id, { onDelete: 'cascade' }),
    clientId: text('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    clientFilingProfileId: text('client_filing_profile_id').references(
      () => clientFilingProfile.id,
      { onDelete: 'set null' },
    ),

    // Free text string matching the AI Normalizer tax_types enum
    // (docs/product-design/migration-copilot/05-default-matrix.v1.0.yaml).
    // Phase 1 replaces with rule_id FK.
    taxType: text('tax_type').notNull(),
    // Optional: 4-digit tax year (e.g. '2026'). Some Demo obligations span
    // calendars; NULL means "non-year-specific" which is rare for Demo.
    taxYear: integer('tax_year'),
    // CPA-confirmed tax year basis for this specific obligation. Kept on the
    // obligation because one client can have both calendar-year and fiscal-year work.
    taxYearType: text('tax_year_type', { enum: ['calendar', 'fiscal'] })
      .notNull()
      .default('calendar'),
    fiscalYearEndMonth: integer('fiscal_year_end_month'),
    fiscalYearEndDay: integer('fiscal_year_end_day'),
    // Tax return/reporting period that the authority deadline is based on.
    // For fiscal and short-year returns this is the CPA-facing source of truth.
    taxPeriodStart: integer('tax_period_start', { mode: 'timestamp_ms' }),
    taxPeriodEnd: integer('tax_period_end', { mode: 'timestamp_ms' }),
    taxPeriodKind: text('tax_period_kind', { enum: TAX_PERIOD_KINDS }).notNull().default('unknown'),
    taxPeriodSource: text('tax_period_source', { enum: TAX_PERIOD_SOURCES })
      .notNull()
      .default('unknown'),
    taxPeriodReviewReason: text('tax_period_review_reason'),
    ruleId: text('rule_id'),
    ruleVersion: integer('rule_version'),
    rulePeriod: text('rule_period'),
    generationSource: text('generation_source', {
      enum: ['migration', 'manual', 'annual_rollover', 'pulse'],
    }),
    jurisdiction: text('jurisdiction'),
    obligationType: text('obligation_type', { enum: OBLIGATION_TYPES }).notNull().default('filing'),
    formName: text('form_name'),
    authority: text('authority'),
    filingDueDate: integer('filing_due_date', { mode: 'timestamp_ms' }),
    paymentDueDate: integer('payment_due_date', { mode: 'timestamp_ms' }),
    sourceEvidenceJson: text('source_evidence_json', { mode: 'json' }).$type<unknown>(),
    recurrence: text('recurrence', { enum: OBLIGATION_RECURRENCES }).notNull().default('once'),
    riskLevel: text('risk_level', { enum: OBLIGATION_RISK_LEVELS }).notNull().default('low'),

    baseDueDate: integer('base_due_date', { mode: 'timestamp_ms' }).notNull(),
    currentDueDate: integer('current_due_date', { mode: 'timestamp_ms' }).notNull(),

    status: text('status', {
      enum: [
        'pending',
        'in_progress',
        'done',
        'extended',
        'paid',
        'waiting_on_client',
        'review',
        'not_applicable',
        // Lifecycle v2 additions (behind the ?lifecycle=v2 flag until migration).
        // See docs/Design/obligation-lifecycle-design-brief.md.
        'blocked',
        'completed',
      ],
    })
      .notNull()
      .default('pending'),
    // Annual-rollover lifecycle gate. Rolled-forward, auto-projected, and
    // pulse-generated next-year deadlines are written `confirmed=false` so they
    // surface in dashboards/calendar for planning but are withheld from the
    // client + internal reminder pipeline until a CPA confirms them. Every other
    // creation path (manual add, migration) leaves this at the default `true`.
    confirmed: integer('confirmed', { mode: 'boolean' }).notNull().default(true),
    // Lifecycle v2 (slice 2b): when status === 'blocked', this column
    // records *which other obligation* is blocking this one. Encodes
    // the K-1 dependency graph from PDF anti-pattern #4 — the
    // partnership 1065 that's holding up N partner 1040s. Auto-clears
    // when status transitions away from 'blocked'. Soft self-reference
    // (no FK constraint) — the upstream may belong to a different
    // firm in v3 (K-1 partners across practices).
    blockedByObligationInstanceId: text('blocked_by_obligation_instance_id'),
    extensionDecision: text('extension_decision', { enum: OBLIGATION_EXTENSION_DECISIONS })
      .notNull()
      .default('not_considered'),
    extensionMemo: text('extension_memo'),
    extensionSource: text('extension_source'),
    extensionExpectedDueDate: integer('extension_expected_due_date', { mode: 'timestamp_ms' }),
    extensionDecidedAt: integer('extension_decided_at', { mode: 'timestamp_ms' }),
    extensionDecidedByUserId: text('extension_decided_by_user_id'),
    extensionState: text('extension_state', { enum: OBLIGATION_EXTENSION_STATES })
      .notNull()
      .default('not_started'),
    extensionFormName: text('extension_form_name'),
    extensionFiledAt: integer('extension_filed_at', { mode: 'timestamp_ms' }),
    extensionAcceptedAt: integer('extension_accepted_at', { mode: 'timestamp_ms' }),

    prepStage: text('prep_stage', { enum: OBLIGATION_PREP_STAGES })
      .notNull()
      .default('not_started'),
    reviewStage: text('review_stage', { enum: OBLIGATION_REVIEW_STAGES })
      .notNull()
      .default('not_required'),
    reviewerUserId: text('reviewer_user_id').references(() => user.id, { onDelete: 'set null' }),
    reviewCompletedAt: integer('review_completed_at', { mode: 'timestamp_ms' }),
    paymentState: text('payment_state', { enum: OBLIGATION_PAYMENT_STATES })
      .notNull()
      .default('not_applicable'),
    paymentConfirmedAt: integer('payment_confirmed_at', { mode: 'timestamp_ms' }),
    efileState: text('efile_state', { enum: OBLIGATION_EFILE_STATES })
      .notNull()
      .default('not_applicable'),
    efileAuthorizationForm: text('efile_authorization_form'),
    efileSubmittedAt: integer('efile_submitted_at', { mode: 'timestamp_ms' }),
    efileAcceptedAt: integer('efile_accepted_at', { mode: 'timestamp_ms' }),
    efileRejectedAt: integer('efile_rejected_at', { mode: 'timestamp_ms' }),

    // 2026-06-08 (Pencil HuYeb /deadlines detail — per-deadline ownership +
    // snooze): `assigneeId` is resolved per-obligation and OVERRIDES the
    // client-level assignee (client.assignee_id) so a single return can be
    // handed to one preparer without reassigning the whole client. NULL falls
    // back to the client default. `snoozedUntil` defers the deadline from the
    // default queue view / needs-attention strip until the chosen date passes.
    assigneeId: text('assignee_id').references(() => user.id, { onDelete: 'set null' }),
    snoozedUntil: integer('snoozed_until', { mode: 'timestamp_ms' }),

    // Pinned-items affordance (/today "Pinned" section). When true the CPA
    // has manually starred this deadline so it surfaces in the dashboard's
    // Pinned section regardless of due window or assignee. Defaults to false;
    // a per-firm flag with no FK — it's a personal-workspace marker, not part
    // of the obligation's regulatory state.
    isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),

    // Nullable: rows created outside of a migration batch (manual add,
    // Pulse-apply in Phase 1 via exception) do not carry a batch id.
    migrationBatchId: text('migration_batch_id'),

    estimatedTaxDueCents: integer('estimated_tax_due_cents'),
    estimatedExposureCents: integer('estimated_exposure_cents'),
    exposureStatus: text('exposure_status', { enum: EXPOSURE_STATUSES })
      .notNull()
      .default('needs_input'),
    penaltyFactsJson: text('penalty_facts_json', { mode: 'json' }).$type<unknown>(),
    penaltyFactsVersion: text('penalty_facts_version'),
    penaltyBreakdownJson: text('penalty_breakdown_json', { mode: 'json' }).$type<unknown>(),
    penaltyFormulaVersion: text('penalty_formula_version'),
    missingPenaltyFactsJson: text('missing_penalty_facts_json', { mode: 'json' }).$type<unknown>(),
    penaltySourceRefsJson: text('penalty_source_refs_json', { mode: 'json' }).$type<unknown>(),
    penaltyFormulaLabel: text('penalty_formula_label'),
    exposureCalculatedAt: integer('exposure_calculated_at', { mode: 'timestamp_ms' }),

    // Soft-archive for rule-backed obligations. When a client is reclassified
    // (e.g. C->S election), obligations that no longer apply are SUPERSEDED, not
    // hard-deleted — preserving workflow state (status, prep/review, e-file,
    // extension, notes) and keeping the change reversible. `supersededAt` NULL =
    // active; active reads + the generation dedup feed filter on it.
    // `supersededByAuditId` is a SOFT pointer (no FK) to the
    // `client.obligations.reclassified` event — obligation_instance must not
    // depend on audit_event, which already references obligation_instance.
    supersededAt: integer('superseded_at', { mode: 'timestamp_ms' }),
    supersededReason: text('superseded_reason'),
    supersededByAuditId: text('superseded_by_audit_id'),

    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Dashboard tabs: This Week / This Month / All — scan by firm + status +
    // soonest due first.
    index('idx_oi_firm_status_due').on(table.firmId, table.status, table.currentDueDate),
    // Deadline Radar / Obligations triage: sort open obligations by exposure.
    index('idx_oi_firm_due_exposure').on(
      table.firmId,
      table.currentDueDate,
      table.exposureStatus,
      table.estimatedExposureCents,
    ),
    // Obligations P0 filters: tax form/type and dollar-at-risk range.
    index('idx_oi_firm_tax_type_due').on(table.firmId, table.taxType, table.currentDueDate),
    index('idx_oi_firm_exposure_amount').on(table.firmId, table.estimatedExposureCents),
    uniqueIndex('uq_oi_generated_rule_period')
      .on(
        table.firmId,
        table.clientId,
        table.jurisdiction,
        table.ruleId,
        table.taxYear,
        table.rulePeriod,
      )
      .where(
        sql`rule_id is not null and tax_year is not null and rule_period is not null and superseded_at is null`,
      ),
    index('idx_oi_firm_rule_tax_year').on(table.firmId, table.ruleId, table.taxYear),
    index('idx_oi_firm_jurisdiction_due').on(
      table.firmId,
      table.jurisdiction,
      table.currentDueDate,
    ),
    index('idx_oi_firm_type_due').on(table.firmId, table.obligationType, table.currentDueDate),
    index('idx_oi_firm_workflow').on(
      table.firmId,
      table.prepStage,
      table.reviewStage,
      table.paymentState,
      table.efileState,
    ),
    index('idx_oi_profile').on(table.clientFilingProfileId),
    // Client detail page drawer.
    index('idx_oi_client').on(table.clientId),
    // 24h revert path mirror of idx_client_batch.
    index('idx_oi_batch').on(table.migrationBatchId),
  ],
)

export const obligationDependency = sqliteTable(
  'obligation_dependency',
  {
    id: text('id').primaryKey(),
    firmId: text('firm_id')
      .notNull()
      .references(() => firmProfile.id, { onDelete: 'cascade' }),
    upstreamObligationId: text('upstream_obligation_id')
      .notNull()
      .references(() => obligationInstance.id, { onDelete: 'cascade' }),
    downstreamObligationId: text('downstream_obligation_id')
      .notNull()
      .references(() => obligationInstance.id, { onDelete: 'cascade' }),
    dependencyType: text('dependency_type', { enum: OBLIGATION_DEPENDENCY_TYPES })
      .notNull()
      .default('k1'),
    status: text('status', { enum: OBLIGATION_DEPENDENCY_STATUSES }).notNull().default('blocking'),
    sourceNote: text('source_note'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('uq_obligation_dependency_pair_type').on(
      table.firmId,
      table.upstreamObligationId,
      table.downstreamObligationId,
      table.dependencyType,
    ),
    index('idx_obligation_dependency_downstream').on(table.firmId, table.downstreamObligationId),
    index('idx_obligation_dependency_upstream').on(table.firmId, table.upstreamObligationId),
  ],
)

export const obligationReviewNote = sqliteTable(
  'obligation_review_note',
  {
    id: text('id').primaryKey(),
    firmId: text('firm_id')
      .notNull()
      .references(() => firmProfile.id, { onDelete: 'cascade' }),
    obligationInstanceId: text('obligation_instance_id')
      .notNull()
      .references(() => obligationInstance.id, { onDelete: 'cascade' }),
    authorUserId: text('author_user_id').references(() => user.id, { onDelete: 'set null' }),
    noteType: text('note_type', { enum: ['review_note', 'blocking_issue', 'override'] })
      .notNull()
      .default('review_note'),
    body: text('body').notNull(),
    resolvedAt: integer('resolved_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('idx_obligation_review_note_obligation').on(table.firmId, table.obligationInstanceId),
    index('idx_obligation_review_note_open').on(table.firmId, table.noteType, table.resolvedAt),
  ],
)

export const obligationInstanceRelations = relations(obligationInstance, ({ one }) => ({
  firm: one(firmProfile, {
    fields: [obligationInstance.firmId],
    references: [firmProfile.id],
  }),
  client: one(client, {
    fields: [obligationInstance.clientId],
    references: [client.id],
  }),
  filingProfile: one(clientFilingProfile, {
    fields: [obligationInstance.clientFilingProfileId],
    references: [clientFilingProfile.id],
  }),
}))

export type ObligationInstance = typeof obligationInstance.$inferSelect
export type NewObligationInstance = typeof obligationInstance.$inferInsert
export type ObligationDependency = typeof obligationDependency.$inferSelect
export type NewObligationDependency = typeof obligationDependency.$inferInsert
export type ObligationReviewNote = typeof obligationReviewNote.$inferSelect
export type NewObligationReviewNote = typeof obligationReviewNote.$inferInsert

export const OBLIGATION_STATUSES = [
  'pending',
  'in_progress',
  'done',
  'extended',
  'paid',
  'waiting_on_client',
  'review',
  'not_applicable',
  // Lifecycle v2 additions. See docs/Design/obligation-lifecycle-design-brief.md.
  'blocked',
  'completed',
] as const
export type ObligationStatus = (typeof OBLIGATION_STATUSES)[number]
