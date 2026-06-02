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

export const ObligationCreateFromRuleInputSchema = z.object({
  clientId: EntityIdSchema,
  ruleId: z.string().trim().min(1),
  taxYear: z.number().int().min(2000).max(2100).optional(),
})
export type ObligationCreateFromRuleInput = z.infer<typeof ObligationCreateFromRuleInputSchema>

export const ObligationCreateFromRulesInputSchema = z.object({
  clientId: EntityIdSchema,
  selections: z
    .array(
      z.object({
        ruleId: z.string().trim().min(1),
        taxYear: z.number().int().min(2000).max(2100).optional(),
      }),
    )
    .min(1)
    .max(25),
})
export type ObligationCreateFromRulesInput = z.infer<typeof ObligationCreateFromRulesInputSchema>

export const ObligationCreateFromRuleOutputSchema = z.object({
  obligations: z.array(ObligationInstancePublicSchema),
  duplicateCount: z.number().int().min(0),
})
export type ObligationCreateFromRuleOutput = z.infer<typeof ObligationCreateFromRuleOutputSchema>

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
// stamps `efileRejectedAt`, transitions status to `review`, and writes
// the manual authority-response detail into the audit row. The Rejected
// chip auto-renders on the queue thereafter (rejection-chip.tsx).
export const ObligationFiledRejectionNextStepSchema = z.enum([
  'correct_resubmit',
  'request_client_input',
  'paper_file',
])
export type ObligationFiledRejectionNextStep = z.infer<
  typeof ObligationFiledRejectionNextStepSchema
>
export const ObligationMarkFiledRejectedInputSchema = z.object({
  id: EntityIdSchema,
  rejectedAt: z.iso.date().optional(),
  authority: z.string().trim().min(1).max(80).optional(),
  reference: z.string().trim().max(120).optional(),
  reason: z.string().trim().min(1).max(280),
  nextStep: ObligationFiledRejectionNextStepSchema,
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

// In Review sub-status mutations. The obligation drawer now presents
// a collapsed CPA-facing workflow, but these RPCs keep the underlying
// prep/review columns auditable. Server writes a `prep_stage_changed`
// / `review_stage_changed` audit row mirroring
// `obligation.status.updated` shape.
//
// `notes_open` overlays the "Reviewing return" state via the same
// mutation (caller flips between `in_review` ↔ `notes_open` from the
// "Leave note" / "Notes addressed" affordances).
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
  // Manually-entered extended filing deadline. REQUIRED only for the few
  // extension rules that carry no statutory durationMonths (Form 8809 /
  // 1099-NEC, the TX franchise trio); ignored when the rule has a duration
  // (the server computes the extended deadline from baseDueDate + duration).
  extendedFilingDate: z.iso.date().optional(),
})

export const ObligationExtensionDecisionOutputSchema = z.object({
  obligation: ObligationInstancePublicSchema,
  auditId: EntityIdSchema,
  evidenceId: EntityIdSchema.nullable(),
})

// Bulk "Decide extension" — applies one internal extension plan to many
// selected deadlines. A single shared internalTargetDate is applied to every
// eligible row, so the dialog caps the date picker at the earliest filing
// deadline (from the preview) and the server skips any row whose deadline is
// earlier (defense in depth) plus rows already extension-applied.
export const ObligationBulkExtensionDecisionInputSchema = z.object({
  ids: z.array(EntityIdSchema).min(1).max(100),
  memo: z.string().trim().max(1000).optional(),
  source: z.string().trim().max(240).optional(),
  internalTargetDate: z.iso.date().optional(),
})
export type ObligationBulkExtensionDecisionInput = z.infer<
  typeof ObligationBulkExtensionDecisionInputSchema
>

export const ObligationBulkExtensionDecisionOutputSchema = z.object({
  // Rows that actually had the extension decision applied.
  decidedCount: z.number().int().min(0),
  // Rows skipped: not found, already extension-applied, or (when a date is
  // given) the row's filing deadline is earlier than the shared target date.
  skippedCount: z.number().int().min(0),
  auditIds: z.array(EntityIdSchema),
})
export type ObligationBulkExtensionDecisionOutput = z.infer<
  typeof ObligationBulkExtensionDecisionOutputSchema
