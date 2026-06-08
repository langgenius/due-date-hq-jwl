import { sql } from 'drizzle-orm'
import { type ClientEntityType } from '../../schema/clients'
import { type ObligationStatus } from '../../schema/obligations'
import {
  pulse,
  pulseSourceSnapshot,
  type Pulse,
  type PulseActionMode,
  type PulseChangeKind,
  type PulseFirmAlertStatus,
  type PulsePriorityReviewStatus,
  type PulseSourceBaselineMode,
  type PulseSourceHealthStatus,
  type PulseSourceState,
  type PulseSourceSnapshot,
  type PulseSourceSnapshotStatus,
  type PulseStatus,
} from '../../schema/pulse'
import { OPEN_OBLIGATION_STATUSES } from '@duedatehq/core/obligation-workflow'
import { listRuleSources } from '@duedatehq/core/rules'
import { taxAreasForAlert, type TaxArea } from '@duedatehq/core/tax-area'
export const OPEN_STATUSES = [...OPEN_OBLIGATION_STATUSES] satisfies ObligationStatus[]
export const APPLICATION_BATCH_SIZE = Math.floor(100 / 9)
export const EXCEPTION_RULE_BATCH_SIZE = Math.floor(100 / 18)
export const EXCEPTION_APPLICATION_BATCH_SIZE = Math.floor(100 / 8)
export const EVIDENCE_BATCH_SIZE = Math.floor(100 / 17)
export const AUDIT_BATCH_SIZE = Math.floor(100 / 12)
export const EMAIL_BATCH_SIZE = 1
export const NOTIFICATION_BATCH_SIZE = Math.floor(100 / 10)
export const REVERT_WINDOW_MS = 24 * 60 * 60 * 1000
export const PULSE_DUPLICATE_WINDOW_MS = 45 * 24 * 60 * 60 * 1000
export const PULSE_DISMISS_DEFAULT_AUDIT_REASON = 'Dismissed from Pulse detail.'
export const PULSE_SNOOZE_DEFAULT_AUDIT_REASON = 'Snoozed for 24 hours from Pulse detail.'
export const PULSE_MARK_REVIEWED_DEFAULT_AUDIT_REASON = 'Marked reviewed from Pulse detail.'
export const PULSE_HANDLED_ALERT_STATUSES = [
  'dismissed',
  'snoozed',
  'partially_applied',
  'applied',
  'reverted',
  'reviewed',
] as const satisfies ReadonlyArray<PulseFirmAlertStatus>

export type PulseAffectedClientStatus = 'eligible' | 'needs_review' | 'already_applied' | 'reverted'
export type PulseReviewOnlyChangeKind = Exclude<PulseChangeKind, 'deadline_shift'>
export type PulseHandledFirmAlertStatus = (typeof PULSE_HANDLED_ALERT_STATUSES)[number]
export type PulseApplyReadinessStatus = 'ready' | 'needs_details' | 'not_applicable'
export type PulseApplyReadinessMissing =
  | 'original_due_date'
  | 'new_due_date'
  | 'forms'
  | 'entity_types'
  | 'affected_clients'

export interface PulseApplyReadinessRow {
  status: PulseApplyReadinessStatus
  missing: PulseApplyReadinessMissing[]
}

export interface PulseAlertRow {
  id: string
  pulseId: string
  status: PulseFirmAlertStatus
  sourceStatus: PulseStatus
  changeKind: PulseChangeKind
  actionMode: PulseActionMode
  title: string
  source: string
  sourceUrl: string
  summary: string
  publishedAt: Date
  matchedCount: number
  needsReviewCount: number
  applyReadiness: PulseApplyReadinessRow
  duplicateSourceSnapshotCount: number
  confidence: number
  isSample: boolean
  // 2026-05-25 (Yuqi Alerts #9): jurisdiction (`FED` or a US
  // state/DC code, e.g. "CA") on each list-item alert. Mirrors
  // `pulse.parsedJurisdiction` — same source field used by
  // PulseDetailRow.jurisdiction.
  jurisdiction: string
  // 2026-06-05 (Tax area filter): coarse service-line bucket(s) this alert
  // touches, derived from its reverify-rule citations (+ parsedForms fallback)
  // in toAlert. Empty = uncategorized.
  taxAreas: TaxArea[]
  // 2026-06-05 (Affecting facts cell): AI-parsed forms (mirrors
  // pulse.parsedForms), passed through to the public row so the alert card's
  // "Affecting" cell renders without a per-card detail fetch.
  forms: string[]
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
  matchStatus: PulseAffectedClientStatus
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
  applyReadiness: PulseApplyReadinessRow
  affectedClients: PulseAffectedClientRow[]
}

