import { Hono } from 'hono'
import {
  createDb,
  makeReadinessPortalRepo,
  scoped,
  type ReadinessPortalRequestRow,
} from '@duedatehq/db'
import {
  ReadinessPublicPortalSchema,
  ReadinessPublicSubmitInputSchema,
  type ReadinessPublicPortal,
} from '@duedatehq/contracts'
import type { Env, ContextVars } from '../env'
import { sha256Hex, verifyReadinessPortalToken } from '../lib/readiness-token'

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}

export function clientVisibleFirmName(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, ' ')
  if (/^(?:solo|pro|team|firm)\s+plan\s+demo\s+cpa$/i.test(trimmed)) {
    return 'Mock Practice CPA'
  }
  return trimmed || 'CPA Practice'
}

export function clientVisibleSenderName(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, ' ')
  return trimmed || 'CPA'
}

async function requestIpHash(
  secret: string,
  value: string | undefined,
): Promise<string | undefined> {
  return value ? sha256Hex(`${secret}:${value}`) : undefined
}

async function loadPortalRequest(input: {
  env: Env
  token: string
}): Promise<ReadinessPortalRequestRow | null> {
  const payload = await verifyReadinessPortalToken({
    secret: input.env.AUTH_SECRET,
    token: input.token,
  })
  if (!payload) return null
  const tokenHash = await sha256Hex(input.token)
  return makeReadinessPortalRepo(createDb(input.env.DB)).getPortalRequest({
    requestId: payload.requestId,
    tokenHash,
  })
}

function toPortal(row: ReadinessPortalRequestRow): ReadinessPublicPortal {
  const responseByItem = new Map(row.responses.map((response) => [response.itemId, response]))
  return ReadinessPublicPortalSchema.parse({
    requestId: row.request.id,
    firmName: clientVisibleFirmName(row.firmName),
    senderName: clientVisibleSenderName(row.senderName),
    clientName: row.clientName,
    taxType: row.taxType,
    currentDueDate: toIsoDate(row.currentDueDate),
    status: row.request.status,
    expiresAt: row.request.expiresAt.toISOString(),
    items: row.request.checklistJson.map((item) => {
      const response = responseByItem.get(item.id)
      return Object.assign({}, item, {
        responseStatus: response?.status ?? null,
        note: response?.note ?? null,
      })
    }),
  })
}

function unavailableResponse(status: 404 | 410) {
  return new Response(status === 404 ? 'Readiness link not found.' : 'Readiness link expired.', {
    status,
  })
}

export const readinessRoute = new Hono<{
  Bindings: Env
  Variables: ContextVars
}>()
  .get('/:token', async (c) => {
    const token = c.req.param('token')
    const portal = await loadPortalRequest({ env: c.env, token })
    if (!portal) return unavailableResponse(404)
    if (
      portal.request.status === 'revoked' ||
      portal.request.status === 'expired' ||
      portal.request.expiresAt.getTime() <= Date.now()
    ) {
      return unavailableResponse(410)
    }

    const repo = scoped(createDb(c.env.DB), portal.request.firmId)
    if (!portal.request.firstOpenedAt) {
      const openedAt = new Date()
      await repo.readiness.markOpened(portal.request.id, openedAt)
      const ipHash = await requestIpHash(c.env.AUTH_SECRET, c.req.header('cf-connecting-ip'))
      await repo.audit.write({
        actorId: null,
        // Anonymous client-portal visitor authenticated by a signed token,
        // not a firm user — record as a system actor, not a `user`.
        actorType: 'system',
        entityType: 'obligation_instance',
        entityId: portal.request.obligationInstanceId,
        action: 'readiness.portal.opened',
        after: { requestId: portal.request.id },
        ...(ipHash ? { ipHash } : {}),
      })
    }

    return c.json(toPortal(portal))
  })
  .post('/:token', async (c) => {
    const token = c.req.param('token')
    const portal = await loadPortalRequest({ env: c.env, token })
    if (!portal) return unavailableResponse(404)
    if (
      portal.request.status === 'revoked' ||
      portal.request.status === 'expired' ||
      portal.request.expiresAt.getTime() <= Date.now()
    ) {
      return unavailableResponse(410)
    }

    const parsed = ReadinessPublicSubmitInputSchema.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json({ error: 'INVALID_READINESS_RESPONSE' }, 400)
    const expectedItemIds = new Set(portal.request.checklistJson.map((item) => item.id))
    const responseItemIds = new Set(parsed.data.responses.map((response) => response.itemId))
    if (
      parsed.data.responses.length !== expectedItemIds.size ||
      parsed.data.responses.some((response) => !expectedItemIds.has(response.itemId)) ||
      expectedItemIds.size !== responseItemIds.size
    ) {
      return c.json({ error: 'READINESS_RESPONSE_INCOMPLETE' }, 400)
    }

    const repo = scoped(createDb(c.env.DB), portal.request.firmId)
    const submittedAt = new Date()
    const result = await repo.readiness.submitResponses({
      requestId: portal.request.id,
      obligationInstanceId: portal.request.obligationInstanceId,
      submittedAt,
      responses: parsed.data.responses.map((response) => ({
        itemId: response.itemId,
        status: response.status,
        note: response.note?.trim() || null,
      })),
    })
    await repo.readiness.syncDocumentChecklistFromResponses({
      obligationInstanceId: portal.request.obligationInstanceId,
      now: submittedAt,
      responses: parsed.data.responses.map((response) => ({
        itemId: response.itemId,
        status: response.status,
        note: response.note?.trim() || null,
      })),
    })
    await repo.evidence.write({
      obligationInstanceId: portal.request.obligationInstanceId,
      sourceType: 'readiness_client_response',
      sourceId: portal.request.id,
      rawValue: JSON.stringify(parsed.data.responses),
      normalizedValue: JSON.stringify({ readiness: result.readiness }),
    })
    const ipHash = await requestIpHash(c.env.AUTH_SECRET, c.req.header('cf-connecting-ip'))
    await repo.audit.write({
      actorId: null,
      // Anonymous client-portal submission (signed token), not a firm user.
      actorType: 'system',
      entityType: 'obligation_instance',
      entityId: portal.request.obligationInstanceId,
      action: 'readiness.client_response',
      after: {
        requestId: portal.request.id,
        readiness: result.readiness,
        responseCount: parsed.data.responses.length,
      },
      ...(ipHash ? { ipHash } : {}),
    })

    return c.json({
      readiness: result.readiness,
      submittedAt: submittedAt.toISOString(),
    })
  })
