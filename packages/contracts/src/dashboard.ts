import { oc } from '@orpc/contract'
import * as z from 'zod'
import { EvidencePublicSchema } from './evidence'
import { PenaltyBreakdownItemSchema, PenaltySourceRefSchema } from './obligations'
import { SmartPriorityBreakdownSchema } from './priority'
import { ExposureStatusSchema, ObligationStatusSchema, ObligationTypeSchema } from './shared/enums'
import { EntityIdSchema } from './shared/ids'

export const DASHBOARD_FILTER_MAX_SELECTIONS = 16
export const DASHBOARD_FILTER_VALUE_MAX_LENGTH = 120

const DashboardFilterValueSchema = z.string().trim().min(1).max(DASHBOARD_FILTER_VALUE_MAX_LENGTH)

export const DashboardSeveritySchema = z.enum(['critical', 'high', 'medium', 'neutral'])
export type DashboardSeverity = z.infer<typeof DashboardSeveritySchema>

export const DashboardTriageTabKeySchema = z.enum(['this_week', 'this_month', 'long_term'])
export type DashboardTriageTabKey = z.infer<typeof DashboardTriageTabKeySchema>

export const DashboardDueBucketSchema = z.enum([
  'overdue',
  'today',
  'next_7_days',
  'next_30_days',
  'long_term',
])
export type DashboardDueBucket = z.infer<typeof DashboardDueBucketSchema>

export const DashboardEvidenceFilterSchema = z.enum(['needs', 'linked'])
export type DashboardEvidenceFilter = z.infer<typeof DashboardEvidenceFilterSchema>

export const DashboardBriefStatusSchema = z.enum(['pending', 'ready', 'failed', 'stale'])
export type DashboardBriefStatus = z.infer<typeof DashboardBriefStatusSchema>

export const DashboardBriefScopeSchema = z.enum(['firm', 'me'])
export type DashboardBriefScope = z.infer<typeof DashboardBriefScopeSchema>

export const DashboardBriefCitationEvidenceSchema = z
  .object({
    id: EntityIdSchema.nullable(),
    sourceType: z.string().min(1),
    sourceId: z.string().nullable(),
    sourceUrl: z.string().nullable(),
  })
  .nullable()
export type DashboardBriefCitationEvidence = z.infer<typeof DashboardBriefCitationEvidenceSchema>

export const DashboardBriefCitationSchema = z.object({
  ref: z.number().int().min(1),
  obligationId: EntityIdSchema,
  evidence: DashboardBriefCitationEvidenceSchema,
})
export type DashboardBriefCitation = z.infer<typeof DashboardBriefCitationSchema>

export const DashboardBriefCitationsSchema = z.array(DashboardBriefCitationSchema)
export type DashboardBriefCitations = z.infer<typeof DashboardBriefCitationsSchema>

export const DashboardLoadInputSchema = z
  .object({
    asOfDate: z.iso.date().optional(),
    windowDays: z.number().int().min(1).max(31).default(7).optional(),
    topLimit: z.number().int().min(1).max(20).default(8).optional(),
    briefScope: DashboardBriefScopeSchema.default('firm').optional(),
    clientIds: z.array(EntityIdSchema).max(DASHBOARD_FILTER_MAX_SELECTIONS).optional(),
    taxTypes: z.array(DashboardFilterValueSchema).max(DASHBOARD_FILTER_MAX_SELECTIONS).optional(),
    dueBuckets: z
      .array(DashboardDueBucketSchema)
      .max(DashboardDueBucketSchema.options.length)
      .optional(),
    status: z.array(ObligationStatusSchema).max(8).optional(),
    severity: z
      .array(DashboardSeveritySchema)
      .max(DashboardSeveritySchema.options.length)
      .optional(),
    evidence: z
      .array(DashboardEvidenceFilterSchema)
      .max(DashboardEvidenceFilterSchema.options.length)
      .optional(),
  })
  .optional()
export type DashboardLoadInput = z.infer<typeof DashboardLoadInputSchema>

export const DashboardSummarySchema = z.object({
  openObligationCount: z.number().int().min(0),
  dueThisWeekCount: z.number().int().min(0),
  needsReviewCount: z.number().int().min(0),
  evidenceGapCount: z.number().int().min(0),
  totalAccruedPenaltyCents: z.number().int().min(0),
  accruedPenaltyReadyCount: z.number().int().min(0),
  accruedPenaltyNeedsInputCount: z.number().int().min(0),
  accruedPenaltyUnsupportedCount: z.number().int().min(0),
})
export type DashboardSummary = z.infer<typeof DashboardSummarySchema>

