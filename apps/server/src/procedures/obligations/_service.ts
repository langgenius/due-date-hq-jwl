import { ORPCError } from '@orpc/server'
import type {
  ObligationBulkStatusUpdateInput,
  ObligationBulkStatusUpdateOutput,
  ObligationExtensionDecisionInput,
  ObligationExtensionDecisionOutput,
  ObligationInstancePublic,
  ObligationMarkFiledRejectedInput,
  ObligationStatusUpdateInput,
  ObligationStatusUpdateOutput,
  ObligationUpdateBlockedByInput,
  ObligationUpdatePrepStageInput,
  ObligationUpdateReviewStageInput,
} from '@duedatehq/contracts'
import { isLegalObligationTransition } from '@duedatehq/core/obligation-workflow'
import type { ScopedRepo } from '@duedatehq/ports/scoped'
import { calculateAccruedPenalty } from '../_accrued-penalty'

interface ObligationRow {
  id: string
  firmId: string
  clientId: string
  clientFilingProfileId?: string | null
  taxType: string
  taxYear: number | null
  taxYearType: ObligationInstancePublic['taxYearType']
  fiscalYearEndMonth: number | null
  fiscalYearEndDay: number | null
  taxPeriodStart?: Date | null
  taxPeriodEnd?: Date | null
  taxPeriodKind?: ObligationInstancePublic['taxPeriodKind']
  taxPeriodSource?: ObligationInstancePublic['taxPeriodSource']
  taxPeriodReviewReason?: string | null
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
    taxYearType: row.taxYearType,
    fiscalYearEndMonth: row.fiscalYearEndMonth,
    fiscalYearEndDay: row.fiscalYearEndDay,
    taxPeriodStart: row.taxPeriodStart ? toIsoDate(row.taxPeriodStart) : null,
    taxPeriodEnd: row.taxPeriodEnd ? toIsoDate(row.taxPeriodEnd) : null,
    taxPeriodKind: row.taxPeriodKind ?? 'unknown',
    taxPeriodSource: row.taxPeriodSource ?? 'unknown',
    taxPeriodReviewReason: row.taxPeriodReviewReason ?? null,
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
    extensionInternalTargetDate: row.extensionExpectedDueDate
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

async function resetReviewSubSteps(scoped: ScopedRepo, obligationId: string): Promise<void> {
  await Promise.all([
    scoped.obligations.setPrepStage(obligationId, 'prepared'),
    scoped.obligations.setReviewStage(obligationId, 'in_review'),
  ])
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
      message: `Deadline ${input.id} not found in current firm.`,
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

  const enteringReview = before.status !== 'review' && input.status === 'review'
  await scoped.obligations.updateStatus(input.id, input.status)
  if (enteringReview) {
    await resetReviewSubSteps(scoped, input.id)
  }
  const after = await scoped.obligations.findById(input.id)
  if (!after) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Updated deadline could not be re-read.',
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

/**
 * Filed → e-file rejected unwind (PDF anti-pattern #3: Filed ≠ Done).
 *
 * Caller holds a row in `done` ("Filed"). We stamp `efile_rejected_at`,
 * clear any prior acceptance timestamp, transition status to `review`,
 * and write an `obligation.efile.rejected` audit row. The Rejected
 * chip auto-renders on the queue once efileRejectedAt + status='review'
 * both hold (see apps/app/src/features/obligations/rejection-chip.tsx).
 */
export async function markObligationFiledRejected(
  scoped: ScopedRepo,
  userId: string,
  input: ObligationMarkFiledRejectedInput,
): Promise<ObligationStatusUpdateOutput> {
  const before = await scoped.obligations.findById(input.id)
  if (!before) {
    throw new ORPCError('NOT_FOUND', {
      message: `Deadline ${input.id} not found in current firm.`,
    })
  }
  if (before.status !== 'done') {
    throw new ORPCError('BAD_REQUEST', {
      message: `Only a Filed deadline can be marked rejected. Current status: ${before.status}.`,
    })
  }

  const rejectedAt = new Date()
  await scoped.obligations.setEfileRejected(input.id, { rejectedAt, nextStatus: 'review' })
  await resetReviewSubSteps(scoped, input.id)
  const after = await scoped.obligations.findById(input.id)
  if (!after) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Updated deadline could not be re-read.',
    })
  }

  const auditPayload: {
    actorId: string
    entityType: string
    entityId: string
    action: string
    before: { status: string; efileAcceptedAt: string | null }
    after: { status: string; efileRejectedAt: string }
    reason?: string
  } = {
    actorId: userId,
    entityType: 'obligation_instance',
    entityId: input.id,
    action: 'obligation.efile.rejected',
    before: {
      status: before.status,
      efileAcceptedAt: before.efileAcceptedAt ? before.efileAcceptedAt.toISOString() : null,
    },
    after: { status: after.status, efileRejectedAt: rejectedAt.toISOString() },
  }
  if (input.reason !== undefined) auditPayload.reason = input.reason

  const { id: auditId } = await scoped.audit.write(auditPayload)

  return {
    obligation: await toObligationPublicFromScoped(scoped, after),
    auditId,
  }
}

