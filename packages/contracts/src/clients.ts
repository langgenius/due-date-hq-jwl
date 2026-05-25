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
