import { oc } from '@orpc/contract'
import * as z from 'zod'
import { AiInsightPublicSchema } from './ai-insights'
import {
  ObligationInstancePublicSchema,
  PenaltyBreakdownItemSchema,
  PenaltySourceRefSchema,
} from './obligation-instance'
import { obligationQueueContract } from './obligation-queue'
import { ObligationGenerationPreviewSchema } from './rules'
import {
  ExposureStatusSchema,
  ObligationEfileStateSchema,
  ObligationExtensionStateSchema,
  ObligationPaymentStateSchema,
  ObligationPrepStageSchema,
  ObligationRecurrenceSchema,
  ObligationReviewStageSchema,
  ObligationRiskLevelSchema,
  ObligationStatusSchema,
  ClientTaxYearTypeSchema,
  TaxPeriodKindSchema,
  TaxPeriodSourceSchema,
  ObligationTypeSchema,
} from './shared/enums'
import { EntityIdSchema } from './shared/ids'

export {
  ObligationInstancePublicSchema,
  PenaltyBreakdownItemSchema,
  PenaltySourceRefSchema,
} from './obligation-instance'
export type {
  ObligationInstancePublic,
  PenaltyBreakdownItem,
  PenaltySourceRef,
} from './obligation-instance'

export const ObligationCreateInputSchema = z.object({
  clientId: EntityIdSchema,
  clientFilingProfileId: EntityIdSchema.nullable().optional(),
  taxType: z.string().min(1),
  taxYear: z.number().int().min(1900).max(2100).nullable().optional(),
  taxYearType: ClientTaxYearTypeSchema.optional(),
  fiscalYearEndMonth: z.number().int().min(1).max(12).nullable().optional(),
  fiscalYearEndDay: z.number().int().min(1).max(31).nullable().optional(),
  taxPeriodStart: z.iso.date().nullable().optional(),
  taxPeriodEnd: z.iso.date().nullable().optional(),
  taxPeriodKind: TaxPeriodKindSchema.optional(),
  taxPeriodSource: TaxPeriodSourceSchema.optional(),
  taxPeriodReviewReason: z.string().trim().min(1).nullable().optional(),
  ruleId: z.string().min(1).nullable().optional(),
  ruleVersion: z.number().int().positive().nullable().optional(),
  rulePeriod: z.string().min(1).nullable().optional(),
  generationSource: z
    .enum(['migration', 'manual', 'annual_rollover', 'pulse'])
    .nullable()
    .optional(),
  jurisdiction: z.string().trim().min(1).nullable().optional(),
  obligationType: ObligationTypeSchema.optional(),
  formName: z.string().trim().min(1).nullable().optional(),
  authority: z.string().trim().min(1).nullable().optional(),
  filingDueDate: z.iso.date().nullable().optional(),
  paymentDueDate: z.iso.date().nullable().optional(),
  sourceEvidence: z.unknown().nullable().optional(),
  recurrence: ObligationRecurrenceSchema.optional(),
  riskLevel: ObligationRiskLevelSchema.optional(),
  baseDueDate: z.iso.date(),
  currentDueDate: z.iso.date().optional(),
  status: ObligationStatusSchema.optional(),
  prepStage: ObligationPrepStageSchema.optional(),
  reviewStage: ObligationReviewStageSchema.optional(),
  extensionState: ObligationExtensionStateSchema.optional(),
  extensionFormName: z.string().trim().min(1).nullable().optional(),
  paymentState: ObligationPaymentStateSchema.optional(),
  efileState: ObligationEfileStateSchema.optional(),
  efileAuthorizationForm: z.string().trim().min(1).nullable().optional(),
  migrationBatchId: EntityIdSchema.nullable().optional(),
  estimatedTaxDueCents: z.number().int().min(0).nullable().optional(),
  estimatedExposureCents: z.number().int().min(0).nullable().optional(),
  exposureStatus: ExposureStatusSchema.optional(),
  penaltyFacts: z.unknown().optional(),
  penaltyFactsVersion: z.string().nullable().optional(),
  penaltyBreakdown: z.array(PenaltyBreakdownItemSchema).optional(),
  penaltyFormulaVersion: z.string().nullable().optional(),
  missingPenaltyFacts: z.array(z.string().min(1)).optional(),
  penaltySourceRefs: z.array(PenaltySourceRefSchema).optional(),
  penaltyFormulaLabel: z.string().nullable().optional(),
  exposureCalculatedAt: z.iso.datetime().nullable().optional(),
})