export const DashboardTopRowSchema = z.object({
  obligationId: EntityIdSchema,
  clientId: EntityIdSchema,
  clientName: z.string().min(1),
  clientEmail: z.email().nullable(),
  taxType: z.string().min(1),
  // 2026-06-03 (Yuqi /critique pass — Reviewer panel finding P0
  // "FORM column lies for 3 of 6 types"): obligation type threaded
  // through so the dashboard ActionsTable can render a TYPE column
  // (icon + 1-word label) distinguishing return / payment / deposit
  // / information / client_action / internal_review without inferring
  // from the taxType string. DB enum value is `'filing'` for tax
  // return submissions (canonical PDF §3.1); the UI label "Return"
  // is rendered via `useObligationTypeLabels()`.
  obligationType: ObligationTypeSchema,
  currentDueDate: z.iso.date(),
  // 2026-05-27 (D12 — Agent ω / journey audit): payment due date,
  // populated from the underlying obligation. Lets dashboard surfaces
  // detect filed-but-payment-overdue rows (anti-pattern #1: filing
  // extension ≠ payment extension) so the "Needs attention" cluster
  // can render a "Payment N days late" chip on rows whose filing is
  // done but whose payment is still outstanding. Optional/nullable
  // because not every obligation has a payment side (e.g. info-only
  // filings).
  paymentDueDate: z.iso.date().nullable(),
  status: ObligationStatusSchema,
  missingPenaltyFacts: z.array(z.string().min(1)),
  penaltySourceRefs: z.array(PenaltySourceRefSchema),
  penaltyFormulaLabel: z.string().nullable(),
  penaltyFactsVersion: z.string().nullable(),
  accruedPenaltyCents: z.number().int().min(0).nullable(),
  accruedPenaltyStatus: ExposureStatusSchema,
  accruedPenaltyBreakdown: z.array(PenaltyBreakdownItemSchema),
  penaltyAsOfDate: z.iso.date(),
  penaltyFormulaVersion: z.string().nullable(),
  severity: DashboardSeveritySchema,
  evidenceCount: z.number().int().min(0),
  primaryEvidence: EvidencePublicSchema.nullable(),
  smartPriority: SmartPriorityBreakdownSchema,
})
export type DashboardTopRow = z.infer<typeof DashboardTopRowSchema>

export const DashboardTriageTabSchema = z.object({
  key: DashboardTriageTabKeySchema,
  label: z.string().min(1),
  count: z.number().int().min(0),
  rows: z.array(DashboardTopRowSchema),
})
export type DashboardTriageTab = z.infer<typeof DashboardTriageTabSchema>

export const DashboardFacetOptionSchema = z.object({
  value: DashboardFilterValueSchema,
  label: z.string().trim().min(1).max(160),
  count: z.number().int().min(0),
})
export type DashboardFacetOption = z.infer<typeof DashboardFacetOptionSchema>

export const DashboardClientFacetOptionSchema = DashboardFacetOptionSchema.extend({
  value: EntityIdSchema,
})
export type DashboardClientFacetOption = z.infer<typeof DashboardClientFacetOptionSchema>

export const DashboardFacetsOutputSchema = z.object({
  clients: z.array(DashboardClientFacetOptionSchema),
  taxTypes: z.array(DashboardFacetOptionSchema),
  dueBuckets: z.array(DashboardFacetOptionSchema.extend({ value: DashboardDueBucketSchema })),
  statuses: z.array(DashboardFacetOptionSchema.extend({ value: ObligationStatusSchema })),
  severities: z.array(DashboardFacetOptionSchema.extend({ value: DashboardSeveritySchema })),
  evidence: z.array(DashboardFacetOptionSchema.extend({ value: DashboardEvidenceFilterSchema })),
})
export type DashboardFacetsOutput = z.infer<typeof DashboardFacetsOutputSchema>

export const DashboardBriefPublicSchema = z.object({
  status: DashboardBriefStatusSchema,
  generatedAt: z.iso.datetime().nullable(),
  expiresAt: z.iso.datetime().nullable(),
  text: z.string().nullable(),
  citations: DashboardBriefCitationsSchema.nullable(),
  aiOutputId: EntityIdSchema.nullable(),
  errorCode: z.string().nullable(),
})
export type DashboardBriefPublic = z.infer<typeof DashboardBriefPublicSchema>

export const DashboardLoadOutputSchema = z.object({
  asOfDate: z.iso.date(),
  windowDays: z.number().int().min(1),
  summary: DashboardSummarySchema,
  topRows: z.array(DashboardTopRowSchema),
  triageTabs: z.array(DashboardTriageTabSchema),
  facets: DashboardFacetsOutputSchema,
  brief: DashboardBriefPublicSchema.nullable(),
})
export type DashboardLoadOutput = z.infer<typeof DashboardLoadOutputSchema>

export const DashboardRequestBriefRefreshInputSchema = z
  .object({
    scope: DashboardBriefScopeSchema.default('firm').optional(),
  })
  .optional()
export type DashboardRequestBriefRefreshInput = z.infer<
  typeof DashboardRequestBriefRefreshInputSchema
>

export const DashboardRequestBriefRefreshOutputSchema = z.object({
  queued: z.boolean(),
  brief: DashboardBriefPublicSchema.nullable(),
})
export type DashboardRequestBriefRefreshOutput = z.infer<
  typeof DashboardRequestBriefRefreshOutputSchema
>

export const dashboardContract = oc.router({
  load: oc.input(DashboardLoadInputSchema).output(DashboardLoadOutputSchema),
  requestBriefRefresh: oc
    .input(DashboardRequestBriefRefreshInputSchema)
    .output(DashboardRequestBriefRefreshOutputSchema),
})
export type DashboardContract = typeof dashboardContract
