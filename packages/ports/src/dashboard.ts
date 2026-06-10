import type {
  DashboardBriefScope,
  DashboardBriefStatus,
  DashboardDueBucket,
  DashboardEvidenceFilter,
  DashboardSeverity,
  ExposureStatus,
  ObligationStatus,
  ObligationType,
} from './shared'
import type { PenaltyBreakdownItem, PenaltySourceRef } from './obligations'
import type { SmartPriorityBreakdown } from './priority'

export type DashboardTriageTabKey = 'this_week' | 'this_month' | 'long_term'

export interface DashboardLoadInput {
  asOfDate: string
  windowDays?: number
  topLimit?: number
  // Unified page scope (2026-06-10 "My work / Everyone"): one field drives
  // BOTH the daily-brief lookup and the row/summary/facet scoping. `me`
  // keeps rows whose effective assignee (obligation-level override, else
  // client-level) is `scopeUserId` — plus unassigned rows, so a deadline
  // nobody claimed never disappears from everyone's Today.
  scope?: DashboardBriefScope
  scopeUserId?: string | null
  // Viewer id for the "Yesterday" recap (independent of scope — the recap
  // anchor is per-user even in the firm-wide view). Unset for non-view
  // loads (brief-consumer snapshots, cron risk probes).
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

export interface DashboardTopRow {
  obligationId: string
  clientId: string
  clientName: string
  clientEmail: string | null
  taxType: string
  // 2026-06-03 (Yuqi /critique pass): obligation type threaded
  // through so the dashboard ActionsTable can render a TYPE column
  // distinguishing the 6 obligation types without inferring from
  // taxType. See dashboard contract for full context.
  obligationType: ObligationType
  currentDueDate: Date
  // 2026-05-27 (D12 — Agent ω): payment-side due date threaded from
  // `obligation_instance.payment_due_date`. Null when the obligation
  // has no payment side. Render layer uses this to surface
  // "Payment N days late" on filed-but-payment-overdue rows.
  paymentDueDate: Date | null
  status: ObligationStatus
  // 2026-06-10 (My work / Everyone): EFFECTIVE assignee — the
  // obligation-level override when set, else the client-level default
  // (COALESCE semantics shared with the obligations queue + reminder
  // dispatch). `assigneeId` is an auth user id; `assigneeName` is the
  // display label (may be a free-text import name with no user id).
  assigneeId: string | null
  assigneeName: string | null
  missingPenaltyFacts: string[]
  penaltySourceRefs: PenaltySourceRef[]
  penaltyFormulaLabel: string | null
  penaltyFactsVersion: string | null
  accruedPenaltyCents: number | null
  accruedPenaltyStatus: ExposureStatus
  accruedPenaltyBreakdown: PenaltyBreakdownItem[]
  penaltyAsOfDate: string
  penaltyFormulaVersion: string | null
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

export interface DashboardFacetOption {
  value: string
  label: string
  count: number
}

export interface DashboardClientFacetOption extends DashboardFacetOption {
  value: string
}

export interface DashboardDueBucketFacetOption extends DashboardFacetOption {
  value: DashboardDueBucket
}

export interface DashboardStatusFacetOption extends DashboardFacetOption {
  value: ObligationStatus
}

export interface DashboardSeverityFacetOption extends DashboardFacetOption {
  value: DashboardSeverity
}

export interface DashboardEvidenceFacetOption extends DashboardFacetOption {
  value: DashboardEvidenceFilter
}

export interface DashboardFacetsOutput {
  clients: DashboardClientFacetOption[]
  taxTypes: DashboardFacetOption[]
  dueBuckets: DashboardDueBucketFacetOption[]
  statuses: DashboardStatusFacetOption[]
  severities: DashboardSeverityFacetOption[]
  evidence: DashboardEvidenceFacetOption[]
}

export type { DashboardDueBucket, DashboardEvidenceFilter } from './shared'

export interface DashboardLoadResult {
  asOfDate: string
  windowDays: number
  summary: {
    openObligationCount: number
    // Firm-wide open count, ALWAYS unscoped — when `scope: 'me'` empties
    // the personal queue this still says whether the rest of the firm has
    // open work (drives the "you're clear, firm has N" empty state).
    firmOpenObligationCount: number
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
  // "Yesterday" Daily-Brief row: deterministic activity counts since the
  // viewer's previous (earlier-day) visit. Null without a recapUserId.
  recap: DashboardRecap | null
}

export interface DashboardRecap {
  since: Date
  completedCount: number
  filedCount: number
  paidCount: number
  newAlertCount: number
  dueDateMovedCount: number
  remindersSentCount: number
}

export interface DashboardBriefRow {
  id: string
  firmId: string
  userId: string | null
  scope: DashboardBriefScope
  asOfDate: string
  status: DashboardBriefStatus
  inputHash: string
  aiOutputId: string | null
  summaryText: string | null
  topObligationIds: string[]
  citations: unknown
  reason: string
  errorCode: string | null
  generatedAt: Date | null
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface DashboardBriefCreatePendingInput {
  id?: string
  scope: DashboardBriefScope
  userId?: string | null
  asOfDate: string
  inputHash: string
  reason: string
  now?: Date
}

export interface DashboardBriefReadyInput {
  aiOutputId?: string | null
  summaryText: string
  topObligationIds: string[]
  citations?: unknown
  generatedAt: Date
  expiresAt: Date
}

export interface DashboardBriefFailedInput {
  aiOutputId?: string | null
  errorCode: string
  generatedAt: Date
  expiresAt: Date
}

export interface DashboardRepo {
  readonly firmId: string
  load(input: DashboardLoadInput): Promise<DashboardLoadResult>
  // Pencil QGZta /splash — last-visit-aware "while you were away" recap.
  welcomeRecap(input: { userId: string; now: Date; weekAheadDays: number }): Promise<{
    lastVisitAt: Date | null
    deadlinesSyncedCount: number
    newAlertCount: number
    remindersSentCount: number
    clientsImportedCount: number
    dueThisWeekCount: number
  }>
  recordDashboardVisit(input: { userId: string; now: Date }): Promise<Date>
  findLatestBrief(input: {
    scope: DashboardBriefScope
    asOfDate: string
    userId?: string | null
    now?: Date
  }): Promise<DashboardBriefRow | null>
  findBriefByHash(input: {
    scope: DashboardBriefScope
    asOfDate: string
    inputHash: string
    userId?: string | null
    statuses?: DashboardBriefStatus[]
    now?: Date
  }): Promise<DashboardBriefRow | null>
  createBriefPending(input: DashboardBriefCreatePendingInput): Promise<DashboardBriefRow>
  markBriefReady(id: string, input: DashboardBriefReadyInput): Promise<DashboardBriefRow>
  markBriefFailed(id: string, input: DashboardBriefFailedInput): Promise<DashboardBriefRow>
}
