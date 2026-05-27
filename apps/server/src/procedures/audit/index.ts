import { ORPCError } from '@orpc/server'
import {
  AiEventMetadataSchema,
  type AiEventMetadata,
  type AuditActorType,
  type AuditEvidencePackagePublic,
  type AuditEventPublic,
} from '@duedatehq/contracts'
import { planHasFeature } from '@duedatehq/core/plan-entitlements'
import { signAuditPackageDownload } from '../../routes/signed-url'
import { requireTenant } from '../_context'
import { requireCurrentFirmRole } from '../_permissions'
import { os } from '../_root'

interface AuditRow {
  id: string
  firmId: string
  actorId: string | null
  actorLabel: string | null
  // η pass — F-035 / F-037: AI-provenance + optional metadata.
  actorType: AuditActorType
  previousActorType: AuditActorType | null
  aiEventMetadataJson: unknown
  entityType: string
  entityId: string
  action: string
  beforeJson: unknown
  afterJson: unknown
  reason: string | null
  ipHash: string | null
  userAgentHash: string | null
  createdAt: Date
}

function parseAiEventMetadata(value: unknown): AiEventMetadata | null {
  if (value == null) return null
  // Defensive: rows written before contract tightening may carry stale
  // shapes. Strict-parse fails closed (null) so the drawer simply hides
  // the disclosure section rather than crashing.
  const parsed = AiEventMetadataSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export function toAuditEventPublic(row: AuditRow): AuditEventPublic {
  return {
    id: row.id,
    firmId: row.firmId,
    actorId: row.actorId,
    actorLabel: row.actorLabel,
    actorType: row.actorType,
    previousActorType: row.previousActorType,
    aiEventMetadata: parseAiEventMetadata(row.aiEventMetadataJson),
    entityType: row.entityType,
    entityId: row.entityId,
    action: row.action,
    beforeJson: row.beforeJson ?? null,
    afterJson: row.afterJson ?? null,
    reason: row.reason,
    ipHash: row.ipHash,
    userAgentHash: row.userAgentHash,
    createdAt: row.createdAt.toISOString(),
  }
}

type AuditPackageRow = Omit<
  AuditEvidencePackagePublic,
  'rangeStart' | 'rangeEnd' | 'expiresAt' | 'createdAt' | 'updatedAt'
> & {
  rangeStart: Date | null
  rangeEnd: Date | null
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}

function toNullableIso(value: Date | null): string | null {
  return value ? value.toISOString() : null
}

function toAuditPackagePublic(row: AuditPackageRow): AuditEvidencePackagePublic {
  return {
    ...row,
    rangeStart: toNullableIso(row.rangeStart),
    rangeEnd: toNullableIso(row.rangeEnd),
    expiresAt: toNullableIso(row.expiresAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

const list = os.audit.list.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, ['owner', 'partner', 'manager', 'preparer'])
  const { scoped } = requireTenant(context)

  const repoInput: NonNullable<Parameters<typeof scoped.audit.list>[0]> = {}
  if (input.search !== undefined) repoInput.search = input.search
  if (input.category !== undefined) repoInput.category = input.category
  if (input.action !== undefined) repoInput.action = input.action
  if (input.actorId !== undefined) repoInput.actorId = input.actorId
  if (input.actorType !== undefined) repoInput.actorType = input.actorType
  if (input.entityType !== undefined) repoInput.entityType = input.entityType
  if (input.entityId !== undefined) repoInput.entityId = input.entityId
  if (input.range !== undefined) repoInput.range = input.range
  if (input.cursor !== undefined) repoInput.cursor = input.cursor
  if (input.limit !== undefined) repoInput.limit = input.limit

  const result = await scoped.audit.list(repoInput)
  return {
    events: result.rows.map(toAuditEventPublic),
    nextCursor: result.nextCursor,
  }
})

const requestEvidencePackage = os.audit.requestEvidencePackage.handler(
  async ({ input, context }) => {
    await requireCurrentFirmRole(context, ['owner'])
    const { scoped, userId, tenant } = requireTenant(context)
    if (!planHasFeature(tenant.plan, 'auditExport')) {
      throw new ORPCError('FORBIDDEN', {
        message: 'Audit export packages require Team or Enterprise.',
      })
    }
    if (!scoped.audit.createEvidencePackage || !scoped.audit.getEvidencePackage) {
      throw new Error('Audit package repo methods are not available.')
    }
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const { id } = await scoped.audit.createEvidencePackage({
      exportedByUserId: userId,
      scope: input.scope ?? 'firm',
      scopeEntityId: input.scopeEntityId ?? null,
      rangeStart: input.rangeStart ? new Date(input.rangeStart) : null,
      rangeEnd: input.rangeEnd ? new Date(input.rangeEnd) : null,
      expiresAt,
    })
    await scoped.audit.write({
      actorId: userId,
      entityType: 'audit_evidence_package',
      entityId: id,
      action: 'export.audit_package.requested',
      after: { scope: input.scope ?? 'firm', scopeEntityId: input.scopeEntityId ?? null },
    })
    await context.env.AUDIT_QUEUE.send({ type: 'audit.package.generate', packageId: id })
    const row = await scoped.audit.getEvidencePackage(id)
    if (!row) throw new Error('Created audit package could not be re-read.')
    return toAuditPackagePublic(row)
  },
)

const getEvidencePackage = os.audit.getEvidencePackage.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, ['owner'])
  const { scoped, tenant } = requireTenant(context)
  if (!planHasFeature(tenant.plan, 'auditExport')) {
    throw new ORPCError('FORBIDDEN', {
      message: 'Audit export packages require Team or Enterprise.',
    })
  }
  if (!scoped.audit.getEvidencePackage) {
    throw new Error('Audit package repo methods are not available.')
  }
  const row = await scoped.audit.getEvidencePackage(input.id)
  return row ? toAuditPackagePublic(row) : null
})

const listEvidencePackages = os.audit.listEvidencePackages.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, ['owner'])
  const { scoped, tenant } = requireTenant(context)
  if (!planHasFeature(tenant.plan, 'auditExport')) {
    throw new ORPCError('FORBIDDEN', {
      message: 'Audit export packages require Team or Enterprise.',
    })
  }
  if (!scoped.audit.listEvidencePackages) {
    throw new Error('Audit package repo methods are not available.')
  }
  const rows = await scoped.audit.listEvidencePackages({ limit: input?.limit ?? 10 })
  return { packages: rows.map(toAuditPackagePublic) }
})

const createDownloadUrl = os.audit.createDownloadUrl.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, ['owner'])
  const { scoped, tenant } = requireTenant(context)
  if (!planHasFeature(tenant.plan, 'auditExport')) {
    throw new ORPCError('FORBIDDEN', {
      message: 'Audit export packages require Team or Enterprise.',
    })
  }
  if (!scoped.audit.getEvidencePackage) {
    throw new Error('Audit package repo methods are not available.')
  }
  const row = await scoped.audit.getEvidencePackage(input.id)
  if (!row || row.status !== 'ready' || !row.r2Key) {
    throw new Error('Audit package is not ready for download.')
  }
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
  const expiresAtMs = expiresAt.getTime()
  const signature = await signAuditPackageDownload({
    secret: context.env.AUTH_SECRET,
    packageId: row.id,
    expiresAtMs,
  })
  const url = `/api/audit/packages/${row.id}/download?expires=${expiresAtMs}&signature=${signature}`
  return { url, expiresAt: expiresAt.toISOString() }
})

export const auditHandlers = {
  list,
  requestEvidencePackage,
  getEvidencePackage,
  listEvidencePackages,
  createDownloadUrl,
}
