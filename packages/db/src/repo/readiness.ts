import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { deriveObligationReadiness } from '@duedatehq/core/obligation-workflow'
import type { ObligationReadiness } from '@duedatehq/ports/shared'
import type { Db } from '../client'
import { client } from '../schema/clients'
import { firmProfile } from '../schema/firm'
import { obligationInstance } from '../schema/obligations'
import {
  clientReadinessRequest,
  clientReadinessResponse,
  obligationReadinessChecklistItem,
  obligationReadinessTemplateItemSuppression,
  type ClientReadinessRequest,
  type ClientReadinessResponse,
  type ObligationReadinessChecklistItem,
  type ReadinessDocumentChecklistItemStatus,
  type ReadinessChecklistItemRow,
} from '../schema/readiness'

const RESPONSE_LOOKUP_BATCH_SIZE = 90
const LEGACY_TEMPLATE_LABEL_TO_KEYS = new Map<string, string[]>([
  ['w 2 1099 and income forms', ['1040.individual_return.w2_forms']],
  ['brokerage and crypto statements', ['1040.individual_return.brokerage_crypto']],
  ['deduction and credit support', ['1040.individual_return.deductions_credits']],
  ['schedule c business records', ['1040.individual_return.schedule_c']],
  ['k 1 packages', ['1040.individual_return.schedule_k1']],
  [
    'trial balance and general ledger',
    [
      '1065.partnership_return.books_trial_balance',
      '1120s.s_corporation_return.books_trial_balance',
      '1120.c_corporation_return.corporate_books',
    ],
  ],
  [
    'bank and card reconciliations',
    [
      '1065.partnership_return.bank_loan_reconciliations',
      '1120s.s_corporation_return.bank_loan_reconciliations',
    ],
  ],
  [
    'fixed asset additions and disposals',
    [
      '1065.partnership_return.fixed_assets',
      '1120s.s_corporation_return.fixed_assets',
      '1120.c_corporation_return.fixed_assets',
    ],
  ],
  ['partner capital and ownership changes', ['1065.partnership_return.capital_accounts']],
  [
    'k 1 recipient delivery list',
    ['1065.partnership_return.k1_delivery', '1120s.s_corporation_return.k1_delivery'],
  ],
  ['payroll and officer wages', ['1120s.s_corporation_return.reasonable_compensation']],
  ['shareholder basis and ownership changes', ['1120s.s_corporation_return.shareholder_basis']],
  ['balance sheet support', ['1120.c_corporation_return.balance_sheet_support']],
  ['state apportionment support', ['1120.c_corporation_return.state_apportionment']],
  ['e file authorization signer', ['1120.c_corporation_return.signature_payment_authorization']],
  ['source documents', ['generic.fallback_readiness.source_documents']],
  ['bookkeeping export', ['generic.fallback_readiness.bookkeeping_export']],
  ['client confirmations', ['generic.fallback_readiness.open_questions']],
])

export interface ReadinessDocumentChecklistTemplateRow {
  templateKey: string
  templateVersion: number
  label: string
  description: string | null
  source: 'template'
}

interface ReconciliationExistingItem {
  id: string
  label: string
  description: string | null
  templateKey: string | null
  templateVersion: number | null
  source: 'template' | 'custom'
  sortOrder: number
}

interface ReconciliationSuppression {
  templateKey: string
}

export interface ReadinessDocumentChecklistReconciliationPlan {
  updates: Array<{
    id: string
    templateKey: string | null
    templateVersion: number | null
    sortOrder: number
  }>
  inserts: Array<ReadinessDocumentChecklistTemplateRow & { sortOrder: number }>
}

export interface ReadinessPortalRequestRow {
  request: ClientReadinessRequest
  clientName: string
  firmName: string
  taxType: string
  currentDueDate: Date
  responses: ClientReadinessResponse[]
}

function normalizeReadinessFromResponses(
  responses: Array<{ status: 'ready' | 'not_yet' | 'need_help' }>,
): ObligationReadiness {
  return deriveObligationReadiness({
    status: 'in_progress',
    requestStatus: 'responded',
    responseStatuses: responses.map((response) => response.status),
  })
}

function readinessDocumentStatusFromResponse(
  status: 'ready' | 'not_yet' | 'need_help',
): ReadinessDocumentChecklistItemStatus {
  if (status === 'ready') return 'received'
  if (status === 'need_help') return 'needs_review'
  return 'missing'
}

