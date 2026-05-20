import type { ClientEntityType, ObligationStatus } from './shared'

export interface PulseAlertRow {
  id: string
  pulseId: string
  status: 'matched' | 'partially_applied' | 'applied' | 'dismissed' | 'snoozed' | 'reverted'
  sourceStatus: 'pending_review' | 'approved' | 'rejected' | 'quarantined' | 'source_revoked'
  title: string
  source: string
  sourceUrl: string
  summary: string
  publishedAt: Date
  matchedCount: number
  needsReviewCount: number
  confidence: number
  isSample: boolean
}

export interface PulseAffectedClientRow {
  obligationId: string
  clientId: string
  clientName: string
  state: string | null
  county: string | null
  entityType: ClientEntityType
  taxType: string
  currentDueDate: Date
  newDueDate: Date
  status: ObligationStatus
  matchStatus: 'eligible' | 'needs_review' | 'already_applied' | 'reverted'
  reason: string | null
}

export interface PulseDetailRow {
  alert: PulseAlertRow
  jurisdiction: string
  counties: string[]
  forms: string[]
  entityTypes: ClientEntityType[]
  originalDueDate: Date
  newDueDate: Date
  effectiveFrom: Date | null
  sourceExcerpt: string
  reviewedAt: Date | null
  affectedClients: PulseAffectedClientRow[]
}

export interface PulseSourceStateRow {
  sourceId: string
  tier: string
  jurisdiction: string
  enabled: boolean
  cadenceMs: number
  healthStatus: 'healthy' | 'degraded' | 'failing' | 'paused'
  lastCheckedAt: Date | null
  lastSuccessAt: Date | null
  lastChangeDetectedAt: Date | null
  nextCheckAt: Date | null
  consecutiveFailures: number
  lastError: string | null
  etag: string | null
  lastModified: string | null
}

export interface PulseSourceSignalRow {
  id: string
  sourceId: string
  externalId: string
  title: string
  officialSourceUrl: string
  publishedAt: Date
  fetchedAt: Date
  contentHash: string
  rawR2Key: string
  tier: string
  jurisdiction: string
  signalType: string
  status: 'open' | 'linked' | 'reviewed' | 'dismissed'
  linkedPulseId: string | null
  reviewedRuleId: string | null
  reviewDecisionId: string | null
}

export type PulsePriorityReviewStatus = 'open' | 'reviewed' | 'applied' | 'dismissed'
export type PulsePriorityLevel = 'normal' | 'high' | 'urgent'
export type PulsePriorityReasonKey =
  | 'preparer_requested'
  | 'needs_review_matches'
  | 'low_confidence'
  | 'high_impact'
  | 'source_attention'

export interface PulsePriorityReasonRow {
  key: PulsePriorityReasonKey
  points: number
  label: string
}

export interface PulsePriorityReviewRow {
  id: string
  alertId: string
  pulseId: string
  status: PulsePriorityReviewStatus
  priorityScore: number
  priorityReasons: PulsePriorityReasonRow[]
  selectedObligationIds: string[]
  confirmedObligationIds: string[]
  excludedObligationIds: string[]
  note: string | null
  requestedBy: string | null
  reviewedBy: string | null
  reviewedAt: Date | null
}

export interface PulsePriorityQueueItemRow {
  alert: PulseAlertRow
  level: PulsePriorityLevel
  priorityScore: number
  priorityReasons: PulsePriorityReasonRow[]
  review: PulsePriorityReviewRow | null
}

export interface PulseSeedInput {
  pulseId?: string
  alertId?: string
  source: string
  sourceUrl: string
  rawR2Key?: string | null
  publishedAt: Date
  aiSummary: string
  verbatimQuote: string
  parsedJurisdiction: string
  parsedCounties: string[]
  parsedForms: string[]
  parsedEntityTypes: ClientEntityType[]
  parsedOriginalDueDate: Date
  parsedNewDueDate: Date
  parsedEffectiveFrom?: Date | null
  confidence: number
  reviewedBy?: string | null
  reviewedAt?: Date
  requiresHumanReview?: boolean
  isSample?: boolean
  matchedCount?: number
  needsReviewCount?: number
}

export interface PulseApplyInput {
  alertId: string
  obligationIds: string[]
  confirmedObligationIds?: string[]
  userId: string
  now?: Date
}

export interface PulseReviewPriorityMatchesInput {
  alertId: string
  selectedObligationIds: string[]
  confirmedObligationIds?: string[]
  excludedObligationIds?: string[]
  note?: string | null
  userId: string
  now?: Date
}

export interface PulseAlertActionInput {
  alertId: string
  userId: string
  now?: Date
}

export interface PulseDismissReasonInput extends PulseAlertActionInput {
  reason: string
}

export interface PulseSnoozeInput extends PulseAlertActionInput {
  until: Date
  reason: string
}

export interface PulseApplyResult {
  alert: PulseAlertRow
  appliedCount: number
  auditIds: string[]
  evidenceIds: string[]
  applicationIds: string[]
  emailOutboxId: string
  revertExpiresAt: Date
}

export interface PulseDismissResult {
  alert: PulseAlertRow
  auditId: string
}

export interface PulseRevertResult {
  alert: PulseAlertRow
  revertedCount: number
  auditIds: string[]
  evidenceIds: string[]
}

export interface PulseRepo {
  readonly firmId: string
  createSeedAlert(input: PulseSeedInput): Promise<{ pulseId: string; alertId: string }>
  listAlerts(opts?: { limit?: number }): Promise<PulseAlertRow[]>
  listHistory(opts?: { limit?: number; status?: PulseAlertRow['status'] }): Promise<PulseAlertRow[]>
  listSourceStates(): Promise<PulseSourceStateRow[]>
  listSourceSignals(opts?: {
    limit?: number
    status?: PulseSourceSignalRow['status']
  }): Promise<PulseSourceSignalRow[]>
  getSourceSignal(signalId: string): Promise<PulseSourceSignalRow | null>
  reviewSourceSignalForRule(input: {
    signalId: string
    ruleId: string
    reviewDecisionId: string
  }): Promise<PulseSourceSignalRow>
  getDetail(alertId: string): Promise<PulseDetailRow>
  listPriorityQueue(opts?: { limit?: number }): Promise<PulsePriorityQueueItemRow[]>
  requestPriorityReview(input: {
    alertId: string
    userId: string
    now?: Date
  }): Promise<PulsePriorityReviewRow>
  reviewPriorityMatches(input: PulseReviewPriorityMatchesInput): Promise<PulsePriorityReviewRow>
  applyReviewed(input: PulseAlertActionInput): Promise<PulseApplyResult>
  apply(input: PulseApplyInput): Promise<PulseApplyResult>
  dismiss(input: PulseDismissReasonInput): Promise<PulseDismissResult>
  snooze(input: PulseSnoozeInput): Promise<PulseDismissResult>
  revert(input: PulseAlertActionInput): Promise<PulseRevertResult>
  reactivate(input: PulseAlertActionInput): Promise<PulseDismissResult>
}
