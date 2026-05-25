import type {
  ClientReadinessRequestPublic,
  ClientReadinessResponsePublic,
  ReadinessDocumentChecklistItemPublic,
} from '@duedatehq/contracts'

interface DocumentChecklistItemRow {
  id: string
  firmId: string
  obligationInstanceId: string
  label: string
  description: string | null
  source: 'template' | 'custom'
  status: 'missing' | 'received' | 'needs_review'
  sortOrder: number
  note: string | null
  receivedAt: Date | null
  receivedByUserId: string | null
  createdByUserId: string
  createdAt: Date
  updatedAt: Date
}

interface ResponseRow {
  id: string
  requestId: string
  obligationInstanceId: string
  itemId: string
  status: 'ready' | 'not_yet' | 'need_help'
  note: string | null
  etaDate: Date | null
  createdAt: Date
}

interface RequestRow {
  id: string
  firmId: string
  obligationInstanceId: string
  clientId: string
  createdByUserId: string
  recipientEmail: string | null
  status: 'sent' | 'opened' | 'responded' | 'revoked' | 'expired'
  checklistJson: ClientReadinessRequestPublic['checklist']
  expiresAt: Date
  sentAt: Date | null
  firstOpenedAt: Date | null
  lastRespondedAt: Date | null
  createdAt: Date
  updatedAt: Date
  responses: ResponseRow[]
}

function toIsoDate(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null
}

function toNullableIso(value: Date | null): string | null {
  return value ? value.toISOString() : null
}

export function toReadinessDocumentChecklistItemPublic(
  row: DocumentChecklistItemRow,
): ReadinessDocumentChecklistItemPublic {
  return {
    id: row.id,
    firmId: row.firmId,
    obligationInstanceId: row.obligationInstanceId,
    label: row.label,
    description: row.description,
    source: row.source,
    status: row.status,
    sortOrder: row.sortOrder,
    note: row.note,
    receivedAt: toNullableIso(row.receivedAt),
    receivedByUserId: row.receivedByUserId,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function toReadinessResponsePublic(row: ResponseRow): ClientReadinessResponsePublic {
  return {
    id: row.id,
    requestId: row.requestId,
    obligationInstanceId: row.obligationInstanceId,
    itemId: row.itemId,
    status: row.status,
    note: row.note,
    etaDate: toIsoDate(row.etaDate),
    createdAt: row.createdAt.toISOString(),
  }
}

export function toReadinessRequestPublic(
  row: RequestRow,
  portalUrl: string | null,
): ClientReadinessRequestPublic {
  return {
    id: row.id,
    firmId: row.firmId,
    obligationInstanceId: row.obligationInstanceId,
    clientId: row.clientId,
    createdByUserId: row.createdByUserId,
    recipientEmail: row.recipientEmail,
    status: row.status,
    checklist: row.checklistJson,
    portalUrl,
    expiresAt: row.expiresAt.toISOString(),
    sentAt: toNullableIso(row.sentAt),
    firstOpenedAt: toNullableIso(row.firstOpenedAt),
    lastRespondedAt: toNullableIso(row.lastRespondedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    responses: row.responses.map(toReadinessResponsePublic),
  }
}