function normalizeTemplateMatch(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function legacyMatchKey(value: { label: string; description: string | null }): string {
  return `${normalizeTemplateMatch(value.label)}\n${normalizeTemplateMatch(value.description)}`
}

export function planReadinessDocumentChecklistReconciliation(input: {
  existing: readonly ReconciliationExistingItem[]
  suppressions: readonly ReconciliationSuppression[]
  template: readonly ReadinessDocumentChecklistTemplateRow[]
}): ReadinessDocumentChecklistReconciliationPlan {
  const updates: ReadinessDocumentChecklistReconciliationPlan['updates'] = []
  const inserts: ReadinessDocumentChecklistReconciliationPlan['inserts'] = []
  const suppressed = new Set(input.suppressions.map((row) => row.templateKey))
  const matchedExistingIds = new Set<string>()
  const byTemplateKey = new Map<string, ReconciliationExistingItem>()
  const legacyByLabel = new Map<string, ReconciliationExistingItem[]>()
  const legacyByTemplateKey = new Map<string, ReconciliationExistingItem[]>()

  for (const row of input.existing) {
    if (row.source === 'template' && row.templateKey) {
      byTemplateKey.set(row.templateKey, row)
    } else if (row.source === 'template') {
      const key = legacyMatchKey(row)
      const bucket = legacyByLabel.get(key) ?? []
      bucket.push(row)
      legacyByLabel.set(key, bucket)
      const legacyTemplateKeys = LEGACY_TEMPLATE_LABEL_TO_KEYS.get(
        normalizeTemplateMatch(row.label),
      )
      for (const legacyTemplateKey of legacyTemplateKeys ?? []) {
        const legacyBucket = legacyByTemplateKey.get(legacyTemplateKey) ?? []
        legacyBucket.push(row)
        legacyByTemplateKey.set(legacyTemplateKey, legacyBucket)
      }
    }
  }

  input.template.forEach((templateItem, sortOrder) => {
    if (suppressed.has(templateItem.templateKey)) return
    const exact = byTemplateKey.get(templateItem.templateKey)
    const legacyBucket = legacyByLabel.get(legacyMatchKey(templateItem))
    const legacyByKeyBucket = legacyByTemplateKey.get(templateItem.templateKey)
    const legacy = legacyByKeyBucket?.shift() ?? legacyBucket?.shift()
    const existing = exact ?? legacy
    if (existing) {
      matchedExistingIds.add(existing.id)
      if (
        existing.sortOrder !== sortOrder ||
        existing.templateKey !== templateItem.templateKey ||
        existing.templateVersion !== templateItem.templateVersion
      ) {
        updates.push({
          id: existing.id,
          templateKey: templateItem.templateKey,
          templateVersion: templateItem.templateVersion,
          sortOrder,
        })
      }
      return
    }
    inserts.push({ ...templateItem, sortOrder })
  })

  let overflowSortOrder = input.template.filter((item) => !suppressed.has(item.templateKey)).length
  const overflow = input.existing
    .filter((row) => !matchedExistingIds.has(row.id))
    .toSorted((a, b) => a.sortOrder - b.sortOrder)
  for (const row of overflow) {
    if (row.sortOrder === overflowSortOrder) {
      overflowSortOrder += 1
      continue
    }
    updates.push({
      id: row.id,
      templateKey: row.templateKey,
      templateVersion: row.templateVersion,
      sortOrder: overflowSortOrder,
    })
    overflowSortOrder += 1
  }

  return { updates, inserts }
}

export function makeReadinessPortalRepo(db: Db) {
  return {
    async getPortalRequest(input: {
      requestId: string
      tokenHash: string
    }): Promise<ReadinessPortalRequestRow | null> {
      const [row] = await db
        .select({
          request: clientReadinessRequest,
          clientName: client.name,
          firmName: firmProfile.name,
          taxType: obligationInstance.taxType,
          currentDueDate: obligationInstance.currentDueDate,
        })
        .from(clientReadinessRequest)
        .innerJoin(client, eq(clientReadinessRequest.clientId, client.id))
        .innerJoin(firmProfile, eq(clientReadinessRequest.firmId, firmProfile.id))
        .innerJoin(
          obligationInstance,
          eq(clientReadinessRequest.obligationInstanceId, obligationInstance.id),
        )
        .where(
          and(
            eq(clientReadinessRequest.id, input.requestId),
            eq(clientReadinessRequest.tokenHash, input.tokenHash),
          ),
        )
        .limit(1)
      if (!row) return null
      const responses = await db
        .select()
        .from(clientReadinessResponse)
        .where(
          and(
            eq(clientReadinessResponse.firmId, row.request.firmId),
            eq(clientReadinessResponse.requestId, row.request.id),
          ),
        )
        .orderBy(desc(clientReadinessResponse.createdAt))
      return { ...row, responses }
    },
  }
}

export function makeReadinessRepo(db: Db, firmId: string) {
  async function assertObligationsInFirm(obligationInstanceIds: string[]): Promise<void> {
    const uniqueIds = [...new Set(obligationInstanceIds)]
    if (uniqueIds.length === 0) return
    const rows = await db
      .select({ id: obligationInstance.id })
      .from(obligationInstance)
      .where(and(eq(obligationInstance.firmId, firmId), inArray(obligationInstance.id, uniqueIds)))
    const found = new Set(rows.map((row) => row.id))
    const missing = uniqueIds.filter((id) => !found.has(id))
    if (missing.length > 0) {
      throw new Error(`Cannot access readiness outside the current firm: ${missing.join(', ')}`)
    }
  }

  async function listResponses(
    requestIds: string[],
  ): Promise<Map<string, ClientReadinessResponse[]>> {
    const byRequest = new Map<string, ClientReadinessResponse[]>()
    if (requestIds.length === 0) return byRequest
    const reads = []
    for (let i = 0; i < requestIds.length; i += RESPONSE_LOOKUP_BATCH_SIZE) {
      const chunk = requestIds.slice(i, i + RESPONSE_LOOKUP_BATCH_SIZE)
      reads.push(
        db
          .select()
          .from(clientReadinessResponse)
          .where(
            and(
              eq(clientReadinessResponse.firmId, firmId),
              inArray(clientReadinessResponse.requestId, chunk),
            ),
          )
          .orderBy(desc(clientReadinessResponse.createdAt)),
      )
    }
    for (const row of (await Promise.all(reads)).flat()) {
      const bucket = byRequest.get(row.requestId) ?? []
      bucket.push(row)
      byRequest.set(row.requestId, bucket)
    }
    return byRequest
  }

  async function withResponses(rows: ClientReadinessRequest[]) {
    const responses = await listResponses(rows.map((row) => row.id))
    return rows.map((row) => Object.assign({}, row, { responses: responses.get(row.id) ?? [] }))
  }

  return {
    firmId,

    async listDocumentChecklistByObligation(obligationInstanceId: string) {
      await assertObligationsInFirm([obligationInstanceId])
      return db
        .select()
        .from(obligationReadinessChecklistItem)
        .where(
          and(
            eq(obligationReadinessChecklistItem.firmId, firmId),
            eq(obligationReadinessChecklistItem.obligationInstanceId, obligationInstanceId),
          ),
        )
        .orderBy(
          asc(obligationReadinessChecklistItem.sortOrder),
          asc(obligationReadinessChecklistItem.createdAt),
        )
    },

    async createDocumentChecklistItems(input: {
      obligationInstanceId: string
      createdByUserId: string
      items: Array<{
        id: string
        label: string
        description: string | null
        templateKey?: string | null
        templateVersion?: number | null
        source: 'template' | 'custom'
        status?: ReadinessDocumentChecklistItemStatus
        sortOrder: number
        note?: string | null
      }>
    }) {
      await assertObligationsInFirm([input.obligationInstanceId])
      if (input.items.length === 0) {
        return this.listDocumentChecklistByObligation(input.obligationInstanceId)
      }
      await db.insert(obligationReadinessChecklistItem).values(
        input.items.map((item) => ({
          id: item.id,
          firmId,
          obligationInstanceId: input.obligationInstanceId,
          label: item.label,
          description: item.description,
          templateKey: item.templateKey ?? null,
          templateVersion: item.templateVersion ?? null,
          source: item.source,
          status: item.status ?? 'missing',
          sortOrder: item.sortOrder,
          note: item.note ?? null,
          createdByUserId: input.createdByUserId,
        })),
      )
      return this.listDocumentChecklistByObligation(input.obligationInstanceId)
    },

    async reconcileDocumentChecklistItems(input: {
      obligationInstanceId: string
      createdByUserId: string
      template: ReadinessDocumentChecklistTemplateRow[]
      now: Date
    }) {
      await assertObligationsInFirm([input.obligationInstanceId])
      const [existing, suppressions] = await Promise.all([
        this.listDocumentChecklistByObligation(input.obligationInstanceId),
        db
          .select({
            templateKey: obligationReadinessTemplateItemSuppression.templateKey,
          })
          .from(obligationReadinessTemplateItemSuppression)
          .where(
            and(
              eq(obligationReadinessTemplateItemSuppression.firmId, firmId),
              eq(
                obligationReadinessTemplateItemSuppression.obligationInstanceId,
                input.obligationInstanceId,
              ),
            ),
          ),
      ])
      const plan = planReadinessDocumentChecklistReconciliation({
        existing,
        suppressions,
        template: input.template,
      })

      await Promise.all([
        ...plan.updates.map((update) =>
          db
            .update(obligationReadinessChecklistItem)
            .set({
              templateKey: update.templateKey,
              templateVersion: update.templateVersion,
              sortOrder: update.sortOrder,
              updatedAt: input.now,
            })
            .where(
              and(
                eq(obligationReadinessChecklistItem.firmId, firmId),
                eq(obligationReadinessChecklistItem.id, update.id),
              ),
            ),
        ),
        ...(plan.inserts.length > 0
          ? [
              db.insert(obligationReadinessChecklistItem).values(
                plan.inserts.map((item) => ({
                  id: crypto.randomUUID(),
                  firmId,
                  obligationInstanceId: input.obligationInstanceId,
                  label: item.label,
                  description: item.description,
                  templateKey: item.templateKey,
                  templateVersion: item.templateVersion,
                  source: item.source,
                  status: 'missing' as const,
                  sortOrder: item.sortOrder,
                  createdByUserId: input.createdByUserId,
                })),
              ),
            ]
          : []),
      ])

      return this.listDocumentChecklistByObligation(input.obligationInstanceId)
    },

    async updateDocumentChecklistItem(input: {
      id: string
      label?: string
      description?: string | null
      status?: ReadinessDocumentChecklistItemStatus
      note?: string | null
      receivedByUserId?: string | null
      now: Date
    }): Promise<ObligationReadinessChecklistItem> {
      const [before] = await db
        .select()
        .from(obligationReadinessChecklistItem)
        .where(
          and(
            eq(obligationReadinessChecklistItem.firmId, firmId),
            eq(obligationReadinessChecklistItem.id, input.id),
          ),
        )
        .limit(1)
      if (!before) throw new Error('Readiness checklist item not found.')

      const nextStatus = input.status ?? before.status
      const receivedAt =
        input.status === undefined
          ? before.receivedAt
          : nextStatus === 'received'
            ? (before.receivedAt ?? input.now)
            : null
      const receivedByUserId =
        input.status === undefined
          ? before.receivedByUserId
          : nextStatus === 'received'
            ? (input.receivedByUserId ?? before.receivedByUserId)
            : null

      await db
        .update(obligationReadinessChecklistItem)
        .set({
          ...(input.label !== undefined ? { label: input.label } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.note !== undefined ? { note: input.note } : {}),
          receivedAt,
          receivedByUserId,
          updatedAt: input.now,
        })
        .where(
          and(
            eq(obligationReadinessChecklistItem.firmId, firmId),
            eq(obligationReadinessChecklistItem.id, input.id),
          ),
        )
      const [after] = await db
        .select()
        .from(obligationReadinessChecklistItem)
        .where(
          and(
            eq(obligationReadinessChecklistItem.firmId, firmId),
            eq(obligationReadinessChecklistItem.id, input.id),
          ),
        )
        .limit(1)
      if (!after) throw new Error('Readiness checklist item could not be re-read.')
      return after
    },

    async deleteDocumentChecklistItem(input: {
      id: string
      deletedByUserId: string
    }): Promise<ObligationReadinessChecklistItem | undefined> {
      const [before] = await db
        .select()
        .from(obligationReadinessChecklistItem)
        .where(
          and(
            eq(obligationReadinessChecklistItem.firmId, firmId),
            eq(obligationReadinessChecklistItem.id, input.id),
          ),
        )
        .limit(1)
      if (!before) return undefined
      if (before.source === 'template' && before.templateKey) {
        await db
          .insert(obligationReadinessTemplateItemSuppression)
          .values({
            id: crypto.randomUUID(),
            firmId,
            obligationInstanceId: before.obligationInstanceId,
            templateKey: before.templateKey,
            templateVersion: before.templateVersion ?? 1,
            suppressedByUserId: input.deletedByUserId,
          })
          .onConflictDoNothing({
            target: [
              obligationReadinessTemplateItemSuppression.firmId,
              obligationReadinessTemplateItemSuppression.obligationInstanceId,
              obligationReadinessTemplateItemSuppression.templateKey,
            ],
          })
      }
      await db
        .delete(obligationReadinessChecklistItem)
        .where(
          and(
            eq(obligationReadinessChecklistItem.firmId, firmId),
            eq(obligationReadinessChecklistItem.id, input.id),
          ),
        )
      return before
    },

    async listByObligation(obligationInstanceId: string) {
      await assertObligationsInFirm([obligationInstanceId])
      const rows = await db
        .select()
        .from(clientReadinessRequest)
        .where(
          and(
            eq(clientReadinessRequest.firmId, firmId),
            eq(clientReadinessRequest.obligationInstanceId, obligationInstanceId),
          ),
        )
        .orderBy(desc(clientReadinessRequest.createdAt))
      return withResponses(rows)
    },

    async createRequest(input: {
      id: string
      obligationInstanceId: string
      clientId: string
      createdByUserId: string
      recipientEmail: string | null
      tokenHash: string
      checklistJson: ReadinessChecklistItemRow[]
      expiresAt: Date
      sentAt: Date | null
    }) {
      await assertObligationsInFirm([input.obligationInstanceId])
      await db.insert(clientReadinessRequest).values({
        id: input.id,
        firmId,
        obligationInstanceId: input.obligationInstanceId,
        clientId: input.clientId,
        createdByUserId: input.createdByUserId,
        recipientEmail: input.recipientEmail,
        tokenHash: input.tokenHash,
        checklistJson: input.checklistJson,
        expiresAt: input.expiresAt,
        sentAt: input.sentAt,
      })
      const row = await this.getRequest(input.id)
      if (!row) throw new Error('Readiness request could not be re-read.')
      return row
    },

    async getRequest(id: string) {
      const [row] = await db
        .select()
        .from(clientReadinessRequest)
        .where(and(eq(clientReadinessRequest.firmId, firmId), eq(clientReadinessRequest.id, id)))
        .limit(1)
      if (!row) return undefined
      const [hydrated] = await withResponses([row])
      return hydrated
    },

    async markOpened(id: string, openedAt: Date): Promise<void> {
      const row = await this.getRequest(id)
      if (!row || row.status === 'revoked' || row.status === 'expired') return
      await db
        .update(clientReadinessRequest)
        .set({
          status: row.status === 'sent' ? 'opened' : row.status,
          firstOpenedAt: row.firstOpenedAt ?? openedAt,
          updatedAt: openedAt,
        })
        .where(and(eq(clientReadinessRequest.firmId, firmId), eq(clientReadinessRequest.id, id)))
    },

    async revokeRequest(id: string): Promise<void> {
      await db
        .update(clientReadinessRequest)
        .set({ status: 'revoked', updatedAt: new Date() })
        .where(and(eq(clientReadinessRequest.firmId, firmId), eq(clientReadinessRequest.id, id)))
    },

    async submitResponses(input: {
      requestId: string
      obligationInstanceId: string
      responses: Array<{
        itemId: string
        status: 'ready' | 'not_yet' | 'need_help'
        note?: string | null
        etaDate?: Date | null
      }>
      submittedAt: Date
    }) {
      await assertObligationsInFirm([input.obligationInstanceId])
      const readiness = normalizeReadinessFromResponses(input.responses)
      await Promise.all([
        db.insert(clientReadinessResponse).values(
          input.responses.map((response) => ({
            id: crypto.randomUUID(),
            firmId,
            requestId: input.requestId,
            obligationInstanceId: input.obligationInstanceId,
            itemId: response.itemId,
            status: response.status,
            note: response.note ?? null,
            etaDate: response.etaDate ?? null,
          })),
        ),
        db
          .update(clientReadinessRequest)
          .set({
            status: 'responded',
            lastRespondedAt: input.submittedAt,
            updatedAt: input.submittedAt,
          })
          .where(
            and(
              eq(clientReadinessRequest.firmId, firmId),
              eq(clientReadinessRequest.id, input.requestId),
            ),
          ),
      ])
      return { readiness }
    },

    async syncDocumentChecklistFromResponses(input: {
      obligationInstanceId: string
      responses: Array<{
        itemId: string
        status: 'ready' | 'not_yet' | 'need_help'
        note?: string | null
      }>
      now: Date
    }): Promise<void> {
      await assertObligationsInFirm([input.obligationInstanceId])
      await Promise.all(
        input.responses.map((response) => {
          const status = readinessDocumentStatusFromResponse(response.status)
          return db
            .update(obligationReadinessChecklistItem)
            .set({
              status,
              note: response.note ?? null,
              receivedAt: status === 'received' ? input.now : null,
              receivedByUserId: null,
              updatedAt: input.now,
            })
            .where(
              and(
                eq(obligationReadinessChecklistItem.firmId, firmId),
                eq(
                  obligationReadinessChecklistItem.obligationInstanceId,
                  input.obligationInstanceId,
                ),
                eq(obligationReadinessChecklistItem.id, response.itemId),
              ),
            )
        }),
      )
    },
  }
}

export type ReadinessRepo = ReturnType<typeof makeReadinessRepo>