// Mirrors @duedatehq/ports PulseRuleMatchRow. One approved, still-active pulse
// that affects a given rule, surfaced in the rule-review dialog.
export interface PulseRuleMatchRow {
  alert: PulseAlertRow
  originalDueDate: Date | null
  newDueDate: Date | null
  effectiveFrom: Date | null
  effectiveUntil: Date | null
  sourceExcerpt: string | null
  matchReason: 'affected_rule' | 'reverify_rule' | 'scope'
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
  changeKind?: PulseChangeKind
  actionMode?: PulseActionMode
  affectedRuleIds?: string[]
  structuredChange?: unknown
  confidence: number
  reviewedBy?: string | null
  reviewedAt?: Date | null
  requiresHumanReview?: boolean
  isSample?: boolean
  matchedCount?: number
  needsReviewCount?: number
}

export interface PulseSourceSnapshotInput {
  id?: string
  sourceId: string
  externalId: string
  title: string
  officialSourceUrl: string
  publishedAt: Date
  fetchedAt: Date
  contentHash: string
  rawR2Key: string
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
  parseStatus: PulseSourceSnapshotStatus
  pulseId: string | null
  aiOutputId: string | null
  failureReason: string | null
}

export interface PulseSourceStateInput {
  sourceId: string
  tier: string
  jurisdiction: string
  cadenceMs: number
  enabled?: boolean
  // Initial baseline mode, applied only when the row is first created (never
  // overwritten on conflict). 'backfill' makes a source's first scan enqueue the
  // items already on its page instead of skipping them. Omit for the default
  // 'establish_on_first_seen'.
  baselineMode?: PulseSourceBaselineMode
  now?: Date
}

export interface PulseSourceStateRow {
  sourceId: string
  tier: string
  jurisdiction: string
  enabled: boolean
  cadenceMs: number
  healthStatus: PulseSourceHealthStatus
  lastCheckedAt: Date | null
  lastSuccessAt: Date | null
  lastChangeDetectedAt: Date | null
  monitoringBaselineAt: Date | null
  baselineMode: PulseSourceBaselineMode
  nextCheckAt: Date | null
  consecutiveFailures: number
  lastError: string | null
  etag: string | null
  lastModified: string | null
}

export type PulsePriorityReasonKey =
  | 'preparer_requested'
  | 'needs_review_matches'
  | 'low_confidence'
  | 'high_impact'
  | 'source_attention'
  | 'protective_claim_deadline'
  | 'rights_window_source'
export type PulsePriorityLevel = 'normal' | 'high' | 'urgent'

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

export interface PulseReviewRow {
  pulseId: string
  source: string
  sourceUrl: string
  rawR2Key: string | null
  publishedAt: Date
  summary: string
  sourceExcerpt: string
  jurisdiction: string
  counties: string[]
  forms: string[]
  entityTypes: string[]
  originalDueDate: Date | null
  newDueDate: Date | null
  effectiveFrom: Date | null
  effectiveUntil: Date | null
  affectedRuleIds: string[]
  structuredChange: unknown
  confidence: number
  status: PulseStatus
  requiresHumanReview: boolean
  createdAt: Date
}

export interface PulseExtractInput {
  snapshotId: string
  aiOutputId?: string | null
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
  // Action deadline for review_only protective_claim_window alerts, derived from
  // structuredChange.actionDeadline. Promoted to a column so the
  // still-actionable / expiry predicate and deadline sorting can query it.
  protectiveActionDeadline?: Date | null
  changeKind?: PulseChangeKind
  actionMode?: PulseActionMode
  affectedRuleIds?: string[]
  reverifyRuleIds?: string[]
  structuredChange?: unknown
  confidence: number
  requiresHumanReview?: boolean
  isSample?: boolean
  /**
   * When true, derive and persist a canonical `dedupeKey` so this AI-extracted
   * alert collapses with other extractions of the same real-world event
   * (race-safe via the uq_pulse_dedupe_key unique index). Deterministic callers
   * (threshold_advisory / rule_source_drift) leave this unset → NULL key.
   */
  dedupe?: boolean
  /**
   * Persisted pulse status. Defaults to 'approved'. Low-confidence AI extracts
   * pass 'quarantined' so they are retained for review but never fanned out.
   */
  status?: PulseStatus
}

