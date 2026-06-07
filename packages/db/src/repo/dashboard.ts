import { asc, and, count, desc, eq, gte, inArray, isNull, lte } from 'drizzle-orm'
import type {
  DashboardBriefCreatePendingInput,
  DashboardBriefFailedInput,
  DashboardBriefReadyInput,
  DashboardBriefRow,
  DashboardDueBucket,
  DashboardEvidenceFilter,
  DashboardFacetOption,
  DashboardFacetsOutput,
} from '@duedatehq/ports/dashboard'
import type {
  DashboardBriefScope,
  DashboardBriefStatus,
  ExposureStatus,
  ObligationType,
} from '@duedatehq/ports/shared'
import { OPEN_OBLIGATION_STATUSES } from '@duedatehq/core/obligation-workflow'
import { estimateAccruedPenalty } from '@duedatehq/core/penalty'
import type { PenaltyBreakdownItem, PenaltySourceRef } from '@duedatehq/core/penalty'
import { statutoryPenaltyDueDate } from '@duedatehq/core/deadlines'
import { rankSmartPriorities } from '@duedatehq/core/priority'
import type { SmartPriorityProfile } from '@duedatehq/core/priority'
import type { SmartPriorityBreakdown } from '@duedatehq/ports/priority'
import type { Db } from '../client'
import { evidenceLink } from '../schema/audit'
import { client } from '../schema/clients'
import { dashboardBrief, userDashboardVisit } from '../schema/dashboard'
import { firmProfile } from '../schema/firm'
import { reminder } from '../schema/notifications'
import { obligationInstance, type ObligationStatus } from '../schema/obligations'
import { pulseFirmAlert } from '../schema/pulse'
import { listActiveOverlayDueDateSet } from './overlay'
import { toSmartPriorityProfile } from './priority-profile'

const OPEN_STATUSES = [...OPEN_OBLIGATION_STATUSES] satisfies ObligationStatus[]
const EVIDENCE_BATCH_SIZE = 90
const DAY_MS = 24 * 60 * 60 * 1000
const DASHBOARD_DUE_BUCKETS = [
  'overdue',
  'today',
  'next_7_days',
  'next_30_days',
  'long_term',
] as const satisfies readonly DashboardDueBucket[]
const DASHBOARD_EVIDENCE_FILTERS = [
  'needs',
  'linked',
] as const satisfies readonly DashboardEvidenceFilter[]
const DASHBOARD_SEVERITIES = [
  'critical',
  'high',
  'medium',
  'neutral',
] as const satisfies readonly DashboardSeverity[]

export type DashboardSeverity = 'critical' | 'high' | 'medium' | 'neutral'
export type DashboardTriageTabKey = 'this_week' | 'this_month' | 'long_term'

export interface DashboardLoadInput {
  asOfDate: string
  windowDays?: number
  topLimit?: number
  briefScope?: DashboardBriefScope
  briefUserId?: string | null
  clientIds?: string[]
  taxTypes?: string[]
  dueBuckets?: DashboardDueBucket[]
  status?: ObligationStatus[]
  severity?: DashboardSeverity[]
  evidence?: DashboardEvidenceFilter[]
}

export interface DashboardEvidenceRow {
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
}

export interface DashboardRawRow {
  obligationId: string
  clientId: string
  clientName: string
  clientEmail: string | null
  taxType: string
  // 2026-06-03 (Yuqi /critique pass): obligation type threaded
  // from DB to dashboard render layer so the ActionsTable can
  // render a TYPE column distinguishing the 6 obligation types.
  obligationType: ObligationType
  filingDueDate: Date | null
  paymentDueDate: Date | null
  baseDueDate: Date
  currentDueDate: Date
  status: ObligationStatus
  penaltyFormulaVersion: string | null
  penaltyFactsJson?: unknown
  penaltyFactsVersion?: string | null
  missingPenaltyFactsJson?: unknown
  penaltySourceRefsJson?: unknown
  penaltyFormulaLabel?: string | null
  clientState: string | null
  clientEntityType: string | null
  clientEstimatedTaxLiabilityCents: number | null
  clientEquityOwnerCount: number | null
  importanceWeight?: number
  lateFilingCountLast12mo?: number
}

