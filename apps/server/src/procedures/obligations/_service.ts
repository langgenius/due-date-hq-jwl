import { ORPCError } from '@orpc/server'
import type {
  ObligationBulkStatusUpdateInput,
  ObligationBulkStatusUpdateOutput,
  ObligationExtensionDecisionInput,
  ObligationExtensionDecisionOutput,
  ObligationInstancePublic,
  ObligationStatusUpdateInput,
  ObligationStatusUpdateOutput,
} from '@duedatehq/contracts'
import { isLegalObligationTransition } from '@duedatehq/core/obligation-workflow'
import type { ScopedRepo } from '@duedatehq/ports/scoped'
import { calculateAccruedPenalty } from '../_penalty-exposure'

interface ObligationRow {
  id: string
  firmId: string
  clientId: string
  clientFilingProfileId?: string | null
  taxType: string
  taxYear: number | null
  ruleId?: string | null
  ruleVersion?: number | null
  rulePeriod?: string | null
  generationSource?: ObligationInstancePublic['generationSource']
  jurisdiction?: string | null
  obligationType?: ObligationInstancePublic['obligationType']
  formName?: string | null
  authority?: string | null
  filingDueDate?: Date | null
  paymentDueDate?: Date | null
  sourceEvidenceJson?: unknown
  recurrence?: ObligationInstancePublic['recurrence']
  riskLevel?: ObligationInstancePublic['riskLevel']
  baseDueDate: Date
  currentDueDate: Date
  status: ObligationInstancePublic['status']
  blockedByObligationInstanceId?: string | null
  readiness: ObligationInstancePublic['readiness']
  extensionDecision: ObligationInstancePublic['extensionDecision']
  extensionMemo: string | null
  extensionSource: string | null
  extensionExpectedDueDate: Date | null
  extensionDecidedAt: Date | null
  extensionDecidedByUserId: string | null
  extensionState?: ObligationInstancePublic['extensionState']
  extensionFormName?: string | null
  extensionFiledAt?: Date | null
  extensionAcceptedAt?: Date | null
  prepStage?: ObligationInstancePublic['prepStage']
  reviewStage?: ObligationInstancePublic['reviewStage']
  reviewerUserId?: string | null
  reviewCompletedAt?: Date | null
  paymentState?: ObligationInstancePublic['paymentState']
  paymentConfirmedAt?: Date | null
  efileState?: ObligationInstancePublic['efileState']
  efileAuthorizationForm?: string | null
  efileSubmittedAt?: Date | null
  efileAcceptedAt?: Date | null
  efileRejectedAt?: Date | null
  migrationBatchId: string | null
  estimatedTaxDueCents: number | null
  estimatedExposureCents: number | null
  exposureStatus: ObligationInstancePublic['exposureStatus']
  penaltyFactsJson: unknown
  penaltyFactsVersion: string | null
  penaltyBreakdownJson: unknown
  penaltyFormulaVersion: string | null
  missingPenaltyFactsJson: unknown
  penaltySourceRefsJson: unknown
  penaltyFormulaLabel: string | null
  exposureCalculatedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

interface ClientPenaltyFacts {
  id: string
  entityType?: string | null
  state?: string | null
  estimatedTaxLiabilityCents?: number | null
  equityOwnerCount?: number | null
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function toObligationPublic(
  row: ObligationRow,
  opts: { client?: ClientPenaltyFacts | null | undefined; asOfDate?: string | Date } = {},
): ObligationInstancePublic {
  const taxAuthorityFilingDueDate = row.filingDueDate ?? row.baseDueDate
  const taxAuthorityPaymentDueDate = row.paymentDueDate ?? row.baseDueDate
  const penaltyAsOfDate =
    opts.asOfDate instanceof Date
      ? opts.asOfDate.toISOString().slice(0, 10)
      : (opts.asOfDate ?? new Date().toISOString().slice(0, 10))
  const accrued = opts.client
    ? calculateAccruedPenalty(opts.client, row, penaltyAsOfDate)
    : {
        accruedPenaltyCents: null,
        accruedPenaltyStatus: 'unsupported' as const,
        accruedPenaltyBreakdown: [],
        penaltyAsOfDate,
      }
  return {
    id: row.id,
    firmId: row.firmId,
    clientId: row.clientId,
    clientFilingProfileId: row.clientFilingProfileId ?? null,
    taxType: row.taxType,
    taxYear: row.taxYear,
    ruleId: row.ruleId ?? null,
    ruleVersion: row.ruleVersion ?? null,
    rulePeriod: row.rulePeriod ?? null,
    generationSource: row.generationSource ?? null,
    jurisdiction: row.jurisdiction ?? null,
    obligationType: row.obligationType ?? 'filing',
    formName: row.formName ?? null,
    authority: row.authority ?? null,
    filingDueDate: toIsoDate(taxAuthorityFilingDueDate),
    paymentDueDate: toIsoDate(taxAuthorityPaymentDueDate),
    sourceEvidence: row.sourceEvidenceJson ?? null,
    recurrence: row.recurrence ?? 'once',
    riskLevel: row.riskLevel ?? 'low',
    baseDueDate: toIsoDate(row.baseDueDate),
    currentDueDate: toIsoDate(row.currentDueDate),
    status: row.status,
    blockedByObligationInstanceId: row.blockedByObligationInstanceId ?? null,
    readiness: row.readiness,
    extensionDecision: row.extensionDecision,
    extensionMemo: row.extensionMemo,
    extensionSource: row.extensionSource,
    extensionExpectedDueDate: row.extensionExpectedDueDate
      ? toIsoDate(row.extensionExpectedDueDate)
      : null,
    extensionDecidedAt: row.extensionDecidedAt?.toISOString() ?? null,
    extensionDecidedByUserId: row.extensionDecidedByUserId,
    extensionState: row.extensionState ?? 'not_started',
    extensionFormName: row.extensionFormName ?? null,
    extensionFiledAt: row.extensionFiledAt?.toISOString() ?? null,
    extensionAcceptedAt: row.extensionAcceptedAt?.toISOString() ?? null,
    prepStage: row.prepStage ?? 'not_started',
    reviewStage: row.reviewStage ?? 'not_required',
    reviewerUserId: row.reviewerUserId ?? null,
    reviewCompletedAt: row.reviewCompletedAt?.toISOString() ?? null,
    paymentState: row.paymentState ?? 'not_applicable',
    paymentConfirmedAt: row.paymentConfirmedAt?.toISOString() ?? null,
    efileState: row.efileState ?? 'not_applicable',
    efileAuthorizationForm: row.efileAuthorizationForm ?? null,
    efileSubmittedAt: row.efileSubmittedAt?.toISOString() ?? null,
    efileAcceptedAt: row.efileAcceptedAt?.toISOString() ?? null,
    efileRejectedAt: row.efileRejectedAt?.toISOString() ?? null,
    migrationBatchId: row.migrationBatchId,
    estimatedTaxDueCents: row.estimatedTaxDueCents,
    estimatedExposureCents: row.estimatedExposureCents,
    exposureStatus: row.exposureStatus,
    penaltyBreakdown: parsePenaltyBreakdown(row.penaltyBreakdownJson),
    missingPenaltyFacts: parseStringArray(row.missingPenaltyFactsJson),
    penaltySourceRefs: parsePenaltySourceRefs(row.penaltySourceRefsJson),
    penaltyFormulaLabel: row.penaltyFormulaLabel,
    penaltyFactsVersion: row.penaltyFactsVersion,
    accruedPenaltyCents: accrued.accruedPenaltyCents,
    accruedPenaltyStatus: accrued.accruedPenaltyStatus,
    accruedPenaltyBreakdown: accrued.accruedPenaltyBreakdown,
    penaltyAsOfDate: accrued.penaltyAsOfDate,
    penaltyFormulaVersion: row.penaltyFormulaVersion,
    exposureCalculatedAt: row.exposureCalculatedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function parsePenaltyBreakdown(value: unknown): ObligationInstancePublic['penaltyBreakdown'] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!isRecord(item)) return []
    const key = item.key
    const label = item.label
    const amountCents = item.amountCents
    const formula = item.formula
    if (
      typeof key !== 'string' ||
      typeof label !== 'string' ||
      typeof amountCents !== 'number' ||
      typeof formula !== 'string'
    ) {
      return []
    }
    return [
      {
        key,
        label,
        amountCents,
        formula,
        inputs: parsePenaltyInputs(item.inputs),
        sourceRefs: parsePenaltySourceRefs(item.sourceRefs),
      },
    ]
  })
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
}

