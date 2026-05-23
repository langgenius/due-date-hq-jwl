import { ORPCError } from '@orpc/server'
import type { Role } from '@duedatehq/auth/permissions'
import { createAI } from '@duedatehq/ai'
import { enqueueDashboardBriefRefresh } from '../../jobs/dashboard-brief/enqueue'
import { requireTenant, type RpcContext } from '../_context'
import {
  MIGRATION_REVERT_ROLES,
  MIGRATION_RUN_ROLES,
  requireCurrentFirmRole,
} from '../_permissions'
import { os } from '../_root'
import { toClientPublic } from '../clients/_serializers'
import { MigrationService } from './_service'

/**
 * migration.* — Demo Sprint subset of the Migration Copilot contract.
 *
 * Current DDL cut: createBatch / uploadRaw / runMapper / confirmMapping /
 * runNormalizer / confirmNormalization / applyDefaultMatrix / dryRun /
 * apply / revert / singleUndo / getBatch / listErrors.
 */

async function buildService(
  ctx: RpcContext,
  allowedRoles: readonly Role[],
): Promise<MigrationService> {
  await requireCurrentFirmRole(ctx, allowedRoles)
  const { scoped, userId, tenant } = requireTenant(ctx)
  return new MigrationService({
    scoped,
    userId,
    plan: tenant.plan,
    internalDeadlineOffsetDays: tenant.internalDeadlineOffsetDays,
    ...(tenant.createdAt ? { firmCreatedAt: tenant.createdAt } : {}),
    ai: createAI(ctx.env),
    rawBucket: ctx.env.R2_MIGRATION,
  })
}

const createBatch = os.migration.createBatch.handler(async ({ input, context }) => {
  const service = await buildService(context, MIGRATION_RUN_ROLES)
  const args: Parameters<MigrationService['createBatch']>[0] = {
    source: input.source,
    presetUsed: input.presetUsed ?? null,
  }
  if (input.rowCount !== undefined) args.rowCount = input.rowCount
  return service.createBatch(args)
})

const uploadRaw = os.migration.uploadRaw.handler(async ({ input, context }) => {
  const service = await buildService(context, MIGRATION_RUN_ROLES)
  if (!input.inline) {
    throw new ORPCError('NOT_IMPLEMENTED', {
      message:
        'Real R2 signed-URL uploads land in Phase 0; Demo Sprint requires the inline payload.',
    })
  }
  const out: Parameters<MigrationService['uploadRaw']>[0] = {
    batchId: input.batchId,
    kind: input.inline.kind,
    fileName: input.fileName,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
  }
  if (input.inline.text !== undefined) out.text = input.inline.text
  if (input.inline.base64 !== undefined) out.base64 = input.inline.base64
  if (input.inline.rawBase64 !== undefined) out.rawBase64 = input.inline.rawBase64
  if (input.inline.sourceManifest !== undefined) out.sourceManifest = input.inline.sourceManifest
  return service.uploadRaw(out)
})

const runMapper = os.migration.runMapper.handler(async ({ input, context }) => {
  const service = await buildService(context, MIGRATION_RUN_ROLES)
  return service.runMapper(input.batchId)
})

const confirmMapping = os.migration.confirmMapping.handler(async ({ input, context }) => {
  const service = await buildService(context, MIGRATION_RUN_ROLES)
  return service.confirmMapping(input.batchId, input.mappings)
})

const runNormalizer = os.migration.runNormalizer.handler(async ({ input, context }) => {
  const service = await buildService(context, MIGRATION_RUN_ROLES)
  return service.runNormalizer(input.batchId)
})

const confirmNormalization = os.migration.confirmNormalization.handler(
  async ({ input, context }) => {
    const service = await buildService(context, MIGRATION_RUN_ROLES)
    return service.confirmNormalization(input.batchId, input.normalizations)
  },
)

const applyDefaultMatrix = os.migration.applyDefaultMatrix.handler(async ({ input, context }) => {
  const service = await buildService(context, MIGRATION_RUN_ROLES)
  return service.applyDefaultMatrix(input.batchId, input.matrixSelections ?? [])
})

const dryRun = os.migration.dryRun.handler(async ({ input, context }) => {
  const service = await buildService(context, MIGRATION_RUN_ROLES)
  return service.dryRun(input.batchId)
})

const apply = os.migration.apply.handler(async ({ input, context }) => {
  const service = await buildService(context, MIGRATION_RUN_ROLES)
  const result = await service.apply(input.batchId)
  const { tenant } = requireTenant(context)
  await enqueueDashboardBriefRefresh(context.env, {
    firmId: tenant.firmId,
    reason: 'migration_apply',
  }).catch(() => false)
  return result
})

const discardDraft = os.migration.discardDraft.handler(async ({ input, context }) => {
  const service = await buildService(context, MIGRATION_RUN_ROLES)
  return service.discardDraft(input.batchId)
})

const getBatch = os.migration.getBatch.handler(async ({ input, context }) => {
  const service = await buildService(context, MIGRATION_RUN_ROLES)
  return service.getBatch(input.batchId)
})

const listErrors = os.migration.listErrors.handler(async ({ input, context }) => {
  const service = await buildService(context, MIGRATION_RUN_ROLES)
  const errors = await service.listErrors(input.batchId, input.stage ?? 'all')
  return { errors }
})

const listBatches = os.migration.listBatches.handler(async ({ input, context }) => {
  const service = await buildService(context, MIGRATION_RUN_ROLES)
  return service.listBatches({
    ...(input?.limit !== undefined ? { limit: input.limit } : {}),
    ...(input?.status !== undefined ? { status: input.status } : {}),
  })
})

const listBatchClients = os.migration.listBatchClients.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, MIGRATION_RUN_ROLES)
  const { scoped } = requireTenant(context)
  const batch = await scoped.migration.getBatch(input.batchId)
  if (!batch) return { clients: [] }
  const clients = await scoped.clients.listByBatch(input.batchId)
  return { clients: clients.map((client) => toClientPublic(client)) }
})

const revert = os.migration.revert.handler(async ({ input, context }) => {
  const service = await buildService(context, MIGRATION_REVERT_ROLES)
  const result = await service.revert(input.batchId)
  const { tenant } = requireTenant(context)
  await enqueueDashboardBriefRefresh(context.env, {
    firmId: tenant.firmId,
    reason: 'migration_revert',
  }).catch(() => false)
  return result
})

const singleUndo = os.migration.singleUndo.handler(async ({ input, context }) => {
  const service = await buildService(context, MIGRATION_REVERT_ROLES)
  const result = await service.singleUndo(input.batchId, input.clientId)
  const { tenant } = requireTenant(context)
  await enqueueDashboardBriefRefresh(context.env, {
    firmId: tenant.firmId,
    reason: 'migration_revert',
  }).catch(() => false)
  return result
})

export const migrationHandlers = {
  createBatch,
  uploadRaw,
  runMapper,
  confirmMapping,
  runNormalizer,
  confirmNormalization,
  applyDefaultMatrix,
  dryRun,
  apply,
  discardDraft,
  revert,
  singleUndo,
  getBatch,
  listErrors,
  listBatches,
  listBatchClients,
}