export interface DashboardTopRow extends DashboardRawRow {
  missingPenaltyFacts: string[]
  penaltySourceRefs: PenaltySourceRef[]
  penaltyFormulaLabel: string | null
  penaltyFactsVersion: string | null
  accruedPenaltyCents: number | null
  accruedPenaltyStatus: ExposureStatus
  accruedPenaltyBreakdown: PenaltyBreakdownItem[]
  penaltyAsOfDate: string
  severity: DashboardSeverity
  evidenceCount: number
  primaryEvidence: DashboardEvidenceRow | null
  smartPriority: SmartPriorityBreakdown
}

export interface DashboardTriageTab {
  key: DashboardTriageTabKey
  label: string
  count: number
  rows: DashboardTopRow[]
}

export interface DashboardLoadResult {
  asOfDate: string
  windowDays: number
  summary: {
    openObligationCount: number
    dueThisWeekCount: number
    needsReviewCount: number
    evidenceGapCount: number
    totalAccruedPenaltyCents: number
    accruedPenaltyReadyCount: number
    accruedPenaltyNeedsInputCount: number
    accruedPenaltyUnsupportedCount: number
  }
  topRows: DashboardTopRow[]
  triageTabs: DashboardTriageTab[]
  facets: DashboardFacetsOutput
  brief: DashboardBriefRow | null
}