function parsePenaltyInputs(
  value: unknown,
): Record<string, string | number | boolean | null> | undefined {
  if (!isRecord(value)) return undefined
  const result: Record<string, string | number | boolean | null> = {}
  for (const [key, item] of Object.entries(value)) {
    if (
      typeof item === 'string' ||
      typeof item === 'number' ||
      typeof item === 'boolean' ||
      item === null
    ) {
      result[key] = item
    }
  }
  return Object.keys(result).length > 0 ? result : undefined
}

function parsePenaltySourceRefs(value: unknown): ObligationInstancePublic['penaltySourceRefs'] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!isRecord(item)) return []
    const { label, url, sourceExcerpt, effectiveDate, lastReviewedDate } = item
    if (
      typeof label !== 'string' ||
      typeof url !== 'string' ||
      typeof sourceExcerpt !== 'string' ||
      typeof effectiveDate !== 'string' ||
      typeof lastReviewedDate !== 'string'
    ) {
      return []
    }
    return [{ label, url, sourceExcerpt, effectiveDate, lastReviewedDate }]
  })
}

async function toObligationPublicFromScoped(
  scoped: ScopedRepo,
  row: ObligationRow,
): Promise<ObligationInstancePublic> {
  const client = await scoped.clients.findById(row.clientId)
  return toObligationPublic(row, { client })
}

