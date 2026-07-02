import {
  asc,
  and,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  sql,
} from 'drizzle-orm'
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
import { auditEvent, evidenceLink } from '../schema/audit'
import { user } from '../schema/auth'
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
const ASSIGNEE_LOOKUP_BATCH_SIZE = 90
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
  // Unified page scope ("My work / Everyone"). One field drives BOTH the
  // daily-brief lookup and row/summary/facet scoping — see
  // `composeDashboardLoad`. `me` = effective assignee is `scopeUserId`
  // OR unassigned (an unclaimed deadline must never vanish from every
  // member's Today — same fallback rule the reminder dispatcher uses).
  scope?: DashboardBriefScope
  scopeUserId?: string | null
  // Viewer id for the "Yesterday" recap window (independent of scope —
  // the recap anchor is per-user even in the firm-wide view). When set,
  // load() computes the since-last-visit recap AND stamps the first
  // visit of the day (see recordDashboardVisit / resolveRecapAnchor).
  recapUserId?: string | null
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
  // EFFECTIVE assignee, resolved by `load()` before compose:
  // COALESCE(obligation.assignee_id, client.assignee_id) for the id,
  // with the obligation-level user's display name winning over the
  // client-level denormalized `assignee_name` (queue parity).
  assigneeId: string | null
  assigneeName: string | null
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
    // Always firm-wide (unscoped), even when `scope: 'me'` — feeds the
    // "your queue is clear, the firm still has N" empty-state split.
    firmOpenObligationCount: number
    // Scoped: which form type the overdue work clusters in (form-level
    // only — never a member-level signal). Null when nothing is overdue.
    overdueConcentration: { taxType: string; count: number; overdueTotal: number } | null
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
  // "Yesterday" row of the Daily Brief — deterministic activity counts
  // since the viewer's previous (earlier-day) visit. Null when the load
  // was made without a recapUserId (e.g. brief-consumer snapshots, cron).
  recap: DashboardRecap | null
}

export interface DashboardRecap {
  since: Date
  // Distinct obligations whose status reached done/paid/completed in the
  // window (audit-derived), with the done/paid split for the breakdown.
  completedCount: number
  filedCount: number
  paidCount: number
  newAlertCount: number
  dueDateMovedCount: number
  remindersSentCount: number
}

