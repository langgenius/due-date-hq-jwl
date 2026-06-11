import type { ClientEntityType, ObligationStatus } from './shared'

export interface PulseAlertRow {
  id: string
  pulseId: string
  status: 'matched' | 'partially_applied' | 'applied' | 'dismissed' | 'reverted' | 'reviewed'
  sourceStatus: 'pending_review' | 'approved' | 'rejected' | 'quarantined' | 'source_revoked'
  changeKind:
    | 'deadline_shift'
    | 'filing_requirement'
    | 'applicability_scope'
    | 'form_instruction'
    | 'source_status'
    | 'rule_source_drift'
    | 'new_obligation'
    | 'protective_claim_window'
    | 'threshold_advisory'
    | 'other'
  actionMode: 'due_date_overlay' | 'review_only'
  title: string
  source: string
  sourceUrl: string
  summary: string
  publishedAt: Date
  // 2026-06-10 (handoff Phase 1.2): lifecycle timestamps for the alert status
  // chip suffix. Only the detail query populates them; list rows leave them
  // null. Serialized to ISO at the server boundary (toAlertPublic).
  dismissedAt: Date | null
  appliedAt: Date | null
  matchedCount: number
  needsReviewCount: number
  applyReadiness: {
    status: 'ready' | 'needs_details' | 'not_applicable'
    missing: Array<
      'original_due_date' | 'new_due_date' | 'forms' | 'entity_types' | 'affected_clients'
    >
  }
  duplicateSourceSnapshotCount: number
  confidence: number
  isSample: boolean
  // 2026-05-25 (Yuqi Alerts #9): jurisdiction (`FED` or a US
  // state/DC code, e.g. "CA", "TX") on each list-item alert. Same value as
  // PulseDetailRow.jurisdiction — mirrors `pulse.parsedJurisdiction`
  // from the DB. Lets the alerts list page filter / group by jurisdiction
  // without an N+1 detail fetch.
  jurisdiction: string
  // 2026-06-05 (Tax area filter): derived service-line bucket(s) the alert
  // touches (see @duedatehq/core/tax-area). Empty = uncategorized. Inlined as a
  // literal union to keep this port boundary decoupled from contracts, matching
  // the other enum-ish fields above.
  taxAreas: Array<
    | 'income_individual'
    | 'income_business'
    | 'sales_use'
    | 'payroll_withholding'
    | 'franchise'
    | 'info_compliance'
  >
  // 2026-06-05 (Affecting facts cell): AI-parsed forms the alert touches.
  // Structural twin of the repo PulseAlertRow.forms (same caveat as above).
  forms: string[]
  // 2026-06-11 (Already-in-effect band): how this firm got the row. 'catchup'
  // = onboarding catch-up over the still-in-effect landscape (state, not
  // news — pinned band, excluded from new-alert counters); 'live' = approval
  // fan-out or the daily sweep.
  origin: 'live' | 'catchup'
  // 2026-06-11 (Already-in-effect band): the date the firm must act by —
  // parsedNewDueDate, else protectiveActionDeadline, else parsedEffectiveUntil.
  // Drives the band's ascending act-by ordering; null sorts last.
  actionDeadline: Date | null
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
  newDueDate: Date | null
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
  originalDueDate: Date | null
  newDueDate: Date | null
  effectiveFrom: Date | null
  effectiveUntil: Date | null
  affectedRuleIds: string[]
  reverifyRuleIds: string[]
  structuredChange: unknown
  sourceExcerpt: string
  reviewedAt: Date | null
  applyReadiness: {
    status: 'ready' | 'needs_details' | 'not_applicable'
    missing: Array<
      'original_due_date' | 'new_due_date' | 'forms' | 'entity_types' | 'affected_clients'
    >
  }
  affectedClients: PulseAffectedClientRow[]
}