/**
 * updateObligationStatus — extracted from the procedure handler so it can be
 * unit-tested with an in-memory scoped repo + audit writer.
 *
 * Audit invariant (docs/dev-file/06 §6.1):
 *   1. read `before`,
 *   2. update,
 *   3. read `after`,
 *   4. write audit with both payloads.
 * Order matters: any reordering would let the audit drift from the
 * persisted state on failure.
 */
export async function updateObligationStatus(
  scoped: ScopedRepo,
  userId: string,
  input: ObligationStatusUpdateInput,
): Promise<ObligationStatusUpdateOutput> {
  const before = await scoped.obligations.findById(input.id)
  if (!before) {
    throw new ORPCError('NOT_FOUND', {
      message: `Obligation ${input.id} not found in current firm.`,
    })
  }

  if (before.status === input.status) {
    return {
      obligation: await toObligationPublicFromScoped(scoped, before),
      auditId: '00000000-0000-0000-0000-000000000000',
    }
  }

  // Lifecycle v2 transition validation. The matrix lives in
  // packages/core/src/obligation-workflow — see "Filed ≠ Done"
  // (PDF anti-pattern #3) for the load-bearing invariant: `completed`
  // can only follow `done` or `paid`. The legacy 8 states still
  // transition freely among themselves; the new `completed` is the
  // strict gate.
  if (!isLegalObligationTransition(before.status, input.status)) {
    throw new ORPCError('BAD_REQUEST', {
      message: `Illegal status transition: ${before.status} → ${input.status}.`,
    })
  }

  await scoped.obligations.updateStatus(input.id, input.status)
  const after = await scoped.obligations.findById(input.id)
  if (!after) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Updated obligation could not be re-read.',
    })
  }

  const auditPayload: {
    actorId: string
    entityType: string
    entityId: string
    action: string
    before: { status: string; readiness: string }
    after: { status: string; readiness: string }
    reason?: string
  } = {
    actorId: userId,
    entityType: 'obligation_instance',
    entityId: input.id,
    action: 'obligation.status.updated',
    before: { status: before.status, readiness: before.readiness },
    after: { status: after.status, readiness: after.readiness },
  }
  if (input.reason !== undefined) auditPayload.reason = input.reason

  const { id: auditId } = await scoped.audit.write(auditPayload)

  // Lifecycle v2 (slice 2d.4): parent→child unblock cascade.
  // When this row reaches `completed`, every obligation that was
  // `blocked_by` this row flips back to `pending` (with blocked_by
  // cleared). Each cascade writes its own audit row so the child's
  // timeline reads "Unblocked by Lakeview Partnership · federal_1065"
  // instead of just a bare parent UUID. (Slice 2d.4 polish.)
  if (after.status === 'completed') {
    const unblockedIds = await scoped.obligations.unblockChildrenOf(input.id)
    if (unblockedIds.length > 0) {
      const parentClient = await scoped.clients.findById(after.clientId)
      const parentLabel = `${parentClient?.name ?? 'Unknown client'} · ${after.taxType}`
      await Promise.all(
        unblockedIds.map((childId) =>
          scoped.audit.write({
            actorId: userId,
            entityType: 'obligation_instance',
            entityId: childId,
            action: 'obligation.status.auto_unblocked',
            before: { status: 'blocked', readiness: 'needs_review' },
            after: { status: 'pending', readiness: 'ready' },
            reason: `Unblocked by ${parentLabel} (parent #${input.id.slice(0, 8)}).`,
          }),
        ),
      )
    }
  }

  return {
    obligation: await toObligationPublicFromScoped(scoped, after),
    auditId,
  }
}

