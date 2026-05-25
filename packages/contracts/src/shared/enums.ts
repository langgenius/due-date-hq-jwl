import * as z from 'zod'

// Entity type (PRD §6A · Default Matrix keys).
export const EntityTypeSchema = z.enum([
  'llc',
  's_corp',
  'partnership',
  'c_corp',
  'sole_prop',
  'trust',
  'individual',
  'other',
])
export type EntityType = z.infer<typeof EntityTypeSchema>

export const ClientLegalEntitySchema = z.enum([
  'individual',
  'sole_proprietorship',
  'single_member_llc',
  'multi_member_llc',
  'partnership',
  'corporation',
  'trust',
  'estate',
  'nonprofit',
  'foreign_entity',
  'other',
])
export type ClientLegalEntity = z.infer<typeof ClientLegalEntitySchema>

export const ClientTaxClassificationSchema = z.enum([
  'individual',
  'disregarded_entity',
  'partnership',
  's_corp',
  'c_corp',
  'trust',
  'estate',
  'nonprofit',
  'foreign_reporting_company',
  'unknown',
])
export type ClientTaxClassification = z.infer<typeof ClientTaxClassificationSchema>

export const ClientTaxYearTypeSchema = z.enum(['calendar', 'fiscal'])
export type ClientTaxYearType = z.infer<typeof ClientTaxYearTypeSchema>

export const TaxPeriodKindSchema = z.enum(['calendar', 'fiscal', 'short', '52_53_week', 'unknown'])
export type TaxPeriodKind = z.infer<typeof TaxPeriodKindSchema>

export const TaxPeriodSourceSchema = z.enum([
  'client_default',
  'prior_obligation',
  'migration',
  'manual_cpa_confirmed',
  'unknown',
])
export type TaxPeriodSource = z.infer<typeof TaxPeriodSourceSchema>

// US state code whitelist lives in packages/core/default-matrix.
export const StateCodeSchema = z.string().regex(/^[A-Z]{2}$/, {
  error: 'Expected 2-letter state code',
})
export type StateCode = z.infer<typeof StateCodeSchema>

// Obligation status (PRD §5.2).
// Lifecycle v2 (in flight): the queue is migrating to a 6-state model
// (not_started, waiting_on_client, blocked, in_review, filed, completed).
// `blocked` and `completed` are added below as non-breaking enum
// additions. Existing 8 values stay valid through the migration.
// See docs/Design/obligation-lifecycle-design-brief.md.
export const ObligationStatusSchema = z.enum([
  'pending',
  'in_progress',
  'done',
  'extended',
  'paid',
  'waiting_on_client',
  'review',
  'not_applicable',
  'blocked',
  'completed',
])
export type ObligationStatus = z.infer<typeof ObligationStatusSchema>

export const ObligationReadinessSchema = z.enum(['ready', 'waiting', 'needs_review'])
export type ObligationReadiness = z.infer<typeof ObligationReadinessSchema>

export const ObligationExtensionDecisionSchema = z.enum(['not_considered', 'applied', 'rejected'])
export type ObligationExtensionDecision = z.infer<typeof ObligationExtensionDecisionSchema>

export const ExposureStatusSchema = z.enum(['ready', 'needs_input', 'unsupported'])
export type ExposureStatus = z.infer<typeof ExposureStatusSchema>

export const ObligationTypeSchema = z.enum([
  'filing',
  'payment',
  'deposit',
  'information',
  'client_action',
  'internal_review',
])
export type ObligationType = z.infer<typeof ObligationTypeSchema>

export const ObligationRecurrenceSchema = z.enum([
  'once',
  'annual',
  'quarterly',
  'monthly',
  'semiweekly',
  'event_triggered',
])
export type ObligationRecurrence = z.infer<typeof ObligationRecurrenceSchema>

export const ObligationRiskLevelSchema = z.enum(['low', 'med', 'high'])
export type ObligationRiskLevel = z.infer<typeof ObligationRiskLevelSchema>

export const ObligationPrepStageSchema = z.enum([
  'not_started',
  'waiting_on_client',
  'waiting_on_third_party',
  'bookkeeping_cleanup',
  'ready_for_prep',
  'in_prep',
  'prepared',
])
export type ObligationPrepStage = z.infer<typeof ObligationPrepStageSchema>

export const ObligationReviewStageSchema = z.enum([
  'not_required',
  'ready_for_review',
  'in_review',
  'notes_open',
  'approved',
  'overridden',
])
export type ObligationReviewStage = z.infer<typeof ObligationReviewStageSchema>

export const ObligationExtensionStateSchema = z.enum([
  'not_applicable',
  'not_started',
  'estimate_needed',
  'client_approval_needed',
  'ready_to_file',
  'filed',
  'accepted',
  'rejected',
])
export type ObligationExtensionState = z.infer<typeof ObligationExtensionStateSchema>

export const ObligationPaymentStateSchema = z.enum([
  'not_applicable',
  'estimate_needed',
  'client_approval_needed',
  'scheduled',
  'confirmed',
])
export type ObligationPaymentState = z.infer<typeof ObligationPaymentStateSchema>

export const ObligationEfileStateSchema = z.enum([
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
])
export type ObligationEfileState = z.infer<typeof ObligationEfileStateSchema>