>

// Read-only eligibility breakdown for the bulk "Decide extension" dialog.
// earliestFilingDeadline = min(filingDueDate ?? baseDueDate) across ELIGIBLE
// rows, used as the date-picker max so any picked date passes validation for
// every eligible row; null when none are eligible.
export const ObligationBulkExtensionDecisionPreviewInputSchema = z.object({
  ids: z.array(EntityIdSchema).min(1).max(100),
})
export type ObligationBulkExtensionDecisionPreviewInput = z.infer<
  typeof ObligationBulkExtensionDecisionPreviewInputSchema
>

export const ObligationBulkExtensionDecisionPreviewOutputSchema = z.object({
  // Rows that can receive the decision (found AND not already applied).
  eligibleCount: z.number().int().min(0),
  // Rows already extensionDecision='applied' — skipped for idempotency.
  alreadyExtendedCount: z.number().int().min(0),
  // Rows not found in the current firm — skipped.
  skippedCount: z.number().int().min(0),
  // Min ORIGINAL filing deadline across eligible rows (kept for the
  // "payment still due …" copy); null when none are eligible.
  earliestFilingDeadline: z.iso.date().nullable(),
  // Min EXTENDED filing deadline across eligible rows that have a computable
  // duration; the dialog caps the internal-target picker here. null when no
  // eligible row has a duration.
  earliestExtendedFilingDeadline: z.iso.date().nullable(),
  // Eligible rows whose rule carries no statutory durationMonths — these need
  // an individually-entered extended date and are skipped by the bulk apply.
  needsManualDeadlineCount: z.number().int().min(0),
})
export type ObligationBulkExtensionDecisionPreviewOutput = z.infer<
  typeof ObligationBulkExtensionDecisionPreviewOutputSchema
>

export const ObligationBulkStatusUpdateInputSchema = z.object({
  ids: z.array(EntityIdSchema).min(1).max(100),
  status: ObligationStatusSchema,
  reason: z.string().max(280).optional(),
})
export type ObligationBulkStatusUpdateInput = z.infer<typeof ObligationBulkStatusUpdateInputSchema>

export const ObligationBulkStatusUpdateOutputSchema = z.object({
  updatedCount: z.number().int().min(0),
  skippedCount: z.number().int().min(0),
  auditIds: z.array(EntityIdSchema),
})
export type ObligationBulkStatusUpdateOutput = z.infer<
  typeof ObligationBulkStatusUpdateOutputSchema
>

export const ObligationRequestInputInputSchema = z.object({
  obligationId: EntityIdSchema,
  recipientUserId: z.string().trim().min(1),
  message: z.string().trim().min(1).max(1000),
})
export type ObligationRequestInputInput = z.infer<typeof ObligationRequestInputInputSchema>

export const ObligationRequestInputOutputSchema = z.object({
  auditId: EntityIdSchema,
  notificationId: EntityIdSchema,
})
export type ObligationRequestInputOutput = z.infer<typeof ObligationRequestInputOutputSchema>

// E-file sub-state advance (the "signature loop"). P0 wires only the
// authorization_requested → authorization_signed step ("Mark 8879
// signed"), but the RPC is generic over the e-file pipeline so later
// slices (submitted / accepted / …) reuse it. Server validates the
// transition (isLegalEfileTransition), writes the column, and appends an
// `obligation.efile.state.updated` audit row mirroring the status shape.
export const ObligationUpdateEfileStateInputSchema = z.object({
  id: EntityIdSchema,
  efileState: ObligationEfileStateSchema,
  reason: z.string().trim().max(280).optional(),
})
export type ObligationUpdateEfileStateInput = z.infer<typeof ObligationUpdateEfileStateInputSchema>