export interface PulseExtractDuplicateInput extends Pick<
  PulseExtractInput,
  | 'publishedAt'
  | 'sourceUrl'
  | 'parsedJurisdiction'
  | 'parsedCounties'
  | 'parsedForms'
  | 'parsedEntityTypes'
  | 'parsedOriginalDueDate'
  | 'parsedNewDueDate'
  | 'changeKind'
  | 'actionMode'
> {
  windowDays?: number
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

export interface AlertJoinedRow {
  alertId: string
  pulseId: string
  alertStatus: PulseFirmAlertStatus
  matchedCount: number
  needsReviewCount: number
  source: string
  sourceUrl: string
  publishedAt: Date
  changeKind: PulseChangeKind
  actionMode: PulseActionMode
  aiSummary: string
  verbatimQuote: string
  parsedJurisdiction: string
  parsedCounties: string[]
  parsedForms: string[]
  parsedEntityTypes: string[]
  parsedOriginalDueDate: Date | null
  parsedNewDueDate: Date | null
  parsedEffectiveFrom: Date | null
  parsedEffectiveUntil: Date | null
  affectedRuleIds: string[]
  reverifyRuleIds: string[]
  structuredChange: unknown
  confidence: number
  pulseStatus: PulseStatus
  reviewedBy: string | null
  reviewedAt: Date | null
  isSample: boolean
  duplicateSourceSnapshotCount?: number
}

export interface PriorityReviewJoinedRow {
  id: string
  alertId: string
  pulseId: string
  status: PulsePriorityReviewStatus
  priorityScore: number
  priorityReasonsJson: unknown
  selectedObligationIdsJson: unknown
  confirmedObligationIdsJson: unknown
  excludedObligationIdsJson: unknown
  note: string | null
  requestedBy: string | null
  reviewedBy: string | null
  reviewedAt: Date | null
}

export interface CandidateRow {
  obligationId: string
  clientId: string
  clientName: string
  state: string | null
  county: string | null
  counties: string[] | null
  entityType: ClientEntityType
  taxType: string
  currentDueDate: Date
  status: ObligationStatus
}

export interface EffectiveCandidateRow extends CandidateRow {
  baseCurrentDueDate: Date
}

export interface ApplicationRow {
  id: string
  obligationId: string
  clientId: string
  clientName: string
  state: string | null
  county: string | null
  counties: string[] | null
  entityType: ClientEntityType
  taxType: string
  currentDueDate: Date
  status: ObligationStatus
  appliedAt: Date
  revertedAt: Date | null
  beforeDueDate: Date
  afterDueDate: Date
}

export interface AllFirmCandidateRow {
  firmId: string
  obligationId: string
  currentDueDate: Date
  county: string | null
  counties: string[] | null
}

export interface AlertRecipientRow {
  email: string
}

export interface PulseNotificationRecipientRow {
  userId: string
  email: string
  inAppEnabled: boolean | null
  pulseEnabled: boolean | null
}

export interface PulseDigestObligationRow {
  obligationId: string
  clientId: string
  clientName: string
  state: string | null
  county: string | null
  counties: string[] | null
  taxType: string
  currentDueDate: Date
  matchStatus: 'eligible' | 'needs_review'
  reason: string | null
}

export class PulseRepoError extends Error {
  constructor(
    readonly code:
      | 'not_found'
      | 'conflict'
      | 'revert_expired'
      | 'no_eligible'
      | 'review_only'
      | 'needs_details',
  ) {
    super(`Pulse repo error: ${code}`)
    this.name = 'PulseRepoError'
  }
}

export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function toDateOnlyOrNull(date: Date | null): string | null {
  return date ? toDateOnly(date) : null
}

export function sameTimestamp(left: Date | null, right: Date | null): boolean {
  if (!left || !right) return false
  return left.getTime() === right.getTime()
}

export function isDueDateOverlayAlert(alert: Pick<AlertJoinedRow, 'actionMode'>): boolean {
  return alert.actionMode === 'due_date_overlay'
}

export function hasCompleteStructuredDueDateScope(
  alert: Pick<
    AlertJoinedRow,
    'parsedOriginalDueDate' | 'parsedForms' | 'parsedEntityTypes' | 'parsedNewDueDate'
  >,
): boolean {
  return Boolean(
    alert.parsedOriginalDueDate &&
    alert.parsedNewDueDate &&
    alert.parsedForms.length > 0 &&
    alert.parsedEntityTypes.length > 0,
  )
}

export function applyReadinessForAlert(
  alert: Pick<AlertJoinedRow, 'actionMode' | 'parsedNewDueDate'>,
  affectedClients: readonly PulseAffectedClientRow[],
  opts: { affectedDeadlinesConfirmed: boolean },
): PulseApplyReadinessRow {
  if (!isDueDateOverlayAlert(alert)) return { status: 'not_applicable', missing: [] }

  const missing: PulseApplyReadinessMissing[] = []
  if (!alert.parsedNewDueDate) missing.push('new_due_date')

  const hasApplicableClients = affectedClients.some(
    (row) => row.matchStatus === 'eligible' || row.matchStatus === 'needs_review',
  )
  if (!opts.affectedDeadlinesConfirmed || !hasApplicableClients) {
    missing.push('affected_clients')
  }

  return { status: missing.length === 0 ? 'ready' : 'needs_details', missing }
}

export function applyReadinessForAlertSummary(
  alert: Pick<
    AlertJoinedRow,
    'actionMode' | 'matchedCount' | 'needsReviewCount' | 'parsedNewDueDate'
  >,
): PulseApplyReadinessRow {
  if (!isDueDateOverlayAlert(alert)) return { status: 'not_applicable', missing: [] }

  const missing: PulseApplyReadinessMissing[] = []
  if (!alert.parsedNewDueDate) missing.push('new_due_date')
  if (alert.matchedCount + alert.needsReviewCount === 0) missing.push('affected_clients')

  return { status: missing.length === 0 ? 'ready' : 'needs_details', missing }
}

export function pulseAlertHasFirmImpact(alert: {
  matchedCount: number
  needsReviewCount: number
}): boolean {
  return alert.matchedCount + alert.needsReviewCount > 0
}

export const DEADLINE_SELECTION_REVIEW_KEY = 'deadlineSelectionReview'

export interface DeadlineSelectionSnapshot {
  obligationId: string
  currentDueDate: string
}

export interface DeadlineSelectionReviewSnapshot {
  selectedObligationIds: string[]
  snapshots: DeadlineSelectionSnapshot[]
}

export function isDeadlineSelectionReviewSnapshot(
  value: unknown,
): value is DeadlineSelectionReviewSnapshot {
  if (!isRecord(value)) return false
  return (
    Array.isArray(value.selectedObligationIds) &&
    value.selectedObligationIds.every((item) => typeof item === 'string') &&
    Array.isArray(value.snapshots) &&
    value.snapshots.every(
      (item) =>
        isRecord(item) &&
        typeof item.obligationId === 'string' &&
        typeof item.currentDueDate === 'string',
    )
  )
}

export function deadlineSelectionReviewFromStructuredChange(
  structuredChange: unknown,
): DeadlineSelectionReviewSnapshot | null {
  if (!isRecord(structuredChange)) return null
  const value = structuredChange[DEADLINE_SELECTION_REVIEW_KEY]
  return isDeadlineSelectionReviewSnapshot(value) ? value : null
}

export function deadlineSelectionSnapshotsById(
  review: DeadlineSelectionReviewSnapshot | null,
): Map<string, DeadlineSelectionSnapshot> {
  return new Map((review?.snapshots ?? []).map((row) => [row.obligationId, row]))
}

export function withDeadlineSelectionReview(
  structuredChange: unknown,
  review: DeadlineSelectionReviewSnapshot,
): unknown {
  return {
    ...(isRecord(structuredChange) ? structuredChange : {}),
    [DEADLINE_SELECTION_REVIEW_KEY]: review,
  }
}

export function toNonEmptyBatch<T>(items: T[]): [T, ...T[]] {
  const [first, ...rest] = items
  if (first === undefined) throw new Error('Expected at least one D1 batch statement')
  return [first, ...rest]
}

export function duplicateSourceSnapshotCountForPulse() {
  return sql<number>`(
    select count(*)
    from ${pulseSourceSnapshot}
    where ${pulseSourceSnapshot.parseStatus} = 'duplicate'
      and ${pulseSourceSnapshot.pulseId} = ${pulse.id}
  )`
}

export function isHandledFirmAlertStatus(
  status: PulseFirmAlertStatus,
): status is PulseHandledFirmAlertStatus {
  return PULSE_HANDLED_ALERT_STATUSES.some((handledStatus) => handledStatus === status)
}

export function toAlert(row: AlertJoinedRow): PulseAlertRow {
  return {
    id: row.alertId,
    pulseId: row.pulseId,
    status: row.alertStatus,
    sourceStatus: row.pulseStatus,
    changeKind: row.changeKind,
    actionMode: row.actionMode,
    title: row.aiSummary,
    source: row.source,
    sourceUrl: row.sourceUrl,
    summary: row.aiSummary,
    publishedAt: row.publishedAt,
    matchedCount: row.matchedCount,
    needsReviewCount: row.needsReviewCount,
    applyReadiness: applyReadinessForAlertSummary(row),
    duplicateSourceSnapshotCount: row.duplicateSourceSnapshotCount ?? 0,
    confidence: row.confidence,
    isSample: row.isSample,
    // 2026-05-25 (Yuqi Alerts #9): pass through the joined-row's
    // `parsedJurisdiction` (already selected via the pulse join in
    // `loadAlertJoined`) so list consumers can filter by jurisdiction
    // without a per-row detail fetch.
    jurisdiction: row.parsedJurisdiction,
    // 2026-06-05 (Tax area filter): classify the alert into coarse service-line
    // buckets from its deterministic reverify-rule citations, falling back to
    // the AI-parsed forms. See @duedatehq/core/tax-area.
    taxAreas: taxAreasForAlert(row),
    // 2026-06-05 (Affecting facts cell): pass the AI-parsed forms through so the
    // alert card's "Affecting" cell renders without a per-card detail fetch.
    forms: row.parsedForms,
  }
}

export function toSnapshot(row: PulseSourceSnapshot): PulseSourceSnapshotRow {
  return {
    id: row.id,
    sourceId: row.sourceId,
    externalId: row.externalId,
    title: row.title,
    officialSourceUrl: row.officialSourceUrl,
    publishedAt: row.publishedAt,
    fetchedAt: row.fetchedAt,
    contentHash: row.contentHash,
    rawR2Key: row.rawR2Key,
    parseStatus: row.parseStatus,
    pulseId: row.pulseId,
    aiOutputId: row.aiOutputId,
    failureReason: row.failureReason,
  }
}

export function toSourceState(row: PulseSourceState): PulseSourceStateRow {
  return {
    sourceId: row.sourceId,
    tier: row.tier,
    jurisdiction: row.jurisdiction,
    enabled: row.enabled,
    cadenceMs: row.cadenceMs,
    healthStatus: row.healthStatus,
    lastCheckedAt: row.lastCheckedAt,
    lastSuccessAt: row.lastSuccessAt,
    lastChangeDetectedAt: row.lastChangeDetectedAt,
    monitoringBaselineAt: row.monitoringBaselineAt,
    baselineMode: row.baselineMode,
    nextCheckAt: row.nextCheckAt,
    consecutiveFailures: row.consecutiveFailures,
    lastError: row.lastError,
    etag: row.etag,
    lastModified: row.lastModified,
  }
}

export function priorityLevel(score: number): PulsePriorityLevel {
  if (score >= 70) return 'urgent'
  if (score >= 45) return 'high'
  return 'normal'
}

export function priorityReasonLabel(key: PulsePriorityReasonKey): string {
  switch (key) {
    case 'preparer_requested':
      return 'Preparer requested manager review.'
    case 'needs_review_matches':
      return 'Affected clients need applicability confirmation.'
    case 'low_confidence':
      return 'Pulse extraction confidence is below the safe-review threshold.'
    case 'high_impact':
      return 'This Pulse affects multiple clients.'
    case 'source_attention':
      return 'The source watcher has an internal diagnostics signal.'
    case 'protective_claim_deadline':
      return 'Protective claim action window closes within 60 days.'
    case 'rights_window_source':
      return 'Rights-window source needs CPA review.'
  }
  return key
}

const RIGHTS_WINDOW_SOURCE_IDS = new Set(
  listRuleSources()
    .filter((source) => source.alertCoverageRoles?.includes('rights_window_signal'))
    .map((source) => source.id),
)

const PROTECTIVE_CLAIM_PRIORITY_WINDOW_MS = 60 * 24 * 60 * 60 * 1000

function dateFromIsoDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  return new Date(`${value}T00:00:00.000Z`)
}

