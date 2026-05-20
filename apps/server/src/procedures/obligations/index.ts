import { ORPCError } from '@orpc/server'
import type { ObligationInstancePublic } from '@duedatehq/contracts'
import { internalDeadlineFromBaseDueDate } from '@duedatehq/core/deadlines'
import { canEditTaxYearProfileForObligation, findRuleById } from '@duedatehq/core/rules'
import { requireTenant } from '../_context'
import {
  MIGRATION_RUN_ROLES,
  OBLIGATION_STATUS_WRITE_ROLES,
  requireCurrentFirmRole,
} from '../_permissions'
import { requirePracticeAiWorkflow } from '../_plan-gates'
import { os } from '../_root'
import { dateInTimezone, toAiInsightPublic } from '../_ai-insights'
import { enqueueAiInsightRefresh } from '../../jobs/ai-insights/enqueue'
import { enqueueDashboardBriefRefresh } from '../../jobs/dashboard-brief/enqueue'
import { recalculateObligationExposure } from '../_penalty-exposure'
import {
  bulkUpdateObligationStatus,
  decideObligationExtension,
  markObligationFiledRejected,
  toObligationPublic,
  updateObligationBlockedBy,
  updateObligationStatus,
} from './_service'
import { runAnnualRollover } from './_annual-rollover'
import { resolveUpdatedTaxYearProfilePlan } from './_tax-year-profile'

/**
 * obligations.* — Demo Sprint subset of the Obligation Domain Contract.
 *
 * Authority:
 *   - packages/contracts/src/obligations.ts (frozen contract)
 *   - docs/dev-file/06 §4.1 (procedures call scoped repo only)
 *
 * Scope (Day 3): unblock Migration Step 4 commit. We expose createBatch,
 * listByClient, and updateStatus (LYZ Obligations). `updateDueDate` belongs
 * to the pulse-apply path (Day 5+) and stays a stub.
 */

