import {
  DashboardBriefCitationsSchema,
  type DashboardBriefPublic,
  type DashboardLoadOutput,
  type DashboardTopRow,
} from '@duedatehq/contracts'
import type { DashboardBriefRow } from '@duedatehq/ports/dashboard'
import { enqueueDashboardBriefRefresh } from '../../jobs/dashboard-brief/enqueue'
import { requireTenant } from '../_context'
import { requirePracticeAiWorkflow } from '../_plan-gates'
import { os } from '../_root'

interface DashboardRepoTopRow {
  obligationId: string
  clientId: string
  clientName: string
  clientEmail?: string | null
  taxType: string
  obligationType: DashboardTopRow['obligationType']
  currentDueDate: Date
  // 2026-05-27 (D12 — Agent ω): payment due date from the obligation
  // row. Threaded through so the dashboard render layer can detect
  // filed-but-payment-overdue cases (anti-pattern #1).
  paymentDueDate: Date | null
  status: DashboardTopRow['status']
  missingPenaltyFacts: string[]
  penaltySourceRefs: DashboardTopRow['penaltySourceRefs']
  penaltyFormulaLabel: string | null
  penaltyFactsVersion: string | null
  accruedPenaltyCents: number | null
  accruedPenaltyStatus: DashboardTopRow['accruedPenaltyStatus']
  accruedPenaltyBreakdown: DashboardTopRow['accruedPenaltyBreakdown']
  penaltyAsOfDate: string
  penaltyFormulaVersion: string | null
  severity: DashboardTopRow['severity']
  evidenceCount: number
  smartPriority: DashboardTopRow['smartPriority']
  primaryEvidence: {
    id: string
    obligationInstanceId: string | null
    aiOutputId: string | null
    sourceType: string
    sourceId: string | null
    sourceUrl: string | null
    verbatimQuote: string | null
    rawValue: string | null
    normalizedValue: string | null
    confidence: number | null
    model: string | null
    appliedAt: Date
  } | null
}