export async function bulkUpdateObligationStatus(
  scoped: ScopedRepo,
  userId: string,
  input: ObligationBulkStatusUpdateInput,
): Promise<ObligationBulkStatusUpdateOutput> {
  const ids = [...new Set(input.ids)]
  const beforeRows = await scoped.obligations.findManyByIds(ids)
  if (beforeRows.length !== ids.length) {
    throw new ORPCError('NOT_FOUND', {
      message: 'One or more selected obligations were not found in the current firm.',
    })
  }

  const changedRows = beforeRows.filter((row) => row.status !== input.status)
  if (changedRows.length === 0) {
    return { updatedCount: 0, auditIds: [] }
  }

  // Lifecycle v2: bulk transitions must each pass the matrix. Any
  // illegal source row blocks the entire batch so the partial-failure
  // surprise doesn't bite preparers mid-tax-week. (Per the brief's
  // bulk-error contract: "<N> rows skipped — illegal status transition")
  const illegalRow = changedRows.find(
    (row) => !isLegalObligationTransition(row.status, input.status),
  )
  if (illegalRow) {
    throw new ORPCError('BAD_REQUEST', {
      message: `Illegal status transition for obligation ${illegalRow.id}: ${illegalRow.status} → ${input.status}.`,
    })
  }

  await scoped.obligations.updateStatusMany(
    changedRows.map((row) => row.id),
    input.status,
  )
  const afterRows = await scoped.obligations.findManyByIds(changedRows.map((row) => row.id))
  const afterById = new Map(afterRows.map((row) => [row.id, row]))

  const { ids: auditIds } = await scoped.audit.writeBatch(
    changedRows.map((before) => {
      const event: Parameters<typeof scoped.audit.writeBatch>[0][number] = {
        actorId: userId,
        entityType: 'obligation_instance',
        entityId: before.id,
        action: 'obligation.status.updated',
        before: { status: before.status, readiness: before.readiness },
        after: {
          status: afterById.get(before.id)?.status ?? input.status,
          readiness: afterById.get(before.id)?.readiness ?? before.readiness,
        },
      }
      if (input.reason !== undefined) event.reason = input.reason
      return event
    }),
  )

  // Lifecycle v2 (slice 2d.4): cascade parent→child unblock for each
  // row in the bulk that landed at `completed`. Mirrors the single-
  // row path. Failures don't block the bulk write; cascades are
  // best-effort with their own audit trail. Reason includes the
  // parent's client name + tax type for readable child timelines
  // (slice 2d.4 polish).
  if (input.status === 'completed') {
    const cascades = await Promise.all(
      changedRows.map((row) =>
        scoped.obligations.unblockChildrenOf(row.id).then((childIds) =>
          childIds.map((childId) => ({
            parentId: row.id,
            parentClientId: row.clientId,
            parentTaxType: row.taxType,
            childId,
          })),
        ),
      ),
    )
    const allCascades = cascades.flat()
    if (allCascades.length > 0) {
      const parentClientIds = [...new Set(allCascades.map((c) => c.parentClientId))]
      const parentClients = await scoped.clients.findManyByIds(parentClientIds)
      const parentClientNameById = new Map(parentClients.map((c) => [c.id, c.name]))
      await Promise.all(
        allCascades.map(({ parentId, parentClientId, parentTaxType, childId }) => {
          const parentClientName = parentClientNameById.get(parentClientId) ?? 'Unknown client'
          return scoped.audit.write({
            actorId: userId,
            entityType: 'obligation_instance',
            entityId: childId,
            action: 'obligation.status.auto_unblocked',
            before: { status: 'blocked', readiness: 'needs_review' },
            after: { status: 'pending', readiness: 'ready' },
            reason: `Unblocked by ${parentClientName} · ${parentTaxType} (parent #${parentId.slice(0, 8)}, bulk).`,
          })
        }),
      )
    }
  }

  return {
    updatedCount: changedRows.length,
    auditIds,
  }
}