function protectiveActionDeadline(structuredChange: unknown): Date | null {
  if (!isRecord(structuredChange)) return null
  const deadline = structuredChange.actionDeadline
  return typeof deadline === 'string' ? dateFromIsoDateOnly(deadline) : null
}

function utcStartOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function scorePulsePriority(input: {
  matchedCount: number
  needsReviewCount: number
  confidence: number
  changeKind?: PulseChangeKind
  structuredChange?: unknown
  sourceId?: string
  now?: Date
  preparerRequested?: boolean
  sourceNeedsAttention?: boolean
}): { score: number; level: PulsePriorityLevel; reasons: PulsePriorityReasonRow[] } {
  const reasons: PulsePriorityReasonRow[] = []
  if (input.preparerRequested) {
    reasons.push({
      key: 'preparer_requested',
      points: 30,
      label: priorityReasonLabel('preparer_requested'),
    })
  }
  if (input.needsReviewCount > 0) {
    reasons.push({
      key: 'needs_review_matches',
      points: 50 + Math.min(input.needsReviewCount * 5, 25),
      label: priorityReasonLabel('needs_review_matches'),
    })
  }
  if (input.confidence < 0.5) {
    reasons.push({
      key: 'low_confidence',
      points: 35,
      label: priorityReasonLabel('low_confidence'),
    })
  } else if (input.confidence < 0.7) {
    reasons.push({
      key: 'low_confidence',
      points: 25,
      label: priorityReasonLabel('low_confidence'),
    })
  } else if (input.confidence < 0.9) {
    reasons.push({
      key: 'low_confidence',
      points: 10,
      label: priorityReasonLabel('low_confidence'),
    })
  }

  const impactedCount = input.matchedCount + input.needsReviewCount
  if (impactedCount > 0) {
    reasons.push({
      key: 'high_impact',
      points: Math.min(impactedCount * 3, 30),
      label: priorityReasonLabel('high_impact'),
    })
  }
  if (input.sourceNeedsAttention) {
    reasons.push({
      key: 'source_attention',
      points: 20,
      label: priorityReasonLabel('source_attention'),
    })
  }
  // Rights-window sources are flagged for CPA review on their own axis, detected
  // from sourceId and independent of the source-diagnostics `sourceNeedsAttention`
  // signal. Gate on a credible extraction so quarantined (<0.5) items do not earn
  // the bonus — those already score via `low_confidence`, and routing them through
  // `sourceNeedsAttention` previously mislabeled them as a source-diagnostics signal.
  const isRightsWindowSource =
    input.sourceId !== undefined &&
    input.confidence >= 0.5 &&
    RIGHTS_WINDOW_SOURCE_IDS.has(input.sourceId)
  if (isRightsWindowSource) {
    reasons.push({
      key: 'rights_window_source',
      points: 10,
      label: priorityReasonLabel('rights_window_source'),
    })
  }
  if (input.changeKind === 'protective_claim_window') {
    const deadline = protectiveActionDeadline(input.structuredChange)
    const now = utcStartOfDay(input.now ?? new Date())
    if (
      deadline &&
      deadline.getTime() >= now.getTime() &&
      deadline.getTime() - now.getTime() <= PROTECTIVE_CLAIM_PRIORITY_WINDOW_MS
    ) {
      reasons.push({
        key: 'protective_claim_deadline',
        points: 45,
        label: priorityReasonLabel('protective_claim_deadline'),
      })
    }
  }

  const score = reasons.reduce((sum, reason) => sum + reason.points, 0)
  return { score, level: priorityLevel(score), reasons }
}