function parseDateOnly(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`)
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function severityForDueDate(
  dueDate: Date,
  asOfDate: string,
  status: ObligationStatus,
): DashboardSeverity {
  const days = Math.floor(
    (parseDateOnly(toDateOnly(dueDate)).getTime() - parseDateOnly(asOfDate).getTime()) / DAY_MS,
  )
  if (days <= 2) return 'critical'
  if (days <= 7) return 'high'
  if (status === 'review' || days <= 14) return 'medium'
  return 'neutral'
}

function triageKeyForDays(days: number): DashboardTriageTabKey | null {
  if (days <= 7) return 'this_week'
  if (days <= 30) return 'this_month'
  if (days <= 180) return 'long_term'
  return null
}

function dueBucketForDays(days: number): DashboardDueBucket | null {
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  if (days <= 7) return 'next_7_days'
  if (days <= 30) return 'next_30_days'
  if (days <= 180) return 'long_term'
  return null
}

function daysUntilDueFromDate(dueDate: Date, asOfDate: string): number {
  return Math.floor(
    (parseDateOnly(toDateOnly(dueDate)).getTime() - parseDateOnly(asOfDate).getTime()) / DAY_MS,
  )
}

function uniqueNonEmpty(values: readonly string[] | undefined): string[] {
  return [
    ...new Set((values ?? []).map((value) => value.trim()).filter((value) => value.length > 0)),
  ]
}

function incrementFacet(
  facets: Map<string, DashboardFacetOption>,
  value: string,
  label = value,
): void {
  const current = facets.get(value)
  if (current) {
    current.count += 1
    return
  }
  facets.set(value, { value, label, count: 1 })
}

function compareFacetLabels(
  a: Pick<DashboardFacetOption, 'label' | 'value'>,
  b: Pick<DashboardFacetOption, 'label' | 'value'>,
): number {
  const labelDelta = a.label.localeCompare(b.label)
  if (labelDelta !== 0) return labelDelta
  return a.value.localeCompare(b.value)
}

function enumFacetOptions<T extends string>(
  values: readonly T[],
  counts: Map<string, number>,
): Array<DashboardFacetOption & { value: T }> {
  return values.map((value) => ({ value, label: value, count: counts.get(value) ?? 0 }))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
}

function parsePenaltySourceRefs(value: unknown): PenaltySourceRef[] {
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

function matchesDashboardFilters(
  row: DashboardTopRow,
  input: DashboardLoadInput,
  asOfMs: number,
): boolean {
  const clientIds = uniqueNonEmpty(input.clientIds)
  if (clientIds.length > 0 && !clientIds.includes(row.clientId)) return false

  const taxTypes = uniqueNonEmpty(input.taxTypes)
  if (taxTypes.length > 0 && !taxTypes.includes(row.taxType)) return false

  const days = Math.floor(
    (parseDateOnly(toDateOnly(row.currentDueDate)).getTime() - asOfMs) / DAY_MS,
  )
  const dueBucket = dueBucketForDays(days)
  if (input.dueBuckets && input.dueBuckets.length > 0) {
    if (!dueBucket || !input.dueBuckets.includes(dueBucket)) return false
  }

  if (input.status && input.status.length > 0 && !input.status.includes(row.status)) return false
  if (input.severity && input.severity.length > 0 && !input.severity.includes(row.severity)) {
    return false
  }

  if (input.evidence && input.evidence.length > 0) {
    const evidenceState: DashboardEvidenceFilter = row.evidenceCount === 0 ? 'needs' : 'linked'
    if (!input.evidence.includes(evidenceState)) return false
  }

  return true
}

function composeDashboardFacets(rows: DashboardTopRow[], asOfMs: number): DashboardFacetsOutput {
  const clients = new Map<string, DashboardFacetOption>()
  const taxTypes = new Map<string, DashboardFacetOption>()
  const dueBucketCounts = new Map<string, number>()
  const statusCounts = new Map<string, number>()
  const severityCounts = new Map<string, number>()
  const evidenceCounts = new Map<string, number>()

  for (const row of rows) {
    const days = Math.floor(
      (parseDateOnly(toDateOnly(row.currentDueDate)).getTime() - asOfMs) / DAY_MS,
    )
    if (!triageKeyForDays(days)) continue

    incrementFacet(clients, row.clientId, row.clientName)
    incrementFacet(taxTypes, row.taxType)
    const dueBucket = dueBucketForDays(days)
    if (dueBucket) dueBucketCounts.set(dueBucket, (dueBucketCounts.get(dueBucket) ?? 0) + 1)
    statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1)
    severityCounts.set(row.severity, (severityCounts.get(row.severity) ?? 0) + 1)
    const evidenceState: DashboardEvidenceFilter = row.evidenceCount === 0 ? 'needs' : 'linked'
    evidenceCounts.set(evidenceState, (evidenceCounts.get(evidenceState) ?? 0) + 1)
  }

  return {
    clients: [...clients.values()].toSorted(compareFacetLabels),
    taxTypes: [...taxTypes.values()].toSorted(compareFacetLabels),
    dueBuckets: enumFacetOptions(DASHBOARD_DUE_BUCKETS, dueBucketCounts),
    statuses: enumFacetOptions(OPEN_STATUSES, statusCounts),
    severities: enumFacetOptions(DASHBOARD_SEVERITIES, severityCounts),
    evidence: enumFacetOptions(DASHBOARD_EVIDENCE_FILTERS, evidenceCounts),
  }
}

export function composeDashboardLoad(
  rows: DashboardRawRow[],
  evidenceRows: DashboardEvidenceRow[],
  input: DashboardLoadInput,
  smartPriorityProfile?: SmartPriorityProfile | null,
): DashboardLoadResult {
  const windowDays = input.windowDays ?? 7
  const topLimit = input.topLimit ?? 8
  const evidenceByObligation = new Map<string, DashboardEvidenceRow[]>()

  for (const evidence of evidenceRows) {
    if (!evidence.obligationInstanceId) continue
    const bucket = evidenceByObligation.get(evidence.obligationInstanceId) ?? []
    bucket.push(evidence)
    evidenceByObligation.set(evidence.obligationInstanceId, bucket)
  }

  for (const bucket of evidenceByObligation.values()) {
    bucket.sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime())
  }

  let dueThisWeekCount = 0
  let needsReviewCount = 0
  let evidenceGapCount = 0
  let totalAccruedPenaltyCents = 0
  let accruedPenaltyReadyCount = 0
  let accruedPenaltyNeedsInputCount = 0
  let accruedPenaltyUnsupportedCount = 0
  const asOf = parseDateOnly(input.asOfDate).getTime()
  const topRowDrafts: Array<Omit<DashboardTopRow, 'smartPriority'>> = []

  for (const row of rows) {
    const days = daysUntilDueFromDate(row.currentDueDate, input.asOfDate)
    const inUrgentWindow = days <= windowDays
    const isOverdue = days < 0
    const evidence = evidenceByObligation.get(row.obligationId) ?? []
    const accrued = estimateAccruedPenalty(
      {
        jurisdiction: row.clientState,
        taxType: row.taxType,
        entityType: row.clientEntityType,
        dueDate: statutoryPenaltyDueDate(row),
        penaltyFactsJson: row.penaltyFactsJson,
      },
      { asOfDate: input.asOfDate },
    )
    if (inUrgentWindow) dueThisWeekCount += 1
    if (row.status === 'review') needsReviewCount += 1
    if (evidence.length === 0) evidenceGapCount += 1
    if (isOverdue && accrued.status === 'ready') {
      accruedPenaltyReadyCount += 1
      totalAccruedPenaltyCents += accrued.estimatedExposureCents ?? 0
    } else if (isOverdue && accrued.status === 'needs_input') {
      accruedPenaltyNeedsInputCount += 1
    } else if (isOverdue && accrued.status === 'unsupported') {
      accruedPenaltyUnsupportedCount += 1
    }

    topRowDrafts.push({
      ...row,
      accruedPenaltyCents: accrued.estimatedExposureCents,
      accruedPenaltyStatus: accrued.status,
      accruedPenaltyBreakdown: accrued.breakdown,
      penaltyAsOfDate: input.asOfDate,
      missingPenaltyFacts: parseStringArray(row.missingPenaltyFactsJson),
      penaltySourceRefs: parsePenaltySourceRefs(row.penaltySourceRefsJson),
      penaltyFormulaLabel: row.penaltyFormulaLabel ?? null,
      penaltyFactsVersion: row.penaltyFactsVersion ?? null,
      severity: severityForDueDate(row.currentDueDate, input.asOfDate, row.status),
      evidenceCount: evidence.length,
      primaryEvidence: evidence[0] ?? null,
    })
  }

  const topRows: DashboardTopRow[] = rankSmartPriorities(
    topRowDrafts.map((row) =>
      Object.assign({}, row, {
        asOfDate: input.asOfDate,
        importanceWeight: row.importanceWeight ?? 2,
        lateFilingCountLast12mo: row.lateFilingCountLast12mo ?? 0,
      }),
    ),
    smartPriorityProfile,
  ).map(({ row, smartPriority }) =>
    Object.assign({}, row, {
      smartPriority,
    }),
  )

  const filteredRows = topRows.filter((row) => matchesDashboardFilters(row, input, asOf))
  const facets = composeDashboardFacets(topRows, asOf)

  const triage = new Map<DashboardTriageTabKey, { count: number; rows: DashboardTopRow[] }>([
    ['this_week', { count: 0, rows: [] }],
    ['this_month', { count: 0, rows: [] }],
    ['long_term', { count: 0, rows: [] }],
  ])

  for (const row of filteredRows) {
    const days = Math.floor(
      (parseDateOnly(toDateOnly(row.currentDueDate)).getTime() - asOf) / DAY_MS,
    )
    const key = triageKeyForDays(days)
    if (!key) continue
    const bucket = triage.get(key)
    if (!bucket) continue
    bucket.count += 1
    if (bucket.rows.length < topLimit) bucket.rows.push(row)
  }

  return {
    asOfDate: input.asOfDate,
    windowDays,
    summary: {
      openObligationCount: rows.length,
      dueThisWeekCount,
      needsReviewCount,
      evidenceGapCount,
      totalAccruedPenaltyCents,
      accruedPenaltyReadyCount,
      accruedPenaltyNeedsInputCount,
      accruedPenaltyUnsupportedCount,
    },
    topRows: topRows.slice(0, topLimit),
    triageTabs: [
      { key: 'this_week', label: 'This Week', ...triage.get('this_week')! },
      { key: 'this_month', label: 'This Month', ...triage.get('this_month')! },
      { key: 'long_term', label: 'Long-term', ...triage.get('long_term')! },
    ],
    facets,
    brief: null,
  }
}

function normalizeBrief(
  row: typeof dashboardBrief.$inferSelect,
  now = new Date(),
): DashboardBriefRow {
  const computedStatus =
    row.status === 'ready' && row.expiresAt && row.expiresAt.getTime() < now.getTime()
      ? 'stale'
      : row.status
  return {
    id: row.id,
    firmId: row.firmId,
    userId: row.userId,
    scope: row.scope,
    asOfDate: row.asOfDate,
    status: computedStatus,
    inputHash: row.inputHash,
    aiOutputId: row.aiOutputId,
    summaryText: row.summaryText,
    topObligationIds: row.topObligationIdsJson ?? [],
    citations: row.citationsJson ?? null,
    reason: row.reason,
    errorCode: row.errorCode,
    generatedAt: row.generatedAt,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function makeDashboardRepo(db: Db, firmId: string) {
  async function loadSmartPriorityProfile() {
    const [row] = await db
      .select({ smartPriorityProfileJson: firmProfile.smartPriorityProfileJson })
      .from(firmProfile)
      .where(eq(firmProfile.id, firmId))
      .limit(1)
    return toSmartPriorityProfile(row?.smartPriorityProfileJson)
  }

  function briefScopePredicate(scope: DashboardBriefScope, userId?: string | null) {
    if (scope === 'me') {
      return userId ? eq(dashboardBrief.userId, userId) : isNull(dashboardBrief.userId)
    }
    return isNull(dashboardBrief.userId)
  }

  async function findLatestBrief(input: {
    scope: DashboardBriefScope
    asOfDate: string
    userId?: string | null
    now?: Date
  }): Promise<DashboardBriefRow | null> {
    const [row] = await db
      .select()
      .from(dashboardBrief)
      .where(
        and(
          eq(dashboardBrief.firmId, firmId),
          eq(dashboardBrief.scope, input.scope),
          eq(dashboardBrief.asOfDate, input.asOfDate),
          briefScopePredicate(input.scope, input.userId),
        ),
      )
      .orderBy(desc(dashboardBrief.updatedAt), desc(dashboardBrief.createdAt))
      .limit(1)

    return row ? normalizeBrief(row, input.now) : null
  }

  async function findBriefByHash(input: {
    scope: DashboardBriefScope
    asOfDate: string
    inputHash: string
    userId?: string | null
    statuses?: DashboardBriefStatus[]
    now?: Date
  }): Promise<DashboardBriefRow | null> {
    const statusPredicate =
      input.statuses && input.statuses.length > 0
        ? inArray(dashboardBrief.status, input.statuses)
        : undefined
    const [row] = await db
      .select()
      .from(dashboardBrief)
      .where(
        and(
          eq(dashboardBrief.firmId, firmId),
          eq(dashboardBrief.scope, input.scope),
          eq(dashboardBrief.asOfDate, input.asOfDate),
          eq(dashboardBrief.inputHash, input.inputHash),
          briefScopePredicate(input.scope, input.userId),
          statusPredicate,
        ),
      )
      .orderBy(desc(dashboardBrief.updatedAt), desc(dashboardBrief.createdAt))
      .limit(1)

    return row ? normalizeBrief(row, input.now) : null
  }

  async function requireBrief(id: string, now?: Date): Promise<DashboardBriefRow> {
    const [row] = await db
      .select()
      .from(dashboardBrief)
      .where(and(eq(dashboardBrief.firmId, firmId), eq(dashboardBrief.id, id)))
      .limit(1)
    if (!row) throw new Error('Dashboard brief not found.')
    return normalizeBrief(row, now)
  }

  async function listEvidenceByObligations(
    obligationIds: string[],
  ): Promise<DashboardEvidenceRow[]> {
    if (obligationIds.length === 0) return []

    const reads = []
    for (let i = 0; i < obligationIds.length; i += EVIDENCE_BATCH_SIZE) {
      const chunk = obligationIds.slice(i, i + EVIDENCE_BATCH_SIZE)
      reads.push(
        db
          .select({
            id: evidenceLink.id,
            obligationInstanceId: evidenceLink.obligationInstanceId,
            aiOutputId: evidenceLink.aiOutputId,
            sourceType: evidenceLink.sourceType,
            sourceId: evidenceLink.sourceId,
            sourceUrl: evidenceLink.sourceUrl,
            verbatimQuote: evidenceLink.verbatimQuote,
            rawValue: evidenceLink.rawValue,
            normalizedValue: evidenceLink.normalizedValue,
            confidence: evidenceLink.confidence,
            model: evidenceLink.model,
            appliedAt: evidenceLink.appliedAt,
          })
          .from(evidenceLink)
          .where(
            and(eq(evidenceLink.firmId, firmId), inArray(evidenceLink.obligationInstanceId, chunk)),
          )
          .orderBy(desc(evidenceLink.appliedAt)),
      )
    }

    return (await Promise.all(reads)).flat()
  }

  return {
    firmId,

    // Pencil QGZta /splash. Reads the user's last dashboard-visit stamp and
    // counts firm activity since then (created-since-window table counts —
    // real numbers, not audit-event tallies). Does NOT record the visit.
    async welcomeRecap(input: { userId: string; now: Date; weekAheadDays: number }): Promise<{
      lastVisitAt: Date | null
      deadlinesSyncedCount: number
      newAlertCount: number
      remindersSentCount: number
      clientsImportedCount: number
      dueThisWeekCount: number
    }> {
      const [visit] = await db
        .select({ lastVisitAt: userDashboardVisit.lastVisitAt })
        .from(userDashboardVisit)
        .where(
          and(eq(userDashboardVisit.firmId, firmId), eq(userDashboardVisit.userId, input.userId)),
        )
        .limit(1)
      const lastVisitAt = visit?.lastVisitAt ?? null
      // Window: since last visit, or the trailing 24h on a first-ever open.
      const since = lastVisitAt ?? new Date(input.now.getTime() - DAY_MS)
      const weekEnd = new Date(input.now.getTime() + input.weekAheadDays * DAY_MS)

      const [[deadlines], [clients], [alerts], [reminders], [dueThisWeek]] = await Promise.all([
        db
          .select({ value: count() })
          .from(obligationInstance)
          .where(
            and(
              eq(obligationInstance.firmId, firmId),
              isNull(obligationInstance.supersededAt),
              gte(obligationInstance.createdAt, since),
            ),
          ),
        db
          .select({ value: count() })
          .from(client)
          .where(
            and(eq(client.firmId, firmId), isNull(client.deletedAt), gte(client.createdAt, since)),
          ),
        db
          .select({ value: count() })
          .from(pulseFirmAlert)
          .where(and(eq(pulseFirmAlert.firmId, firmId), gte(pulseFirmAlert.createdAt, since))),
        db
          .select({ value: count() })
          .from(reminder)
          .where(
            and(
              eq(reminder.firmId, firmId),
              eq(reminder.status, 'sent'),
              gte(reminder.sentAt, since),
            ),
          ),
        db
          .select({ value: count() })
          .from(obligationInstance)
          .innerJoin(
            client,
            and(
              eq(client.id, obligationInstance.clientId),
              eq(client.firmId, obligationInstance.firmId),
            ),
          )
          .where(
            and(
              eq(obligationInstance.firmId, firmId),
              isNull(obligationInstance.supersededAt),
              isNull(client.deletedAt),
              inArray(obligationInstance.status, OPEN_STATUSES),
              gte(obligationInstance.currentDueDate, input.now),
              lte(obligationInstance.currentDueDate, weekEnd),
            ),
          ),
      ])

      return {
        lastVisitAt,
        deadlinesSyncedCount: deadlines?.value ?? 0,
        newAlertCount: alerts?.value ?? 0,
        remindersSentCount: reminders?.value ?? 0,
        clientsImportedCount: clients?.value ?? 0,
        dueThisWeekCount: dueThisWeek?.value ?? 0,
      }
    },

    // Upsert the "visited now" stamp so the splash won't re-trigger today.
    async recordDashboardVisit(input: { userId: string; now: Date }): Promise<Date> {
      await db
        .insert(userDashboardVisit)
        .values({
          id: crypto.randomUUID(),
          firmId,
          userId: input.userId,
          lastVisitAt: input.now,
          createdAt: input.now,
          updatedAt: input.now,
        })
        .onConflictDoUpdate({
          target: [userDashboardVisit.userId, userDashboardVisit.firmId],
          set: { lastVisitAt: input.now, updatedAt: input.now },
        })
      return input.now
    },

    async load(input: DashboardLoadInput): Promise<DashboardLoadResult> {
      const rows = await db
        .select({
          obligationId: obligationInstance.id,
          clientId: obligationInstance.clientId,
          clientName: client.name,
          clientEmail: client.email,
          taxType: obligationInstance.taxType,
          obligationType: obligationInstance.obligationType,
          filingDueDate: obligationInstance.filingDueDate,
          paymentDueDate: obligationInstance.paymentDueDate,
          baseDueDate: obligationInstance.baseDueDate,
          currentDueDate: obligationInstance.currentDueDate,
          status: obligationInstance.status,
          penaltyFormulaVersion: obligationInstance.penaltyFormulaVersion,
          penaltyFactsJson: obligationInstance.penaltyFactsJson,
          penaltyFactsVersion: obligationInstance.penaltyFactsVersion,
          missingPenaltyFactsJson: obligationInstance.missingPenaltyFactsJson,
          penaltySourceRefsJson: obligationInstance.penaltySourceRefsJson,
          penaltyFormulaLabel: obligationInstance.penaltyFormulaLabel,
          clientState: obligationInstance.jurisdiction,
          clientEntityType: client.entityType,
          clientEstimatedTaxLiabilityCents: client.estimatedTaxLiabilityCents,
          clientEquityOwnerCount: client.equityOwnerCount,
          importanceWeight: client.importanceWeight,
          lateFilingCountLast12mo: client.lateFilingCountLast12mo,
        })
        .from(obligationInstance)
        .innerJoin(client, eq(obligationInstance.clientId, client.id))
        .where(
          and(
            eq(obligationInstance.firmId, firmId),
            eq(client.firmId, firmId),
            isNull(client.deletedAt),
            inArray(obligationInstance.status, OPEN_STATUSES),
            isNull(obligationInstance.supersededAt),
          ),
        )
        .orderBy(asc(obligationInstance.currentDueDate), asc(obligationInstance.id))
        .limit(1000)

      const obligationIds = rows.map((row) => row.obligationId)
      const [evidenceRows, overlayDueDateSet, smartPriorityProfile] = await Promise.all([
        listEvidenceByObligations(obligationIds),
        listActiveOverlayDueDateSet(db, firmId, obligationIds),
        loadSmartPriorityProfile(),
      ])
      const { statutory: overlayStatutory, internal: overlayInternal } = overlayDueDateSet
      const overlayRows = rows.map((row) => {
        // Pulse postponement moves the statutory filing + payment deadlines to
        // the override date; current_due_date (internal target) is that minus
        // the firm offset. statutoryPenaltyDueDate then defers accrual too.
        const overlayStatutoryDate = overlayStatutory.get(row.obligationId)
        return Object.assign({}, row, {
          currentDueDate: overlayInternal.get(row.obligationId) ?? row.currentDueDate,
          filingDueDate: overlayStatutoryDate ?? row.filingDueDate,
          paymentDueDate: overlayStatutoryDate ?? row.paymentDueDate,
        })
      })
      const result = composeDashboardLoad(overlayRows, evidenceRows, input, smartPriorityProfile)
      return {
        ...result,
        brief: await findLatestBrief({
          scope: input.briefScope ?? 'firm',
          asOfDate: input.asOfDate,
          userId: input.briefUserId ?? null,
        }),
      }
    },

    findLatestBrief,
    findBriefByHash,

    async createBriefPending(input: DashboardBriefCreatePendingInput): Promise<DashboardBriefRow> {
      const now = input.now ?? new Date()
      const id = input.id ?? crypto.randomUUID()
      await db.insert(dashboardBrief).values({
        id,
        firmId,
        userId: input.scope === 'me' ? (input.userId ?? null) : null,
        scope: input.scope,
        asOfDate: input.asOfDate,
        status: 'pending',
        inputHash: input.inputHash,
        reason: input.reason,
        createdAt: now,
        updatedAt: now,
      })
      return requireBrief(id, now)
    },

    async markBriefReady(id: string, input: DashboardBriefReadyInput): Promise<DashboardBriefRow> {
      await db
        .update(dashboardBrief)
        .set({
          status: 'ready',
          aiOutputId: input.aiOutputId ?? null,
          summaryText: input.summaryText,
          topObligationIdsJson: input.topObligationIds,
          citationsJson: input.citations ?? null,
          errorCode: null,
          generatedAt: input.generatedAt,
          expiresAt: input.expiresAt,
          updatedAt: input.generatedAt,
        })
        .where(and(eq(dashboardBrief.firmId, firmId), eq(dashboardBrief.id, id)))
      return requireBrief(id, input.generatedAt)
    },

    async markBriefFailed(
      id: string,
      input: DashboardBriefFailedInput,
    ): Promise<DashboardBriefRow> {
      await db
        .update(dashboardBrief)
        .set({
          status: 'failed',
          aiOutputId: input.aiOutputId ?? null,
          errorCode: input.errorCode,
          generatedAt: input.generatedAt,
          expiresAt: input.expiresAt,
          updatedAt: input.generatedAt,
        })
        .where(and(eq(dashboardBrief.firmId, firmId), eq(dashboardBrief.id, id)))
      return requireBrief(id, input.generatedAt)
    },
  }
}

export type DashboardRepo = ReturnType<typeof makeDashboardRepo>