export const ObligationDependencyTypeSchema = z.enum(['k1', 'source_document', 'payment', 'review'])
export const ObligationDependencyStatusSchema = z.enum(['blocking', 'satisfied', 'waived'])
export const ObligationDependencyPublicSchema = z.object({
  id: EntityIdSchema,
  firmId: z.string().min(1),
  upstreamObligationId: EntityIdSchema,
  downstreamObligationId: EntityIdSchema,
  dependencyType: ObligationDependencyTypeSchema,
  status: ObligationDependencyStatusSchema,
  sourceNote: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type ObligationDependencyPublic = z.infer<typeof ObligationDependencyPublicSchema>

export const ObligationReviewNoteTypeSchema = z.enum(['review_note', 'blocking_issue', 'override'])
export const ObligationReviewNotePublicSchema = z.object({
  id: EntityIdSchema,
  firmId: z.string().min(1),
  obligationInstanceId: EntityIdSchema,
  authorUserId: z.string().nullable(),
  noteType: ObligationReviewNoteTypeSchema,
  body: z.string().min(1),
  resolvedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type ObligationReviewNotePublic = z.infer<typeof ObligationReviewNotePublicSchema>

export const DueDateUpdateInputSchema = z.object({
  id: EntityIdSchema,
  currentDueDate: z.iso.date(),
})

function isValidFiscalYearEnd(month: number, day: number): boolean {
  const date = new Date(Date.UTC(2024, month - 1, day))
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export const ObligationTaxYearProfileUpdateInputSchema = z
  .object({
    id: EntityIdSchema,
    taxYearType: ClientTaxYearTypeSchema,
    fiscalYearEndMonth: z.number().int().min(1).max(12).nullable(),
    fiscalYearEndDay: z.number().int().min(1).max(31).nullable(),
    reason: z.string().max(280).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.taxYearType !== 'fiscal') return
    if (!value.fiscalYearEndMonth || !value.fiscalYearEndDay) {
      ctx.addIssue({
        code: 'custom',
        path: ['fiscalYearEndMonth'],
        message: 'Fiscal-year obligations require a fiscal year end month and day.',
      })
      return
    }
    if (!isValidFiscalYearEnd(value.fiscalYearEndMonth, value.fiscalYearEndDay)) {
      ctx.addIssue({
        code: 'custom',
        path: ['fiscalYearEndDay'],
        message: 'Fiscal year end must be a valid month/day.',
      })
    }
  })
export type ObligationTaxYearProfileUpdateInput = z.infer<
  typeof ObligationTaxYearProfileUpdateInputSchema
>

export const ObligationTaxYearProfileUpdateOutputSchema = z.object({
  obligation: ObligationInstancePublicSchema,
  auditId: EntityIdSchema,
})
export type ObligationTaxYearProfileUpdateOutput = z.infer<
  typeof ObligationTaxYearProfileUpdateOutputSchema
>

export const ObligationStatusUpdateInputSchema = z.object({
  id: EntityIdSchema,
  status: ObligationStatusSchema,
  reason: z.string().max(280).optional(),
})

export const ObligationStatusUpdateOutputSchema = z.object({
  obligation: ObligationInstancePublicSchema,
  auditId: EntityIdSchema,
})

// Filed → e-file rejected → In review unwind (PDF anti-pattern #3:
// Filed ≠ Done). Caller must hold a row in `done` ("Filed"). Server
// stamps `efileRejectedAt = now()`, transitions status to `review`,
// and writes an `obligation.efile.rejected` audit row. The Rejected
// chip auto-renders on the queue thereafter (rejection-chip.tsx).
export const ObligationMarkFiledRejectedInputSchema = z.object({
  id: EntityIdSchema,
  reason: z.string().trim().max(280).optional(),
})
export type ObligationMarkFiledRejectedInput = z.infer<
  typeof ObligationMarkFiledRejectedInputSchema
>

// K-1 dependency wiring (PDF anti-pattern #4 + §6.4). Set or clear
// the upstream-blocker pointer on a row.
//   - blockedByObligationInstanceId set    → status flips to `blocked`
//   - blockedByObligationInstanceId null   → blocker cleared, status
//     reverts to `pending` (when currently `blocked`)
// Server validates: parent exists in same firm, not self, not already
// completed. Parent-completion auto-unblock cascade is already wired
// in updateStatus → unblockChildrenOf.
export const ObligationUpdateBlockedByInputSchema = z.object({
  id: EntityIdSchema,
  blockedByObligationInstanceId: EntityIdSchema.nullable(),
  reason: z.string().trim().max(280).optional(),
})
export type ObligationUpdateBlockedByInput = z.infer<typeof ObligationUpdateBlockedByInputSchema>

// In Review sub-status mutations — the prep ↔ review pipeline strip in
// the obligation drawer becomes a real action surface. Each click moves
// the row to that step (forward or backward — slider model, no
// transition guards). See
// docs/Design/in-review-substatus-mutations-2026-05-23.md for the full
// brief. Server writes a `prep_stage_changed` / `review_stage_changed`
// audit row mirroring `obligation.status.updated` shape.
//
// `notes_open` is the only `reviewStage` value that isn't a step in
// the strip — it overlays the `in_review` step via the same mutation
// (caller flips between `in_review` ↔ `notes_open` from the "Leave
// note" / "Notes addressed" affordances).
export const ObligationUpdatePrepStageInputSchema = z.object({
  id: EntityIdSchema,
  prepStage: ObligationPrepStageSchema,
  reason: z.string().trim().max(280).optional(),
})
export type ObligationUpdatePrepStageInput = z.infer<typeof ObligationUpdatePrepStageInputSchema>

export const ObligationUpdateReviewStageInputSchema = z.object({
  id: EntityIdSchema,
  reviewStage: ObligationReviewStageSchema,
  reason: z.string().trim().max(280).optional(),
})
export type ObligationUpdateReviewStageInput = z.infer<
  typeof ObligationUpdateReviewStageInputSchema
>

export const ObligationExtensionDecisionInputSchema = z.object({
  id: EntityIdSchema,
  memo: z.string().trim().max(1000).optional(),
  source: z.string().trim().max(240).optional(),
  internalTargetDate: z.iso.date().optional(),
})

export const ObligationExtensionDecisionOutputSchema = z.object({
  obligation: ObligationInstancePublicSchema,
  auditId: EntityIdSchema,
  evidenceId: EntityIdSchema.nullable(),
})

export const ObligationBulkStatusUpdateInputSchema = z.object({
  ids: z.array(EntityIdSchema).min(1).max(100),
  status: ObligationStatusSchema,
  reason: z.string().max(280).optional(),
})
export type ObligationBulkStatusUpdateInput = z.infer<typeof ObligationBulkStatusUpdateInputSchema>

export const ObligationBulkStatusUpdateOutputSchema = z.object({
  updatedCount: z.number().int().min(0),
  auditIds: z.array(EntityIdSchema),
})
export type ObligationBulkStatusUpdateOutput = z.infer<
  typeof ObligationBulkStatusUpdateOutputSchema
>

export const DeadlineTipInputSchema = z.object({ obligationId: EntityIdSchema })
export type DeadlineTipInput = z.infer<typeof DeadlineTipInputSchema>

export const DeadlineTipRefreshInputSchema = z.object({ obligationId: EntityIdSchema })
export type DeadlineTipRefreshInput = z.infer<typeof DeadlineTipRefreshInputSchema>

export const DeadlineTipRefreshOutputSchema = z.object({
  queued: z.boolean(),
  insight: AiInsightPublicSchema,
})
export type DeadlineTipRefreshOutput = z.infer<typeof DeadlineTipRefreshOutputSchema>

export const AnnualRolloverInputSchema = z
  .object({
    sourceFilingYear: z.number().int().min(1900).max(2100),
    targetFilingYear: z.number().int().min(1901).max(2101),
    clientIds: z.array(EntityIdSchema).min(1).max(100).optional(),
  })
  .refine((input) => input.targetFilingYear === input.sourceFilingYear + 1, {
    message: 'targetFilingYear must be the next filing year.',
    path: ['targetFilingYear'],
  })
export type AnnualRolloverInput = z.infer<typeof AnnualRolloverInputSchema>

export const AnnualRolloverDispositionSchema = z.enum([
  'will_create',
  'review',
  'duplicate',
  'missing_verified_rule',
  'missing_due_date',
])
export type AnnualRolloverDisposition = z.infer<typeof AnnualRolloverDispositionSchema>

export const AnnualRolloverTargetStatusSchema = ObligationStatusSchema.extract([
  'pending',
  'review',
])
export type AnnualRolloverTargetStatus = z.infer<typeof AnnualRolloverTargetStatusSchema>

export const AnnualRolloverRowSchema = z.object({
  clientId: EntityIdSchema,
  clientName: z.string().min(1),
  taxType: z.string().min(1),
  sourceObligationIds: z.array(EntityIdSchema),
  preview: ObligationGenerationPreviewSchema.nullable(),
  disposition: AnnualRolloverDispositionSchema,
  targetStatus: AnnualRolloverTargetStatusSchema.nullable(),
  duplicateObligationId: EntityIdSchema.nullable(),
  createdObligationId: EntityIdSchema.nullable(),
  skippedReason: z.string().min(1).nullable(),
})
export type AnnualRolloverRow = z.infer<typeof AnnualRolloverRowSchema>

export const AnnualRolloverSummarySchema = z.object({
  sourceFilingYear: z.number().int().min(1900).max(2100),
  targetFilingYear: z.number().int().min(1901).max(2101),
  seedObligationCount: z.number().int().min(0),
  clientCount: z.number().int().min(0),
  willCreateCount: z.number().int().min(0),
  reviewCount: z.number().int().min(0),
  duplicateCount: z.number().int().min(0),
  skippedCount: z.number().int().min(0),
  createdCount: z.number().int().min(0),
})
export type AnnualRolloverSummary = z.infer<typeof AnnualRolloverSummarySchema>

export const AnnualRolloverOutputSchema = z.object({
  summary: AnnualRolloverSummarySchema,
  rows: z.array(AnnualRolloverRowSchema),
  auditId: EntityIdSchema.nullable(),
})
export type AnnualRolloverOutput = z.infer<typeof AnnualRolloverOutputSchema>

export const obligationsContract = oc.router({
  list: obligationQueueContract.list,
  getDetail: obligationQueueContract.getDetail,
  facets: obligationQueueContract.facets,
  listSavedViews: obligationQueueContract.listSavedViews,
  createSavedView: obligationQueueContract.createSavedView,
  updateSavedView: obligationQueueContract.updateSavedView,
  deleteSavedView: obligationQueueContract.deleteSavedView,
  exportSelected: obligationQueueContract.exportSelected,
  createBatch: oc
    .input(z.object({ obligations: z.array(ObligationCreateInputSchema).min(1).max(1000) }))
    .output(z.object({ obligations: z.array(ObligationInstancePublicSchema) })),
  previewAnnualRollover: oc.input(AnnualRolloverInputSchema).output(AnnualRolloverOutputSchema),
  createAnnualRollover: oc.input(AnnualRolloverInputSchema).output(AnnualRolloverOutputSchema),
  updateDueDate: oc.input(DueDateUpdateInputSchema).output(ObligationInstancePublicSchema),
  updateTaxYearProfile: oc
    .input(ObligationTaxYearProfileUpdateInputSchema)
    .output(ObligationTaxYearProfileUpdateOutputSchema),
  /**
   * Update one obligation's status. Handler must read `before`, write the
   * row, and append an `obligation.status.updated` audit row carrying both
   * `before` and `after` payloads. Returns the updated row + audit id so
   * the Obligations UI can surface the audit reference inline.
   */
  updateStatus: oc
    .input(ObligationStatusUpdateInputSchema)
    .output(ObligationStatusUpdateOutputSchema),
  markFiledRejected: oc
    .input(ObligationMarkFiledRejectedInputSchema)
    .output(ObligationStatusUpdateOutputSchema),
  updateBlockedBy: oc
    .input(ObligationUpdateBlockedByInputSchema)
    .output(ObligationStatusUpdateOutputSchema),
  /**
   * In Review sub-status mutations. Each click on a pipeline step
   * fires one of these. Server validates the row exists in the
   * current firm, writes the column, appends a
   * `prep_stage_changed` / `review_stage_changed` audit row, and
   * returns the updated row + audit id. No transition guards — the
   * slider model permits any value→any value, forward or backward.
   */
  updatePrepStage: oc
    .input(ObligationUpdatePrepStageInputSchema)
    .output(ObligationStatusUpdateOutputSchema),
  updateReviewStage: oc
    .input(ObligationUpdateReviewStageInputSchema)
    .output(ObligationStatusUpdateOutputSchema),
  bulkUpdateStatus: oc
    .input(ObligationBulkStatusUpdateInputSchema)
    .output(ObligationBulkStatusUpdateOutputSchema),
  decideExtension: oc
    .input(ObligationExtensionDecisionInputSchema)
    .output(ObligationExtensionDecisionOutputSchema),
  listByClient: oc
    .input(z.object({ clientId: EntityIdSchema }))
    .output(z.array(ObligationInstancePublicSchema)),
  getDeadlineTip: oc.input(DeadlineTipInputSchema).output(AiInsightPublicSchema),
  requestDeadlineTipRefresh: oc
    .input(DeadlineTipRefreshInputSchema)
    .output(DeadlineTipRefreshOutputSchema),
})

export type ObligationCreateInput = z.infer<typeof ObligationCreateInputSchema>
export type DueDateUpdateInput = z.infer<typeof DueDateUpdateInputSchema>
export type ObligationStatusUpdateInput = z.infer<typeof ObligationStatusUpdateInputSchema>
export type ObligationStatusUpdateOutput = z.infer<typeof ObligationStatusUpdateOutputSchema>
export type ObligationExtensionDecisionInput = z.infer<
  typeof ObligationExtensionDecisionInputSchema
>
export type ObligationExtensionDecisionOutput = z.infer<
  typeof ObligationExtensionDecisionOutputSchema
>
export type ObligationsContract = typeof obligationsContract
