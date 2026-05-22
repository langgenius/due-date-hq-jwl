import { oc } from '@orpc/contract'
import * as z from 'zod'
import { ObligationReadinessSchema } from './shared/enums'
import { EntityIdSchema, TenantIdSchema } from './shared/ids'

export const ReadinessChecklistItemSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable(),
  reason: z.string().trim().max(500).nullable(),
  sourceHint: z.string().trim().max(240).nullable(),
})
export type ReadinessChecklistItem = z.infer<typeof ReadinessChecklistItemSchema>

export const ReadinessDocumentChecklistItemSourceSchema = z.enum(['template', 'custom'])
export type ReadinessDocumentChecklistItemSource = z.infer<
  typeof ReadinessDocumentChecklistItemSourceSchema
>

export const ReadinessDocumentChecklistItemStatusSchema = z.enum([
  'missing',
  'received',
  'needs_review',
])
export type ReadinessDocumentChecklistItemStatus = z.infer<
  typeof ReadinessDocumentChecklistItemStatusSchema
>

export const ReadinessDocumentChecklistItemPublicSchema = z.object({
  id: EntityIdSchema,
  firmId: TenantIdSchema,
  obligationInstanceId: EntityIdSchema,
  label: z.string().trim().min(1).max(160),
  description: z.string().trim().max(500).nullable(),
  source: ReadinessDocumentChecklistItemSourceSchema,
  status: ReadinessDocumentChecklistItemStatusSchema,
  sortOrder: z.number().int().min(0).max(1000),
  note: z.string().trim().max(1000).nullable(),
  receivedAt: z.iso.datetime().nullable(),
  receivedByUserId: z.string().min(1).nullable(),
  createdByUserId: z.string().min(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type ReadinessDocumentChecklistItemPublic = z.infer<
  typeof ReadinessDocumentChecklistItemPublicSchema
>

export const ReadinessRequestStatusSchema = z.enum([
  'sent',
  'opened',
  'responded',
  'revoked',
  'expired',
])
export type ReadinessRequestStatus = z.infer<typeof ReadinessRequestStatusSchema>

export const ReadinessResponseStatusSchema = z.enum(['ready', 'not_yet', 'need_help'])
export type ReadinessResponseStatus = z.infer<typeof ReadinessResponseStatusSchema>

export const ClientReadinessResponsePublicSchema = z.object({
  id: EntityIdSchema,
  requestId: EntityIdSchema,
  obligationInstanceId: EntityIdSchema,
  itemId: z.string().min(1),
  status: ReadinessResponseStatusSchema,
  note: z.string().nullable(),
  etaDate: z.iso.date().nullable(),
  createdAt: z.iso.datetime(),
})
export type ClientReadinessResponsePublic = z.infer<typeof ClientReadinessResponsePublicSchema>

export const ClientReadinessRequestPublicSchema = z.object({
  id: EntityIdSchema,
  firmId: TenantIdSchema,
  obligationInstanceId: EntityIdSchema,
  clientId: EntityIdSchema,
  createdByUserId: z.string().min(1),
  recipientEmail: z.email().nullable(),
  status: ReadinessRequestStatusSchema,
  checklist: z.array(ReadinessChecklistItemSchema).min(1).max(30),
  portalUrl: z.string().min(1).nullable(),
  expiresAt: z.iso.datetime(),
  sentAt: z.iso.datetime().nullable(),
  firstOpenedAt: z.iso.datetime().nullable(),
  lastRespondedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  responses: z.array(ClientReadinessResponsePublicSchema),
})
export type ClientReadinessRequestPublic = z.infer<typeof ClientReadinessRequestPublicSchema>

export const ReadinessGenerateChecklistInputSchema = z.object({
  obligationId: EntityIdSchema,
})
export type ReadinessGenerateChecklistInput = z.infer<typeof ReadinessGenerateChecklistInputSchema>

export const ReadinessGenerateChecklistOutputSchema = z.object({
  checklist: z.array(ReadinessDocumentChecklistItemPublicSchema).min(1).max(30),
  degraded: z.boolean(),
  aiOutputId: EntityIdSchema.nullable(),
  evidenceId: EntityIdSchema.nullable(),
})
export type ReadinessGenerateChecklistOutput = z.infer<
  typeof ReadinessGenerateChecklistOutputSchema
>

export const ReadinessSendRequestInputSchema = z.object({
  obligationId: EntityIdSchema,
  checklist: z.array(ReadinessChecklistItemSchema).min(1).max(30).optional(),
})
export type ReadinessSendRequestInput = z.infer<typeof ReadinessSendRequestInputSchema>

export const ReadinessSendRequestOutputSchema = z.object({
  request: ClientReadinessRequestPublicSchema,
  auditId: EntityIdSchema,
  emailQueued: z.boolean(),
})
export type ReadinessSendRequestOutput = z.infer<typeof ReadinessSendRequestOutputSchema>

export const ReadinessRevokeRequestInputSchema = z.object({
  requestId: EntityIdSchema,
})
export type ReadinessRevokeRequestInput = z.infer<typeof ReadinessRevokeRequestInputSchema>

export const ReadinessAddChecklistItemInputSchema = z.object({
  obligationId: EntityIdSchema,
  label: z.string().trim().min(1).max(160),
  description: z.string().trim().max(500).nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
})
export type ReadinessAddChecklistItemInput = z.infer<typeof ReadinessAddChecklistItemInputSchema>

export const ReadinessUpdateChecklistItemInputSchema = z
  .object({
    itemId: EntityIdSchema,
    label: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    status: ReadinessDocumentChecklistItemStatusSchema.optional(),
    note: z.string().trim().max(1000).nullable().optional(),
  })
  .refine(
    (value) =>
      value.label !== undefined ||
      value.description !== undefined ||
      value.status !== undefined ||
      value.note !== undefined,
    { message: 'At least one checklist field is required.' },
  )
export type ReadinessUpdateChecklistItemInput = z.infer<
  typeof ReadinessUpdateChecklistItemInputSchema
>

export const ReadinessDeleteChecklistItemInputSchema = z.object({
  itemId: EntityIdSchema,
})
export type ReadinessDeleteChecklistItemInput = z.infer<
  typeof ReadinessDeleteChecklistItemInputSchema
>

export const ReadinessChecklistItemMutationOutputSchema = z.object({
  checklist: z.array(ReadinessDocumentChecklistItemPublicSchema).max(30),
  item: ReadinessDocumentChecklistItemPublicSchema.nullable(),
  auditId: EntityIdSchema,
})
export type ReadinessChecklistItemMutationOutput = z.infer<
  typeof ReadinessChecklistItemMutationOutputSchema
>

export const ReadinessListByObligationInputSchema = z.object({
  obligationId: EntityIdSchema,
})
export type ReadinessListByObligationInput = z.infer<typeof ReadinessListByObligationInputSchema>

export const ReadinessListByObligationOutputSchema = z.object({
  requests: z.array(ClientReadinessRequestPublicSchema),
})
export type ReadinessListByObligationOutput = z.infer<typeof ReadinessListByObligationOutputSchema>

export const ReadinessRevokeRequestOutputSchema = z.object({
  request: ClientReadinessRequestPublicSchema,
  auditId: EntityIdSchema,
})
export type ReadinessRevokeRequestOutput = z.infer<typeof ReadinessRevokeRequestOutputSchema>

export const ReadinessPublicPortalItemSchema = ReadinessChecklistItemSchema.extend({
  responseStatus: ReadinessResponseStatusSchema.nullable(),
  note: z.string().nullable(),
  etaDate: z.iso.date().nullable(),
})
export type ReadinessPublicPortalItem = z.infer<typeof ReadinessPublicPortalItemSchema>

export const ReadinessPublicPortalSchema = z.object({
  requestId: EntityIdSchema,
  firmName: z.string().min(1),
  clientName: z.string().min(1),
  taxType: z.string().min(1),
  currentDueDate: z.iso.date(),
  status: ReadinessRequestStatusSchema,
  expiresAt: z.iso.datetime(),
  items: z.array(ReadinessPublicPortalItemSchema).min(1),
})
export type ReadinessPublicPortal = z.infer<typeof ReadinessPublicPortalSchema>

export const ReadinessPublicSubmitInputSchema = z.object({
  responses: z.array(
    z.object({
      itemId: z.string().min(1),
      status: ReadinessResponseStatusSchema,
      note: z.string().trim().max(1000).optional(),
      etaDate: z.iso.date().optional(),
    }),
  ),
})
export type ReadinessPublicSubmitInput = z.infer<typeof ReadinessPublicSubmitInputSchema>

export const ReadinessPublicSubmitOutputSchema = z.object({
  readiness: ObligationReadinessSchema,
  submittedAt: z.iso.datetime(),
})
export type ReadinessPublicSubmitOutput = z.infer<typeof ReadinessPublicSubmitOutputSchema>

export const readinessContract = oc.router({
  generateChecklist: oc
    .input(ReadinessGenerateChecklistInputSchema)
    .output(ReadinessGenerateChecklistOutputSchema),
  sendRequest: oc.input(ReadinessSendRequestInputSchema).output(ReadinessSendRequestOutputSchema),
  revokeRequest: oc
    .input(ReadinessRevokeRequestInputSchema)
    .output(ReadinessRevokeRequestOutputSchema),
  addChecklistItem: oc
    .input(ReadinessAddChecklistItemInputSchema)
    .output(ReadinessChecklistItemMutationOutputSchema),
  updateChecklistItem: oc
    .input(ReadinessUpdateChecklistItemInputSchema)
    .output(ReadinessChecklistItemMutationOutputSchema),
  deleteChecklistItem: oc
    .input(ReadinessDeleteChecklistItemInputSchema)
    .output(ReadinessChecklistItemMutationOutputSchema),
  listByObligation: oc
    .input(ReadinessListByObligationInputSchema)
    .output(ReadinessListByObligationOutputSchema),
})
export type ReadinessContract = typeof readinessContract
