import { oc } from '@orpc/contract'
import * as z from 'zod'
import { EntityTypeSchema, ObligationStatusSchema, StateCodeSchema } from './shared/enums'
import { EntityIdSchema } from './shared/ids'

export const PulseStatusSchema = z.enum([
  'pending_review',
  'approved',
  'rejected',
  'quarantined',
  'source_revoked',
])
export type PulseStatus = z.infer<typeof PulseStatusSchema>

export const PulseFirmAlertStatusSchema = z.enum([
  'matched',
  'dismissed',
  'snoozed',
  'partially_applied',
  'applied',
  'reverted',
  'reviewed',
])
export type PulseFirmAlertStatus = z.infer<typeof PulseFirmAlertStatusSchema>

export const PulseHandledFirmAlertStatusSchema = z.enum([
  'dismissed',
  'snoozed',
  'partially_applied',
  'applied',
  'reverted',
  'reviewed',
])
export type PulseHandledFirmAlertStatus = z.infer<typeof PulseHandledFirmAlertStatusSchema>

export const PulseChangeKindSchema = z.enum([
  'deadline_shift',
  'filing_requirement',
  'applicability_scope',
  'form_instruction',
  'source_status',
  'rule_source_drift',
  'new_obligation',
  // Deterministic-only (no AI) — annual IRS inflation Rev. Proc. pointer
  // advisory (review_only, no asserted dollar amounts). Mirrors the DB
  // enum in @duedatehq/db PULSE_CHANGE_KINDS.
  'threshold_advisory',
  'other',
])
export type PulseChangeKind = z.infer<typeof PulseChangeKindSchema>

export const PulseActionModeSchema = z.enum(['due_date_overlay', 'review_only'])
export type PulseActionMode = z.infer<typeof PulseActionModeSchema>

export const PulseFirmImpactSchema = z.enum([
  'matched',
  'needs_review',
  'no_current_match',
  'review_only',
])
export type PulseFirmImpact = z.infer<typeof PulseFirmImpactSchema>

export const PulseSourceHealthStatusSchema = z.enum(['healthy', 'degraded', 'failing', 'paused'])
export type PulseSourceHealthStatus = z.infer<typeof PulseSourceHealthStatusSchema>

export const PulseAffectedClientStatusSchema = z.enum([
  'eligible',
  'needs_review',
  'already_applied',
  'reverted',
])
export type PulseAffectedClientStatus = z.infer<typeof PulseAffectedClientStatusSchema>

export const PulsePriorityReviewStatusSchema = z.enum(['open', 'reviewed', 'applied', 'dismissed'])
export type PulsePriorityReviewStatus = z.infer<typeof PulsePriorityReviewStatusSchema>

export const PulsePriorityLevelSchema = z.enum(['normal', 'high', 'urgent'])
export type PulsePriorityLevel = z.infer<typeof PulsePriorityLevelSchema>

export const PulseApplyReadinessStatusSchema = z.enum(['ready', 'needs_details', 'not_applicable'])
export type PulseApplyReadinessStatus = z.infer<typeof PulseApplyReadinessStatusSchema>

export const PulseApplyReadinessMissingSchema = z.enum([
  'original_due_date',
  'new_due_date',
  'forms',
  'entity_types',
  'affected_clients',
])
export type PulseApplyReadinessMissing = z.infer<typeof PulseApplyReadinessMissingSchema>

export const PulseApplyReadinessSchema = z.object({
  status: PulseApplyReadinessStatusSchema,
  missing: z.array(PulseApplyReadinessMissingSchema),
})
export type PulseApplyReadiness = z.infer<typeof PulseApplyReadinessSchema>

export const PulseJurisdictionSchema = z.union([z.literal('FED'), StateCodeSchema])
export type PulseJurisdiction = z.infer<typeof PulseJurisdictionSchema>

export const PulsePriorityReasonKeySchema = z.enum([
  'preparer_requested',
  'needs_review_matches',
  'low_confidence',
  'high_impact',
  'source_attention',
])
export type PulsePriorityReasonKey = z.infer<typeof PulsePriorityReasonKeySchema>

