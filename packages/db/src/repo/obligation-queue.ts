import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { estimateAccruedPenalty } from '@duedatehq/core/penalty'
import type { PenaltyBreakdownItem } from '@duedatehq/core/penalty'
import { statutoryPenaltyDueDate } from '@duedatehq/core/deadlines'
import { compareSmartPriority, rankSmartPriorities } from '@duedatehq/core/priority'
import type { ObligationReadiness } from '@duedatehq/core/obligation-workflow'
import type { SmartPriorityBreakdown } from '@duedatehq/ports/priority'
import type { Db } from '../client'
import { user } from '../schema/auth'
import { evidenceLink } from '../schema/audit'
import { client, clientFilingProfile } from '../schema/clients'
import { firmProfile } from '../schema/firm'
import {
  obligationInstance,
  type ObligationEfileState,
  type ObligationExtensionState,
  type ObligationPaymentState,
  type ObligationPrepStage,
  type ObligationRecurrence,
  type ObligationReviewStage,
  type ObligationRiskLevel,
  type ObligationStatus,
  type ObligationType,
  type TaxPeriodKind,
  type TaxPeriodSource,
} from '../schema/obligations'
import { obligationSavedView, type ObligationQueueDensity } from '../schema/obligation-saved-view'
import { listActiveOverlayDueDateSet } from './overlay'
import { toSmartPriorityProfile } from './priority-profile'
import { loadDerivedReadinessByObligation } from './readiness-derived'

/**
 * Obligations read model joining obligation_instance + client.
 *
 * Why this lives in its own repo (and not in obligations):
 *   - The obligation queue query crosses two tables (obligation + client.name) and
 *     is read-only. obligations.* stays focused on writes + per-client reads.
 *   - Keeps the join SQL out of the obligation write path, so future
 *     overlay logic (Phase 1) can replace this read alone.
 *
 * Cursor format: base64(`${score}|${ISO_DATE}|${id}`).
 * `updated_desc` falls back to offset-less single page in Demo Sprint (limit
 * caps at 100 per request).
 */

export type ObligationQueueSort = 'smart_priority' | 'due_asc' | 'due_desc' | 'updated_desc'
export type ObligationQueueReadiness = ObligationReadiness

export interface ObligationQueueListInput {
  status?: ObligationStatus[]
  search?: string
  obligationIds?: string[]
  clientIds?: string[]
  ruleIds?: string[]
  states?: string[]
  counties?: string[]
  taxTypes?: string[]
  assigneeName?: string
  assigneeNames?: string[]
  owner?: 'unassigned'
  due?: 'overdue'
  dueWithinDays?: number
  readiness?: ObligationQueueReadiness[]
  minDaysUntilDue?: number
  maxDaysUntilDue?: number
  needsEvidence?: boolean
  awaitingSignature?: boolean
  confirmed?: boolean
  asOfDate?: string
  sort?: ObligationQueueSort
  cursor?: string | null
  limit?: number
}

export interface ObligationQueueListRow {
  id: string
  firmId: string
  clientId: string
  clientFilingProfileId: string | null
  taxType: string
  taxYear: number | null
  taxYearType: 'calendar' | 'fiscal'
  fiscalYearEndMonth: number | null
  fiscalYearEndDay: number | null
  taxPeriodStart: Date | null
  taxPeriodEnd: Date | null
  taxPeriodKind: TaxPeriodKind
  taxPeriodSource: TaxPeriodSource
  taxPeriodReviewReason: string | null
  ruleId: string | null
  ruleVersion: number | null
  rulePeriod: string | null
  generationSource: 'migration' | 'manual' | 'annual_rollover' | 'pulse' | null
  jurisdiction: string | null
  obligationType: ObligationType
  formName: string | null
  authority: string | null
  filingDueDate: Date | null
  paymentDueDate: Date | null
  sourceEvidenceJson: unknown
  recurrence: ObligationRecurrence
  riskLevel: ObligationRiskLevel
  baseDueDate: Date
  currentDueDate: Date
  status: ObligationStatus
  confirmed: boolean
  blockedByObligationInstanceId: string | null
  readiness: ObligationQueueReadiness
  extensionDecision: 'not_considered' | 'applied' | 'rejected'
  extensionMemo: string | null
  extensionSource: string | null
  extensionExpectedDueDate: Date | null
  extensionDecidedAt: Date | null
  extensionDecidedByUserId: string | null
  extensionState: ObligationExtensionState
  extensionFormName: string | null
  extensionFiledAt: Date | null
  extensionAcceptedAt: Date | null
  prepStage: ObligationPrepStage
  reviewStage: ObligationReviewStage
  reviewerUserId: string | null
  reviewCompletedAt: Date | null
  paymentState: ObligationPaymentState
  paymentConfirmedAt: Date | null
  efileState: ObligationEfileState
  efileAuthorizationForm: string | null
  efileSubmittedAt: Date | null
  efileAcceptedAt: Date | null
  efileRejectedAt: Date | null
  migrationBatchId: string | null
  estimatedTaxDueCents: number | null
  estimatedExposureCents: number | null
  exposureStatus: 'ready' | 'needs_input' | 'unsupported'
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
  clientName: string
  clientState: string | null
  clientCounty: string | null
  clientEntityType:
    | 'llc'
    | 's_corp'
    | 'partnership'
    | 'c_corp'
    | 'sole_prop'
    | 'trust'
    | 'individual'
    | 'other'
  assigneeName: string | null
  assigneeId: string | null
  snoozedUntil: Date | null
  daysUntilDue: number
  evidenceCount: number
  accruedPenaltyCents: number | null
  accruedPenaltyStatus: 'ready' | 'needs_input' | 'unsupported'
  accruedPenaltyBreakdown: PenaltyBreakdownItem[]
  penaltyAsOfDate: string
  smartPriority: SmartPriorityBreakdown
}

