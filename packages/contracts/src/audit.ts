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
  'calendar',
  'reminder',
  'ai',
  'system',
])
export type AuditActionCategory = z.infer<typeof AuditActionCategorySchema>

// η pass — F-035 / F-036. `ai_assisted` means a human pressed apply but the
// VALUE came from an AI; `ai` means the write was fully autonomous (cron-
// triggered Pulse extraction, scheduled regeneration). The two are
// rendered identically in the table (both wear the Astroid chip) but the
// drawer disclosure surfaces the distinction.
export const AuditActorTypeSchema = z.enum(['user', 'system', 'ai', 'ai_assisted'])
export type AuditActorType = z.infer<typeof AuditActorTypeSchema>

// `ai_any` is the audit-drawer segmented-control bucket. Expanded server-side.
export const AuditActorTypeFilterSchema = z.enum(['user', 'system', 'ai', 'ai_assisted', 'ai_any'])
export type AuditActorTypeFilter = z.infer<typeof AuditActorTypeFilterSchema>

// F-037: optional disclosure surface for AI events. Every field is optional —
// the drawer renders only what it has. See AiEventMetadata in
// packages/db/src/audit-writer.ts for the producer-side type.
export const AiEventMetadataSchema = z
  .object({
    model: z.string().max(160).optional(),
    promptVersion: z.string().max(64).optional(),
    inputTokens: z.number().int().min(0).optional(),
    outputTokens: z.number().int().min(0).optional(),
    latencyMs: z.number().int().min(0).optional(),
    guardStatus: z.enum(['passed', 'flagged', 'blocked', 'skipped']).optional(),
    confidence: z.number().min(0).max(1).optional(),
    aiOutputId: z.string().min(1).max(128).optional(),
  })
  .strict()
export type AiEventMetadata = z.infer<typeof AiEventMetadataSchema>

export const AuditRangeSchema = z.enum(['24h', '7d', '30d', 'all'])
export type AuditRange = z.infer<typeof AuditRangeSchema>

export const AUDIT_SEARCH_MAX_LENGTH = 80
export const AUDIT_FILTER_MAX_LENGTH = 128

export const AuditListInputSchema = z.object({
  search: z.string().max(AUDIT_SEARCH_MAX_LENGTH).optional(),
  category: AuditActionCategorySchema.optional(),
  action: z.string().min(1).max(AUDIT_FILTER_MAX_LENGTH).optional(),
  actorId: TenantIdSchema.optional(),
  actorType: AuditActorTypeFilterSchema.optional(),
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
  actorType: AuditActorTypeSchema,
  previousActorType: AuditActorTypeSchema.nullable(),
  aiEventMetadata: AiEventMetadataSchema.nullable(),
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