export async function decideObligationExtension(
  scoped: ScopedRepo,
  userId: string,
  input: ObligationExtensionDecisionInput,
): Promise<ObligationExtensionDecisionOutput> {
  const before = await scoped.obligations.findById(input.id)
  if (!before) {
    throw new ORPCError('NOT_FOUND', {
      message: `Obligation ${input.id} not found in current firm.`,
    })
  }

  const decidedAt = new Date()
  const memo = input.memo?.trim() || null
  const source = input.source?.trim() || null
  const expectedExtendedDueDate = input.expectedExtendedDueDate
    ? new Date(`${input.expectedExtendedDueDate}T00:00:00.000Z`)
    : null
  const nextStatus = input.decision === 'applied' ? 'extended' : before.status

  await scoped.obligations.updateExtensionDecision(input.id, {
    decision: input.decision,
    memo,
    source,
    expectedExtendedDueDate,
    decidedAt,
    decidedByUserId: userId,
    status: nextStatus,
  })
  const after = await scoped.obligations.findById(input.id)
  if (!after) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Updated obligation could not be re-read.',
    })
  }

  const evidence = await scoped.evidence.write({
    obligationInstanceId: input.id,
    sourceType: 'extension_decision',
    rawValue: JSON.stringify({
      decision: before.extensionDecision,
      memo: before.extensionMemo,
      source: before.extensionSource,
    }),
    normalizedValue: JSON.stringify({
      decision: input.decision,
      memo,
      source,
      expectedExtendedDueDate: input.expectedExtendedDueDate ?? null,
      paymentStillDue: true,
    }),
    appliedBy: userId,
  })

  const { id: auditId } = await scoped.audit.write({
    actorId: userId,
    entityType: 'obligation_instance',
    entityId: input.id,
    action: 'obligation.extension.decided',
    before: {
      status: before.status,
      extensionDecision: before.extensionDecision,
      extensionMemo: before.extensionMemo,
      extensionSource: before.extensionSource,
      extensionExpectedDueDate: before.extensionExpectedDueDate?.toISOString().slice(0, 10) ?? null,
    },
    after: {
      status: after.status,
      extensionDecision: after.extensionDecision,
      extensionMemo: after.extensionMemo,
      extensionSource: after.extensionSource,
      extensionExpectedDueDate: after.extensionExpectedDueDate?.toISOString().slice(0, 10) ?? null,
      paymentStillDue: true,
    },
    ...(memo ? { reason: memo } : {}),
  })

  return {
    obligation: await toObligationPublicFromScoped(scoped, after),
    auditId,
    evidenceId: evidence.id,
  }
}