export interface ObligationQueueListResult {
  rows: ObligationQueueListRow[]
  nextCursor: string | null
}

export interface ObligationQueueFacetOption {
  value: string
  label: string
  count: number
}

export interface ObligationQueueClientFacetOption extends ObligationQueueFacetOption {
  state: string | null
  county: string | null
}

export interface ObligationQueueCountyFacetOption extends ObligationQueueFacetOption {
  state: string | null
}

export interface ObligationQueueFacetsOutput {
  clients: ObligationQueueClientFacetOption[]
  states: ObligationQueueFacetOption[]
  counties: ObligationQueueCountyFacetOption[]
  taxTypes: ObligationQueueFacetOption[]
  assigneeNames: ObligationQueueFacetOption[]
  statuses: ObligationQueueFacetOption[]
}

export interface ObligationQueueSavedViewRow {
  id: string
  firmId: string
  createdByUserId: string
  name: string
  queryJson: unknown
  columnVisibilityJson: unknown
  density: ObligationQueueDensity
  isPinned: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ObligationQueueSavedViewCreateInput {
  name: string
  createdByUserId: string
  queryJson: unknown
  columnVisibilityJson: unknown
  density: ObligationQueueDensity
  isPinned: boolean
}

export interface ObligationQueueSavedViewUpdateInput {
  id: string
  name?: string
  queryJson?: unknown
  columnVisibilityJson?: unknown
  density?: ObligationQueueDensity
  isPinned?: boolean
}

interface ObligationQueueRawJoinedRow {
  id: string
  firmId: string
  clientId: string
  clientFilingProfileId: string | null
  taxType: string
  taxYear: number | null
  taxYearType: 'calendar' | 'fiscal'
  fiscalYearEndMonth: number | null
  fiscalYearEndDay: number | null
  taxPeriodStart: Date | null
  taxPeriodEnd: Date | null
  taxPeriodKind: TaxPeriodKind
  taxPeriodSource: TaxPeriodSource
  taxPeriodReviewReason: string | null
  ruleId: string | null
  ruleVersion: number | null
  rulePeriod: string | null
  generationSource: 'migration' | 'manual' | 'annual_rollover' | 'pulse' | null
  jurisdiction: string | null
  obligationType: ObligationType
  formName: string | null
  authority: string | null
  filingDueDate: Date | null
  paymentDueDate: Date | null
  sourceEvidenceJson: unknown
  recurrence: ObligationRecurrence
  riskLevel: ObligationRiskLevel
  baseDueDate: Date
  currentDueDate: Date
  status: ObligationStatus
  confirmed: boolean
  blockedByObligationInstanceId: string | null
  extensionDecision: 'not_considered' | 'applied' | 'rejected'
  extensionMemo: string | null
  extensionSource: string | null
  extensionExpectedDueDate: Date | null
  extensionDecidedAt: Date | null
  extensionDecidedByUserId: string | null
  extensionState: ObligationExtensionState
  extensionFormName: string | null
  extensionFiledAt: Date | null
  extensionAcceptedAt: Date | null
  prepStage: ObligationPrepStage
  reviewStage: ObligationReviewStage
  reviewerUserId: string | null
  reviewCompletedAt: Date | null
  paymentState: ObligationPaymentState
  paymentConfirmedAt: Date | null
  efileState: ObligationEfileState
  efileAuthorizationForm: string | null
  efileSubmittedAt: Date | null
  efileAcceptedAt: Date | null
  efileRejectedAt: Date | null
  migrationBatchId: string | null
  estimatedTaxDueCents: number | null
  estimatedExposureCents: number | null
  exposureStatus: 'ready' | 'needs_input' | 'unsupported'
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
  clientName: string
  clientState: string | null
  clientCounty: string | null
  assigneeName: string | null
  // Per-deadline override (Pencil HuYeb). `assigneeId` is the
  // obligation-level assignee user id; its display name is resolved in
  // hydrateRows and wins over the client-level `assigneeName` above.
  assigneeId: string | null
  snoozedUntil: Date | null
  clientEntityType:
    | 'llc'
    | 's_corp'
    | 'partnership'
    | 'c_corp'
    | 'sole_prop'
    | 'trust'
    | 'individual'
    | 'other'
  clientEstimatedTaxLiabilityCents: number | null
  clientEquityOwnerCount: number | null
  importanceWeight: number
  lateFilingCountLast12mo: number
}

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100
const MAX_READ_ROWS = 1000
const MAX_FACET_OPTIONS = 250
const EVIDENCE_COUNT_BATCH_SIZE = 90
const ID_LOOKUP_BATCH_SIZE = 90
const MAX_SEARCH_LENGTH = 64
const LIKE_WILDCARD_RE = /[\\%_]/g
const UNSAFE_SEARCH_CHARS_RE = /[^\p{L}\p{N}\s&'.-]+/gu
const DAY_MS = 24 * 60 * 60 * 1000
const STATE_CODE_RE = /^[A-Z]{2}$/

export function normalizeObligationQueueSearch(search: string | undefined): string | null {
  const normalized = (search ?? '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(UNSAFE_SEARCH_CHARS_RE, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, MAX_SEARCH_LENGTH)
    .trim()

  return normalized.length > 0 ? normalized : null
}

function escapeLikePattern(value: string): string {
  return value.replace(LIKE_WILDCARD_RE, '\\$&')
}

function parseDateOnly(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`)
}

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10)
}

function getAsOfDate(input: Pick<ObligationQueueListInput, 'asOfDate'>): Date {
  return parseDateOnly(input.asOfDate ?? todayDateOnly())
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

function encodeCursor(
  row: Pick<ObligationQueueListRow, 'currentDueDate' | 'id' | 'smartPriority'>,
): string {
  const iso = row.currentDueDate.toISOString()
  return Buffer.from(`${row.smartPriority.score}|${iso}|${row.id}`, 'utf8').toString('base64url')
}

function decodeCursor(cursor: string): {
  currentDueDate: Date
  id: string
  smartPriorityScore: number | null
} | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8')
    const parts = raw.split('|')
    const [scoreValue, iso, id] =
      parts.length === 4
        ? [parts[0] ?? '', parts[1] ?? '', parts[3] ?? '']
        : parts.length === 3
          ? [parts[0] ?? '', parts[1] ?? '', parts[2] ?? '']
          : [null, parts[0] ?? '', parts[1] ?? '']
    if (!iso || !id) return null
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    const score = scoreValue === null ? Number.NaN : Number(scoreValue)
    return {
      currentDueDate: d,
      id,
      smartPriorityScore: Number.isFinite(score) ? score : null,
    }
  } catch {
    return null
  }
}

function isWithinDueFilter(
  row: { currentDueDate: Date },
  input: Pick<ObligationQueueListInput, 'due' | 'dueWithinDays' | 'asOfDate'>,
): boolean {
  const asOfDate = getAsOfDate(input)
  if (input.due === 'overdue' && row.currentDueDate.getTime() >= asOfDate.getTime()) return false
  if (input.dueWithinDays !== undefined) {
    const due = row.currentDueDate.getTime()
    if (due < asOfDate.getTime() || due > addDays(asOfDate, input.dueWithinDays).getTime()) {
      return false
    }
  }
  return true
}

function daysUntilDue(currentDueDate: Date, asOfDate: Date): number {
  return Math.floor((currentDueDate.getTime() - asOfDate.getTime()) / DAY_MS)
}

function isWithinDaysRange(
  row: Pick<ObligationQueueListRow, 'daysUntilDue'>,
  input: Pick<ObligationQueueListInput, 'minDaysUntilDue' | 'maxDaysUntilDue'>,
): boolean {
  if (input.minDaysUntilDue !== undefined && row.daysUntilDue < input.minDaysUntilDue) return false
  if (input.maxDaysUntilDue !== undefined && row.daysUntilDue > input.maxDaysUntilDue) return false
  return true
}

function uniqueNonEmpty(values: (string | null | undefined)[] | undefined): string[] {
  return [
    ...new Set(
      (values ?? [])
        .map((value) => value?.trim())
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
    ),
  ]
}

function normalizeStateCode(value: string | null | undefined): string | null {
  const normalized = value?.trim().toUpperCase()
  return normalized && STATE_CODE_RE.test(normalized) ? normalized : null
}

function normalizeNullableText(value: string | null | undefined): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function compareFacetLabels(
  a: { label: string; value: string },
  b: { label: string; value: string },
) {
  const labelDelta = a.label.localeCompare(b.label)
  if (labelDelta !== 0) return labelDelta
  return a.value.localeCompare(b.value)
}

function compareRows(
  a: ObligationQueueListRow,
  b: ObligationQueueListRow,
  sort: ObligationQueueSort,
): number {
  // clientId is the universal secondary tiebreak. When the primary
  // sort metric ties (same priority score, same due date, same
  // exposure), same-client rows cluster — so the queue's
  // adjacency-based grouping (continuationRowIds in the route file)
  // actually triggers. Without this, two rows from the same client
  // that both hit, say, Apr 15 would still scatter randomly because
  // the only tiebreaker was obligationId (a UUID).
  if (sort === 'smart_priority') {
    const cmp = compareSmartPriority(
      { obligationId: a.id, currentDueDate: a.currentDueDate, smartPriority: a.smartPriority },
      { obligationId: b.id, currentDueDate: b.currentDueDate, smartPriority: b.smartPriority },
    )
    if (cmp !== 0) return cmp
    return a.clientId.localeCompare(b.clientId)
  }
  if (sort === 'updated_desc') {
    const updatedDelta = b.updatedAt.getTime() - a.updatedAt.getTime()
    if (updatedDelta !== 0) return updatedDelta
    const clientDelta = a.clientId.localeCompare(b.clientId)
    if (clientDelta !== 0) return clientDelta
    return b.id.localeCompare(a.id)
  }
  const direction = sort === 'due_desc' ? -1 : 1
  const dateDelta = a.currentDueDate.getTime() - b.currentDueDate.getTime()
  if (dateDelta !== 0) return dateDelta * direction
  const clientDelta = a.clientId.localeCompare(b.clientId)
  if (clientDelta !== 0) return clientDelta
  return a.id.localeCompare(b.id) * direction
}

function isAfterCursor(
  row: ObligationQueueListRow,
  sort: ObligationQueueSort,
  cursor: {
    currentDueDate: Date
    id: string
    smartPriorityScore: number | null
  },
): boolean {
  if (sort === 'updated_desc') return true
  if (sort === 'smart_priority') {
    if (cursor.smartPriorityScore === null) return true
    return (
      compareSmartPriority(
        {
          obligationId: row.id,
          currentDueDate: row.currentDueDate,
          smartPriority: row.smartPriority,
        },
        {
          obligationId: cursor.id,
          currentDueDate: cursor.currentDueDate,
          smartPriority: { score: cursor.smartPriorityScore },
        },
      ) > 0
    )
  }
  const dateDelta = row.currentDueDate.getTime() - cursor.currentDueDate.getTime()
  if (sort === 'due_desc') return dateDelta < 0 || (dateDelta === 0 && row.id < cursor.id)
  return dateDelta > 0 || (dateDelta === 0 && row.id > cursor.id)
}

export function makeObligationQueueRepo(db: Db, firmId: string) {
  async function loadSmartPriorityProfile() {
    const [row] = await db
      .select({ smartPriorityProfileJson: firmProfile.smartPriorityProfileJson })
      .from(firmProfile)
      .where(eq(firmProfile.id, firmId))
      .limit(1)
    return toSmartPriorityProfile(row?.smartPriorityProfileJson)
  }

  async function listEvidenceCounts(obligationIds: string[]): Promise<Map<string, number>> {
    if (obligationIds.length === 0) return new Map()
    const reads = []
    for (let i = 0; i < obligationIds.length; i += EVIDENCE_COUNT_BATCH_SIZE) {
      const chunk = obligationIds.slice(i, i + EVIDENCE_COUNT_BATCH_SIZE)
      reads.push(
        db
          .select({
            obligationInstanceId: evidenceLink.obligationInstanceId,
          })
          .from(evidenceLink)
          .where(
            and(eq(evidenceLink.firmId, firmId), inArray(evidenceLink.obligationInstanceId, chunk)),
          ),
      )
    }
    const rows = (await Promise.all(reads)).flat()

    const counts = new Map<string, number>()
    for (const row of rows) {
      if (!row.obligationInstanceId) continue
      counts.set(row.obligationInstanceId, (counts.get(row.obligationInstanceId) ?? 0) + 1)
    }
    return counts
  }

  // Per-deadline assignee name resolution (Pencil HuYeb). Looks up the
  // display names for obligation-level assignee user ids so they can win
  // over the client-level `assigneeName` in hydrateRows.
  async function loadUserNames(userIds: string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map()
    const reads = []
    for (let i = 0; i < userIds.length; i += ID_LOOKUP_BATCH_SIZE) {
      const chunk = userIds.slice(i, i + ID_LOOKUP_BATCH_SIZE)
      reads.push(
        db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, chunk)),
      )
    }
    const rows = (await Promise.all(reads)).flat()
    return new Map(rows.map((row) => [row.id, row.name]))
  }

  async function hydrateRows(
    rawRows: ObligationQueueRawJoinedRow[],
    input: Pick<ObligationQueueListInput, 'asOfDate'> = {},
  ): Promise<ObligationQueueListRow[]> {
    const obligationIds = rawRows.map((row) => row.id)
    const statuses = new Map(rawRows.map((row) => [row.id, row.status]))
    const assigneeUserIds = [
      ...new Set(rawRows.map((row) => row.assigneeId).filter((id): id is string => Boolean(id))),
    ]
    const [
      overlayDueDateSet,
      evidenceCounts,
      readinessById,
      smartPriorityProfile,
      assigneeNamesById,
    ] = await Promise.all([
      listActiveOverlayDueDateSet(db, firmId, obligationIds),
      listEvidenceCounts(obligationIds),
      loadDerivedReadinessByObligation(db, firmId, statuses),
      loadSmartPriorityProfile(),
      loadUserNames(assigneeUserIds),
    ])
    const { statutory: overlayStatutory, internal: overlayInternal } = overlayDueDateSet
    const asOfDate = getAsOfDate(input)
    const asOfDateOnly = asOfDate.toISOString().slice(0, 10)
    const rowDrafts = rawRows.map((row) => {
      const currentDueDate = overlayInternal.get(row.id) ?? row.currentDueDate
      // A pulse postponement moves the tax-authority FILING + PAYMENT deadlines
      // to the new statutory date; current_due_date (internal target) is that
      // date minus the firm offset. Overlaying only current_due_date left the
      // filing/payment tiles showing the old date — and the UI clamps the
      // internal target to <= filing, hiding the move entirely.
      const overlayStatutoryDate = overlayStatutory.get(row.id)
      const taxAuthorityFilingDueDate = overlayStatutoryDate ?? row.filingDueDate ?? row.baseDueDate
      const taxAuthorityPaymentDueDate =
        overlayStatutoryDate ?? row.paymentDueDate ?? row.baseDueDate
      const accrued = estimateAccruedPenalty(
        {
          jurisdiction: row.clientState,
          taxType: row.taxType,
          entityType: row.clientEntityType,
          // Penalties accrue from the postponed statutory date — feed the
          // overlaid filing/payment so a relief extension defers accrual.
          dueDate: statutoryPenaltyDueDate({
            ...row,
            filingDueDate: taxAuthorityFilingDueDate,
            paymentDueDate: taxAuthorityPaymentDueDate,
            currentDueDate,
          }),
          penaltyFactsJson: row.penaltyFactsJson,
        },
        { asOfDate: asOfDateOnly },
      )
      return Object.assign({}, row, {
        filingDueDate: taxAuthorityFilingDueDate,
        paymentDueDate: taxAuthorityPaymentDueDate,
        currentDueDate,
        readiness: readinessById.get(row.id) ?? 'ready',
        evidenceCount: evidenceCounts.get(row.id) ?? 0,
        // Obligation-level assignee wins over the client default.
        assigneeName: row.assigneeId
          ? (assigneeNamesById.get(row.assigneeId) ?? row.assigneeName)
          : row.assigneeName,
        clientState: normalizeStateCode(row.clientState),
        clientCounty: normalizeNullableText(row.clientCounty),
        daysUntilDue: daysUntilDue(currentDueDate, asOfDate),
        accruedPenaltyCents: accrued.estimatedExposureCents,
        accruedPenaltyStatus: accrued.status,
        accruedPenaltyBreakdown: accrued.breakdown,
        penaltyAsOfDate: asOfDateOnly,
      })
    })
    const priorityById = new Map(
      rankSmartPriorities(
        rowDrafts.map((row) => ({
          ...row,
          obligationId: row.id,
          asOfDate: asOfDateOnly,
          importanceWeight: row.importanceWeight ?? 2,
          lateFilingCountLast12mo: row.lateFilingCountLast12mo ?? 0,
        })),
        smartPriorityProfile,
      ).map(({ row, smartPriority }) => [row.id, smartPriority]),
    )

    return rowDrafts.map(
      (row): ObligationQueueListRow =>
        Object.assign({}, row, {
          smartPriority: priorityById.get(row.id)!,
        }),
    )
  }

  return {
    firmId,

    async list(input: ObligationQueueListInput = {}): Promise<ObligationQueueListResult> {
      const sort: ObligationQueueSort = input.sort ?? 'smart_priority'
      const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT)

      const filters: SQL[] = [
        eq(obligationInstance.firmId, firmId),
        eq(client.firmId, firmId),
        isNull(client.deletedAt),
        isNull(obligationInstance.supersededAt),
      ]
      const clientCountySql = sql<
        string | null
      >`coalesce(json_extract(${clientFilingProfile.countiesJson}, '$[0]'), ${client.county})`

      if (input.status && input.status.length > 0) {
        filters.push(inArray(obligationInstance.status, input.status))
      }

      // "Awaiting signature" lens — filed returns whose client hasn't
      // signed Form 8879 yet. Combined predicate on purpose: efileState
      // alone is unreliable (new filing obligations are seeded with
      // 'authorization_requested' at creation while still 'pending'), so
      // we also require status='done'.
      if (input.awaitingSignature) {
        filters.push(
          and(
            eq(obligationInstance.status, 'done'),
            eq(obligationInstance.efileState, 'authorization_requested'),
          )!,
        )
      }

      if (input.confirmed !== undefined) {
        filters.push(eq(obligationInstance.confirmed, input.confirmed))
      }

      const obligationIds = uniqueNonEmpty(input.obligationIds)
      if (obligationIds.length > 0) {
        filters.push(inArray(obligationInstance.id, obligationIds))
      }

      const clientIds = uniqueNonEmpty(input.clientIds)
      if (clientIds.length > 0) {
        filters.push(inArray(obligationInstance.clientId, clientIds))
      }

      const ruleIds = uniqueNonEmpty(input.ruleIds)
      if (ruleIds.length > 0) {
        filters.push(inArray(obligationInstance.ruleId, ruleIds))
      }

      const states = uniqueNonEmpty(input.states)
        .map((value) => normalizeStateCode(value))
        .filter((value): value is string => value !== null)
      if (states.length > 0) {
        filters.push(inArray(obligationInstance.jurisdiction, states))
      }

      const counties = uniqueNonEmpty(input.counties)
      if (counties.length > 0) {
        filters.push(inArray(clientCountySql, counties))
      }

      const taxTypes = uniqueNonEmpty(input.taxTypes)
      if (taxTypes.length > 0) {
        filters.push(inArray(obligationInstance.taxType, taxTypes))
      }

      const assigneeNames = uniqueNonEmpty([input.assigneeName, ...(input.assigneeNames ?? [])])
      if (assigneeNames.length > 0) {
        filters.push(inArray(client.assigneeName, assigneeNames))
      }

      if (input.owner === 'unassigned') {
        filters.push(or(isNull(client.assigneeName), eq(client.assigneeName, ''))!)
      }

      const search = normalizeObligationQueueSearch(input.search)
      if (search) {
        const needle = `%${escapeLikePattern(search)}%`
        filters.push(sql`${client.name} like ${needle} escape '\\'`)
      }

      const orderBy =
        sort === 'due_desc'
          ? [desc(obligationInstance.currentDueDate), desc(obligationInstance.id)]
          : sort === 'updated_desc'
            ? [desc(obligationInstance.updatedAt), desc(obligationInstance.id)]
            : [asc(obligationInstance.currentDueDate), asc(obligationInstance.id)]

      const rawRows = await db
        .select({
          id: obligationInstance.id,
          firmId: obligationInstance.firmId,
          clientId: obligationInstance.clientId,
          clientFilingProfileId: obligationInstance.clientFilingProfileId,
          taxType: obligationInstance.taxType,
          taxYear: obligationInstance.taxYear,
          taxYearType: obligationInstance.taxYearType,
          fiscalYearEndMonth: obligationInstance.fiscalYearEndMonth,
          fiscalYearEndDay: obligationInstance.fiscalYearEndDay,
          taxPeriodStart: obligationInstance.taxPeriodStart,
          taxPeriodEnd: obligationInstance.taxPeriodEnd,
          taxPeriodKind: obligationInstance.taxPeriodKind,
          taxPeriodSource: obligationInstance.taxPeriodSource,
          taxPeriodReviewReason: obligationInstance.taxPeriodReviewReason,
          ruleId: obligationInstance.ruleId,
          ruleVersion: obligationInstance.ruleVersion,
          rulePeriod: obligationInstance.rulePeriod,
          generationSource: obligationInstance.generationSource,
          jurisdiction: obligationInstance.jurisdiction,
          obligationType: obligationInstance.obligationType,
          formName: obligationInstance.formName,
          authority: obligationInstance.authority,
          filingDueDate: obligationInstance.filingDueDate,
          paymentDueDate: obligationInstance.paymentDueDate,
          sourceEvidenceJson: obligationInstance.sourceEvidenceJson,
          recurrence: obligationInstance.recurrence,
          riskLevel: obligationInstance.riskLevel,
          baseDueDate: obligationInstance.baseDueDate,
          currentDueDate: obligationInstance.currentDueDate,
          status: obligationInstance.status,
          confirmed: obligationInstance.confirmed,
          blockedByObligationInstanceId: obligationInstance.blockedByObligationInstanceId,
          extensionDecision: obligationInstance.extensionDecision,
          extensionMemo: obligationInstance.extensionMemo,
          extensionSource: obligationInstance.extensionSource,
          extensionExpectedDueDate: obligationInstance.extensionExpectedDueDate,
          extensionDecidedAt: obligationInstance.extensionDecidedAt,
          extensionDecidedByUserId: obligationInstance.extensionDecidedByUserId,
          extensionState: obligationInstance.extensionState,
          extensionFormName: obligationInstance.extensionFormName,
          extensionFiledAt: obligationInstance.extensionFiledAt,
          extensionAcceptedAt: obligationInstance.extensionAcceptedAt,
          prepStage: obligationInstance.prepStage,
          reviewStage: obligationInstance.reviewStage,
          reviewerUserId: obligationInstance.reviewerUserId,
          reviewCompletedAt: obligationInstance.reviewCompletedAt,
          paymentState: obligationInstance.paymentState,
          paymentConfirmedAt: obligationInstance.paymentConfirmedAt,
          efileState: obligationInstance.efileState,
          efileAuthorizationForm: obligationInstance.efileAuthorizationForm,
          efileSubmittedAt: obligationInstance.efileSubmittedAt,
          efileAcceptedAt: obligationInstance.efileAcceptedAt,
          efileRejectedAt: obligationInstance.efileRejectedAt,
          migrationBatchId: obligationInstance.migrationBatchId,
          estimatedTaxDueCents: obligationInstance.estimatedTaxDueCents,
          estimatedExposureCents: obligationInstance.estimatedExposureCents,
          exposureStatus: obligationInstance.exposureStatus,
          penaltyFactsJson: obligationInstance.penaltyFactsJson,
          penaltyFactsVersion: obligationInstance.penaltyFactsVersion,
          penaltyBreakdownJson: obligationInstance.penaltyBreakdownJson,
          penaltyFormulaVersion: obligationInstance.penaltyFormulaVersion,
          missingPenaltyFactsJson: obligationInstance.missingPenaltyFactsJson,
          penaltySourceRefsJson: obligationInstance.penaltySourceRefsJson,
          penaltyFormulaLabel: obligationInstance.penaltyFormulaLabel,
          exposureCalculatedAt: obligationInstance.exposureCalculatedAt,
          createdAt: obligationInstance.createdAt,
          updatedAt: obligationInstance.updatedAt,
          clientName: client.name,
          clientState: obligationInstance.jurisdiction,
          clientCounty: clientCountySql,
          assigneeName: client.assigneeName,
          assigneeId: obligationInstance.assigneeId,
          snoozedUntil: obligationInstance.snoozedUntil,
          clientEntityType: client.entityType,
          clientEstimatedTaxLiabilityCents: client.estimatedTaxLiabilityCents,
          clientEquityOwnerCount: client.equityOwnerCount,
          importanceWeight: client.importanceWeight,
          lateFilingCountLast12mo: client.lateFilingCountLast12mo,
        })
        .from(obligationInstance)
        .innerJoin(client, eq(obligationInstance.clientId, client.id))
        .leftJoin(
          clientFilingProfile,
          eq(obligationInstance.clientFilingProfileId, clientFilingProfile.id),
        )
        .where(and(...filters))
        .orderBy(...orderBy)
        .limit(MAX_READ_ROWS)

      const decodedCursor =
        sort !== 'updated_desc' && input.cursor ? decodeCursor(input.cursor) : null
      const rows = (await hydrateRows(rawRows, input))
        .filter((row) => (obligationIds.length > 0 ? obligationIds.includes(row.id) : true))
        // Snoozed deadlines drop out of the default queue until the snooze
        // instant passes (Pencil HuYeb). Deep-links via listByIds are
        // unaffected, so a snoozed row can still be opened directly.
        .filter((row) =>
          row.snoozedUntil ? row.snoozedUntil.getTime() <= getAsOfDate(input).getTime() : true,
        )
        .filter((row) => isWithinDueFilter(row, input))
        .filter((row) => isWithinDaysRange(row, input))
        .filter((row) =>
          input.readiness && input.readiness.length > 0
            ? input.readiness.includes(row.readiness)
            : true,
        )
        .filter((row) => (input.needsEvidence ? row.evidenceCount === 0 : true))
        .toSorted((a, b) => compareRows(a, b, sort))
        .filter((row) => (decodedCursor ? isAfterCursor(row, sort, decodedCursor) : true))

      const hasMore = rows.length > limit
      const pageRows = hasMore ? rows.slice(0, limit) : rows
      const lastRow = pageRows[pageRows.length - 1]
      const nextCursor =
        hasMore && lastRow && sort !== 'updated_desc' ? encodeCursor(lastRow) : null

      return {
        rows: pageRows,
        nextCursor,
      }
    },

    async listByIds(
      ids: string[],
      input: Pick<ObligationQueueListInput, 'asOfDate'> = {},
    ): Promise<ObligationQueueListRow[]> {
      const uniqueIds = uniqueNonEmpty(ids)
      if (uniqueIds.length === 0) return []

      const reads = []
      for (let i = 0; i < uniqueIds.length; i += ID_LOOKUP_BATCH_SIZE) {
        const chunk = uniqueIds.slice(i, i + ID_LOOKUP_BATCH_SIZE)
        reads.push(
          db
            .select({
              id: obligationInstance.id,
              firmId: obligationInstance.firmId,
              clientId: obligationInstance.clientId,
              clientFilingProfileId: obligationInstance.clientFilingProfileId,
              taxType: obligationInstance.taxType,
              taxYear: obligationInstance.taxYear,
              taxYearType: obligationInstance.taxYearType,
              fiscalYearEndMonth: obligationInstance.fiscalYearEndMonth,
              fiscalYearEndDay: obligationInstance.fiscalYearEndDay,
              taxPeriodStart: obligationInstance.taxPeriodStart,
              taxPeriodEnd: obligationInstance.taxPeriodEnd,
              taxPeriodKind: obligationInstance.taxPeriodKind,
              taxPeriodSource: obligationInstance.taxPeriodSource,
              taxPeriodReviewReason: obligationInstance.taxPeriodReviewReason,
              ruleId: obligationInstance.ruleId,
              ruleVersion: obligationInstance.ruleVersion,
              rulePeriod: obligationInstance.rulePeriod,
              generationSource: obligationInstance.generationSource,
              jurisdiction: obligationInstance.jurisdiction,
              obligationType: obligationInstance.obligationType,
              formName: obligationInstance.formName,
              authority: obligationInstance.authority,
              filingDueDate: obligationInstance.filingDueDate,
              paymentDueDate: obligationInstance.paymentDueDate,
              sourceEvidenceJson: obligationInstance.sourceEvidenceJson,
              recurrence: obligationInstance.recurrence,
              riskLevel: obligationInstance.riskLevel,
              baseDueDate: obligationInstance.baseDueDate,
              currentDueDate: obligationInstance.currentDueDate,
              status: obligationInstance.status,
              confirmed: obligationInstance.confirmed,
              blockedByObligationInstanceId: obligationInstance.blockedByObligationInstanceId,
              extensionDecision: obligationInstance.extensionDecision,
              extensionMemo: obligationInstance.extensionMemo,
              extensionSource: obligationInstance.extensionSource,
              extensionExpectedDueDate: obligationInstance.extensionExpectedDueDate,
              extensionDecidedAt: obligationInstance.extensionDecidedAt,
              extensionDecidedByUserId: obligationInstance.extensionDecidedByUserId,
              extensionState: obligationInstance.extensionState,
              extensionFormName: obligationInstance.extensionFormName,
              extensionFiledAt: obligationInstance.extensionFiledAt,
              extensionAcceptedAt: obligationInstance.extensionAcceptedAt,
              prepStage: obligationInstance.prepStage,
              reviewStage: obligationInstance.reviewStage,
              reviewerUserId: obligationInstance.reviewerUserId,
              reviewCompletedAt: obligationInstance.reviewCompletedAt,
              paymentState: obligationInstance.paymentState,
              paymentConfirmedAt: obligationInstance.paymentConfirmedAt,
              efileState: obligationInstance.efileState,
              efileAuthorizationForm: obligationInstance.efileAuthorizationForm,
              efileSubmittedAt: obligationInstance.efileSubmittedAt,
              efileAcceptedAt: obligationInstance.efileAcceptedAt,
              efileRejectedAt: obligationInstance.efileRejectedAt,
              migrationBatchId: obligationInstance.migrationBatchId,
              estimatedTaxDueCents: obligationInstance.estimatedTaxDueCents,
              estimatedExposureCents: obligationInstance.estimatedExposureCents,
              exposureStatus: obligationInstance.exposureStatus,
              penaltyFactsJson: obligationInstance.penaltyFactsJson,
              penaltyFactsVersion: obligationInstance.penaltyFactsVersion,
              penaltyBreakdownJson: obligationInstance.penaltyBreakdownJson,
              penaltyFormulaVersion: obligationInstance.penaltyFormulaVersion,
              missingPenaltyFactsJson: obligationInstance.missingPenaltyFactsJson,
              penaltySourceRefsJson: obligationInstance.penaltySourceRefsJson,
              penaltyFormulaLabel: obligationInstance.penaltyFormulaLabel,
              exposureCalculatedAt: obligationInstance.exposureCalculatedAt,
              createdAt: obligationInstance.createdAt,
              updatedAt: obligationInstance.updatedAt,
              clientName: client.name,
              clientState: obligationInstance.jurisdiction,
              clientCounty: sql<
                string | null
              >`coalesce(json_extract(${clientFilingProfile.countiesJson}, '$[0]'), ${client.county})`,
              assigneeName: client.assigneeName,
              assigneeId: obligationInstance.assigneeId,
              snoozedUntil: obligationInstance.snoozedUntil,
              clientEntityType: client.entityType,
              clientEstimatedTaxLiabilityCents: client.estimatedTaxLiabilityCents,
              clientEquityOwnerCount: client.equityOwnerCount,
              importanceWeight: client.importanceWeight,
              lateFilingCountLast12mo: client.lateFilingCountLast12mo,
            })
            .from(obligationInstance)
            .innerJoin(client, eq(obligationInstance.clientId, client.id))
            .leftJoin(
              clientFilingProfile,
              eq(obligationInstance.clientFilingProfileId, clientFilingProfile.id),
            )
            .where(
              and(
                eq(obligationInstance.firmId, firmId),
                eq(client.firmId, firmId),
                isNull(client.deletedAt),
                inArray(obligationInstance.id, chunk),
              ),
            ),
        )
      }

      const rows = await hydrateRows((await Promise.all(reads)).flat(), input)
      const byId = new Map(rows.map((row) => [row.id, row]))
      return uniqueIds.flatMap((id) => {
        const row = byId.get(id)
        return row ? [row] : []
      })
    },

    async facets(): Promise<ObligationQueueFacetsOutput> {
      const rawRows = await db
        .select({
          clientId: obligationInstance.clientId,
          clientName: client.name,
          clientState: obligationInstance.jurisdiction,
          clientCounty: sql<
            string | null
          >`coalesce(json_extract(${clientFilingProfile.countiesJson}, '$[0]'), ${client.county})`,
          taxType: obligationInstance.taxType,
          assigneeName: client.assigneeName,
          status: obligationInstance.status,
        })
        .from(obligationInstance)
        .innerJoin(client, eq(obligationInstance.clientId, client.id))
        .leftJoin(
          clientFilingProfile,
          eq(obligationInstance.clientFilingProfileId, clientFilingProfile.id),
        )
        .where(
          and(
            eq(obligationInstance.firmId, firmId),
            eq(client.firmId, firmId),
            isNull(client.deletedAt),
            isNull(obligationInstance.supersededAt),
          ),
        )
        .orderBy(asc(client.name), asc(obligationInstance.taxType))
        .limit(MAX_READ_ROWS)

      const clients = new Map<string, ObligationQueueClientFacetOption>()
      const states = new Map<string, ObligationQueueFacetOption>()
      const counties = new Map<string, ObligationQueueCountyFacetOption>()
      const taxTypes = new Map<string, ObligationQueueFacetOption>()
      const assigneeNames = new Map<string, ObligationQueueFacetOption>()
      const statuses = new Map<string, ObligationQueueFacetOption>()

      for (const row of rawRows) {
        const clientState = normalizeStateCode(row.clientState)
        const clientCounty = normalizeNullableText(row.clientCounty)
        const assigneeName = normalizeNullableText(row.assigneeName)

        const clientFacet = clients.get(row.clientId)
        if (clientFacet) {
          clientFacet.count += 1
        } else {
          clients.set(row.clientId, {
            value: row.clientId,
            label: row.clientName,
            count: 1,
            state: clientState,
            county: clientCounty,
          })
        }

        if (clientState) {
          const stateFacet = states.get(clientState)
          if (stateFacet) {
            stateFacet.count += 1
          } else {
            states.set(clientState, { value: clientState, label: clientState, count: 1 })
          }
        }

        if (clientCounty) {
          const countyKey = `${clientState ?? ''}|${clientCounty}`
          const countyFacet = counties.get(countyKey)
          if (countyFacet) {
            countyFacet.count += 1
          } else {
            counties.set(countyKey, {
              value: clientCounty,
              label: clientState ? `${clientCounty}, ${clientState}` : clientCounty,
              count: 1,
              state: clientState,
            })
          }
        }

        const taxTypeFacet = taxTypes.get(row.taxType)
        if (taxTypeFacet) {
          taxTypeFacet.count += 1
        } else {
          taxTypes.set(row.taxType, { value: row.taxType, label: row.taxType, count: 1 })
        }

        if (assigneeName) {
          const assigneeFacet = assigneeNames.get(assigneeName)
          if (assigneeFacet) {
            assigneeFacet.count += 1
          } else {
            assigneeNames.set(assigneeName, {
              value: assigneeName,
              label: assigneeName,
              count: 1,
            })
          }
        }

        const statusFacet = statuses.get(row.status)
        if (statusFacet) {
          statusFacet.count += 1
        } else {
          statuses.set(row.status, { value: row.status, label: row.status, count: 1 })
        }
      }

      return {
        clients: [...clients.values()].toSorted(compareFacetLabels).slice(0, MAX_FACET_OPTIONS),
        states: [...states.values()].toSorted(compareFacetLabels).slice(0, MAX_FACET_OPTIONS),
        counties: [...counties.values()].toSorted(compareFacetLabels).slice(0, MAX_FACET_OPTIONS),
        taxTypes: [...taxTypes.values()].toSorted(compareFacetLabels).slice(0, MAX_FACET_OPTIONS),
        assigneeNames: [...assigneeNames.values()]
          .toSorted(compareFacetLabels)
          .slice(0, MAX_FACET_OPTIONS),
        statuses: [...statuses.values()],
      }
    },

    async listSavedViews(): Promise<ObligationQueueSavedViewRow[]> {
      return db
        .select()
        .from(obligationSavedView)
        .where(eq(obligationSavedView.firmId, firmId))
        .orderBy(desc(obligationSavedView.isPinned), asc(obligationSavedView.name))
    },

    async createSavedView(
      input: ObligationQueueSavedViewCreateInput,
    ): Promise<ObligationQueueSavedViewRow> {
      const id = crypto.randomUUID()
      await db.insert(obligationSavedView).values({
        id,
        firmId,
        createdByUserId: input.createdByUserId,
        name: input.name,
        queryJson: input.queryJson,
        columnVisibilityJson: input.columnVisibilityJson,
        density: input.density,
        isPinned: input.isPinned,
      })
      const [row] = await db
        .select()
        .from(obligationSavedView)
        .where(and(eq(obligationSavedView.firmId, firmId), eq(obligationSavedView.id, id)))
        .limit(1)
      if (!row) throw new Error('Saved view could not be re-read.')
      return row
    },

    async updateSavedView(
      input: ObligationQueueSavedViewUpdateInput,
    ): Promise<ObligationQueueSavedViewRow> {
      const patch: Partial<typeof obligationSavedView.$inferInsert> = {}
      if (input.name !== undefined) patch.name = input.name
      if (input.queryJson !== undefined) patch.queryJson = input.queryJson
      if (input.columnVisibilityJson !== undefined) {
        patch.columnVisibilityJson = input.columnVisibilityJson
      }
      if (input.density !== undefined) patch.density = input.density
      if (input.isPinned !== undefined) patch.isPinned = input.isPinned
      if (Object.keys(patch).length > 0) {
        await db
          .update(obligationSavedView)
          .set(patch)
          .where(and(eq(obligationSavedView.firmId, firmId), eq(obligationSavedView.id, input.id)))
      }
      const [row] = await db
        .select()
        .from(obligationSavedView)
        .where(and(eq(obligationSavedView.firmId, firmId), eq(obligationSavedView.id, input.id)))
        .limit(1)
      if (!row) throw new Error('Saved view not found.')
      return row
    },

    async deleteSavedView(id: string): Promise<void> {
      await db
        .delete(obligationSavedView)
        .where(and(eq(obligationSavedView.firmId, firmId), eq(obligationSavedView.id, id)))
    },
  }
}

export type ObligationQueueRepo = ReturnType<typeof makeObligationQueueRepo>