interface ObligationRow {
  id: string
  firmId: string
  clientId: string
  clientFilingProfileId: string | null
  taxType: string
  taxYear: number | null
  taxYearType: ObligationInstancePublic['taxYearType']
  fiscalYearEndMonth: number | null
  fiscalYearEndDay: number | null
  taxPeriodStart: Date | null
  taxPeriodEnd: Date | null
  taxPeriodKind: ObligationInstancePublic['taxPeriodKind']
  taxPeriodSource: ObligationInstancePublic['taxPeriodSource']
  taxPeriodReviewReason: string | null
  ruleId: string | null
  ruleVersion: number | null
  rulePeriod: string | null
  generationSource: ObligationInstancePublic['generationSource']
  jurisdiction: string | null
  obligationType: ObligationInstancePublic['obligationType']
  formName: string | null
  authority: string | null
  filingDueDate: Date | null
  paymentDueDate: Date | null
  sourceEvidenceJson: unknown
  recurrence: ObligationInstancePublic['recurrence']
  riskLevel: ObligationInstancePublic['riskLevel']
  baseDueDate: Date
  currentDueDate: Date
  status: ObligationInstancePublic['status']
  readiness: ObligationInstancePublic['readiness']
  extensionDecision: ObligationInstancePublic['extensionDecision']
  extensionMemo: string | null
  extensionSource: string | null
  extensionExpectedDueDate: Date | null
  extensionDecidedAt: Date | null
  extensionDecidedByUserId: string | null
  extensionState: ObligationInstancePublic['extensionState']
  extensionFormName: string | null
  extensionFiledAt: Date | null
  extensionAcceptedAt: Date | null
  prepStage: ObligationInstancePublic['prepStage']
  reviewStage: ObligationInstancePublic['reviewStage']
  reviewerUserId: string | null
  reviewCompletedAt: Date | null
  paymentState: ObligationInstancePublic['paymentState']
  paymentConfirmedAt: Date | null
  efileState: ObligationInstancePublic['efileState']
  efileAuthorizationForm: string | null
  efileSubmittedAt: Date | null
  efileAcceptedAt: Date | null
  efileRejectedAt: Date | null
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

const createBatch = os.obligations.createBatch.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, MIGRATION_RUN_ROLES)
  const { scoped, tenant, userId } = requireTenant(context)

  const repoInputs = input.obligations.map((o) => {
    const baseDueDate = new Date(o.baseDueDate)
    const repoInput: {
      clientId: string
      clientFilingProfileId?: string | null
      taxType: string
      taxYear: number | null
      taxYearType?: ObligationInstancePublic['taxYearType']
      fiscalYearEndMonth?: number | null
      fiscalYearEndDay?: number | null
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
      status?: ObligationInstancePublic['status']
      prepStage?: ObligationInstancePublic['prepStage']
      reviewStage?: ObligationInstancePublic['reviewStage']
      extensionState?: ObligationInstancePublic['extensionState']
      extensionFormName?: string | null
      paymentState?: ObligationInstancePublic['paymentState']
      efileState?: ObligationInstancePublic['efileState']
      efileAuthorizationForm?: string | null
      migrationBatchId: string | null
      estimatedTaxDueCents?: number | null
      estimatedExposureCents?: number | null
      exposureStatus?: ObligationInstancePublic['exposureStatus']
      penaltyFactsJson?: unknown
      penaltyFactsVersion?: string | null
      penaltyBreakdownJson?: unknown
      penaltyFormulaVersion?: string | null
      missingPenaltyFactsJson?: unknown
      penaltySourceRefsJson?: unknown
      penaltyFormulaLabel?: string | null
      exposureCalculatedAt?: Date | null
    } = {
      clientId: o.clientId,
      clientFilingProfileId: o.clientFilingProfileId ?? null,
      taxType: o.taxType,
      taxYear: o.taxYear ?? null,
      taxPeriodStart: o.taxPeriodStart ? new Date(o.taxPeriodStart) : null,
      taxPeriodEnd: o.taxPeriodEnd ? new Date(o.taxPeriodEnd) : null,
      taxPeriodKind: o.taxPeriodKind ?? 'unknown',
      taxPeriodSource: o.taxPeriodSource ?? 'unknown',
      taxPeriodReviewReason: o.taxPeriodReviewReason ?? null,
      ruleId: o.ruleId ?? null,
      ruleVersion: o.ruleVersion ?? null,
      rulePeriod: o.rulePeriod ?? null,
      generationSource: o.generationSource ?? null,
      jurisdiction: o.jurisdiction ?? null,
      obligationType: o.obligationType ?? 'filing',
      formName: o.formName ?? null,
      authority: o.authority ?? null,
      filingDueDate: o.filingDueDate ? new Date(o.filingDueDate) : null,
      paymentDueDate: o.paymentDueDate ? new Date(o.paymentDueDate) : null,
      sourceEvidenceJson: o.sourceEvidence ?? null,
      recurrence: o.recurrence ?? 'once',
      riskLevel: o.riskLevel ?? 'low',
      baseDueDate,
      currentDueDate: o.currentDueDate
        ? new Date(o.currentDueDate)
        : internalDeadlineFromBaseDueDate(baseDueDate, tenant.internalDeadlineOffsetDays),
      prepStage: o.prepStage ?? 'not_started',
      reviewStage: o.reviewStage ?? 'not_required',
      extensionState: o.extensionState ?? 'not_started',
      extensionFormName: o.extensionFormName ?? null,
      paymentState: o.paymentState ?? 'not_applicable',
      efileState: o.efileState ?? 'not_applicable',
      efileAuthorizationForm: o.efileAuthorizationForm ?? null,
      migrationBatchId: o.migrationBatchId ?? null,
      estimatedTaxDueCents: o.estimatedTaxDueCents ?? null,
      estimatedExposureCents: o.estimatedExposureCents ?? null,
      exposureStatus: o.exposureStatus ?? 'needs_input',
      penaltyFactsJson: o.penaltyFacts ?? null,
      penaltyFactsVersion: o.penaltyFactsVersion ?? null,
      penaltyBreakdownJson: o.penaltyBreakdown ?? [],
      penaltyFormulaVersion: o.penaltyFormulaVersion ?? null,
      missingPenaltyFactsJson: o.missingPenaltyFacts ?? [],
      penaltySourceRefsJson: o.penaltySourceRefs ?? [],
      penaltyFormulaLabel: o.penaltyFormulaLabel ?? null,
      exposureCalculatedAt: o.exposureCalculatedAt ? new Date(o.exposureCalculatedAt) : null,
    }
    if (o.taxYearType !== undefined) {
      repoInput.taxYearType = o.taxYearType
      repoInput.fiscalYearEndMonth =
        o.taxYearType === 'fiscal' ? (o.fiscalYearEndMonth ?? null) : null
      repoInput.fiscalYearEndDay = o.taxYearType === 'fiscal' ? (o.fiscalYearEndDay ?? null) : null
    }
    if (o.status !== undefined) repoInput.status = o.status
    return repoInput
  })

  const { ids } = await scoped.obligations.createBatch(repoInputs)

  await scoped.audit.write({
    actorId: userId,
    entityType: 'obligation_batch',
    entityId: ids[0] ?? 'empty',
    action: 'obligation.batch_created',
    after: { count: ids.length },
  })

  // Re-read so the response carries DB-persisted timestamps + canonical
  // status. Per-client readback is cheap because Step 4 commit always
  // groups input by client; fan out per unique clientId in parallel.
  const uniqueClients = Array.from(new Set(input.obligations.map((o) => o.clientId)))
  const idSet = new Set(ids)
  const [clients, rowSets] = await Promise.all([
    scoped.clients.findManyByIds(uniqueClients),
    Promise.all(uniqueClients.map((cid) => scoped.obligations.listByClient(cid))),
  ])
  const clientById = new Map(clients.map((client) => [client.id, client]))
  const allRows: ObligationRow[] = rowSets.flat().filter((row) => idSet.has(row.id))

  if (allRows.length !== ids.length) {
    // Defensive: re-read drift would mask a partial batch failure.
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Created obligations could not be re-read in full.',
    })
  }

  const asOfDate = dateInTimezone(tenant.timezone)
  return {
    obligations: allRows.map((row) =>
      toObligationPublic(row, { client: clientById.get(row.clientId), asOfDate }),
    ),
  }
})