// Signature reminder — emails the client a nudge to sign Form 8879.
// Record-and-send: queues a transactional email AND writes an audit row
// (so "last reminded N days ago" is derivable). There is no in-app e-sign
// portal; the firm collects the signature via its own channel, so the
// email carries no signing link. `auditId` is null + `emailQueued` false
// when the client has no email on file.
//
// `subject`/`body` are optional CPA edits from the drawer's preview dialog;
// when omitted the server renders the default template.
export const ObligationRemindSignatureInputSchema = z.object({
  id: EntityIdSchema,
  subject: z.string().trim().min(1).max(200).optional(),
  body: z.string().trim().min(1).max(5000).optional(),
  reason: z.string().trim().max(280).optional(),
})
export type ObligationRemindSignatureInput = z.infer<typeof ObligationRemindSignatureInputSchema>

export const ObligationRemindSignatureOutputSchema = z.object({
  auditId: EntityIdSchema.nullable(),
  emailQueued: z.boolean(),
})
export type ObligationRemindSignatureOutput = z.infer<typeof ObligationRemindSignatureOutputSchema>

// Editable-preview source for the drawer's "Remind client to sign" dialog:
// the default rendered subject/body + the recipient on file (null when the
// client has no email, so the dialog can warn before sending).
export const ObligationSignatureReminderPreviewInputSchema = z.object({ id: EntityIdSchema })
export type ObligationSignatureReminderPreviewInput = z.infer<
  typeof ObligationSignatureReminderPreviewInputSchema
>

// One resolved recipient used for the dialog's live preview. `vars` are the
// substitution values (form already resolved to its friendly label) so the
// frontend can re-render the preview from the current edited template without
// re-deriving anything.
export const SignatureReminderSampleSchema = z.object({
  clientName: z.string(),
  vars: z.object({
    client_name: z.string(),
    form: z.string(),
    tax_year: z.string(),
  }),
})
export type SignatureReminderSample = z.infer<typeof SignatureReminderSampleSchema>

export const ObligationSignatureReminderPreviewOutputSchema = z.object({
  // The editable template (with {{tokens}}), not the resolved copy.
  subjectTemplate: z.string(),
  bodyTemplate: z.string(),
  tokens: z.array(z.string()),
  recipientEmail: z.string().nullable(),
  sample: SignatureReminderSampleSchema,
  // When this row was last reminded (from the audit log); null if never. The
  // dialog warns before re-sending within SIGNATURE_REMINDER_THROTTLE_DAYS.
  lastRemindedAt: z.iso.datetime().nullable(),
})
export type ObligationSignatureReminderPreviewOutput = z.infer<
  typeof ObligationSignatureReminderPreviewOutputSchema
>

export const ObligationBulkRemindSignatureInputSchema = z.object({
  ids: z.array(EntityIdSchema).min(1).max(100),
  // Optional CPA-edited template (with {{tokens}}) applied to every selected
  // recipient; each row falls back to the built-in default when omitted.
  subject: z.string().trim().min(1).max(200).optional(),
  body: z.string().trim().min(1).max(5000).optional(),
})
export type ObligationBulkRemindSignatureInput = z.infer<
  typeof ObligationBulkRemindSignatureInputSchema
>

export const ObligationBulkRemindSignatureOutputSchema = z.object({
  // Rows that actually got a reminder email queued.
  remindedCount: z.number().int().min(0),
  // Rows not in the awaiting-signature state (status≠done or efileState≠
  // authorization_requested) — silently skipped.
  skippedCount: z.number().int().min(0),
  // Awaiting-signature rows whose client has no email on file.
  noEmailCount: z.number().int().min(0),
})
export type ObligationBulkRemindSignatureOutput = z.infer<
  typeof ObligationBulkRemindSignatureOutputSchema
>

// Editable-preview source for the bulk "Remind to sign" dialog: the default
// template + the eligibility breakdown across the selection so the CPA sees
// who will actually be emailed before sending.
export const ObligationBulkSignatureReminderPreviewInputSchema = z.object({
  ids: z.array(EntityIdSchema).min(1).max(100),
})
export type ObligationBulkSignatureReminderPreviewInput = z.infer<
  typeof ObligationBulkSignatureReminderPreviewInputSchema
