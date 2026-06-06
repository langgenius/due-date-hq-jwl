import { oc } from '@orpc/contract'
import * as z from 'zod'
import { AiInsightPublicSchema } from './ai-insights'
import {
  ClientLegalEntitySchema,
  ClientTaxClassificationSchema,
  ClientTaxYearTypeSchema,
  EntityTypeSchema,
  StateCodeSchema,
} from './shared/enums'
import { EntityIdSchema, TenantIdSchema } from './shared/ids'

export const ClientImportanceWeightSchema = z.number().int().min(1).max(3)
export type ClientImportanceWeight = z.infer<typeof ClientImportanceWeightSchema>

export const ClientFilingProfileSourceSchema = z.enum([
  'manual',
  'imported',
  'demo_seed',
  'backfill',
])
export type ClientFilingProfileSource = z.infer<typeof ClientFilingProfileSourceSchema>

export const ClientFilingProfilePublicSchema = z.object({
  id: EntityIdSchema,
  firmId: TenantIdSchema,
  clientId: EntityIdSchema,
  state: StateCodeSchema,
  counties: z.array(z.string().trim().min(1).max(120)),
  taxTypes: z.array(z.string().trim().min(1).max(120)),
  isPrimary: z.boolean(),
  source: ClientFilingProfileSourceSchema,
  migrationBatchId: EntityIdSchema.nullable(),
  archivedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type ClientFilingProfilePublic = z.infer<typeof ClientFilingProfilePublicSchema>

export const ClientFilingProfileInputSchema = z.object({
  state: StateCodeSchema,
  counties: z.array(z.string().trim().min(1).max(120)).optional(),
  taxTypes: z.array(z.string().trim().min(1).max(120)).optional(),
  isPrimary: z.boolean().optional(),
  source: ClientFilingProfileSourceSchema.optional(),
  migrationBatchId: EntityIdSchema.nullable().optional(),
})
export type ClientFilingProfileInput = z.infer<typeof ClientFilingProfileInputSchema>

export const ClientIdentitySchema = z.object({
  id: EntityIdSchema,
  name: z.string().min(1),
  ein: z
    .string()
    .regex(/^\d{2}-\d{7}$/)
    .nullable(),
  state: StateCodeSchema.nullable(),
  county: z.string().nullable(),
  entityType: EntityTypeSchema,
  legalEntity: ClientLegalEntitySchema.nullable(),
  taxClassification: ClientTaxClassificationSchema,
  taxYearType: ClientTaxYearTypeSchema,
  fiscalYearEndMonth: z.number().int().min(1).max(12).nullable(),
  fiscalYearEndDay: z.number().int().min(1).max(31).nullable(),
  externalClientId: z.string().nullable(),
  addressLine1: z.string().nullable(),
  city: z.string().nullable(),
  postalCode: z.string().nullable(),
  primaryPhone: z.string().nullable(),
  sourceStatus: z.string().nullable(),
})

export const ClientCreateInputSchema = z.object({
  name: z.string().min(1),
  ein: z
    .string()
    .regex(/^\d{2}-\d{7}$/)
    .nullable()
    .optional(),
  state: StateCodeSchema.nullable().optional(),
  county: z.string().nullable().optional(),
  entityType: EntityTypeSchema,
  legalEntity: ClientLegalEntitySchema.nullable().optional(),
  taxClassification: ClientTaxClassificationSchema.default('unknown').optional(),
  taxYearType: ClientTaxYearTypeSchema.default('calendar').optional(),
  fiscalYearEndMonth: z.number().int().min(1).max(12).nullable().optional(),
  fiscalYearEndDay: z.number().int().min(1).max(31).nullable().optional(),
  externalClientId: z.string().trim().min(1).max(256).nullable().optional(),
  addressLine1: z.string().trim().min(1).max(500).nullable().optional(),
  city: z.string().trim().min(1).max(200).nullable().optional(),
  postalCode: z.string().trim().min(1).max(30).nullable().optional(),
  primaryPhone: z.string().trim().min(1).max(80).nullable().optional(),
  sourceStatus: z.string().trim().min(1).max(120).nullable().optional(),
  ownerCount: z.number().int().min(0).max(10000).nullable().optional(),
  hasForeignAccounts: z.boolean().default(false).optional(),
  hasPayroll: z.boolean().default(false).optional(),
  hasSalesTax: z.boolean().default(false).optional(),
  has1099Vendors: z.boolean().default(false).optional(),
  hasK1Activity: z.boolean().default(false).optional(),
  primaryContactName: z.string().trim().min(1).max(200).nullable().optional(),
  primaryContactEmail: z.email().nullable().optional(),
  email: z.email().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  assigneeId: z.string().trim().min(1).max(200).nullable().optional(),
  assigneeName: z.string().max(200).nullable().optional(),
  importanceWeight: ClientImportanceWeightSchema.default(2).optional(),
  lateFilingCountLast12mo: z.number().int().min(0).max(99).default(0).optional(),
  estimatedTaxLiabilityCents: z.number().int().positive().nullable().optional(),
  estimatedTaxLiabilitySource: z.enum(['manual', 'imported', 'demo_seed']).nullable().optional(),
  equityOwnerCount: z.number().int().positive().nullable().optional(),
  migrationBatchId: EntityIdSchema.nullable().optional(),
  filingProfiles: z.array(ClientFilingProfileInputSchema).max(25).optional(),
})

export const ClientPublicSchema = ClientIdentitySchema.extend({
  firmId: TenantIdSchema,
  email: z.email().nullable(),
  notes: z.string().nullable(),
  assigneeId: z.string().min(1).nullable(),
  assigneeName: z.string().nullable(),
  ownerCount: z.number().int().min(0).nullable(),
  hasForeignAccounts: z.boolean(),
  hasPayroll: z.boolean(),
  hasSalesTax: z.boolean(),
  has1099Vendors: z.boolean(),
  hasK1Activity: z.boolean(),
  primaryContactName: z.string().nullable(),
  primaryContactEmail: z.email().nullable(),
  importanceWeight: ClientImportanceWeightSchema,
  lateFilingCountLast12mo: z.number().int().min(0),
  estimatedTaxLiabilityCents: z.number().int().positive().nullable(),
  estimatedTaxLiabilitySource: z.enum(['manual', 'imported', 'demo_seed']).nullable(),
  equityOwnerCount: z.number().int().positive().nullable(),
  migrationBatchId: EntityIdSchema.nullable(),
  filingProfiles: z.array(ClientFilingProfilePublicSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
})

export const ClientPenaltyInputsUpdateSchema = z.object({
  id: EntityIdSchema,
  estimatedTaxLiabilityCents: z.number().int().positive().nullable().optional(),
  equityOwnerCount: z.number().int().positive().nullable().optional(),
  reason: z.string().max(280).optional(),
})

export const ClientPenaltyInputsUpdateOutputSchema = z.object({
  client: ClientPublicSchema,
  recalculatedObligationCount: z.number().int().min(0),
})

export const ClientJurisdictionUpdateSchema = z.object({
  id: EntityIdSchema,
  state: StateCodeSchema.nullable(),
  county: z.string().trim().max(120).nullable(),
  reason: z.string().max(280).optional(),
})
export type ClientJurisdictionUpdateInput = z.infer<typeof ClientJurisdictionUpdateSchema>

export const ClientJurisdictionUpdateOutputSchema = z.object({
  client: ClientPublicSchema,
  recalculatedObligationCount: z.number().int().min(0),
  auditId: EntityIdSchema,
})
export type ClientJurisdictionUpdateOutput = z.infer<typeof ClientJurisdictionUpdateOutputSchema>

function isValidFiscalYearEnd(month: number, day: number): boolean {
  const date = new Date(Date.UTC(2024, month - 1, day))
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export const ClientTaxYearProfileUpdateSchema = z
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
        message: 'Fiscal-year clients require a fiscal year end month and day.',
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
export type ClientTaxYearProfileUpdateInput = z.infer<typeof ClientTaxYearProfileUpdateSchema>

export const ClientTaxYearProfileUpdateOutputSchema = z.object({
  client: ClientPublicSchema,
  recalculatedObligationCount: z.number().int().min(0),
  auditId: EntityIdSchema,
})
export type ClientTaxYearProfileUpdateOutput = z.infer<
  typeof ClientTaxYearProfileUpdateOutputSchema
>

export const ClientFilingProfilesReplaceSchema = z.object({
  id: EntityIdSchema,
  profiles: z.array(ClientFilingProfileInputSchema).max(25),
  reason: z.string().max(280).optional(),
})
export type ClientFilingProfilesReplaceInput = z.infer<typeof ClientFilingProfilesReplaceSchema>

export const ClientFilingProfilesReplaceOutputSchema = z.object({
  client: ClientPublicSchema,
  recalculatedObligationCount: z.number().int().min(0),
  auditId: EntityIdSchema,
})
export type ClientFilingProfilesReplaceOutput = z.infer<
  typeof ClientFilingProfilesReplaceOutputSchema
>

export const ClientRiskProfileUpdateSchema = z.object({
  id: EntityIdSchema,
  importanceWeight: ClientImportanceWeightSchema.optional(),
  lateFilingCountLast12mo: z.number().int().min(0).max(99).optional(),
  reason: z.string().max(280).optional(),
})
export type ClientRiskProfileUpdateInput = z.infer<typeof ClientRiskProfileUpdateSchema>

export const ClientRiskProfileUpdateOutputSchema = z.object({
  client: ClientPublicSchema,
  auditId: EntityIdSchema,
})
export type ClientRiskProfileUpdateOutput = z.infer<typeof ClientRiskProfileUpdateOutputSchema>

export const ClientSourceDetailsUpdateSchema = z.object({
  id: EntityIdSchema,
  externalClientId: z.string().trim().min(1).max(256).nullable().optional(),
  addressLine1: z.string().trim().min(1).max(500).nullable().optional(),
  city: z.string().trim().min(1).max(200).nullable().optional(),
  postalCode: z.string().trim().min(1).max(30).nullable().optional(),
  primaryPhone: z.string().trim().min(1).max(80).nullable().optional(),
  sourceStatus: z.string().trim().min(1).max(120).nullable().optional(),
  reason: z.string().max(280).optional(),
})
export type ClientSourceDetailsUpdateInput = z.infer<typeof ClientSourceDetailsUpdateSchema>

export const ClientSourceDetailsUpdateOutputSchema = z.object({
  client: ClientPublicSchema,
  auditId: EntityIdSchema,
})
export type ClientSourceDetailsUpdateOutput = z.infer<typeof ClientSourceDetailsUpdateOutputSchema>

// --- Tax classification editing + obligation recompute --------------------
//
// Changing a client's entity type / tax classification (S election, revocation,
// check-the-box, conversion). Two procedures, mirroring the repo's existing
// preview/apply pairs (annual rollover, reprojection): a read-only PREVIEW that
// shows the obligation impact, and an APPLY that writes the classification AND
// recomputes obligations atomically — closing the stale window a classification-
// only write would leave. NO transition restrictions: every entityType /
// taxClassification is always selectable; the impact preview + the structured
// reason are the safety net, not input limits.

export const ClientClassificationReasonSchema = z.object({
  kind: z.enum(['correction', 'reclassification']),
  event: z
    .enum([
      'tax_election',
      'legal_conversion',
      'merger_or_reorganization',
      'ownership_change',
      'other',
    ])
    .optional(),
  note: z.string().max(280).optional(),
})
export type ClientClassificationReason = z.infer<typeof ClientClassificationReasonSchema>

export const ClientClassificationCandidateSchema = z.object({
  entityType: EntityTypeSchema.optional(),
  legalEntity: ClientLegalEntitySchema.nullable().optional(),
  taxClassification: ClientTaxClassificationSchema.optional(),
})
export type ClientClassificationCandidate = z.infer<typeof ClientClassificationCandidateSchema>

export const ClassificationRecomputeDispositionSchema = z.enum([
  'will_add',
  'unchanged',
  'orphan_safe',
  'orphan_needs_confirmation',
])
export type ClassificationRecomputeDisposition = z.infer<
  typeof ClassificationRecomputeDispositionSchema
>

export const ClassificationRecomputeRowSchema = z.object({
  disposition: ClassificationRecomputeDispositionSchema,
  // null for will_add (not yet created); the existing obligation id otherwise.
  obligationId: EntityIdSchema.nullable(),
  taxType: z.string(),
  formName: z.string().nullable(),
  jurisdiction: z.string().nullable(),
  taxYear: z.number().int().nullable(),
  dueDate: z.iso.datetime().nullable(),
  // For orphan_needs_confirmation: human-readable reasons (status, e-file in
  // progress, has review notes, …) powering the dialog badges.
  workflowFlags: z.array(z.string()),
})
export type ClassificationRecomputeRow = z.infer<typeof ClassificationRecomputeRowSchema>

export const ClassificationRecomputeSummarySchema = z.object({
  willAddCount: z.number().int().min(0),
  unchangedCount: z.number().int().min(0),
  orphanSafeCount: z.number().int().min(0),
  orphanNeedsConfirmationCount: z.number().int().min(0),
})
export type ClassificationRecomputeSummary = z.infer<typeof ClassificationRecomputeSummarySchema>

export const ClassificationRecomputePreviewInputSchema = z.object({
  clientId: EntityIdSchema,
  candidate: ClientClassificationCandidateSchema,
  // Reclassification effective tax year — recompute touches only years >= this.
  // Omitted (correction) recomputes all monitored years (history rewrite).
  effectiveFromTaxYear: z.number().int().min(2000).max(2100).optional(),
})
export type ClassificationRecomputePreviewInput = z.infer<
  typeof ClassificationRecomputePreviewInputSchema
>

export const ClassificationRecomputePreviewOutputSchema = z.object({
  summary: ClassificationRecomputeSummarySchema,
  rows: z.array(ClassificationRecomputeRowSchema),
  // Federal return form codes the NEW classification typically files but the
  // client has no obligation for yet. Advisory ONLY — these are NOT auto-created.
  // Obligation generation is gated by the filing profile's tax types, so a
  // reclassify can never conjure a form the profile doesn't list (e.g.
  // nonprofit→individual can't add a 1040 on its own). The dialog surfaces these
  // so the CPA knows which federal return to add to the client's tax types.
  suggestedFederalForms: z.array(z.string()),
})
export type ClassificationRecomputePreviewOutput = z.infer<
  typeof ClassificationRecomputePreviewOutputSchema
>

export const ClassificationRecomputeApplyInputSchema = z
  .object({
    clientId: EntityIdSchema,
    candidate: ClientClassificationCandidateSchema,
    reason: ClientClassificationReasonSchema,
    effectiveFromTaxYear: z.number().int().min(2000).max(2100).optional(),
    // Orphans with workflow state are removed only if explicitly confirmed here.
    confirmedOrphanObligationIds: z.array(EntityIdSchema).max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.reason.kind === 'reclassification' && value.effectiveFromTaxYear === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['effectiveFromTaxYear'],
        message: 'Reclassification requires an effective tax year.',
      })
    }
  })
export type ClassificationRecomputeApplyInput = z.infer<
  typeof ClassificationRecomputeApplyInputSchema
>

export const ClassificationRecomputeApplyOutputSchema = z.object({
  client: ClientPublicSchema,
  addedCount: z.number().int().min(0),
  supersededCount: z.number().int().min(0),
  recalculatedObligationCount: z.number().int().min(0),
  auditId: EntityIdSchema,
})
export type ClassificationRecomputeApplyOutput = z.infer<
  typeof ClassificationRecomputeApplyOutputSchema
>

// 2026-06-01 (Yuqi /clients/[id] critique — IA): dedicated `updateNotes`
// mutation. Notes used to be a read-only display inside the Activity
// tab (no write surface). After moving Notes out to a slide-in panel
// next to the page title, the editor needs a write path. Single field,
// single endpoint, single audit action (`client.notes.updated`) — keeps
// the audit log honest about what actually changed.
export const ClientNotesUpdateSchema = z.object({
  id: EntityIdSchema,
  notes: z.string().max(5000).nullable(),
  reason: z.string().max(280).optional(),
})
export type ClientNotesUpdateInput = z.infer<typeof ClientNotesUpdateSchema>

export const ClientNotesUpdateOutputSchema = z.object({
  client: ClientPublicSchema,
  auditId: EntityIdSchema,
})
export type ClientNotesUpdateOutput = z.infer<typeof ClientNotesUpdateOutputSchema>

export const ClientRiskSummaryInputSchema = z.object({ clientId: EntityIdSchema })
export type ClientRiskSummaryInput = z.infer<typeof ClientRiskSummaryInputSchema>

export const ClientRiskSummaryRefreshInputSchema = z.object({ clientId: EntityIdSchema })
export type ClientRiskSummaryRefreshInput = z.infer<typeof ClientRiskSummaryRefreshInputSchema>

export const ClientRiskSummaryRefreshOutputSchema = z.object({
  queued: z.boolean(),
  insight: AiInsightPublicSchema,
})
export type ClientRiskSummaryRefreshOutput = z.infer<typeof ClientRiskSummaryRefreshOutputSchema>

export const ClientBulkAssigneeUpdateInputSchema = z.object({
  clientIds: z.array(EntityIdSchema).min(1).max(100),
  assigneeId: z.string().trim().min(1).max(200).nullable(),
  reason: z.string().max(280).optional(),
})
export type ClientBulkAssigneeUpdateInput = z.infer<typeof ClientBulkAssigneeUpdateInputSchema>

export const ClientBulkAssigneeUpdateOutputSchema = z.object({
  updatedCount: z.number().int().min(0),
  auditId: EntityIdSchema,
})
export type ClientBulkAssigneeUpdateOutput = z.infer<typeof ClientBulkAssigneeUpdateOutputSchema>

export const ClientDeleteInputSchema = z.object({ id: EntityIdSchema })
export type ClientDeleteInput = z.infer<typeof ClientDeleteInputSchema>

export const ClientDeleteOutputSchema = z.object({
  deleted: z.literal(true),
  auditId: EntityIdSchema,
})
export type ClientDeleteOutput = z.infer<typeof ClientDeleteOutputSchema>

export const clientsContract = oc.router({
  create: oc.input(ClientCreateInputSchema).output(ClientPublicSchema),
  createBatch: oc
    .input(z.object({ clients: z.array(ClientCreateInputSchema).min(1).max(500) }))
    .output(z.object({ clients: z.array(ClientPublicSchema) })),
  get: oc.input(z.object({ id: EntityIdSchema })).output(ClientPublicSchema.nullable()),
  listByFirm: oc
    .input(z.object({ limit: z.number().int().min(1).max(500).optional() }).optional())
    .output(z.array(ClientPublicSchema)),
  updatePenaltyInputs: oc
    .input(ClientPenaltyInputsUpdateSchema)
    .output(ClientPenaltyInputsUpdateOutputSchema),
  updateJurisdiction: oc
    .input(ClientJurisdictionUpdateSchema)
    .output(ClientJurisdictionUpdateOutputSchema),
  updateTaxYearProfile: oc
    .input(ClientTaxYearProfileUpdateSchema)
    .output(ClientTaxYearProfileUpdateOutputSchema),
  replaceFilingProfiles: oc
    .input(ClientFilingProfilesReplaceSchema)
    .output(ClientFilingProfilesReplaceOutputSchema),
  updateRiskProfile: oc
    .input(ClientRiskProfileUpdateSchema)
    .output(ClientRiskProfileUpdateOutputSchema),
  updateSourceDetails: oc
    .input(ClientSourceDetailsUpdateSchema)
    .output(ClientSourceDetailsUpdateOutputSchema),
  previewClassificationRecompute: oc
    .input(ClassificationRecomputePreviewInputSchema)
    .output(ClassificationRecomputePreviewOutputSchema),
  applyClassificationRecompute: oc
    .input(ClassificationRecomputeApplyInputSchema)
    .output(ClassificationRecomputeApplyOutputSchema),
  updateNotes: oc.input(ClientNotesUpdateSchema).output(ClientNotesUpdateOutputSchema),
  getRiskSummary: oc.input(ClientRiskSummaryInputSchema).output(AiInsightPublicSchema),
  requestRiskSummaryRefresh: oc
    .input(ClientRiskSummaryRefreshInputSchema)
    .output(ClientRiskSummaryRefreshOutputSchema),
  bulkUpdateAssignee: oc
    .input(ClientBulkAssigneeUpdateInputSchema)
    .output(ClientBulkAssigneeUpdateOutputSchema),
  delete: oc.input(ClientDeleteInputSchema).output(ClientDeleteOutputSchema),
})

export type ClientIdentity = z.infer<typeof ClientIdentitySchema>
export type ClientCreateInput = z.infer<typeof ClientCreateInputSchema>
export type ClientPublic = z.infer<typeof ClientPublicSchema>
export type ClientPenaltyInputsUpdateInput = z.infer<typeof ClientPenaltyInputsUpdateSchema>
export type ClientPenaltyInputsUpdateOutput = z.infer<typeof ClientPenaltyInputsUpdateOutputSchema>
export type ClientsContract = typeof clientsContract