const listByClient = os.obligations.listByClient.handler(async ({ input, context }) => {
  const { scoped, tenant } = requireTenant(context)
  const [client, rows] = await Promise.all([
    scoped.clients.findById(input.clientId),
    scoped.obligations.listByClient(input.clientId),
  ])
  const asOfDate = dateInTimezone(tenant.timezone)
  return rows.map((row) => toObligationPublic(row, { client, asOfDate }))
})

const previewAnnualRollover = os.obligations.previewAnnualRollover.handler(
  async ({ input, context }) => {
    await requireCurrentFirmRole(context, MIGRATION_RUN_ROLES)
    const { scoped, tenant, userId } = requireTenant(context)
    return runAnnualRollover({
      scoped,
      userId,
      params: input,
      mode: 'preview',
      internalDeadlineOffsetDays: tenant.internalDeadlineOffsetDays,
    })
  },
)

const createAnnualRollover = os.obligations.createAnnualRollover.handler(
  async ({ input, context }) => {
    await requireCurrentFirmRole(context, MIGRATION_RUN_ROLES)
    const { scoped, tenant, userId } = requireTenant(context)
    const result = await runAnnualRollover({
      scoped,
      userId,
      params: input,
      mode: 'create',
      internalDeadlineOffsetDays: tenant.internalDeadlineOffsetDays,
    })
    if (result.summary.createdCount > 0) {
      await enqueueDashboardBriefRefresh(context.env, {
        firmId: tenant.firmId,
        reason: 'annual_rollover',
      }).catch(() => false)
    }
    return result
  },
)