export const PulsePriorityReasonSchema = z.object({
  key: PulsePriorityReasonKeySchema,
  points: z.number().int().min(0),
  label: z.string().min(1),
})
export type PulsePriorityReason = z.infer<typeof PulsePriorityReasonSchema>

export const PulseAlertPublicSchema = z.object({
  id: EntityIdSchema,
  pulseId: EntityIdSchema,
  status: PulseFirmAlertStatusSchema,
  sourceStatus: PulseStatusSchema,
  changeKind: PulseChangeKindSchema,
  actionMode: PulseActionModeSchema,
  firmImpact: PulseFirmImpactSchema,
  title: z.string().min(1),
  source: z.string().min(1),
  sourceUrl: z.url(),
  summary: z.string().min(1),
  publishedAt: z.iso.datetime(),
  matchedCount: z.number().int().min(0),
  needsReviewCount: z.number().int().min(0),
  applyReadiness: PulseApplyReadinessSchema,
  duplicateSourceSnapshotCount: z.number().int().min(0),
  confidence: z.number().min(0).max(1),
  isSample: z.boolean(),
  // 2026-05-25 (Yuqi Alerts #9): jurisdiction now
  // travels with each list-item alert so the alerts list page can
  // filter / group / map without an N+1 detail fetch. The
  // value mirrors `PulseDetail.jurisdiction` — same underlying
  // `pulse.parsedJurisdiction` column in the DB. It accepts `FED`
  // plus state/DC codes because federal policy-watch and federal
  // obligation alerts are first-class Pulse rows.
  jurisdiction: PulseJurisdictionSchema,
})
export type PulseAlertPublic = z.infer<typeof PulseAlertPublicSchema>

export const PulseAffectedClientSchema = z.object({
  obligationId: EntityIdSchema,
  clientId: EntityIdSchema,
  clientName: z.string().min(1),
  state: PulseJurisdictionSchema.nullable(),
  county: z.string().nullable(),
  entityType: EntityTypeSchema,
  taxType: z.string().min(1),
  currentDueDate: z.iso.date(),
  newDueDate: z.iso.date().nullable(),
  status: ObligationStatusSchema,
  matchStatus: PulseAffectedClientStatusSchema,
  reason: z.string().nullable(),
})
export type PulseAffectedClient = z.infer<typeof PulseAffectedClientSchema>

export const PulseDetailSchema = z.object({
  alert: PulseAlertPublicSchema,
  jurisdiction: PulseJurisdictionSchema,
  counties: z.array(z.string()),
  forms: z.array(z.string()),
  entityTypes: z.array(EntityTypeSchema),
  originalDueDate: z.iso.date().nullable(),
  newDueDate: z.iso.date().nullable(),
  effectiveFrom: z.iso.date().nullable(),
  effectiveUntil: z.iso.date().nullable(),
  affectedRuleIds: z.array(z.string()),
  // Deterministic source-cite join: rules whose cited source changed and that
  // the CPA should re-verify from this alert. Empty for ordinary alerts.
  reverifyRuleIds: z.array(z.string()),
  structuredChange: z.unknown().nullable(),
  sourceExcerpt: z.string().min(1),
  reviewedAt: z.iso.datetime().nullable(),
  applyReadiness: PulseApplyReadinessSchema,
  affectedClients: z.array(PulseAffectedClientSchema),
})
export type PulseDetail = z.infer<typeof PulseDetailSchema>

export const PulsePriorityReviewSchema = z.object({
  id: EntityIdSchema,
  alertId: EntityIdSchema,
  pulseId: EntityIdSchema,
  status: PulsePriorityReviewStatusSchema,
  priorityScore: z.number().int().min(0),
  priorityReasons: z.array(PulsePriorityReasonSchema),
  selectedObligationIds: z.array(EntityIdSchema),
  confirmedObligationIds: z.array(EntityIdSchema),
  excludedObligationIds: z.array(EntityIdSchema),
  note: z.string().nullable(),
  requestedBy: z.string().min(1).nullable(),
  reviewedBy: z.string().min(1).nullable(),
  reviewedAt: z.iso.datetime().nullable(),
})
export type PulsePriorityReview = z.infer<typeof PulsePriorityReviewSchema>