/**
 * K-1 dependency wiring (PDF anti-pattern #4 + §6.4).
 *
 * Set or clear `blocked_by_obligation_instance_id`. When the pointer
 * is set, status flips to `blocked`; when cleared (only legal from
 * `blocked`), status reverts to `pending`. Auto-unblock on parent
 * completion is handled separately by updateObligationStatus →
 * unblockChildrenOf.
 */
export async function updateObligationBlockedBy(
  scoped: ScopedRepo,
  userId: string,
  input: ObligationUpdateBlockedByInput,
): Promise<ObligationStatusUpdateOutput> {
  const before = await scoped.obligations.findById(input.id)
  if (!before) {
    throw new ORPCError('NOT_FOUND', {
      message: `Deadline ${input.id} not found in current firm.`,
    })
  }
  const nextParentId = input.blockedByObligationInstanceId
  if (nextParentId === input.id) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'A deadline cannot block itself.',
    })
  }
  if (nextParentId !== null) {
    const parent = await scoped.obligations.findById(nextParentId)
    if (!parent) {
      throw new ORPCError('NOT_FOUND', {
        message: `Parent deadline ${nextParentId} not found in current firm.`,
      })
    }
    if (parent.status === 'completed') {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Cannot mark blocked by an already-completed deadline.',
      })
    }
  } else if (before.status !== 'blocked') {
    // Clearing a blocker on a row that isn't currently blocked is a
    // no-op; we still allow it (idempotent) so the UI can call
    // updateBlockedBy(null) defensively.
  }

  const nextStatus = nextParentId !== null ? 'blocked' : 'pending'
  await scoped.obligations.setBlockedBy(input.id, { blockedBy: nextParentId, nextStatus })
  const after = await scoped.obligations.findById(input.id)
  if (!after) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Updated deadline could not be re-read.',
    })
  }

  const auditPayload: {
    actorId: string
    entityType: string
    entityId: string
    action: string
    before: { status: string; blockedBy: string | null }
    after: { status: string; blockedBy: string | null }
    reason?: string
  } = {
    actorId: userId,
    entityType: 'obligation_instance',
    entityId: input.id,
    action: nextParentId !== null ? 'obligation.blocked_by.set' : 'obligation.blocked_by.cleared',
    before: { status: before.status, blockedBy: before.blockedByObligationInstanceId ?? null },
    after: { status: after.status, blockedBy: nextParentId },
  }
  if (input.reason !== undefined) auditPayload.reason = input.reason

  const { id: auditId } = await scoped.audit.write(auditPayload)

  return {
    obligation: await toObligationPublicFromScoped(scoped, after),
    auditId,
  }
}

/**
 * In Review sub-status mutations — `prep_stage` and `review_stage`.
 *
 * The obligation drawer presents these as a collapsed workflow, but
 * the underlying columns remain independently auditable. Any value→any
 * value is still legal because existing rows may need manual correction.
 *
 * Same NOT_FOUND / no-op / re-read pattern as `updateObligationStatus`.
 * Audit row mirrors the `status_changed` shape with the relevant
 * column in `before` / `after`. Action strings (`obligation.prep_stage.
 * updated` / `obligation.review_stage.updated`) follow the existing
 * `obligation.*` namespace used by `obligation.status.updated`,
 * `obligation.efile.rejected`, etc.
 *
 * See docs/Design/in-review-substatus-mutations-2026-05-23.md.
 */