const updateDueDate = os.obligations.updateDueDate.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, tenant, userId } = requireTenant(context)
  const before = await scoped.obligations.findById(input.id)
  if (!before) {
    throw new ORPCError('NOT_FOUND', {
      message: `Obligation ${input.id} not found in current firm.`,
    })
  }

  await scoped.obligations.updateDueDate(
    input.id,
    new Date(`${input.currentDueDate}T00:00:00.000Z`),
  )
  await recalculateObligationExposure(scoped, input.id)
  const after = await scoped.obligations.findById(input.id)
  if (!after) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Updated obligation could not be re-read.',
    })
  }

  await scoped.audit.write({
    actorId: userId,
    entityType: 'obligation_instance',
    entityId: input.id,
    action: 'obligation.due_date.updated',
    before: { currentDueDate: before.currentDueDate.toISOString().slice(0, 10) },
    after: { currentDueDate: input.currentDueDate },
  })

  await enqueueDashboardBriefRefresh(context.env, {
    firmId: tenant.firmId,
    reason: 'due_date_update',
  }).catch(() => false)
  await enqueueAiInsightRefresh(context.env, {
    firmId: tenant.firmId,
    kind: 'deadline_tip',
    subjectId: input.id,
    reason: 'due_date_update',
  }).catch(() => false)

  const client = await scoped.clients.findById(after.clientId)
  return toObligationPublic(after, { client, asOfDate: dateInTimezone(tenant.timezone) })
})

const updateStatus = os.obligations.updateStatus.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, tenant, userId } = requireTenant(context)
  const result = await updateObligationStatus(scoped, userId, input)
  await enqueueDashboardBriefRefresh(context.env, {
    firmId: tenant.firmId,
    reason: 'status_change',
  }).catch(() => false)
  await enqueueAiInsightRefresh(context.env, {
    firmId: tenant.firmId,
    kind: 'deadline_tip',
    subjectId: input.id,
    reason: 'status_change',
  }).catch(() => false)
  return result
})

const markFiledRejected = os.obligations.markFiledRejected.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, tenant, userId } = requireTenant(context)
  const result = await markObligationFiledRejected(scoped, userId, input)
  await enqueueDashboardBriefRefresh(context.env, {
    firmId: tenant.firmId,
    reason: 'status_change',
  }).catch(() => false)
  return result
})

const updateBlockedBy = os.obligations.updateBlockedBy.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, tenant, userId } = requireTenant(context)
  const result = await updateObligationBlockedBy(scoped, userId, input)
  await enqueueDashboardBriefRefresh(context.env, {
    firmId: tenant.firmId,
    reason: 'status_change',
  }).catch(() => false)
  return result
})

const bulkUpdateStatus = os.obligations.bulkUpdateStatus.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, tenant, userId } = requireTenant(context)
  const result = await bulkUpdateObligationStatus(scoped, userId, input)
  if (result.updatedCount > 0) {
    await enqueueDashboardBriefRefresh(context.env, {
      firmId: tenant.firmId,
      reason: 'status_change',
    }).catch(() => false)
  }
  return result
})

const decideExtension = os.obligations.decideExtension.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped, tenant, userId } = requireTenant(context)
  const result = await decideObligationExtension(scoped, userId, input)
  await enqueueDashboardBriefRefresh(context.env, {
    firmId: tenant.firmId,
    reason: 'status_change',
  }).catch(() => false)
  await enqueueAiInsightRefresh(context.env, {
    firmId: tenant.firmId,
    kind: 'deadline_tip',
    subjectId: input.id,
    reason: 'status_change',
  }).catch(() => false)
  return result
})

function deadlineTipFallback(obligationId: string) {
  return [
    {
      key: 'what',
      label: 'What',
      text: 'Cached deadline tip is pending for this obligation.',
      citationRefs: [],
    },
    {
      key: 'why',
      label: 'Why',
      text: 'Smart Priority explains urgency with deterministic deadline, exposure, client risk, and readiness inputs.',
      citationRefs: [],
    },
    {
      key: 'prepare',
      label: 'Prepare',
      text: `Request a refresh after evidence or status changes for obligation ${obligationId}.`,
      citationRefs: [],
    },
  ]
}