export function isPriorityReasonKey(value: unknown): value is PulsePriorityReasonKey {
  return (
    value === 'preparer_requested' ||
    value === 'needs_review_matches' ||
    value === 'low_confidence' ||
    value === 'high_impact' ||
    value === 'source_attention' ||
    value === 'protective_claim_deadline' ||
    value === 'rights_window_source'
  )
}

export function toPriorityReasons(value: unknown): PulsePriorityReasonRow[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item): PulsePriorityReasonRow | null => {
      if (!isRecord(item)) return null
      const row = item
      if (!isPriorityReasonKey(row.key) || typeof row.points !== 'number') return null
      return {
        key: row.key,
        points: row.points,
        label: typeof row.label === 'string' ? row.label : priorityReasonLabel(row.key),
      }
    })
    .filter((item): item is PulsePriorityReasonRow => item !== null)
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

export function uniqueStrings(values: readonly string[] | undefined): string[] {
  return Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean)))
}

export function normalizePriorityNote(value: string | null | undefined): string | null {
  const note = value?.trim()
  return note ? note.slice(0, 500) : null
}

export function toPriorityReview(row: PriorityReviewJoinedRow): PulsePriorityReviewRow {
  return {
    id: row.id,
    alertId: row.alertId,
    pulseId: row.pulseId,
    status: row.status,
    priorityScore: row.priorityScore,
    priorityReasons: toPriorityReasons(row.priorityReasonsJson),
    selectedObligationIds: stringArray(row.selectedObligationIdsJson),
    confirmedObligationIds: stringArray(row.confirmedObligationIdsJson),
    excludedObligationIds: stringArray(row.excludedObligationIdsJson),
    note: row.note,
    requestedBy: row.requestedBy,
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt,
  }
}