export async function updateObligationPrepStage(
  scoped: ScopedRepo,
  userId: string,
  input: ObligationUpdatePrepStageInput,
): Promise<ObligationStatusUpdateOutput> {
  const before = await scoped.obligations.findById(input.id)
  if (!before) {
    throw new ORPCError('NOT_FOUND', {
      message: `Deadline ${input.id} not found in current firm.`,
    })
  }

  if (before.prepStage === input.prepStage) {
    return {
      obligation: await toObligationPublicFromScoped(scoped, before),
      auditId: '00000000-0000-0000-0000-000000000000',
    }
  }

  await scoped.obligations.setPrepStage(input.id, input.prepStage)
  const after = await scoped.obligations.findById(input.id)
  if (!after) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Updated deadline could not be re-read.',
    })
  }

  const auditPayload: {
    actorId: string
    entityType: string
    entityId: string
    action: string
    before: { prepStage: string }
    after: { prepStage: string }
    reason?: string
  } = {
    actorId: userId,
    entityType: 'obligation_instance',
    entityId: input.id,
    action: 'obligation.prep_stage.updated',
    before: { prepStage: before.prepStage },
    after: { prepStage: after.prepStage },
  }
  if (input.reason !== undefined) auditPayload.reason = input.reason

  const { id: auditId } = await scoped.audit.write(auditPayload)

  return {
    obligation: await toObligationPublicFromScoped(scoped, after),
    auditId,
  }
}

export async function updateObligationReviewStage(
  scoped: ScopedRepo,
  userId: string,
  input: ObligationUpdateReviewStageInput,
): Promise<ObligationStatusUpdateOutput> {
  const before = await scoped.obligations.findById(input.id)
  if (!before) {
    throw new ORPCError('NOT_FOUND', {
      message: `Deadline ${input.id} not found in current firm.`,
    })
  }

  if (before.reviewStage === input.reviewStage) {
    return {
      obligation: await toObligationPublicFromScoped(scoped, before),
      auditId: '00000000-0000-0000-0000-000000000000',
    }
  }

  await scoped.obligations.setReviewStage(input.id, input.reviewStage)
  const after = await scoped.obligations.findById(input.id)
  if (!after) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Updated deadline could not be re-read.',
    })
  }

  const auditPayload: {
    actorId: string
    entityType: string
    entityId: string
    action: string
    before: { reviewStage: string }
    after: { reviewStage: string }
    reason?: string
  } = {
    actorId: userId,
    entityType: 'obligation_instance',
    entityId: input.id,
    action: 'obligation.review_stage.updated',
    before: { reviewStage: before.reviewStage },
    after: { reviewStage: after.reviewStage },
  }
  if (input.reason !== undefined) auditPayload.reason = input.reason

  const { id: auditId } = await scoped.audit.write(auditPayload)

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
      message: 'One or more selected deadlines were not found in the current firm.',
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
      message: `Illegal status transition for deadline ${illegalRow.id}: ${illegalRow.status} → ${input.status}.`,
    })
  }

  await scoped.obligations.updateStatusMany(
    changedRows.map((row) => row.id),
    input.status,
  )
  if (input.status === 'review') {
    await Promise.all(changedRows.map((row) => resetReviewSubSteps(scoped, row.id)))
  }
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
      message: `Deadline ${input.id} not found in current firm.`,
    })
  }

  const decidedAt = new Date()
  const memo = input.memo?.trim() || null
  const source = input.source?.trim() || null
  const filingDeadline = before.filingDueDate ?? before.baseDueDate
  const filingDeadlineIso = toIsoDate(filingDeadline)
  if (input.internalTargetDate && input.internalTargetDate > filingDeadlineIso) {
    throw new ORPCError('BAD_REQUEST', {
      message: `Internal extension target date must be on or before filing deadline ${filingDeadlineIso}.`,
    })
  }

  const internalTargetDate = input.internalTargetDate
    ? new Date(`${input.internalTargetDate}T00:00:00.000Z`)
    : null
  const nextStatus = 'extended'

  await scoped.obligations.updateExtensionDecision(input.id, {
    decision: 'applied',
    memo,
    source,
    internalTargetDate,
    decidedAt,
    decidedByUserId: userId,
    status: nextStatus,
  })
  const after = await scoped.obligations.findById(input.id)
  if (!after) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Updated deadline could not be re-read.',
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
      decision: 'applied',
      memo,
      source,
      internalTargetDate: input.internalTargetDate ?? null,
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
      extensionInternalTargetDate:
        before.extensionExpectedDueDate?.toISOString().slice(0, 10) ?? null,
    },
    after: {
      status: after.status,
      extensionDecision: after.extensionDecision,
      extensionMemo: after.extensionMemo,
      extensionSource: after.extensionSource,
      extensionInternalTargetDate:
        after.extensionExpectedDueDate?.toISOString().slice(0, 10) ?? null,
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