export const PulsePriorityQueueItemSchema = z.object({
  alert: PulseAlertPublicSchema,
  level: PulsePriorityLevelSchema,
  priorityScore: z.number().int().min(0),
  priorityReasons: z.array(PulsePriorityReasonSchema),
  review: PulsePriorityReviewSchema.nullable(),
})
export type PulsePriorityQueueItem = z.infer<typeof PulsePriorityQueueItemSchema>

export const PulseListAlertsInputSchema = z
  .object({
    limit: z.number().int().min(1).max(50).default(5).optional(),
    // Opaque keyset cursor (publishedAt|id, base64url) for "Load more"
    // pagination — null/absent fetches the first page. Optional (not
    // `.default`) so the existing input shape parses unchanged.
    cursor: z.string().nullable().optional(),
  })
  .optional()
export type PulseListAlertsInput = z.infer<typeof PulseListAlertsInputSchema>

export const PulseListHistoryInputSchema = z
  .object({
    limit: z.number().int().min(1).max(100).default(20).optional(),
    status: PulseHandledFirmAlertStatusSchema.optional(),
    cursor: z.string().nullable().optional(),
  })
  .optional()
export type PulseListHistoryInput = z.infer<typeof PulseListHistoryInputSchema>

export const PulseListPriorityQueueInputSchema = z
  .object({
    limit: z.number().int().min(1).max(100).default(50).optional(),
  })
  .optional()
export type PulseListPriorityQueueInput = z.infer<typeof PulseListPriorityQueueInputSchema>

export const PulseSourceHealthSchema = z.object({
  sourceId: z.string().min(1),
  label: z.string().min(1),
  tier: z.enum(['T1', 'T2', 'T3']),
  jurisdiction: z.string().min(1),
  purpose: z
    .enum([
      'explicit_live_adapter',
      'temporary_announcements_or_news',
      'rule_source_watch',
      'email_signal',
      'hidden_policy_watch',
    ])
    .optional(),
  primaryWeb: z.boolean().optional(),
  relatedSourceIds: z.array(z.string().min(1)).optional(),
  enabled: z.boolean(),
  healthStatus: PulseSourceHealthStatusSchema,
  lastCheckedAt: z.iso.datetime().nullable(),
  lastSuccessAt: z.iso.datetime().nullable(),
  nextCheckAt: z.iso.datetime().nullable(),
  consecutiveFailures: z.number().int().min(0),
  lastError: z.string().nullable(),
})
export type PulseSourceHealth = z.infer<typeof PulseSourceHealthSchema>

export const PulseAlertSourceCoverageRoleSchema = z.enum([
  'primary_web_news',
  'guidance_notice',
  'email_signal',
  'rule_source_watch',
  'tax_type_sources',
  'relief_or_disaster_signal',
  'multi_agency_sources',
])
export type PulseAlertSourceCoverageRole = z.infer<typeof PulseAlertSourceCoverageRoleSchema>

export const PulseAlertSourceCoverageRoleStatusSchema = z.enum([
  'covered',
  'missing',
  'not_available_verified',
])
export type PulseAlertSourceCoverageRoleStatus = z.infer<
  typeof PulseAlertSourceCoverageRoleStatusSchema
>

export const PulseAlertSourceCoverageRoleDetailSchema = z.object({
  role: PulseAlertSourceCoverageRoleSchema,
  status: PulseAlertSourceCoverageRoleStatusSchema,
  sourceIds: z.array(z.string().min(1)),
  reason: z.string().nullable(),
})
export type PulseAlertSourceCoverageRoleDetail = z.infer<
  typeof PulseAlertSourceCoverageRoleDetailSchema
>

