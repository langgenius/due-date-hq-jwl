import { and, desc, eq, inArray } from 'drizzle-orm'
import {
  deriveObligationReadiness,
  isClosedObligationStatus,
} from '@duedatehq/core/obligation-workflow'
import type {
  ObligationReadiness,
  ObligationStatus,
  ReadinessResponseStatus,
} from '@duedatehq/core/obligation-workflow'
import type { Db } from '../client'
import {
  clientReadinessRequest,
  clientReadinessResponse,
  obligationReadinessChecklistItem,
  type ReadinessDocumentChecklistItemStatus,
} from '../schema/readiness'

const READINESS_LOOKUP_BATCH_SIZE = 90

export function deriveReadinessForStatus(status: ObligationStatus): ObligationReadiness {
  return deriveObligationReadiness({ status })
}

function deriveReadinessFromDocumentChecklist(input: {
  status: ObligationStatus
  checklistStatuses: readonly ReadinessDocumentChecklistItemStatus[]
}): ObligationReadiness {
  if (isClosedObligationStatus(input.status)) return 'ready'
  if (input.checklistStatuses.some((status) => status === 'needs_review')) return 'needs_review'
  // A waived item no longer applies this year, so it counts as satisfied
  // for readiness (alongside received). All items received-or-waived → ready.
  if (input.checklistStatuses.every((status) => status === 'received' || status === 'waived'))
    return 'ready'
  return 'waiting'
}

export async function loadDerivedReadinessByObligation(
  db: Db,
  firmId: string,
  statusesByObligationId: Map<string, ObligationStatus>,
): Promise<Map<string, ObligationReadiness>> {
  const result = new Map<string, ObligationReadiness>()
  const obligationIds = [...statusesByObligationId.keys()]

  for (const [id, status] of statusesByObligationId) {
    result.set(id, deriveReadinessForStatus(status))
  }
  if (obligationIds.length === 0) return result

  const checklistStatusesByObligationId = new Map<string, ReadinessDocumentChecklistItemStatus[]>()
  const checklistReads = []
  for (let i = 0; i < obligationIds.length; i += READINESS_LOOKUP_BATCH_SIZE) {
    const chunk = obligationIds.slice(i, i + READINESS_LOOKUP_BATCH_SIZE)
    checklistReads.push(
      db
        .select({
          obligationInstanceId: obligationReadinessChecklistItem.obligationInstanceId,
          status: obligationReadinessChecklistItem.status,
        })
        .from(obligationReadinessChecklistItem)
        .where(
          and(
            eq(obligationReadinessChecklistItem.firmId, firmId),
            inArray(obligationReadinessChecklistItem.obligationInstanceId, chunk),
          ),
        ),
    )
  }

  for (const item of (await Promise.all(checklistReads)).flat()) {
    const bucket = checklistStatusesByObligationId.get(item.obligationInstanceId) ?? []
    bucket.push(item.status)
    checklistStatusesByObligationId.set(item.obligationInstanceId, bucket)
  }

  const requestByObligationId = new Map<
    string,
    {
      id: string
      obligationInstanceId: string
      status: 'sent' | 'opened' | 'responded' | 'revoked' | 'expired'
      updatedAt: Date
      createdAt: Date
    }
  >()

  const requestReads = []
  for (let i = 0; i < obligationIds.length; i += READINESS_LOOKUP_BATCH_SIZE) {
    const chunk = obligationIds.slice(i, i + READINESS_LOOKUP_BATCH_SIZE)
    requestReads.push(
      db
        .select({
          id: clientReadinessRequest.id,
          obligationInstanceId: clientReadinessRequest.obligationInstanceId,
          status: clientReadinessRequest.status,
          updatedAt: clientReadinessRequest.updatedAt,
          createdAt: clientReadinessRequest.createdAt,
        })
        .from(clientReadinessRequest)
        .where(
          and(
            eq(clientReadinessRequest.firmId, firmId),
            inArray(clientReadinessRequest.obligationInstanceId, chunk),
          ),
        )
        .orderBy(desc(clientReadinessRequest.updatedAt), desc(clientReadinessRequest.createdAt)),
    )
  }

  for (const request of (await Promise.all(requestReads)).flat()) {
    if (!requestByObligationId.has(request.obligationInstanceId)) {
      requestByObligationId.set(request.obligationInstanceId, request)
    }
  }

  const requestIds = [...requestByObligationId.values()].map((request) => request.id)
  const responseStatusesByRequestId = new Map<string, ReadinessResponseStatus[]>()
  const responseReads = []
  for (let i = 0; i < requestIds.length; i += READINESS_LOOKUP_BATCH_SIZE) {
    const chunk = requestIds.slice(i, i + READINESS_LOOKUP_BATCH_SIZE)
    responseReads.push(
      db
        .select({
          requestId: clientReadinessResponse.requestId,
          status: clientReadinessResponse.status,
        })
        .from(clientReadinessResponse)
        .where(
          and(
            eq(clientReadinessResponse.firmId, firmId),
            inArray(clientReadinessResponse.requestId, chunk),
          ),
        ),
    )
  }

  for (const response of (await Promise.all(responseReads)).flat()) {
    const bucket = responseStatusesByRequestId.get(response.requestId) ?? []
    bucket.push(response.status)
    responseStatusesByRequestId.set(response.requestId, bucket)
  }

  for (const [obligationId, request] of requestByObligationId) {
    if (checklistStatusesByObligationId.has(obligationId)) continue
    const status = statusesByObligationId.get(obligationId)
    if (!status) continue
    result.set(
      obligationId,
      deriveObligationReadiness({
        status,
        requestStatus: request.status,
        responseStatuses: responseStatusesByRequestId.get(request.id) ?? [],
      }),
    )
  }

  for (const [obligationId, checklistStatuses] of checklistStatusesByObligationId) {
    const status = statusesByObligationId.get(obligationId)
    if (!status) continue
    result.set(obligationId, deriveReadinessFromDocumentChecklist({ status, checklistStatuses }))
  }

  return result
}
