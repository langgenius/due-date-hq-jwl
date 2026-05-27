import { ORPCError } from '@orpc/server'
import { generateReadinessDocumentChecklist } from '@duedatehq/core/readiness-documents'
import type {
  ReadinessChecklistItem,
  ReadinessDocumentChecklistItemPublic,
  ReadinessGenerateChecklistOutput,
  ReadinessPreviewRequestEmailOutput,
} from '@duedatehq/contracts'
import type { ReadinessRepo } from '@duedatehq/ports/readiness'
import { renderReminderTemplate, type ReminderTemplateRow } from '@duedatehq/ports/reminders'
import type { ScopedRepo } from '@duedatehq/ports/scoped'
import { requireTenant } from '../_context'
import { OBLIGATION_STATUS_WRITE_ROLES, requireCurrentFirmRole } from '../_permissions'
import { os } from '../_root'
import { signReadinessPortalToken, sha256Hex } from '../../lib/readiness-token'
import { toReadinessDocumentChecklistItemPublic, toReadinessRequestPublic } from './_public'

const READINESS_PORTAL_TTL_MS = 14 * 24 * 60 * 60 * 1000
const READINESS_REQUEST_TEMPLATE_KIND = 'readiness_request'
const READINESS_REQUEST_TEMPLATE_FALLBACK: ReminderTemplateRow = {
  id: null,
  firmId: null,
  templateKey: 'client-materials-request',
  kind: READINESS_REQUEST_TEMPLATE_KIND,
  name: 'Client checklist collection email',
  subject: '{{client_name}}: secure materials request for {{tax_type}}',
  bodyText: [
    'Hello {{client_name}},',
    '',
    'Our office is preparing your {{tax_type}} work for the {{due_date}} deadline. Please use ' +
      'the secure link below to review the materials checklist and upload or confirm the ' +
      'items still outstanding:',
    '',
    '{{request_url}}',
    '',
    'Outstanding items:',
    '{{outstanding_checklist}}',
    '',
    'Items we have already received:',
    '{{received_checklist}}',
    '',
    'If an item is not available yet, please note that in the portal so our team can plan ' +
      'the next step. We will review your responses and follow up if we need clarification.',
    '',
    'Thank you,',
    'Your tax team',
  ].join('\n'),
  active: true,
  isSystem: true,
  usageCount: 0,
  lastSentAt: null,
  createdAt: null,
  updatedAt: null,
}
const READINESS_REQUEST_URL_PREVIEW =
  'A secure materials link will be generated when you send this request.'

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

export function groupReadinessChecklistForEmail(
  items: readonly ReadinessDocumentChecklistItemPublic[],
): ReadinessPreviewRequestEmailOutput['checklist'] {
  return {
    outstanding: items.filter((item) => item.status !== 'received'),
    received: items.filter((item) => item.status === 'received'),
  }
}

function cleanInline(value: string | null): string | null {
  const normalized = value?.replace(/\s+/g, ' ').trim()
  return normalized || null
}

function formatChecklistItemsForEmail(
  items: readonly ReadinessDocumentChecklistItemPublic[],
): string {
  if (items.length === 0) return '- None'
  return items
    .map((item) => {
      const description = cleanInline(item.description)
      const note = cleanInline(item.note)
      return [
        `- ${item.label}`,
        description ? ` - ${description}` : '',
        note ? ` (Note: ${note})` : '',
      ].join('')
    })
    .join('\n')
}