function dateInTimezone(timezone: string, date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return `${year}-${month}-${day}`
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function toTopRow(
  row: DashboardRepoTopRow,
  opts: { hideDollars?: boolean; hideSmartPriorityFactors?: boolean } = {},
): DashboardTopRow {
  return {
    obligationId: row.obligationId,
    clientId: row.clientId,
    clientName: row.clientName,
    clientEmail: row.clientEmail ?? null,
    taxType: row.taxType,
    obligationType: row.obligationType,
    currentDueDate: toDateOnly(row.currentDueDate),
    paymentDueDate: row.paymentDueDate ? toDateOnly(row.paymentDueDate) : null,
    status: row.status,
    missingPenaltyFacts: opts.hideDollars ? [] : row.missingPenaltyFacts,
    penaltySourceRefs: opts.hideDollars ? [] : row.penaltySourceRefs,
    penaltyFormulaLabel: opts.hideDollars ? null : row.penaltyFormulaLabel,
    penaltyFactsVersion: opts.hideDollars ? null : row.penaltyFactsVersion,
    accruedPenaltyCents: opts.hideDollars ? null : row.accruedPenaltyCents,
    accruedPenaltyStatus: row.accruedPenaltyStatus,
    accruedPenaltyBreakdown: opts.hideDollars ? [] : row.accruedPenaltyBreakdown,
    penaltyAsOfDate: row.penaltyAsOfDate,
    penaltyFormulaVersion: opts.hideDollars ? null : row.penaltyFormulaVersion,
    severity: row.severity,
    evidenceCount: row.evidenceCount,
    smartPriority: opts.hideSmartPriorityFactors
      ? { ...row.smartPriority, factors: [] }
      : row.smartPriority,
    primaryEvidence: row.primaryEvidence
      ? {
          id: row.primaryEvidence.id,
          obligationInstanceId: row.primaryEvidence.obligationInstanceId,
          aiOutputId: row.primaryEvidence.aiOutputId,
          sourceType: row.primaryEvidence.sourceType,
          sourceId: row.primaryEvidence.sourceId,
          sourceUrl: row.primaryEvidence.sourceUrl,
          verbatimQuote: row.primaryEvidence.verbatimQuote,
          rawValue: row.primaryEvidence.rawValue,
          normalizedValue: row.primaryEvidence.normalizedValue,
          confidence: row.primaryEvidence.confidence,
          model: row.primaryEvidence.model,
          appliedAt: row.primaryEvidence.appliedAt.toISOString(),
        }
      : null,
  }
}

function toBriefPublic(row: DashboardBriefRow | null): DashboardBriefPublic | null {
  if (!row) return null
  const citations = DashboardBriefCitationsSchema.safeParse(row.citations)
  return {
    status: row.status,
    generatedAt: row.generatedAt ? row.generatedAt.toISOString() : null,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    text: row.summaryText,
    citations: citations.success ? citations.data : null,
    aiOutputId: row.aiOutputId,
    errorCode: row.errorCode,
  }
}

const load = os.dashboard.load.handler(async ({ input, context }) => {
  const { scoped, tenant, userId } = requireTenant(context)
  const asOfDate = input?.asOfDate ?? dateInTimezone(tenant.timezone)
  const windowDays = input?.windowDays ?? 7
  const topLimit = input?.topLimit ?? 8
  const briefScope = input?.briefScope ?? 'firm'
  const result = await scoped.dashboard.load({
    asOfDate,
    windowDays,
    topLimit,
    briefScope,
    briefUserId: briefScope === 'me' ? userId : null,
    ...(input?.clientIds ? { clientIds: input.clientIds } : {}),
    ...(input?.taxTypes ? { taxTypes: input.taxTypes } : {}),
    ...(input?.dueBuckets ? { dueBuckets: input.dueBuckets } : {}),
    ...(input?.status ? { status: input.status } : {}),
    ...(input?.severity ? { severity: input.severity } : {}),
    ...(input?.evidence ? { evidence: input.evidence } : {}),
  })

  const actor = await context.vars.members?.findMembership(tenant.firmId, userId)
  const hideDollars = actor?.role === 'coordinator' && !tenant.coordinatorCanSeeDollars
  const hideSmartPriorityFactors = actor?.role !== 'owner'

  return {
    asOfDate: result.asOfDate,
    windowDays: result.windowDays,
    summary: {
      ...result.summary,
      totalAccruedPenaltyCents: hideDollars ? 0 : result.summary.totalAccruedPenaltyCents,
    },
    topRows: result.topRows.map((row) => toTopRow(row, { hideDollars, hideSmartPriorityFactors })),
    triageTabs: result.triageTabs.map((tab) => ({
      key: tab.key,
      label: tab.label,
      count: tab.count,
      rows: tab.rows.map((row) => toTopRow(row, { hideDollars, hideSmartPriorityFactors })),
    })),
    facets: result.facets,
    brief: toBriefPublic(result.brief),
  } satisfies DashboardLoadOutput
})

const requestBriefRefresh = os.dashboard.requestBriefRefresh.handler(async ({ input, context }) => {
  const { scoped, tenant, userId } = requireTenant(context)
  requirePracticeAiWorkflow(tenant.plan)
  const scope = input?.scope ?? 'firm'
  const asOfDate = dateInTimezone(tenant.timezone)
  const queued = await enqueueDashboardBriefRefresh(context.env, {
    firmId: tenant.firmId,
    scope,
    userId: scope === 'me' ? userId : null,
    asOfDate,
    reason: 'manual_refresh',
  })
  const brief = await scoped.dashboard.findLatestBrief({
    scope,
    asOfDate,
    userId: scope === 'me' ? userId : null,
  })
  return { queued, brief: toBriefPublic(brief) }
})

export const dashboardHandlers = { load, requestBriefRefresh }