>

export const ObligationBulkSignatureReminderPreviewOutputSchema = z.object({
  subjectTemplate: z.string(),
  bodyTemplate: z.string(),
  tokens: z.array(z.string()),
  // Awaiting-signature rows WITH an email on file — these will be emailed.
  eligibleCount: z.number().int().min(0),
  // Rows not in the awaiting-signature state — skipped.
  skippedCount: z.number().int().min(0),
  // Awaiting-signature rows whose client has no email on file — skipped.
  noEmailCount: z.number().int().min(0),
  // Every eligible recipient, in selection order, for the paged live preview;
  // empty when none are eligible. Length always equals eligibleCount.
  samples: z.array(SignatureReminderSampleSchema),
  // Eligible rows reminded within SIGNATURE_REMINDER_THROTTLE_DAYS — purely
  // informational so the CPA can choose to skip re-nudging. Never blocks send.
  recentlyRemindedCount: z.number().int().min(0),
  // The eligible obligation ids reminded within that window, so the client can
  // filter them out before sending when "skip recently reminded" is on.
  recentlyRemindedIds: z.array(EntityIdSchema),
})
export type ObligationBulkSignatureReminderPreviewOutput = z.infer<
  typeof ObligationBulkSignatureReminderPreviewOutputSchema
>

// One-time, owner-run backfill: enter already-filed returns that never got an
// 8879 loop (status='done', efileState='not_applicable') into awaiting-
// signature. Input is empty — the firm comes from context. Idempotent.
export const ObligationBackfillSignatureLoopOutputSchema = z.object({
  // Filed rows scanned (status='done' AND efileState='not_applicable').
  scannedCount: z.number().int().min(0),
  // Of those, the ones whose tax type carries an 8879 loop — now entered.
  enteredCount: z.number().int().min(0),
})
export type ObligationBackfillSignatureLoopOutput = z.infer<
  typeof ObligationBackfillSignatureLoopOutputSchema
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
  'before_monitoring_start',
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
  createFromRule: oc
    .input(ObligationCreateFromRuleInputSchema)
    .output(ObligationCreateFromRuleOutputSchema),
  createFromRules: oc
    .input(ObligationCreateFromRulesInputSchema)
    .output(ObligationCreateFromRuleOutputSchema),
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
   * In Review sub-status mutations. The drawer now exposes a compact
   * three-step workflow, while these endpoints keep the underlying
   * prep/review columns auditable. Server validates the row exists in
   * the current firm, writes the column, appends a
   * `prep_stage_changed` / `review_stage_changed` audit row, and
   * returns the updated row + audit id.
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
  bulkDecideExtension: oc
    .input(ObligationBulkExtensionDecisionInputSchema)
    .output(ObligationBulkExtensionDecisionOutputSchema),
  bulkExtensionDecisionPreview: oc
    .input(ObligationBulkExtensionDecisionPreviewInputSchema)
    .output(ObligationBulkExtensionDecisionPreviewOutputSchema),
  requestInput: oc
    .input(ObligationRequestInputInputSchema)
    .output(ObligationRequestInputOutputSchema),
  updateEfileState: oc
    .input(ObligationUpdateEfileStateInputSchema)
    .output(ObligationStatusUpdateOutputSchema),
  remindSignature: oc
    .input(ObligationRemindSignatureInputSchema)
    .output(ObligationRemindSignatureOutputSchema),
  signatureReminderPreview: oc
    .input(ObligationSignatureReminderPreviewInputSchema)
    .output(ObligationSignatureReminderPreviewOutputSchema),
  bulkRemindSignature: oc
    .input(ObligationBulkRemindSignatureInputSchema)
    .output(ObligationBulkRemindSignatureOutputSchema),
  bulkSignatureReminderPreview: oc
    .input(ObligationBulkSignatureReminderPreviewInputSchema)
    .output(ObligationBulkSignatureReminderPreviewOutputSchema),
  backfillSignatureLoop: oc.input(z.object({})).output(ObligationBackfillSignatureLoopOutputSchema),
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