export const PulseAlertSourceCoverageSchema = z.object({
  jurisdiction: z.string().min(1),
  status: z.enum(['covered', 'missing_source']),
  coverageLevel: z.enum(['missing', 'standard', 'comprehensive']),
  parserStatus: z.enum(['web_primary', 'email_signal_only', 'missing_source']),
  requiredRoles: z.array(PulseAlertSourceCoverageRoleSchema),
  coveredRoles: z.array(PulseAlertSourceCoverageRoleSchema),
  missingRoles: z.array(PulseAlertSourceCoverageRoleSchema),
  roleDetails: z.array(PulseAlertSourceCoverageRoleDetailSchema),
  explicitLiveSourceIds: z.array(z.string().min(1)),
  primaryWebSourceIds: z.array(z.string().min(1)),
  emailSignalSourceIds: z.array(z.string().min(1)),
  ruleSourceWatchIds: z.array(z.string().min(1)),
  guidanceNoticeSourceIds: z.array(z.string().min(1)),
  taxTypeSourceIds: z.array(z.string().min(1)),
  reliefOrDisasterSourceIds: z.array(z.string().min(1)),
  multiAgencySourceIds: z.array(z.string().min(1)),
  sourceIds: z.array(z.string().min(1)),
  lastCheckedAt: z.iso.datetime().nullable(),
  lastSuccessAt: z.iso.datetime().nullable(),
  lastFailureAt: z.iso.datetime().nullable(),
  lastError: z.string().nullable(),
  missingReason: z.string().nullable(),
})
export type PulseAlertSourceCoverage = z.infer<typeof PulseAlertSourceCoverageSchema>

export const PulseAlertIdInputSchema = z.object({ alertId: EntityIdSchema })
export const PulseSourceHealthInputSchema = z.object({ sourceId: z.string().min(1) })
export type PulseSourceHealthInput = z.infer<typeof PulseSourceHealthInputSchema>

export const PulseApplyInputSchema = z.object({
  alertId: EntityIdSchema,
  obligationIds: z.array(EntityIdSchema).min(1).max(100),
  confirmedObligationIds: z.array(EntityIdSchema).max(100).default([]).optional(),
})
export type PulseApplyInput = z.infer<typeof PulseApplyInputSchema>

export const PulseSnoozeInputSchema = z.object({
  alertId: EntityIdSchema,
  until: z.iso.datetime(),
  reason: z.string().trim().min(1).max(500).optional(),
})
export type PulseSnoozeInput = z.infer<typeof PulseSnoozeInputSchema>

export const PulseDismissInputSchema = z.object({
  alertId: EntityIdSchema,
  reason: z.string().trim().min(1).max(500).optional(),
})
export type PulseDismissInput = z.infer<typeof PulseDismissInputSchema>

export const PulseMarkReviewedInputSchema = PulseDismissInputSchema
export type PulseMarkReviewedInput = z.infer<typeof PulseMarkReviewedInputSchema>

export const PulseRequestReviewInputSchema = z.object({
  alertId: EntityIdSchema,
  note: z.string().trim().max(500).optional(),
})
export type PulseRequestReviewInput = z.infer<typeof PulseRequestReviewInputSchema>

export const PulseReviewPriorityMatchesInputSchema = z.object({
  alertId: EntityIdSchema,
  selectedObligationIds: z.array(EntityIdSchema).min(1).max(100),
  confirmedObligationIds: z.array(EntityIdSchema).max(100).default([]).optional(),
  excludedObligationIds: z.array(EntityIdSchema).max(100).default([]).optional(),
  note: z.string().trim().max(500).nullable().optional(),
})
export type PulseReviewPriorityMatchesInput = z.infer<typeof PulseReviewPriorityMatchesInputSchema>

export const PulseReviewDueDateOverlayDetailsInputSchema = z.object({
  alertId: EntityIdSchema,
  newDueDate: z.iso.date(),
  selectedObligationIds: z.array(EntityIdSchema).min(1).max(100),
  confirmedObligationIds: z.array(EntityIdSchema).max(100).default([]).optional(),
  excludedObligationIds: z.array(EntityIdSchema).max(100).default([]).optional(),
  note: z.string().trim().max(500).optional(),
})
export type PulseReviewDueDateOverlayDetailsInput = z.infer<
  typeof PulseReviewDueDateOverlayDetailsInputSchema
