import { ORPCError } from '@orpc/server'
import type {
  ObligationBulkRemindSignatureInput,
  ObligationBulkRemindSignatureOutput,
  ObligationBulkSignatureReminderPreviewInput,
  ObligationBulkSignatureReminderPreviewOutput,
  ObligationBulkStatusUpdateInput,
  ObligationBulkStatusUpdateOutput,
  ObligationExtensionDecisionInput,
  ObligationExtensionDecisionOutput,
  ObligationInstancePublic,
  ObligationMarkFiledRejectedInput,
  ObligationRemindSignatureInput,
  ObligationRemindSignatureOutput,
  ObligationSignatureReminderPreviewInput,
  ObligationSignatureReminderPreviewOutput,
  SignatureReminderSample,
  ObligationStatusUpdateInput,
  ObligationStatusUpdateOutput,
  ObligationUpdateBlockedByInput,
  ObligationUpdateEfileStateInput,
  ObligationUpdatePrepStageInput,
  ObligationUpdateReviewStageInput,
} from '@duedatehq/contracts'
import {
  isLegalEfileTransition,
  isLegalObligationTransition,
  obligationUsesEfileAuthorization,
} from '@duedatehq/core/obligation-workflow'
import { formatTaxCode } from '@duedatehq/core/tax-codes'
import {
  renderTemplate,
  signatureReminderVars,
  SIGNATURE_REMINDER_BODY_TEMPLATE,
  SIGNATURE_REMINDER_SUBJECT_TEMPLATE,
  SIGNATURE_REMINDER_TOKENS,
} from '@duedatehq/core/email-template'
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

