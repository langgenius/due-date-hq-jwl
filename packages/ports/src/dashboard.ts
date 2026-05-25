import type {
  DashboardBriefScope,
  DashboardBriefStatus,
  DashboardDueBucket,
  DashboardEvidenceFilter,
  DashboardSeverity,
  ExposureStatus,
  ObligationStatus,
} from './shared'
import type { PenaltyBreakdownItem, PenaltySourceRef } from './obligations'
import type { SmartPriorityBreakdown } from './priority'

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

export interface DashboardTopRow {
  obligationId: string
  clientId: string
  clientName: string
  clientEmail: string | null
  taxType: string
  currentDueDate: Date
  status: ObligationStatus
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