>

export const PulseApplyOutputSchema = z.object({
  alert: PulseAlertPublicSchema,
  appliedCount: z.number().int().min(0),
  auditIds: z.array(EntityIdSchema),
  evidenceIds: z.array(EntityIdSchema),
  applicationIds: z.array(EntityIdSchema),
  emailOutboxId: EntityIdSchema,
  revertExpiresAt: z.iso.datetime(),
})
export type PulseApplyOutput = z.infer<typeof PulseApplyOutputSchema>

export const PulseDismissOutputSchema = z.object({
  alert: PulseAlertPublicSchema,
  auditId: EntityIdSchema,
})
export type PulseDismissOutput = z.infer<typeof PulseDismissOutputSchema>

export const PulseSnoozeOutputSchema = PulseDismissOutputSchema
export type PulseSnoozeOutput = z.infer<typeof PulseSnoozeOutputSchema>

export const PulseReactivateOutputSchema = PulseDismissOutputSchema
export type PulseReactivateOutput = z.infer<typeof PulseReactivateOutputSchema>

export const PulseMarkReviewedOutputSchema = PulseDismissOutputSchema
export type PulseMarkReviewedOutput = z.infer<typeof PulseMarkReviewedOutputSchema>

export const PulseRevertOutputSchema = z.object({
  alert: PulseAlertPublicSchema,
  revertedCount: z.number().int().min(0),
  auditIds: z.array(EntityIdSchema),
  evidenceIds: z.array(EntityIdSchema),
})
export type PulseRevertOutput = z.infer<typeof PulseRevertOutputSchema>

export const PulseRequestReviewOutputSchema = z.object({
  notificationCount: z.number().int().min(0),
  emailCount: z.number().int().min(0),
  auditId: EntityIdSchema,
})
export type PulseRequestReviewOutput = z.infer<typeof PulseRequestReviewOutputSchema>

// Why a pulse matched a specific rule, surfaced in the rule-review dialog:
//  - affected_rule: the rule is named in the pulse's AI-guessed affectedRuleIds
//  - reverify_rule: the rule cites the changed source (deterministic join)
//  - scope: the rule falls in the pulse's jurisdiction + form scope
export const PulseRuleMatchReasonSchema = z.enum(['affected_rule', 'reverify_rule', 'scope'])
export type PulseRuleMatchReason = z.infer<typeof PulseRuleMatchReasonSchema>

// One approved pulse that affects the rule open in the review dialog. Carries
// the alert's public metadata plus the detail-level date diff + excerpt so the
// dialog can render an additive "proposed change" block (it never replaces the
// catalog evidence/date) with a deep-link to /alerts?alert=<alert.id>.
export const PulseRuleMatchSchema = z.object({
  alert: PulseAlertPublicSchema,
  originalDueDate: z.iso.date().nullable(),
  newDueDate: z.iso.date().nullable(),
  effectiveFrom: z.iso.date().nullable(),
  effectiveUntil: z.iso.date().nullable(),
  sourceExcerpt: z.string().nullable(),
  matchReason: PulseRuleMatchReasonSchema,
})
export type PulseRuleMatch = z.infer<typeof PulseRuleMatchSchema>

export const PulseListAlertsForRuleInputSchema = z.object({
  ruleId: z.string().min(1),
  // Plain string (not PulseJurisdictionSchema): it is only a match key against
  // pulse.parsedJurisdiction, and the caller passes the rule's own jurisdiction
  // (RuleJurisdiction is a broader enum than PulseJurisdiction).
  jurisdiction: z.string().min(1),
  taxType: z.string().min(1),
  formName: z.string().min(1).nullable().optional(),
})
export type PulseListAlertsForRuleInput = z.infer<typeof PulseListAlertsForRuleInputSchema>