const updateTaxYearProfile = os.obligations.updateTaxYearProfile.handler(
  async ({ input, context }) => {
    await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
    const { scoped, tenant, userId } = requireTenant(context)
    const before = await scoped.obligations.findById(input.id)
    if (!before) {
      throw new ORPCError('NOT_FOUND', {
        message: `Obligation ${input.id} not found in current firm.`,
      })
    }
    if (before.taxYear === null) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Only tax-year-specific obligations can update tax year profile.',
      })
    }
    const beforeRule = before.ruleId ? findRuleById(before.ruleId) : null
    if (
      !canEditTaxYearProfileForObligation({
        rule: beforeRule,
        taxType: before.taxType,
        taxYearType: before.taxYearType,
        taxPeriodKind: before.taxPeriodKind,
      })
    ) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'This obligation is not driven by a fiscal tax year.',
      })
    }

    const nextFiscalYearEndMonth = input.taxYearType === 'fiscal' ? input.fiscalYearEndMonth : null
    const nextFiscalYearEndDay = input.taxYearType === 'fiscal' ? input.fiscalYearEndDay : null
    const client = await scoped.clients.findById(before.clientId)
    if (!client) {
      throw new ORPCError('NOT_FOUND', {
        message: `Client ${before.clientId} for obligation ${input.id} was not found.`,
      })
    }
    const plan = resolveUpdatedTaxYearProfilePlan({
      row: before,
      client,
      taxYearType: input.taxYearType,
      fiscalYearEndMonth: nextFiscalYearEndMonth,
      fiscalYearEndDay: nextFiscalYearEndDay,
      internalDeadlineOffsetDays: tenant.internalDeadlineOffsetDays,
    })
    if (!plan) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Could not determine the statutory due date for this tax year profile.',
      })
    }
    if (plan.currentDueDate.getTime() > plan.baseDueDate.getTime()) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Internal deadline must be on or before the statutory deadline.',
      })
    }
    if (
      plan.filingDueDate &&
      plan.taxPeriodEnd &&
      plan.filingDueDate.getTime() < plan.taxPeriodEnd.getTime()
    ) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Statutory filing deadline must be on or after the tax period end.',
      })
    }

    await scoped.obligations.updateTaxYearProfile(input.id, {
      taxYearType: input.taxYearType,
      fiscalYearEndMonth: nextFiscalYearEndMonth,
      fiscalYearEndDay: nextFiscalYearEndDay,
      taxPeriodStart: plan.taxPeriodStart,
      taxPeriodEnd: plan.taxPeriodEnd,
      taxPeriodKind: plan.taxPeriodKind,
      taxPeriodSource: plan.taxPeriodSource,
      taxPeriodReviewReason: plan.taxPeriodReviewReason,
      baseDueDate: plan.baseDueDate,
      currentDueDate: plan.currentDueDate,
      filingDueDate: plan.filingDueDate,
      paymentDueDate: plan.paymentDueDate,
    })
    await recalculateObligationExposure(scoped, input.id)
    const after = await scoped.obligations.findById(input.id)
    if (!after) {
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Updated obligation could not be re-read.',
      })
    }

    const { id: auditId } = await scoped.audit.write({
      actorId: userId,
      entityType: 'obligation_instance',
      entityId: input.id,
      action: 'obligation.tax_year_profile.updated',
      before: {
        taxYearType: before.taxYearType,
        fiscalYearEndMonth: before.fiscalYearEndMonth,
        fiscalYearEndDay: before.fiscalYearEndDay,
        taxPeriodStart: before.taxPeriodStart?.toISOString().slice(0, 10) ?? null,
        taxPeriodEnd: before.taxPeriodEnd?.toISOString().slice(0, 10) ?? null,
        baseDueDate: before.baseDueDate.toISOString().slice(0, 10),
        currentDueDate: before.currentDueDate.toISOString().slice(0, 10),
        filingDueDate: before.filingDueDate?.toISOString().slice(0, 10) ?? null,
        paymentDueDate: before.paymentDueDate?.toISOString().slice(0, 10) ?? null,
      },
      after: {
        taxYearType: after.taxYearType,
        fiscalYearEndMonth: after.fiscalYearEndMonth,
        fiscalYearEndDay: after.fiscalYearEndDay,
        taxPeriodStart: after.taxPeriodStart?.toISOString().slice(0, 10) ?? null,
        taxPeriodEnd: after.taxPeriodEnd?.toISOString().slice(0, 10) ?? null,
        baseDueDate: after.baseDueDate.toISOString().slice(0, 10),
        currentDueDate: after.currentDueDate.toISOString().slice(0, 10),
        filingDueDate: after.filingDueDate?.toISOString().slice(0, 10) ?? null,
        paymentDueDate: after.paymentDueDate?.toISOString().slice(0, 10) ?? null,
      },
      ...(input.reason !== undefined ? { reason: input.reason } : {}),
    })

    await Promise.all([
      enqueueDashboardBriefRefresh(context.env, {
        firmId: tenant.firmId,
        reason: 'due_date_update',
      }).catch(() => false),
      enqueueAiInsightRefresh(context.env, {
        firmId: tenant.firmId,
        kind: 'deadline_tip',
        subjectId: input.id,
        reason: 'due_date_update',
      }).catch(() => false),
    ])

    const afterClient = client ?? (await scoped.clients.findById(after.clientId))
    return {
      obligation: toObligationPublic(after, {
        client: afterClient,
        asOfDate: dateInTimezone(tenant.timezone),
      }),
      auditId,
    }
  },
)