function parseIsoDateAsUtc(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`)
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

  // P0 signature-loop entry. Marking an e-file income return Filed
  // (status → `done`) is the deterministic way INTO "awaiting 8879
  // signature": generation seeds `authorization_requested` for
  // rule-created returns, but migration-imported and hand-added returns
  // land at `not_applicable` and could otherwise never enter the loop.
  // Forward-only — never clobber a row already walking the e-file
  // pipeline (e.g. already `submitted`).
  const efileLoopEntered =
    before.status !== 'done' &&
    input.status === 'done' &&
    (before.efileState ?? 'not_applicable') === 'not_applicable' &&
    obligationUsesEfileAuthorization(before.taxType)
  if (efileLoopEntered) {
    await scoped.obligations.setEfileState(input.id, 'authorization_requested')
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

  // Companion audit for the auto-entered signature loop (above), so the
  // timeline explains *why* the row is suddenly awaiting a signature
  // rather than leaving an unexplained efileState jump.
  if (efileLoopEntered) {
    await scoped.audit.write({
      actorId: userId,
      entityType: 'obligation_instance',
      entityId: input.id,
      action: 'obligation.efile.state.updated',
      before: { efileState: before.efileState ?? 'not_applicable' },
      after: { efileState: 'authorization_requested' },
      reason: 'Awaiting Form 8879 signature after filing.',
    })
  }

  // Companion audit event for the materials-received milestone.
  // When a row transitions from `waiting_on_client → review` the
  // primary `obligation.status.updated` event records the lifecycle
  // change, but reports that need to surface "this is when the
  // materials were considered complete for this filing" benefit from
  // a dedicated event. Fires only on this specific edge.
  if (before.status === 'waiting_on_client' && after.status === 'review') {
    await scoped.audit.write({
      actorId: userId,
      entityType: 'obligation_instance',
      entityId: input.id,
      action: 'readiness.materials_received',
      before: { status: before.status },
      after: { status: after.status },
    })
  }

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
 * and write the manual authority-response detail into an
 * `obligation.efile.rejected` audit row. The Rejected chip auto-renders
 * on the queue once efileRejectedAt + status='review' both hold (see
 * apps/app/src/features/obligations/rejection-chip.tsx).
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

  const rejectedAt = input.rejectedAt ? parseIsoDateAsUtc(input.rejectedAt) : new Date()
  const authority = input.authority?.trim() || null
  const reference = input.reference?.trim() || null
  const reason = input.reason.trim()
  if (!reason) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Authority rejection reason is required.',
    })
  }
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
    after: {
      status: string
      efileRejectedAt: string
      authority: string | null
      reference: string | null
      reason: string
      nextStep: ObligationMarkFiledRejectedInput['nextStep']
    }
    reason: string
  } = {
    actorId: userId,
    entityType: 'obligation_instance',
    entityId: input.id,
    action: 'obligation.efile.rejected',
    before: {
      status: before.status,
      efileAcceptedAt: before.efileAcceptedAt ? before.efileAcceptedAt.toISOString() : null,
    },
    after: {
      status: after.status,
      efileRejectedAt: rejectedAt.toISOString(),
      authority,
      reference,
      reason,
      nextStep: input.nextStep,
    },
    reason,
  }

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
    // Walk the blocker chain from the proposed parent. If we encounter
    // `input.id` before hitting null, the assignment would create a
    // cycle (A blocks B, B blocks A — or longer loops). Bounded to a
    // depth of 32 so a malformed graph in storage can't hang the
    // request.
    let cursor: string | null = parent.blockedByObligationInstanceId ?? null
    const visited = new Set<string>([nextParentId])
    for (let depth = 0; depth < 32 && cursor !== null; depth += 1) {
      if (cursor === input.id) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Cannot create a cycle in the blocker chain.',
        })
      }
      if (visited.has(cursor)) break
      visited.add(cursor)
      const next = await scoped.obligations.findById(cursor)
      cursor = next?.blockedByObligationInstanceId ?? null
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

  const candidateRows = beforeRows.filter((row) => row.status !== input.status)
  if (candidateRows.length === 0) {
    return { updatedCount: 0, skippedCount: 0, auditIds: [] }
  }

  // Lifecycle v2 bulk-error contract: silently skip rows whose source
  // status can't reach `input.status` per the transition matrix
  // (e.g. terminal `completed` rows in a "Set status → Waiting on
  // client" selection). Return the skipped count so the client can
  // surface "<N> deadlines skipped" alongside the success toast.
  // Throwing the whole batch was the prior behavior — it bit
  // preparers mid-tax-week when one stray closed row poisoned an
  // otherwise valid bulk action.
  const changedRows = candidateRows.filter((row) =>
    isLegalObligationTransition(row.status, input.status),
  )
  const skippedCount = candidateRows.length - changedRows.length
  if (changedRows.length === 0) {
    return { updatedCount: 0, skippedCount, auditIds: [] }
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

  // P0 signature-loop entry for the bulk path — mirror of the single-row
  // logic in updateObligationStatus. Bulk "Set status → Filed" on e-file
  // income returns drops them into "awaiting 8879 signature". Forward-only:
  // skip rows already walking the e-file pipeline. The companion audit ids
  // are intentionally not folded into the returned `auditIds` (those stay
  // one-per-status-change).
  if (input.status === 'done') {
    const efileLoopRows = changedRows.filter(
      (row) =>
        (row.efileState ?? 'not_applicable') === 'not_applicable' &&
        obligationUsesEfileAuthorization(row.taxType),
    )
    if (efileLoopRows.length > 0) {
      await Promise.all(
        efileLoopRows.map((row) =>
          scoped.obligations.setEfileState(row.id, 'authorization_requested'),
        ),
      )
      await scoped.audit.writeBatch(
        efileLoopRows.map((row) => ({
          actorId: userId,
          entityType: 'obligation_instance',
          entityId: row.id,
          action: 'obligation.efile.state.updated',
          before: { efileState: row.efileState ?? 'not_applicable' },
          after: { efileState: 'authorization_requested' },
          reason: 'Awaiting Form 8879 signature after filing.',
        })),
      )
    }
  }

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
    skippedCount,
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

/**
 * Advance the e-file sub-state pipeline (the `efileState` column). P0 wires
 * only `authorization_requested → authorization_signed` ("Mark 8879
 * signed"), but the procedure is generic so later slices reuse it. Never
 * touches `status`; the transition is validated by `isLegalEfileTransition`.
 */
export async function updateObligationEfileState(
  scoped: ScopedRepo,
  userId: string,
  input: ObligationUpdateEfileStateInput,
): Promise<ObligationStatusUpdateOutput> {
  const before = await scoped.obligations.findById(input.id)
  if (!before) {
    throw new ORPCError('NOT_FOUND', {
      message: `Deadline ${input.id} not found in current firm.`,
    })
  }

  const beforeEfileState = before.efileState ?? 'not_applicable'
  if (beforeEfileState === input.efileState) {
    return {
      obligation: await toObligationPublicFromScoped(scoped, before),
      auditId: '00000000-0000-0000-0000-000000000000',
    }
  }
  if (!isLegalEfileTransition(beforeEfileState, input.efileState)) {
    throw new ORPCError('BAD_REQUEST', {
      message: `Illegal e-file transition: ${beforeEfileState} → ${input.efileState}.`,
    })
  }

  await scoped.obligations.setEfileState(input.id, input.efileState)
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
    before: { efileState: string }
    after: { efileState: string }
    reason?: string
  } = {
    actorId: userId,
    entityType: 'obligation_instance',
    entityId: input.id,
    action: 'obligation.efile.state.updated',
    before: { efileState: beforeEfileState },
    after: { efileState: after.efileState ?? 'not_applicable' },
  }
  if (input.reason !== undefined) auditPayload.reason = input.reason
  const { id: auditId } = await scoped.audit.write(auditPayload)

  return { obligation: await toObligationPublicFromScoped(scoped, after), auditId }
}

// Built-in Form 8879 signature-reminder email. Unlike the readiness request
// there is no firm-configured template and no signing link — the firm collects
// the signature via its own channel (DocuSign / SafeSend / wet signature);
// this email is a plain nudge so "who hasn't signed" stops slipping through.
//
// The copy is a token template (see @duedatehq/core/email-template). Default
// AND CPA-edited overrides both run through `renderTemplate` against each
// recipient's vars, so a single edited template personalizes per client.

// Resolve the friendly form label for a client-facing email: prefer the
// obligation's own form name, fall back to the tax-code label
// (federal_1120s -> "Form 1120-S"), never leak the snake_case code.
function resolveForm(taxType: string, formName: string | null): string {
  return formName?.trim() || formatTaxCode(taxType) || taxType
}

// The single place "which address do we email" is decided — shared by the
// send path and the eligibility preview so the two can't drift.
function resolveClientEmail(
  clientRow: { email?: string | null; primaryContactEmail?: string | null } | null | undefined,
): string | null {
  return clientRow?.email?.trim() || clientRow?.primaryContactEmail?.trim() || null
}

// True when a row is actually waiting on the client's 8879 signature:
// marked filed (`done`) but the e-file pipeline is still parked at
// `authorization_requested`. Mirrors the queue "Awaiting signature" lens.
function isAwaitingSignature(row: ObligationRow): boolean {
  return row.status === 'done' && (row.efileState ?? 'not_applicable') === 'authorization_requested'
}

// Queue one signature-reminder email for an already-loaded awaiting-
// signature row and record the nudge in the audit log (so the drawer can
// surface "last reminded N days ago"). Returns emailQueued=false (and skips
// the audit) when the client has no email on file or notifications are
// unavailable. Does NOT trigger the EMAIL_QUEUE flush — the procedure
// handler does that once it has `context.env`.
async function enqueueSignatureReminder(
  scoped: ScopedRepo,
  userId: string,
  row: ObligationRow,
  override?: { subject?: string | undefined; body?: string | undefined },
): Promise<ObligationRemindSignatureOutput> {
  const clientRow = await scoped.clients.findById(row.clientId)
  const email = resolveClientEmail(clientRow)
  if (!clientRow || !email || !scoped.notifications) {
    return { auditId: null, emailQueued: false }
  }

  // Default and CPA-edited overrides are BOTH templates — substitute this
  // recipient's tokens so one edited template still personalizes per client.
  const vars = signatureReminderVars({
    clientName: clientRow.name,
    form: resolveForm(row.taxType, row.formName ?? null),
    taxYear: row.taxYear,
  })
  const rendered = {
    subject: renderTemplate(override?.subject?.trim() || SIGNATURE_REMINDER_SUBJECT_TEMPLATE, vars),
    text: renderTemplate(override?.body?.trim() || SIGNATURE_REMINDER_BODY_TEMPLATE, vars),
  }
  const queued = await scoped.notifications.enqueueEmail({
    externalId: `signature-reminder:${row.id}:${crypto.randomUUID()}`,
    type: 'signature_reminder',
    payloadJson: { recipients: [email], subject: rendered.subject, text: rendered.text },
  })
  const { id: auditId } = await scoped.audit.write({
    actorId: userId,
    entityType: 'obligation_instance',
    entityId: row.id,
    action: 'obligation.signature.reminded',
    after: { recipientEmail: 'present', emailQueued: queued.created },
  })
  return { auditId, emailQueued: queued.created }
}

/**
 * Email the client a nudge to sign Form 8879 for a single awaiting-signature
 * deadline. Rejects rows that aren't actually awaiting signature.
 */
export async function remindObligationSignature(
  scoped: ScopedRepo,
  userId: string,
  input: ObligationRemindSignatureInput,
): Promise<ObligationRemindSignatureOutput> {
  const row = await scoped.obligations.findById(input.id)
  if (!row) {
    throw new ORPCError('NOT_FOUND', {
      message: `Deadline ${input.id} not found in current firm.`,
    })
  }
  if (!isAwaitingSignature(row)) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'This deadline is not awaiting a Form 8879 signature.',
    })
  }
  return enqueueSignatureReminder(scoped, userId, row, {
    subject: input.subject,
    body: input.body,
  })
}

/**
 * Render the default signature-reminder email for an awaiting-signature
 * deadline so the drawer can show an editable preview before sending.
 * Read-only — queues nothing.
 */
export async function previewObligationSignatureReminder(
  scoped: ScopedRepo,
  input: ObligationSignatureReminderPreviewInput,
): Promise<ObligationSignatureReminderPreviewOutput> {
  const row = await scoped.obligations.findById(input.id)
  if (!row) {
    throw new ORPCError('NOT_FOUND', {
      message: `Deadline ${input.id} not found in current firm.`,
    })
  }
  const clientRow = await scoped.clients.findById(row.clientId)
  const clientName = clientRow?.name ?? 'there'
  const vars = signatureReminderVars({
    clientName,
    form: resolveForm(row.taxType, row.formName ?? null),
    taxYear: row.taxYear,
  })
  return {
    subjectTemplate: SIGNATURE_REMINDER_SUBJECT_TEMPLATE,
    bodyTemplate: SIGNATURE_REMINDER_BODY_TEMPLATE,
    tokens: [...SIGNATURE_REMINDER_TOKENS],
    recipientEmail: resolveClientEmail(clientRow),
    sample: { clientName, vars },
  }
}

/**
 * Bulk variant for the queue floating action bar. Silently skips rows that
 * aren't awaiting signature (`skippedCount`) and rows whose client has no
 * email on file (`noEmailCount`); `remindedCount` is the number actually
 * emailed. The handler triggers a single EMAIL_QUEUE flush afterward.
 */
export async function bulkRemindObligationSignature(
  scoped: ScopedRepo,
  userId: string,
  input: ObligationBulkRemindSignatureInput,
): Promise<ObligationBulkRemindSignatureOutput> {
  let remindedCount = 0
  let skippedCount = 0
  let noEmailCount = 0
  for (const id of input.ids) {
    const row = await scoped.obligations.findById(id)
    if (!row || !isAwaitingSignature(row)) {
      skippedCount += 1
      continue
    }
    const result = await enqueueSignatureReminder(scoped, userId, row, {
      subject: input.subject,
      body: input.body,
    })
    if (result.emailQueued) remindedCount += 1
    else noEmailCount += 1
  }
  return { remindedCount, skippedCount, noEmailCount }
}

/**
 * Read-only eligibility + default-template source for the bulk "Remind to
 * sign" dialog. Returns the same counts the send path produces (eligible /
 * not-awaiting / no-email) plus one eligible recipient for the live preview,
 * so the CPA sees exactly who will be emailed before sending. Queues nothing.
 */
export async function bulkPreviewObligationSignatureReminder(
  scoped: ScopedRepo,
  input: ObligationBulkSignatureReminderPreviewInput,
): Promise<ObligationBulkSignatureReminderPreviewOutput> {
  let skippedCount = 0
  let noEmailCount = 0
  // One preview entry per eligible row, in selection order, so the dialog can
  // page through every client that will actually be emailed (each mirrors a
  // real send). eligibleCount is derived from this to keep them in lockstep.
  const samples: SignatureReminderSample[] = []
  for (const id of input.ids) {
    const row = await scoped.obligations.findById(id)
    if (!row || !isAwaitingSignature(row)) {
      skippedCount += 1
      continue
    }
    const clientRow = await scoped.clients.findById(row.clientId)
    if (!clientRow || !resolveClientEmail(clientRow)) {
      noEmailCount += 1
      continue
    }
    samples.push({
      clientName: clientRow.name,
      vars: signatureReminderVars({
        clientName: clientRow.name,
        form: resolveForm(row.taxType, row.formName ?? null),
        taxYear: row.taxYear,
      }),
    })
  }
  return {
    subjectTemplate: SIGNATURE_REMINDER_SUBJECT_TEMPLATE,
    bodyTemplate: SIGNATURE_REMINDER_BODY_TEMPLATE,
    tokens: [...SIGNATURE_REMINDER_TOKENS],
    eligibleCount: samples.length,
    skippedCount,
    noEmailCount,
    samples,
  }
}