export const pulseContract = oc.router({
  // Pulses (approved, still-active) that affect a specific rule. Backs the
  // rule-review dialog's "proposed change" block. Lazy, per-rule (the dialog
  // opens one rule at a time) — mirrors the existing previewRuleImpact query.
  listAlertsForRule: oc
    .input(PulseListAlertsForRuleInputSchema)
    .output(z.object({ matches: z.array(PulseRuleMatchSchema) })),
  listAlerts: oc.input(PulseListAlertsInputSchema).output(
    z.object({
      alerts: z.array(PulseAlertPublicSchema),
      // Pass to the next `listAlerts` call's `cursor` to fetch the
      // following page; null when the active queue is fully loaded.
      nextCursor: z.string().nullable(),
    }),
  ),
  /**
   * Count-only variant of `listAlerts` for the sidebar nav badge.
   *
   * The list endpoint clamps to a 50-row max, so a firm with more
   * than 50 active alerts saw "50" in the sidebar badge even though
   * the real count was higher. This endpoint runs a true COUNT(*)
   * against the same WHERE clause `listAlerts` uses, so the badge
   * always shows the true number with no upper bound.
   */
  activeCount: oc.input(z.undefined()).output(z.object({ count: z.number().int().min(0) })),
  listHistory: oc.input(PulseListHistoryInputSchema).output(
    z.object({
      alerts: z.array(PulseAlertPublicSchema),
      nextCursor: z.string().nullable(),
    }),
  ),
  listSourceHealth: oc
    .input(z.undefined())
    .output(z.object({ sources: z.array(PulseSourceHealthSchema) })),
  listAlertSourceCoverage: oc
    .input(z.undefined())
    .output(z.object({ coverage: z.array(PulseAlertSourceCoverageSchema) })),
  retrySourceHealth: oc
    .input(PulseSourceHealthInputSchema)
    .output(z.object({ sources: z.array(PulseSourceHealthSchema) })),
  getDetail: oc.input(PulseAlertIdInputSchema).output(PulseDetailSchema),
  // Batch counterpart to `getDetail` — fetch many alert detail rows in
  // one round-trip. Used by surfaces that need to surface per-client
  // pulse matches (e.g. /clients list, /clients/[id] active-alerts
  // section) and would otherwise fan out into one query per alert.
  // Missing/unauthorized alerts are silently skipped — the caller
  // identifies absences by comparing the returned `details[].alert.id`
  // set with the request.
  getDetailsBatch: oc
    .input(z.object({ alertIds: z.array(EntityIdSchema).max(100) }))
    .output(z.object({ details: z.array(PulseDetailSchema) })),
  listPriorityQueue: oc
    .input(PulseListPriorityQueueInputSchema)
    .output(z.object({ items: z.array(PulsePriorityQueueItemSchema) })),
  reviewPriorityMatches: oc
    .input(PulseReviewPriorityMatchesInputSchema)
    .output(PulsePriorityReviewSchema),
  reviewDueDateOverlayDetails: oc
    .input(PulseReviewDueDateOverlayDetailsInputSchema)
    .output(PulseDetailSchema),
  applyReviewed: oc.input(PulseAlertIdInputSchema).output(PulseApplyOutputSchema),
  apply: oc.input(PulseApplyInputSchema).output(PulseApplyOutputSchema),
  dismiss: oc.input(PulseDismissInputSchema).output(PulseDismissOutputSchema),
  snooze: oc.input(PulseSnoozeInputSchema).output(PulseSnoozeOutputSchema),
  markReviewed: oc.input(PulseMarkReviewedInputSchema).output(PulseMarkReviewedOutputSchema),
  revert: oc.input(PulseAlertIdInputSchema).output(PulseRevertOutputSchema),
  reactivate: oc.input(PulseAlertIdInputSchema).output(PulseReactivateOutputSchema),
  requestReview: oc.input(PulseRequestReviewInputSchema).output(PulseRequestReviewOutputSchema),
})
export type PulseContract = typeof pulseContract