const getDeadlineTip = os.obligations.getDeadlineTip.handler(async ({ input, context }) => {
  const { scoped, tenant } = requireTenant(context)
  const obligation = await scoped.obligations.findById(input.obligationId)
  if (!obligation) {
    throw new ORPCError('NOT_FOUND', {
      message: `Obligation ${input.obligationId} not found in current firm.`,
    })
  }
  const asOfDate = dateInTimezone(tenant.timezone)
  const insight = await scoped.aiInsights.findLatest({
    kind: 'deadline_tip',
    subjectType: 'obligation',
    subjectId: input.obligationId,
    asOfDate,
  })
  return toAiInsightPublic(insight, {
    kind: 'deadline_tip',
    subjectId: input.obligationId,
    sections: deadlineTipFallback(input.obligationId),
  })
})

const requestDeadlineTipRefresh = os.obligations.requestDeadlineTipRefresh.handler(
  async ({ input, context }) => {
    const { scoped, tenant } = requireTenant(context)
    requirePracticeAiWorkflow(tenant.plan)
    const obligation = await scoped.obligations.findById(input.obligationId)
    if (!obligation) {
      throw new ORPCError('NOT_FOUND', {
        message: `Obligation ${input.obligationId} not found in current firm.`,
      })
    }
    const asOfDate = dateInTimezone(tenant.timezone)
    const latest = await scoped.aiInsights.findLatest({
      kind: 'deadline_tip',
      subjectType: 'obligation',
      subjectId: input.obligationId,
      asOfDate,
    })
    const pending =
      latest?.status === 'pending'
        ? latest
        : await scoped.aiInsights.createPending({
            kind: 'deadline_tip',
            subjectType: 'obligation',
            subjectId: input.obligationId,
            asOfDate,
            inputHash: `manual-refresh:${crypto.randomUUID()}`,
            reason: 'manual_refresh',
            output: latest?.output ?? undefined,
            citations: latest?.citations ?? undefined,
            generatedAt: latest?.generatedAt ?? null,
            expiresAt: latest?.expiresAt ?? null,
          })
    const queued = await enqueueAiInsightRefresh(context.env, {
      firmId: tenant.firmId,
      kind: 'deadline_tip',
      subjectId: input.obligationId,
      asOfDate,
      reason: 'manual_refresh',
    })
    return {
      queued,
      insight: toAiInsightPublic(pending, {
        kind: 'deadline_tip',
        subjectId: input.obligationId,
        sections: deadlineTipFallback(input.obligationId),
      }),
    }
  },
)

export const obligationsHandlers = {
  createBatch,
  previewAnnualRollover,
  createAnnualRollover,
  updateDueDate,
  updateTaxYearProfile,
  listByClient,
  updateStatus,
  markFiledRejected,
  updateBlockedBy,
  bulkUpdateStatus,
  decideExtension,
  getDeadlineTip,
  requestDeadlineTipRefresh,
}
