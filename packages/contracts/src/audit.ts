import { oc } from '@orpc/contract'
import * as z from 'zod'
import { EntityIdSchema, TenantIdSchema } from './shared/ids'

export const AuditActionCategorySchema = z.enum([
  'client',
  'obligation',
  'migration',
  'rules',
  'auth',
  'team',
  'pulse',
  'opportunity',
  'export',
  'ai',
  'system',
])
export type AuditActionCategory = z.infer<typeof AuditActionCategorySchema>

export const AuditRangeSchema = z.enum(['24h', '7d', '30d', 'all'])
export type AuditRange = z.infer<typeof AuditRangeSchema>

export const AUDIT_SEARCH_MAX_LENGTH = 80
export const AUDIT_FILTER_MAX_LENGTH = 128

export const AuditListInputSchema = z.object({
  search: z.string().max(AUDIT_SEARCH_MAX_LENGTH).optional(),
  category: AuditActionCategorySchema.optional(),
  action: z.string().min(1).max(AUDIT_FILTER_MAX_LENGTH).optional(),
  actorId: TenantIdSchema.optional(),
  entityType: z.string().min(1).max(AUDIT_FILTER_MAX_LENGTH).optional(),
  entityId: z.string().min(1).max(AUDIT_FILTER_MAX_LENGTH).optional(),
  range: AuditRangeSchema.default('24h').optional(),
  cursor: z.string().nullable().optional(),
  limit: z.number().int().min(1).max(100).default(50).optional(),
})
export type AuditListInput = z.infer<typeof AuditListInputSchema>

export const AuditEventPublicSchema = z.object({
  id: z.uuid(),
  firmId: TenantIdSchema,
  actorId: TenantIdSchema.nullable(),
  actorLabel: z.string().nullable(),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  action: z.string().min(1),
  beforeJson: z.unknown().nullable(),
  afterJson: z.unknown().nullable(),
  reason: z.string().nullable(),
  ipHash: z.string().nullable(),
  userAgentHash: z.string().nullable(),
  createdAt: z.iso.datetime(),
})
export type AuditEventPublic = z.infer<typeof AuditEventPublicSchema>

export const AuditListOutputSchema = z.object({
  events: z.array(AuditEventPublicSchema),
  nextCursor: z.string().nullable(),
})
export type AuditListOutput = z.infer<typeof AuditListOutputSchema>

export const AuditEvidencePackageStatusSchema = z.enum([
  'pending',
  'running',
  'ready',
  'failed',
  'expired',
])
export const AuditEvidencePackageScopeSchema = z.enum(['firm', 'client', 'obligation', 'migration'])

export const AuditEvidencePackagePublicSchema = z.object({
  id: EntityIdSchema,
  firmId: TenantIdSchema,
  exportedByUserId: z.string().min(1),
  scope: AuditEvidencePackageScopeSchema,
  scopeEntityId: z.string().nullable(),
  rangeStart: z.iso.datetime().nullable(),
  rangeEnd: z.iso.datetime().nullable(),
  fileCount: z.number().int().min(0),
  fileManifestJson: z.unknown().nullable(),
  sha256Hash: z.string().nullable(),
  r2Key: z.string().nullable(),
  status: AuditEvidencePackageStatusSchema,
  expiresAt: z.iso.datetime().nullable(),
  failureReason: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type AuditEvidencePackagePublic = z.infer<typeof AuditEvidencePackagePublicSchema>

export const AuditRequestEvidencePackageInputSchema = z.object({
  scope: AuditEvidencePackageScopeSchema.default('firm').optional(),
  scopeEntityId: z.string().nullable().optional(),
  rangeStart: z.iso.datetime().nullable().optional(),
  rangeEnd: z.iso.datetime().nullable().optional(),
})
export type AuditRequestEvidencePackageInput = z.infer<
  typeof AuditRequestEvidencePackageInputSchema
>

export const auditContract = oc.router({
  list: oc.input(AuditListInputSchema).output(AuditListOutputSchema),
  requestEvidencePackage: oc
    .input(AuditRequestEvidencePackageInputSchema)
    .output(AuditEvidencePackagePublicSchema),
  getEvidencePackage: oc
    .input(z.object({ id: EntityIdSchema }))
    .output(AuditEvidencePackagePublicSchema.nullable()),
  listEvidencePackages: oc
    .input(z.object({ limit: z.number().int().min(1).max(50).default(10).optional() }).optional())
    .output(z.object({ packages: z.array(AuditEvidencePackagePublicSchema) })),
  createDownloadUrl: oc
    .input(z.object({ id: EntityIdSchema }))
    .output(z.object({ url: z.string().min(1), expiresAt: z.iso.datetime() })),
})
export type AuditContract = typeof auditContract