function parseDateOnly(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`)
}

// Top overdue form type within the current scope — the deterministic
// "risk is concentrated in …" signal for the firm-scope Today line. Ties
// break on the alphabetically-first tax type so the line is stable
// across reloads. Null when nothing is overdue.
export function resolveOverdueConcentration(
  overdueByTaxType: ReadonlyMap<string, number>,
): { taxType: string; count: number; overdueTotal: number } | null {
  let top: { taxType: string; count: number } | null = null
  let overdueTotal = 0
  for (const [taxType, taxTypeCount] of overdueByTaxType) {
    overdueTotal += taxTypeCount
    if (!top || taxTypeCount > top.count || (taxTypeCount === top.count && taxType < top.taxType)) {
      top = { taxType, count: taxTypeCount }
    }
  }
  return top ? { ...top, overdueTotal } : null
}

// UTC calendar-day comparison. The visit rollover + recap anchor use UTC
// days (not firm-tz) so the repo stays Intl-free; at worst the anchor is
// off near midnight by the tz offset, which a "since your last visit"
// window absorbs harmlessly.
export function isSameUtcDay(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10)
}

export interface DashboardVisitRow {
  lastVisitAt: Date
  previousVisitAt: Date | null
}

/**
 * The "Yesterday" recap anchor — the viewer's most recent visit on an
 * EARLIER day:
 *   • not visited yet today → last_visit_at IS that anchor;
 *   • already stamped today → previous_visit_at (preserved by the daily
 *     rollover in recordDashboardVisit);
 *   • first-ever visit (or pre-0076 rows) → trailing 24h.
 */
export function resolveRecapAnchor(visit: DashboardVisitRow | null, now: Date): Date {
  if (visit && !isSameUtcDay(visit.lastVisitAt, now)) return visit.lastVisitAt
  if (visit?.previousVisitAt) return visit.previousVisitAt
  return new Date(now.getTime() - DAY_MS)
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
  // "My work" scope: keep rows whose effective assignee is the viewer —
  // PLUS unassigned rows. Unassigned must stay visible to every member
  // (reminder-dispatch parity: unowned work falls back to owners rather
  // than silently disappearing). A name-only assignment with no bound
  // user id counts as unassigned — over-showing is the safe failure mode
  // for a deadline product. Everything downstream (summary, Smart
  // Priority ranks, triage tabs, facets) is computed from the scoped set
  // so every number on the page agrees with the visible rows; only
  // `firmOpenObligationCount` reports the unscoped total.
  const scopedRows =
    input.scope === 'me'
      ? rows.filter((row) => row.assigneeId === null || row.assigneeId === input.scopeUserId)
      : rows
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
  // 2026-06-10 (firm-scope Today line): which FORM TYPE the overdue work
  // clusters in — deliberately a form-level signal, never a person-level
  // one (the firm view must not single out members).
  const overdueByTaxType = new Map<string, number>()
  const asOf = parseDateOnly(input.asOfDate).getTime()
  const topRowDrafts: Array<Omit<DashboardTopRow, 'smartPriority'>> = []

  for (const row of scopedRows) {
    const days = daysUntilDueFromDate(row.currentDueDate, input.asOfDate)
    const inUrgentWindow = days <= windowDays
    const isOverdue = days < 0
    if (isOverdue) {
      overdueByTaxType.set(row.taxType, (overdueByTaxType.get(row.taxType) ?? 0) + 1)
    }
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
      openObligationCount: scopedRows.length,
      firmOpenObligationCount: rows.length,
      overdueConcentration: resolveOverdueConcentration(overdueByTaxType),
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
    recap: null,
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

  // Display names for assignee user ids (queue `loadUserNames` parity).
  // Chunked to stay under D1's 100-bind-param limit.
  async function loadAssigneeNames(userIds: string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map()
    const reads = []
    for (let i = 0; i < userIds.length; i += ASSIGNEE_LOOKUP_BATCH_SIZE) {
      const chunk = userIds.slice(i, i + ASSIGNEE_LOOKUP_BATCH_SIZE)
      reads.push(
        db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, chunk)),
      )
    }
    const rows = (await Promise.all(reads)).flat()
    return new Map(rows.map((row) => [row.id, row.name]))
  }

  async function findDashboardVisit(userId: string): Promise<DashboardVisitRow | null> {
    const [visit] = await db
      .select({
        lastVisitAt: userDashboardVisit.lastVisitAt,
        previousVisitAt: userDashboardVisit.previousVisitAt,
      })
      .from(userDashboardVisit)
      .where(and(eq(userDashboardVisit.firmId, firmId), eq(userDashboardVisit.userId, userId)))
      .limit(1)
    return visit ?? null
  }

  // Day-rollover-aware visit stamp: the first stamp of a new day preserves
  // the prior earlier-day visit in previous_visit_at — that timestamp is
  // the "Yesterday" recap anchor and must survive today's own stamp.
  // Same-day re-stamps only move last_visit_at.
  async function recordDashboardVisit(input: { userId: string; now: Date }): Promise<Date> {
    const existing = await findDashboardVisit(input.userId)
    const previousVisitAt =
      existing && !isSameUtcDay(existing.lastVisitAt, input.now)
        ? existing.lastVisitAt
        : (existing?.previousVisitAt ?? null)
    await db
      .insert(userDashboardVisit)
      .values({
        id: crypto.randomUUID(),
        firmId,
        userId: input.userId,
        lastVisitAt: input.now,
        previousVisitAt,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .onConflictDoUpdate({
        target: [userDashboardVisit.userId, userDashboardVisit.firmId],
        set: { lastVisitAt: input.now, previousVisitAt, updatedAt: input.now },
      })
    return input.now
  }

  // Recap orchestration for a dashboard view: resolve the anchor from the
  // viewer's visit row BEFORE stamping, count the window, and stamp the
  // first view of the day (the splash gate is unwired — the dashboard
  // itself is the visit; same-day reloads skip the write entirely).
  async function loadRecapForViewer(input: DashboardLoadInput): Promise<DashboardRecap | null> {
    if (!input.recapUserId) return null
    // The recap is a garnish on the dashboard, never a dependency: if it
    // fails (e.g. a deploy where the worker briefly outruns migration
    // 0076's previous_visit_at column), degrade to null instead of
    // failing the whole load.
    try {
      const now = new Date()
      const visit = await findDashboardVisit(input.recapUserId)
      const since = resolveRecapAnchor(visit, now)
      if (!visit || !isSameUtcDay(visit.lastVisitAt, now)) {
        await recordDashboardVisit({ userId: input.recapUserId, now })
      }
      const counts = await loadDashboardRecap({
        since,
        scope: input.scope,
        scopeUserId: input.scopeUserId,
      })
      return { since, ...counts }
    } catch (error) {
      console.error('[dashboard.load] recap degraded to null:', error)
      return null
    }
  }

  // Deterministic "Yesterday" counts for the Daily Brief — audit-ledger
  // derived, so they never depend on the AI path. The obligation-linked
  // counts follow the page scope (effective assignee = COALESCE(obligation,
  // client) = viewer ∪ unassigned); alert counts stay firm-wide in both
  // scopes (alerts are firm-level signals, mirroring the Alerts strip).
  async function loadDashboardRecap(input: {
    since: Date
    scope?: DashboardBriefScope | undefined
    scopeUserId?: string | null | undefined
  }): Promise<Omit<DashboardRecap, 'since'>> {
    const effectiveAssignee = sql`coalesce(${obligationInstance.assigneeId}, ${client.assigneeId})`
    const scopePredicate =
      input.scope === 'me'
        ? sql`(${effectiveAssignee} IS NULL OR ${effectiveAssignee} = ${input.scopeUserId ?? ''})`
        : undefined
    const completedStatus = sql<string>`json_extract(${auditEvent.afterJson}, '$.status')`

    const [completedRows, [dueDateMoved], [newAlerts], [remindersSent]] = await Promise.all([
      db
        .select({ status: completedStatus, value: countDistinct(auditEvent.entityId) })
        .from(auditEvent)
        .innerJoin(obligationInstance, eq(obligationInstance.id, auditEvent.entityId))
        .innerJoin(client, eq(client.id, obligationInstance.clientId))
        .where(
          and(
            eq(auditEvent.firmId, firmId),
            eq(auditEvent.action, 'obligation.status.updated'),
            gte(auditEvent.createdAt, input.since),
            eq(obligationInstance.firmId, firmId),
            sql`json_extract(${auditEvent.afterJson}, '$.status') IN ('done', 'paid', 'completed')`,
            scopePredicate,
          ),
        )
        .groupBy(completedStatus),
      db
        .select({ value: countDistinct(auditEvent.entityId) })
        .from(auditEvent)
        .innerJoin(obligationInstance, eq(obligationInstance.id, auditEvent.entityId))
        .innerJoin(client, eq(client.id, obligationInstance.clientId))
        .where(
          and(
            eq(auditEvent.firmId, firmId),
            eq(auditEvent.action, 'obligation.due_date.updated'),
            gte(auditEvent.createdAt, input.since),
            eq(obligationInstance.firmId, firmId),
            scopePredicate,
          ),
        ),
      db
        .select({ value: count() })
        .from(pulseFirmAlert)
        .where(
          and(
            eq(pulseFirmAlert.firmId, firmId),
            // Onboarding catch-up rows are state, not news — months-old changes
            // materialized at signup must not read as "N new alerts".
            eq(pulseFirmAlert.origin, 'live'),
            gte(pulseFirmAlert.createdAt, input.since),
          ),
        ),
      input.scope === 'me'
        ? db
            .select({ value: count() })
            .from(reminder)
            .innerJoin(obligationInstance, eq(obligationInstance.id, reminder.obligationInstanceId))
            .innerJoin(client, eq(client.id, obligationInstance.clientId))
            .where(
              and(
                eq(reminder.firmId, firmId),
                eq(reminder.status, 'sent'),
                gte(reminder.sentAt, input.since),
                scopePredicate,
              ),
            )
        : db
            .select({ value: count() })
            .from(reminder)
            .where(
              and(
                eq(reminder.firmId, firmId),
                eq(reminder.status, 'sent'),
                gte(reminder.sentAt, input.since),
              ),
            ),
    ])

    const completedByStatus = new Map(completedRows.map((row) => [row.status, row.value]))
    const filedCount = completedByStatus.get('done') ?? 0
    const paidCount = completedByStatus.get('paid') ?? 0
    const completedCount = filedCount + paidCount + (completedByStatus.get('completed') ?? 0)
    return {
      completedCount,
      filedCount,
      paidCount,
      newAlertCount: newAlerts?.value ?? 0,
      dueDateMovedCount: dueDateMoved?.value ?? 0,
      remindersSentCount: remindersSent?.value ?? 0,
    }
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

  // Display-oriented lookup for the dashboard's Daily Brief card. Unlike
  // `findLatestBrief` (which exact-matches `asOfDate` — the refresh path
  // wants *today's* brief, pending or ready), this returns the most recent
  // brief generated on or before `asOfDate`. A daily brief should persist
  // and surface its own staleness via the freshness chip, not blink out the
  // moment the date rolls past the day it was generated. Without this the
  // card vanishes between an overnight roll-over and the next refresh.
  async function findBriefForDisplay(input: {
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
          lte(dashboardBrief.asOfDate, input.asOfDate),
          briefScopePredicate(input.scope, input.userId),
        ),
      )
      .orderBy(desc(dashboardBrief.asOfDate), desc(dashboardBrief.updatedAt))
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
            and(
              eq(client.firmId, firmId),
              isNull(client.deletedAt),
              isNull(client.archivedAt),
              gte(client.createdAt, since),
            ),
          ),
        db
          .select({ value: count() })
          .from(pulseFirmAlert)
          .where(
            and(
              eq(pulseFirmAlert.firmId, firmId),
              // Catch-up rows are state, not news (see newAlertCount above).
              eq(pulseFirmAlert.origin, 'live'),
              gte(pulseFirmAlert.createdAt, since),
            ),
          ),
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
              isNull(client.archivedAt),
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
    recordDashboardVisit,

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
          // Per-obligation assignee override + the client-level default
          // (id for scope matching, denormalized name for display).
          obligationAssigneeId: obligationInstance.assigneeId,
          clientAssigneeId: client.assigneeId,
          clientAssigneeName: client.assigneeName,
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
            isNull(client.archivedAt),
            inArray(obligationInstance.status, OPEN_STATUSES),
            isNull(obligationInstance.supersededAt),
          ),
        )
        .orderBy(asc(obligationInstance.currentDueDate), asc(obligationInstance.id))
        .limit(1000)

      const obligationIds = rows.map((row) => row.obligationId)
      // Resolve display names for every user id an assignee could come
      // from: obligation-level overrides always, client-level ids only as
      // a fallback when the denormalized `assignee_name` is missing.
      const assigneeUserIds = [
        ...new Set(
          rows
            .flatMap((row) => [
              row.obligationAssigneeId,
              row.clientAssigneeName ? null : row.clientAssigneeId,
            ])
            .filter((id): id is string => Boolean(id)),
        ),
      ]
      const [evidenceRows, overlayDueDateSet, smartPriorityProfile, assigneeNamesById] =
        await Promise.all([
          listEvidenceByObligations(obligationIds),
          listActiveOverlayDueDateSet(db, firmId, obligationIds),
          loadSmartPriorityProfile(),
          loadAssigneeNames(assigneeUserIds),
        ])
      const { statutory: overlayStatutory, internal: overlayInternal } = overlayDueDateSet
      const overlayRows = rows.map((row) => {
        // Pulse postponement moves the statutory filing + payment deadlines to
        // the override date; current_due_date (internal target) is that minus
        // the firm offset. statutoryPenaltyDueDate then defers accrual too.
        const overlayStatutoryDate = overlayStatutory.get(row.obligationId)
        // Effective assignee: the per-obligation override wins over the
        // client default (queue + reminder-dispatch parity).
        const assigneeId = row.obligationAssigneeId ?? row.clientAssigneeId
        const assigneeName = row.obligationAssigneeId
          ? (assigneeNamesById.get(row.obligationAssigneeId) ?? row.clientAssigneeName)
          : (row.clientAssigneeName ??
            (row.clientAssigneeId ? (assigneeNamesById.get(row.clientAssigneeId) ?? null) : null))
        return Object.assign({}, row, {
          currentDueDate: overlayInternal.get(row.obligationId) ?? row.currentDueDate,
          filingDueDate: overlayStatutoryDate ?? row.filingDueDate,
          paymentDueDate: overlayStatutoryDate ?? row.paymentDueDate,
          assigneeId,
          assigneeName,
        })
      })
      const result = composeDashboardLoad(overlayRows, evidenceRows, input, smartPriorityProfile)
      const [brief, recap] = await Promise.all([
        findBriefForDisplay({
          scope: input.scope ?? 'firm',
          asOfDate: input.asOfDate,
          userId: input.scopeUserId ?? null,
        }),
        input.recapUserId ? loadRecapForViewer(input) : Promise.resolve(null),
      ])
      return { ...result, brief, recap }
    },

    findLatestBrief,
    findBriefForDisplay,
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
