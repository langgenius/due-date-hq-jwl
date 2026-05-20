import type {
  ObligationQueueDueFilter,
  ObligationQueueOwnerFilter,
  ObligationQueueReadiness,
  ObligationQueueSort,
} from './shared'
import type { ObligationInstanceRow, PenaltyBreakdownItem } from './obligations'
import type { SmartPriorityBreakdown } from './priority'

export interface ObligationQueueListInput {
  status?: ObligationInstanceRow['status'][]
  search?: string
  obligationIds?: string[]
  clientIds?: string[]
  ruleIds?: string[]
  states?: string[]
  counties?: string[]
  taxTypes?: string[]
  assigneeName?: string
  assigneeNames?: string[]
  owner?: ObligationQueueOwnerFilter
  due?: ObligationQueueDueFilter
  dueWithinDays?: number
  exposureStatus?: ObligationInstanceRow['exposureStatus']
  readiness?: ObligationQueueReadiness[]
  minExposureCents?: number
  maxExposureCents?: number
  minDaysUntilDue?: number
  maxDaysUntilDue?: number
  needsEvidence?: boolean
  asOfDate?: string
  sort?: ObligationQueueSort
  cursor?: string | null
  limit?: number
}

export interface ObligationQueueListRow extends ObligationInstanceRow {
  clientName: string
  clientState: string | null
  clientCounty: string | null
  assigneeName: string | null
  readiness: ObligationQueueReadiness
  daysUntilDue: number
  evidenceCount: number
  accruedPenaltyCents: number | null
  accruedPenaltyStatus: ObligationInstanceRow['exposureStatus']
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
}

export type ObligationQueueDensity = 'comfortable' | 'compact'

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

export interface ObligationQueueRepo {
  readonly firmId: string
  list(input?: ObligationQueueListInput): Promise<ObligationQueueListResult>
  listByIds(ids: string[], input?: { asOfDate?: string }): Promise<ObligationQueueListRow[]>
  facets(): Promise<ObligationQueueFacetsOutput>
  listSavedViews(): Promise<ObligationQueueSavedViewRow[]>
  createSavedView(input: ObligationQueueSavedViewCreateInput): Promise<ObligationQueueSavedViewRow>
  updateSavedView(input: ObligationQueueSavedViewUpdateInput): Promise<ObligationQueueSavedViewRow>
  deleteSavedView(id: string): Promise<void>
}
