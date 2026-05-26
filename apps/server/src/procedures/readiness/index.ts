import { ORPCError } from '@orpc/server'
import { generateReadinessDocumentChecklist } from '@duedatehq/core/readiness-documents'
import type {
  ReadinessChecklistItem,
  ReadinessDocumentChecklistItemPublic,
  ReadinessGenerateChecklistOutput,
} from '@duedatehq/contracts'
import type { ReadinessRepo } from '@duedatehq/ports/readiness'
import { requireTenant } from '../_context'
import { OBLIGATION_STATUS_WRITE_ROLES, requireCurrentFirmRole } from '../_permissions'
import { os } from '../_root'
import { signReadinessPortalToken, sha256Hex } from '../../lib/readiness-token'
import { toReadinessDocumentChecklistItemPublic, toReadinessRequestPublic } from './_public'

const READINESS_PORTAL_TTL_MS = 14 * 24 * 60 * 60 * 1000

export function toPortalChecklist(
  items: readonly ReadinessDocumentChecklistItemPublic[],
): ReadinessChecklistItem[] {
  return items.map((item) => ({
    id: item.id,
    label: item.label.slice(0, 120),
    description: item.description,
    reason: item.status === 'received' ? 'CPA marked this document received.' : null,
    sourceHint: item.source === 'custom' ? 'CPA custom item' : 'Document checklist',
  }))
}

function toPublicDocumentChecklist(
  rows: Parameters<typeof toReadinessDocumentChecklistItemPublic>[0][],
): ReadinessDocumentChecklistItemPublic[] {
  return rows.map(toReadinessDocumentChecklistItemPublic)
}

function portalUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/$/, '')}/readiness/${encodeURIComponent(token)}`
}

interface ReconcileChecklistObligation {
  id: string
  taxType: string
  formName: string | null
  obligationType: string
  jurisdiction: string | null
}

interface ReconcileChecklistClient {
  entityType: string | null
  taxClassification: string | null
  state: string | null
}

export async function reconcileChecklistForObligation(input: {
  readiness: Pick<ReadinessRepo, 'reconcileDocumentChecklistItems'>
  obligation: ReconcileChecklistObligation
  client: ReconcileChecklistClient
  userId: string
  now: Date
}) {
  const template = generateReadinessDocumentChecklist({
    taxType: input.obligation.taxType,
    formName: input.obligation.formName,
    obligationType: input.obligation.obligationType,
    entityType: input.client.entityType,
    taxClassification: input.client.taxClassification,
    jurisdiction: input.obligation.jurisdiction ?? input.client.state,
  })
  return input.readiness.reconcileDocumentChecklistItems({
    obligationInstanceId: input.obligation.id,
    createdByUserId: input.userId,
    template,
    now: input.now,
  })
}

async function portalUrlForRequest(input: {
  appUrl: string
  secret: string
  requestId: string
  expiresAt: Date
  status: string
}): Promise<string | null> {
  if (input.status === 'revoked' || input.status === 'expired') return null
  if (input.expiresAt.getTime() <= Date.now()) return null
  const token = await signReadinessPortalToken({
    secret: input.secret,
    requestId: input.requestId,
    expiresAtMs: input.expiresAt.getTime(),
  })
  return portalUrl(input.appUrl, token)
}

async function publicRequest(input: {
  appUrl: string
  secret: string
  row: Parameters<typeof toReadinessRequestPublic>[0]
}) {
  return toReadinessRequestPublic(
    input.row,
    await portalUrlForRequest({
      appUrl: input.appUrl,
      secret: input.secret,
      requestId: input.row.id,
      expiresAt: input.row.expiresAt,
      status: input.row.status,
    }),
  )
}

const generateChecklist = os.readiness.generateChecklist.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, userId } = requireTenant(context)
  const obligation = await scoped.obligations.findById(input.obligationId)
  if (!obligation) {
    throw new ORPCError('NOT_FOUND', {
      message: `Deadline ${input.obligationId} not found in current firm.`,
    })
  }
  const client = await scoped.clients.findById(obligation.clientId)
  if (!client) {
    throw new ORPCError('NOT_FOUND', { message: 'Client not found for deadline.' })
  }

  const rows = await reconcileChecklistForObligation({
    readiness: scoped.readiness,
    obligation,
    client,
    userId,
    now: new Date(),
  })
  return {
    checklist: toPublicDocumentChecklist(rows),
    degraded: false,
    aiOutputId: null,
    evidenceId: null,
  } satisfies ReadinessGenerateChecklistOutput
})

const sendRequest = os.readiness.sendRequest.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, userId } = requireTenant(context)
  const obligation = await scoped.obligations.findById(input.obligationId)
  if (!obligation) {
    throw new ORPCError('NOT_FOUND', {
      message: `Deadline ${input.obligationId} not found in current firm.`,
    })
  }
  const client = await scoped.clients.findById(obligation.clientId)
  if (!client) throw new ORPCError('NOT_FOUND', { message: 'Client not found.' })
  const documentChecklist = toPublicDocumentChecklist(
    await reconcileChecklistForObligation({
      readiness: scoped.readiness,
      obligation,
      client,
      userId,
      now: new Date(),
    }),
  )
  const checklist =
    documentChecklist.length > 0 ? toPortalChecklist(documentChecklist) : input.checklist
  if (!checklist || checklist.length === 0) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Create a readiness document checklist before sending a portal link.',
    })
  }

  const requestId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + READINESS_PORTAL_TTL_MS)
  const token = await signReadinessPortalToken({
    secret: context.env.AUTH_SECRET,
    requestId,
    expiresAtMs: expiresAt.getTime(),
  })
  const url = portalUrl(context.env.APP_URL, token)
  const request = await scoped.readiness.createRequest({
    id: requestId,
    obligationInstanceId: obligation.id,
    clientId: obligation.clientId,
    createdByUserId: userId,
    recipientEmail: client.email,
    tokenHash: await sha256Hex(token),
    checklistJson: checklist,
    expiresAt,
    sentAt: client.email ? new Date() : null,
  })
  const { id: auditId } = await scoped.audit.write({
    actorId: userId,
    entityType: 'obligation_instance',
    entityId: obligation.id,
    action: 'readiness.request.sent',
    after: {
      requestId,
      checklistCount: checklist.length,
      recipientEmail: client.email ? 'present' : 'missing',
    },
  })

  let emailQueued = false
  if (client.email && scoped.notifications) {
    const queued = await scoped.notifications.enqueueEmail({
      externalId: `readiness:${requestId}`,
      type: 'readiness_request',
      payloadJson: {
        recipients: [client.email],
        subject: `Readiness check for ${obligation.taxType}`,
        text: [
          `Please complete the readiness check for ${client.name} - ${obligation.taxType}.`,
          '',
          url,
        ].join('\n'),
      },
    })
    emailQueued = queued.created
    await context.env.EMAIL_QUEUE.send({ type: 'email.flush' }).catch(() => undefined)
  }

  return {
    request: toReadinessRequestPublic(request, url),
    auditId,
    emailQueued,
  }
})

const addChecklistItem = os.readiness.addChecklistItem.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, userId } = requireTenant(context)
  const existing = await scoped.readiness.listDocumentChecklistByObligation(input.obligationId)
  const sortOrder = existing.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1
  const rows = await scoped.readiness.createDocumentChecklistItems({
    obligationInstanceId: input.obligationId,
    createdByUserId: userId,
    items: [
      {
        id: crypto.randomUUID(),
        label: input.label,
        description: input.description ?? null,
        source: 'custom',
        status: 'missing',
        sortOrder,
        note: input.note ?? null,
      },
    ],
  })
  const item = rows.find((row) => row.sortOrder === sortOrder && row.label === input.label) ?? null
  const { id: auditId } = await scoped.audit.write({
    actorId: userId,
    entityType: 'obligation_instance',
    entityId: input.obligationId,
    action: 'readiness.checklist_item.created',
    after: { itemId: item?.id ?? null, label: input.label, source: 'custom' },
  })
  return {
    checklist: toPublicDocumentChecklist(rows),
    item: item ? toReadinessDocumentChecklistItemPublic(item) : null,
    auditId,
  }
})

const updateChecklistItem = os.readiness.updateChecklistItem.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, userId } = requireTenant(context)
  const item = await scoped.readiness.updateDocumentChecklistItem({
    id: input.itemId,
    ...(input.label !== undefined ? { label: input.label } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.note !== undefined ? { note: input.note } : {}),
    receivedByUserId: input.status === 'received' ? userId : null,
    now: new Date(),
  })
  const checklist = await scoped.readiness.listDocumentChecklistByObligation(
    item.obligationInstanceId,
  )
  const { id: auditId } = await scoped.audit.write({
    actorId: userId,
    entityType: 'obligation_instance',
    entityId: item.obligationInstanceId,
    action: 'readiness.checklist_item.updated',
    after: {
      itemId: item.id,
      label: item.label,
      status: item.status,
      source: item.source,
    },
  })
  return {
    checklist: toPublicDocumentChecklist(checklist),
    item: toReadinessDocumentChecklistItemPublic(item),
    auditId,
  }
})

const deleteChecklistItem = os.readiness.deleteChecklistItem.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, userId } = requireTenant(context)
  const deleted = await scoped.readiness.deleteDocumentChecklistItem({
    id: input.itemId,
    deletedByUserId: userId,
  })
  if (!deleted) throw new ORPCError('NOT_FOUND', { message: 'Readiness checklist item not found.' })
  const checklist = await scoped.readiness.listDocumentChecklistByObligation(
    deleted.obligationInstanceId,
  )
  const { id: auditId } = await scoped.audit.write({
    actorId: userId,
    entityType: 'obligation_instance',
    entityId: deleted.obligationInstanceId,
    action: 'readiness.checklist_item.deleted',
    before: {
      itemId: deleted.id,
      label: deleted.label,
      status: deleted.status,
      source: deleted.source,
    },
  })
  return {
    checklist: toPublicDocumentChecklist(checklist),
    item: null,
    auditId,
  }
})

const revokeRequest = os.readiness.revokeRequest.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, userId } = requireTenant(context)
  const before = await scoped.readiness.getRequest(input.requestId)
  if (!before) throw new ORPCError('NOT_FOUND', { message: 'Readiness request not found.' })
  await scoped.readiness.revokeRequest(input.requestId)
  const after = await scoped.readiness.getRequest(input.requestId)
  if (!after) throw new Error('Revoked request could not be re-read.')
  const { id: auditId } = await scoped.audit.write({
    actorId: userId,
    entityType: 'obligation_instance',
    entityId: after.obligationInstanceId,
    action: 'readiness.request.revoked',
    before: { requestId: before.id, status: before.status },
    after: { requestId: after.id, status: after.status },
  })
  return {
    request: await publicRequest({
      appUrl: context.env.APP_URL,
      secret: context.env.AUTH_SECRET,
      row: after,
    }),
    auditId,
  }
})

const listByObligation = os.readiness.listByObligation.handler(async ({ input, context }) => {
  const { scoped } = requireTenant(context)
  const rows = await scoped.readiness.listByObligation(input.obligationId)
  return {
    requests: await Promise.all(
      rows.map((row) =>
        publicRequest({
          appUrl: context.env.APP_URL,
          secret: context.env.AUTH_SECRET,
          row,
        }),
      ),
    ),
  }
})

export const readinessHandlers = {
  generateChecklist,
  sendRequest,
  revokeRequest,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  listByObligation,
}

export { portalUrlForRequest }