export interface PulseDueDateOverlayDetailsReviewInput {
  alertId: string
  newDueDate: Date
  selectedObligationIds: string[]
  confirmedObligationIds?: string[]
  excludedObligationIds?: string[]
  note?: string | null
  userId: string
  now?: Date
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

export interface PulseSourceSnapshotRow {
  id: string
  sourceId: string
  externalId: string
  title: string
  officialSourceUrl: string
  publishedAt: Date
  fetchedAt: Date
  contentHash: string
  rawR2Key: string
  // NULL = web fetch, 'inbound_email' = email worker (never auto-approves).
  ingestMethod: string | null
  parseStatus: 'pending_extract' | 'extracting' | 'extracted' | 'duplicate' | 'failed' | 'ignored'
  pulseId: string | null
  aiOutputId: string | null
  failureReason: string | null
}

export type PulsePriorityReviewStatus = 'open' | 'reviewed' | 'applied' | 'dismissed'
export type PulsePriorityLevel = 'normal' | 'high' | 'urgent'
export type PulsePriorityReasonKey =
  | 'preparer_requested'
  | 'needs_review_matches'
  | 'low_confidence'
  | 'high_impact'
  | 'source_attention'
  | 'protective_claim_deadline'
  | 'rights_window_source'

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

// One internal team note threaded on a firm's alert (Pencil Aogxu §7). The
// author's display name is resolved server-side (member/user join) so the UI
// never needs a second lookup. `parentNoteId` is the flat reply pointer.
export interface PulseAlertNoteRow {
  id: string
  alertId: string
  authorId: string
  authorName: string
  body: string
  parentNoteId: string | null
  createdAt: Date
}

export interface PulseAddAlertNoteInput {
  alertId: string
  body: string
  parentNoteId?: string | null
  userId: string
  now?: Date
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
  parsedOriginalDueDate: Date | null
  parsedNewDueDate: Date | null
  parsedEffectiveFrom?: Date | null
  parsedEffectiveUntil?: Date | null
  changeKind?:
    | 'deadline_shift'
    | 'filing_requirement'
    | 'applicability_scope'
    | 'form_instruction'
    | 'source_status'
    | 'rule_source_drift'
    | 'new_obligation'
    | 'protective_claim_window'
    | 'threshold_advisory'
    | 'other'
  actionMode?: 'due_date_overlay' | 'review_only'
  affectedRuleIds?: string[]
  structuredChange?: unknown
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
  reason?: string
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

// One approved, still-active pulse that affects a given rule. Dates stay as
// Date objects here; the server handler serializes to date-only strings.
export interface PulseRuleMatchRow {
  alert: PulseAlertRow
  originalDueDate: Date | null
  newDueDate: Date | null
  effectiveFrom: Date | null
  effectiveUntil: Date | null
  sourceExcerpt: string | null
  matchReason: 'affected_rule' | 'reverify_rule' | 'scope'
}

export interface PulseRepo {
  readonly firmId: string
  createSeedAlert(input: PulseSeedInput): Promise<{ pulseId: string; alertId: string }>
  listAlerts(opts?: {
    limit?: number
    cursor?: string | null
    // Filter by row origin: 'live' = the news stream (default UI queue),
    // 'catchup' = the pinned "Already in effect" band. Absent = both.
    origin?: 'live' | 'catchup'
  }): Promise<{ alerts: PulseAlertRow[]; nextCursor: string | null }>
  /**
   * Approved, still-active pulses that affect a specific rule. Backs the
   * rule-review dialog's "proposed change" block. Matches by the pulse's
   * affected/reverify rule lists or jurisdiction+form scope.
   */
  listAlertsForRule(input: {
    ruleId: string
    jurisdiction: string
    taxType: string
    formName?: string | null
  }): Promise<PulseRuleMatchRow[]>
  /**
   * Count-only variant of `listAlerts` — same WHERE clause, no row
   * fetch. Backs the sidebar nav badge so it can show the true count
   * (not a 50-row-cap slice).
   */
  countActiveAlerts(): Promise<number>
  /**
   * Recompute matchedCount/needsReviewCount for the firm's active
   * due-date-overlay alerts whose jurisdiction matches the given
   * just-created obligations. Called after rule acceptance generates
   * deadlines, so a firm that activated a state after a pulse was approved
   * no longer keeps a stale matchedCount=0. Does not apply any overlay.
   */
  refreshMatchedCountsForObligations(obligationIds: string[]): Promise<void>
  listHistory(opts?: {
    limit?: number
    status?: PulseAlertRow['status']
    cursor?: string | null
    /** Free tier passes 30 to window resolved history; null/undefined = full history (paid). */
    historyWindowDays?: number | null
  }): Promise<{ alerts: PulseAlertRow[]; nextCursor: string | null }>
  listSourceStates(): Promise<PulseSourceStateRow[]>
  getLatestSourceSnapshotBySourceId(sourceId: string): Promise<PulseSourceSnapshotRow | null>
  // Opt-in catch-up: materialize the still-open, high-value regulatory windows
  // this firm missed by joining / importing clients after approval. Returns the
  // number of firm alerts (re)materialized.
  catchUpStillOpenWindows(now?: Date): Promise<number>
  // Onboarding trigger for the catch-up above: runs it exactly when the
  // obligations just created are the firm's FIRST (total == createdCount), so
  // every first-materialization path (import, rule accept, rule catalog) gets
  // the day-one landscape without routing later additions away from the
  // sweep's "new alert" channel.
  catchUpStillOpenWindowsOnFirstObligations(createdCount: number, now?: Date): Promise<number>
  getDetail(alertId: string): Promise<PulseDetailRow>
  listPriorityQueue(opts?: { limit?: number }): Promise<PulsePriorityQueueItemRow[]>
  requestPriorityReview(input: {
    alertId: string
    userId: string
    now?: Date
  }): Promise<PulsePriorityReviewRow>
  reviewPriorityMatches(input: PulseReviewPriorityMatchesInput): Promise<PulsePriorityReviewRow>
  reviewDueDateOverlayDetails(input: PulseDueDateOverlayDetailsReviewInput): Promise<PulseDetailRow>
  applyReviewed(input: PulseAlertActionInput): Promise<PulseApplyResult>
  apply(input: PulseApplyInput): Promise<PulseApplyResult>
  dismiss(input: PulseDismissReasonInput): Promise<PulseDismissResult>
  revert(input: PulseAlertActionInput): Promise<PulseRevertResult>
  reactivate(input: PulseAlertActionInput): Promise<PulseDismissResult>
  markReviewed(input: PulseDismissReasonInput): Promise<PulseDismissResult>
  /**
   * Internal team notes threaded on an alert (Pencil Aogxu §7). Firm-scoped:
   * notes are visible to every member of the alert's firm. Ordered oldest →
   * newest; each row carries the author's resolved display name.
   */
  listAlertNotes(alertId: string): Promise<PulseAlertNoteRow[]>
  addAlertNote(input: PulseAddAlertNoteInput): Promise<PulseAlertNoteRow>
}