export function applicationStatus(row: ApplicationRow): PulseAffectedClientStatus {
  return row.revertedAt ? 'reverted' : 'already_applied'
}

export function compareAffected(a: PulseAffectedClientRow, b: PulseAffectedClientRow): number {
  const statusRank: Record<PulseAffectedClientStatus, number> = {
    eligible: 0,
    needs_review: 1,
    already_applied: 2,
    reverted: 3,
  }
  const statusDelta = statusRank[a.matchStatus] - statusRank[b.matchStatus]
  if (statusDelta !== 0) return statusDelta
  const dateDelta = a.currentDueDate.getTime() - b.currentDueDate.getTime()
  if (dateDelta !== 0) return dateDelta
  return a.clientName.localeCompare(b.clientName)
}

export function chunkRows<T>(rows: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < rows.length; i += size) chunks.push(rows.slice(i, i + size))
  return chunks
}

export function isClientEntityType(value: string): value is ClientEntityType {
  return [
    'llc',
    's_corp',
    'partnership',
    'c_corp',
    'sole_prop',
    'trust',
    'individual',
    'other',
  ].includes(value)
}

export function toClientEntityTypes(values: string[]): ClientEntityType[] {
  return values.filter(isClientEntityType)
}

export function normalizeCountyName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\bcounty\b/g, '')
    .replace(/\bparish\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizePulseDuplicateUrl(value: string): string {
  try {
    const url = new URL(value)
    url.hash = ''
    for (const key of Array.from(url.searchParams.keys())) {
      if (/^utm_|^(fbclid|gclid)$/i.test(key)) url.searchParams.delete(key)
    }
    const normalized = url.toString()
    return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized
  } catch {
    return value.trim().replace(/\/+$/, '')
  }
}

export function normalizePulseDuplicateList(
  values: readonly string[],
  kind: 'county' | 'plain',
): string {
  return [
    ...new Set(
      values
        .map((value) =>
          kind === 'county' ? normalizeCountyName(value) : value.toLowerCase().trim(),
        )
        .filter(Boolean),
    ),
  ]
    .toSorted()
    .join('|')
}

/**
 * Group change kinds that the extractor frequently swaps between for the *same*
 * underlying event, so a re-classification does not defeat de-duplication.
 * Observed in production: one county sales-tax change surfaced as both
 * `applicability_scope` and `other`; an SB711 conformity item as both
 * `applicability_scope` and `filing_requirement`.
 */
export function pulseChangeKindFamily(changeKind: PulseChangeKind | undefined): string {
  switch (changeKind) {
    case 'deadline_shift':
    case 'threshold_advisory':
      return 'deadline'
    case 'applicability_scope':
    case 'filing_requirement':
    case 'form_instruction':
    case 'source_status':
    case 'other':
      return 'scope'
    case 'new_obligation':
      return 'new_obligation'
    case 'protective_claim_window':
      return 'protective_claim'
    case 'rule_source_drift':
      return 'drift'
    default:
      return 'deadline'
  }
}

function isoDateUtcDay(date: Date | null | undefined): string {
  return date ? date.toISOString().slice(0, 10) : ''
}

export interface PulseDedupeKeyInput {
  parsedJurisdiction: string
  changeKind?: PulseChangeKind
  parsedOriginalDueDate: Date | null
  parsedNewDueDate: Date | null
  parsedForms: readonly string[]
  parsedCounties: readonly string[]
  structuredChange?: unknown
  publishedAt: Date
}

/**
 * Canonical identity of a real-world regulatory event, used to de-duplicate
 * AI-extracted alerts (stored in pulse.dedupeKey, enforced by
 * uq_pulse_dedupe_key). Two shapes:
 *
 *  • Dated event (postponement / deadline): keyed on jurisdiction + change
 *    family + original/new due dates. Deliberately *excludes* forms and source
 *    URL so the same postponement arriving from multiple feeds, or with a
 *    drifting form list ([] vs ["various"]), collapses to one alert.
 *  • Undated change (rate / scope / conformity): no date axis, so keyed on
 *    jurisdiction + family + normalized forms + counties, bounded to the
 *    publication year so unrelated future changes do not collide.
 *  • Protective claim window: keyed like an undated review-only event, but adds
 *    the source-backed action deadline when present so separate rights windows
 *    in the same year do not collapse.
 *
 * The `v1` prefix lets the scheme evolve without colliding with backfilled keys.
 */
export function computePulseDedupeKey(input: PulseDedupeKeyInput): string {
  const jurisdiction = input.parsedJurisdiction.trim().toUpperCase()
  const family = pulseChangeKindFamily(input.changeKind)
  const originalDue = isoDateUtcDay(input.parsedOriginalDueDate)
  const newDue = isoDateUtcDay(input.parsedNewDueDate)
  if (originalDue || newDue) {
    return ['v1', jurisdiction, family, originalDue, newDue].join('::')
  }
  const forms = normalizePulseDuplicateList(input.parsedForms, 'plain')
  const counties = normalizePulseDuplicateList(input.parsedCounties, 'county')
  const year = String(input.publishedAt.getUTCFullYear())
  if (input.changeKind === 'protective_claim_window') {
    const actionDeadline = isoDateUtcDay(protectiveActionDeadline(input.structuredChange))
    return ['v1', jurisdiction, family, actionDeadline, year, forms, counties].join('::')
  }
  return ['v1', jurisdiction, family, year, forms, counties].join('::')
}

export function pulseDuplicateScopeHasEvidence(input: PulseExtractDuplicateInput): boolean {
  return (
    input.parsedCounties.length > 0 ||
    input.parsedForms.length > 0 ||
    input.parsedEntityTypes.length > 0 ||
    input.parsedOriginalDueDate !== null ||
    input.parsedNewDueDate !== null
  )
}

export function rowMatchesPulseDuplicateScope(
  row: Pick<Pulse, 'sourceUrl' | 'parsedCounties' | 'parsedForms' | 'parsedEntityTypes'>,
  input: PulseExtractDuplicateInput,
): boolean {
  if (normalizePulseDuplicateUrl(row.sourceUrl) === normalizePulseDuplicateUrl(input.sourceUrl)) {
    return true
  }
  if (!pulseDuplicateScopeHasEvidence(input)) return false
  return (
    normalizePulseDuplicateList(row.parsedCounties, 'county') ===
      normalizePulseDuplicateList(input.parsedCounties, 'county') &&
    normalizePulseDuplicateList(row.parsedForms, 'plain') ===
      normalizePulseDuplicateList(input.parsedForms, 'plain') &&
    normalizePulseDuplicateList(row.parsedEntityTypes, 'plain') ===
      normalizePulseDuplicateList(input.parsedEntityTypes, 'plain')
  )
}

export function countyValues(row: { county: string | null; counties: string[] | null }): string[] {
  const profileCounties = Array.isArray(row.counties) ? row.counties : []
  const values = profileCounties.length > 0 ? profileCounties : row.county ? [row.county] : []
  return values.map((value) => value.trim()).filter((value) => value.length > 0)
}

export function displayCounty(row: {
  county: string | null
  counties: string[] | null
}): string | null {
  return countyValues(row)[0] ?? null
}

export function rowMatchesCounty(
  row: { county: string | null; counties: string[] | null },
  counties: ReadonlySet<string>,
): 'match' | 'missing' | 'miss' {
  const values = countyValues(row)
  if (values.length === 0) return 'missing'
  return values.some((value) => counties.has(normalizeCountyName(value))) ? 'match' : 'miss'
}