export function renderReadinessRequestEmail(input: {
  template: Pick<ReminderTemplateRow, 'subject' | 'bodyText'>
  clientName: string
  taxType: string
  dueDate: string
  requestUrl: string
  checklist: ReadinessPreviewRequestEmailOutput['checklist']
}): { subject: string; bodyText: string } {
  const rendered = renderReminderTemplate(input.template, {
    client_name: input.clientName,
    tax_type: input.taxType,
    due_date: input.dueDate,
    request_url: input.requestUrl,
    outstanding_checklist: formatChecklistItemsForEmail(input.checklist.outstanding),
    received_checklist: formatChecklistItemsForEmail(input.checklist.received),
  })
  return { subject: rendered.subject, bodyText: rendered.text }
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

async function readinessRequestTemplate(scoped: ScopedRepo): Promise<ReminderTemplateRow> {
  const templates = await scoped.reminders?.listTemplates()
  return (
    templates?.find((template) => template.kind === READINESS_REQUEST_TEMPLATE_KIND) ??
    READINESS_REQUEST_TEMPLATE_FALLBACK
  )
}

async function loadReadinessRequestEmailDraft(input: {
  scoped: ScopedRepo
  userId: string
  obligationId: string
}): Promise<{
  obligation: NonNullable<Awaited<ReturnType<ScopedRepo['obligations']['findById']>>>
  client: NonNullable<Awaited<ReturnType<ScopedRepo['clients']['findById']>>>
  documentChecklist: ReadinessDocumentChecklistItemPublic[]
  portalChecklist: ReadinessChecklistItem[]
  checklist: ReadinessPreviewRequestEmailOutput['checklist']
  template: ReminderTemplateRow
}> {
  const obligation = await input.scoped.obligations.findById(input.obligationId)
  if (!obligation) {
    throw new ORPCError('NOT_FOUND', {
      message: `Deadline ${input.obligationId} not found in current firm.`,
    })
  }
  const client = await input.scoped.clients.findById(obligation.clientId)
  if (!client) throw new ORPCError('NOT_FOUND', { message: 'Client not found.' })

  const documentChecklist = toPublicDocumentChecklist(
    await reconcileChecklistForObligation({
      readiness: input.scoped.readiness,
      obligation,
      client,
      userId: input.userId,
      now: new Date(),
    }),
  )
  const portalChecklist = toPortalChecklist(documentChecklist)
  if (portalChecklist.length === 0) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Create a readiness document checklist before sending a portal link.',
    })
  }

  return {
    obligation,
    client,
    documentChecklist,
    portalChecklist,
    checklist: groupReadinessChecklistForEmail(documentChecklist),
    template: await readinessRequestTemplate(input.scoped),
  }
}

function readinessRequestEmailPreview(input: {
  draft: Awaited<ReturnType<typeof loadReadinessRequestEmailDraft>>
  requestUrl: string
  notificationsAvailable: boolean
}): ReadinessPreviewRequestEmailOutput {
  const dueDate = input.draft.obligation.currentDueDate.toISOString().slice(0, 10)
  const rendered = renderReadinessRequestEmail({
    template: input.draft.template,
    clientName: input.draft.client.name,
    taxType: input.draft.obligation.taxType,
    dueDate,
    requestUrl: input.requestUrl,
    checklist: input.draft.checklist,
  })
  return {
    obligationId: input.draft.obligation.id,
    recipientEmail: input.draft.client.email,
    subject: rendered.subject,
    bodyText: rendered.bodyText,
    checklist: input.draft.checklist,
    emailWillBeQueued: Boolean(
      input.draft.client.email && input.draft.template.active && input.notificationsAvailable,
    ),
    templateKey: input.draft.template.templateKey,
    templateName: input.draft.template.name,
    templateActive: input.draft.template.active,
  }
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

const previewRequestEmail = os.readiness.previewRequestEmail.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, userId } = requireTenant(context)
  const draft = await loadReadinessRequestEmailDraft({
    scoped,
    userId,
    obligationId: input.obligationId,
  })
  return readinessRequestEmailPreview({
    draft,
    requestUrl: READINESS_REQUEST_URL_PREVIEW,
    notificationsAvailable: Boolean(scoped.notifications),
  })
})

const sendRequest = os.readiness.sendRequest.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, userId } = requireTenant(context)
  const draft = await loadReadinessRequestEmailDraft({
    scoped,
    userId,
    obligationId: input.obligationId,
  })

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
    obligationInstanceId: draft.obligation.id,
    clientId: draft.obligation.clientId,
    createdByUserId: userId,
    recipientEmail: draft.client.email,
    tokenHash: await sha256Hex(token),
    checklistJson: draft.portalChecklist,
    expiresAt,
    sentAt: draft.client.email && draft.template.active ? new Date() : null,
  })
  const { id: auditId } = await scoped.audit.write({
    actorId: userId,
    entityType: 'obligation_instance',
    entityId: draft.obligation.id,
    action: 'readiness.request.sent',
    after: {
      requestId,
      checklistCount: draft.portalChecklist.length,
      recipientEmail: draft.client.email ? 'present' : 'missing',
      templateKey: draft.template.templateKey,
      templateActive: draft.template.active,
    },
  })

  let emailQueued = false
  if (draft.client.email && draft.template.active && scoped.notifications) {
    const rendered = readinessRequestEmailPreview({
      draft,
      requestUrl: url,
      notificationsAvailable: true,
    })
    const queued = await scoped.notifications.enqueueEmail({
      externalId: `readiness:${requestId}`,
      type: 'readiness_request',
      payloadJson: {
        recipients: [draft.client.email],
        subject: rendered.subject,
        text: rendered.bodyText,
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
  previewRequestEmail,
  sendRequest,
  revokeRequest,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  listByObligation,
}

export { portalUrlForRequest }
