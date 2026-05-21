import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte, or } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import type { Db } from '../client'
import { auditEvent, evidenceLink, type NewAuditEvent, type NewEvidenceLink } from '../schema/audit'
import { member, user } from '../schema/auth'
import { client, clientFilingProfile, type ClientEntityType } from '../schema/clients'
import {
  emailOutbox,
  inAppNotification,
  notificationPreference,
  type NewEmailOutbox,
  type NewInAppNotification,
} from '../schema/notifications'
import { obligationInstance, type ObligationStatus } from '../schema/obligations'
import {
  exceptionRule,
  obligationExceptionApplication,
  type NewExceptionRule,
  type NewObligationExceptionApplication,
} from '../schema/overlay'
import {
  pulse,
  pulseApplication,
  pulseFirmAlert,
  pulsePriorityReview,
  pulseSourceSignal,
  pulseSourceState,
  pulseSourceSnapshot,
  type NewPulse,
  type NewPulseApplication,
  type NewPulseFirmAlert,
  type NewPulsePriorityReview,
  type NewPulseSourceSignal,
  type NewPulseSourceState,
  type NewPulseSourceSnapshot,
  type Pulse,
  type PulseFirmAlertStatus,
  type PulsePriorityReviewStatus,
  type PulseSourceSignal,
  type PulseSourceHealthStatus,
  type PulseSourceState,
  type PulseSourceSnapshot,
  type PulseSourceSnapshotStatus,
  type PulseStatus,
} from '../schema/pulse'
import { listActiveOverlayDueDates } from './overlay'
import {
  OPEN_OBLIGATION_STATUSES,
  isOpenObligationStatus,
} from '@duedatehq/core/obligation-workflow'

const OPEN_STATUSES = [...OPEN_OBLIGATION_STATUSES] satisfies ObligationStatus[]
const APPLICATION_BATCH_SIZE = Math.floor(100 / 9)
const EXCEPTION_RULE_BATCH_SIZE = Math.floor(100 / 18)
const EXCEPTION_APPLICATION_BATCH_SIZE = Math.floor(100 / 8)
const EVIDENCE_BATCH_SIZE = Math.floor(100 / 17)
const AUDIT_BATCH_SIZE = Math.floor(100 / 12)
const EMAIL_BATCH_SIZE = 1
const NOTIFICATION_BATCH_SIZE = Math.floor(100 / 10)
const REVERT_WINDOW_MS = 24 * 60 * 60 * 1000

export type PulseAffectedClientStatus = 'eligible' | 'needs_review' | 'already_applied' | 'reverted'

export interface PulseAlertRow {
  id: string
  pulseId: string
  status: PulseFirmAlertStatus
  sourceStatus: PulseStatus
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
  matchStatus: PulseAffectedClientStatus
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
  parsedOriginalDueDate: Date
  parsedNewDueDate: Date
  parsedEffectiveFrom?: Date | null
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
  nextCheckAt: Date | null
  consecutiveFailures: number
  lastError: string | null
  etag: string | null
  lastModified: string | null
}

export interface PulseSourceSignalInput {
  id?: string
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
  signalType?: string
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

export type PulsePriorityReasonKey =
  | 'preparer_requested'
  | 'needs_review_matches'
  | 'low_confidence'
  | 'high_impact'
  | 'source_attention'
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
  originalDueDate: Date
  newDueDate: Date
  effectiveFrom: Date | null
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
  parsedOriginalDueDate: Date
  parsedNewDueDate: Date
  parsedEffectiveFrom?: Date | null
  confidence: number
  requiresHumanReview?: boolean
  isSample?: boolean
}

interface AlertJoinedRow {
  alertId: string
  pulseId: string
  alertStatus: PulseFirmAlertStatus
  matchedCount: number
  needsReviewCount: number
  source: string
  sourceUrl: string
  publishedAt: Date
  aiSummary: string
  verbatimQuote: string
  parsedJurisdiction: string
  parsedCounties: string[]
  parsedForms: string[]
  parsedEntityTypes: string[]
  parsedOriginalDueDate: Date
  parsedNewDueDate: Date
  parsedEffectiveFrom: Date | null
  confidence: number
  pulseStatus: PulseStatus
  reviewedBy: string | null
  reviewedAt: Date | null
  isSample: boolean
}

interface PriorityReviewJoinedRow {
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

interface CandidateRow {
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

interface EffectiveCandidateRow extends CandidateRow {
  baseCurrentDueDate: Date
}

interface ApplicationRow {
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

interface AllFirmCandidateRow {
  firmId: string
  obligationId: string
  currentDueDate: Date
  county: string | null
  counties: string[] | null
}

interface AlertRecipientRow {
  email: string
}

interface PulseNotificationRecipientRow {
  userId: string
  email: string
  inAppEnabled: boolean | null
  pulseEnabled: boolean | null
}

interface PulseDigestObligationRow {
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

export interface PulseSourceSignalListInput {
  limit?: number
  status?: PulseSourceSignalRow['status']
}

export interface PulseSignalLinkResult {
  linked: number
  inspected: number
}

export class PulseRepoError extends Error {
  constructor(readonly code: 'not_found' | 'conflict' | 'revert_expired' | 'no_eligible') {
    super(`Pulse repo error: ${code}`)
    this.name = 'PulseRepoError'
  }
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function sameTimestamp(left: Date, right: Date): boolean {
  return left.getTime() === right.getTime()
}

function toNonEmptyBatch<T>(items: T[]): [T, ...T[]] {
  const [first, ...rest] = items
  if (first === undefined) throw new Error('Expected at least one D1 batch statement')
  return [first, ...rest]
}

function toAlert(row: AlertJoinedRow): PulseAlertRow {
  return {
    id: row.alertId,
    pulseId: row.pulseId,
    status: row.alertStatus,
    sourceStatus: row.pulseStatus,
    title: row.aiSummary,
    source: row.source,
    sourceUrl: row.sourceUrl,
    summary: row.aiSummary,
    publishedAt: row.publishedAt,
    matchedCount: row.matchedCount,
    needsReviewCount: row.needsReviewCount,
    confidence: row.confidence,
    isSample: row.isSample,
  }
}

function toSnapshot(row: PulseSourceSnapshot): PulseSourceSnapshotRow {
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

function toSourceState(row: PulseSourceState): PulseSourceStateRow {
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
    nextCheckAt: row.nextCheckAt,
    consecutiveFailures: row.consecutiveFailures,
    lastError: row.lastError,
    etag: row.etag,
    lastModified: row.lastModified,
  }
}

function toSourceSignal(row: PulseSourceSignal): PulseSourceSignalRow {
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
    tier: row.tier,
    jurisdiction: row.jurisdiction,
    signalType: row.signalType,
    status: row.status,
    linkedPulseId: row.linkedPulseId,
    reviewedRuleId: row.reviewedRuleId,
    reviewDecisionId: row.reviewDecisionId,
  }
}

function priorityLevel(score: number): PulsePriorityLevel {
  if (score >= 70) return 'urgent'
  if (score >= 45) return 'high'
  return 'normal'
}

function priorityReasonLabel(key: PulsePriorityReasonKey): string {
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
  }
  return key
}

function sourceWatcherPrioritySignal(_sourceId: string): boolean {
  return false
}

export function scorePulsePriority(input: {
  matchedCount: number
  needsReviewCount: number
  confidence: number
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

  const score = reasons.reduce((sum, reason) => sum + reason.points, 0)
  return { score, level: priorityLevel(score), reasons }
}

function isPriorityReasonKey(value: unknown): value is PulsePriorityReasonKey {
  return (
    value === 'preparer_requested' ||
    value === 'needs_review_matches' ||
    value === 'low_confidence' ||
    value === 'high_impact' ||
    value === 'source_attention'
  )
}

function toPriorityReasons(value: unknown): PulsePriorityReasonRow[] {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function uniqueStrings(values: readonly string[] | undefined): string[] {
  return Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean)))
}

function normalizePriorityNote(value: string | null | undefined): string | null {
  const note = value?.trim()
  return note ? note.slice(0, 500) : null
}

function toPriorityReview(row: PriorityReviewJoinedRow): PulsePriorityReviewRow {
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

function applicationStatus(row: ApplicationRow): PulseAffectedClientStatus {
  return row.revertedAt ? 'reverted' : 'already_applied'
}

function compareAffected(a: PulseAffectedClientRow, b: PulseAffectedClientRow): number {
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

function chunkRows<T>(rows: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < rows.length; i += size) chunks.push(rows.slice(i, i + size))
  return chunks
}

function isClientEntityType(value: string): value is ClientEntityType {
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

function toClientEntityTypes(values: string[]): ClientEntityType[] {
  return values.filter(isClientEntityType)
}

function normalizeCountyName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\bcounty\b/g, '')
    .replace(/\bparish\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function countyValues(row: { county: string | null; counties: string[] | null }): string[] {
  const profileCounties = Array.isArray(row.counties) ? row.counties : []
  const values = profileCounties.length > 0 ? profileCounties : row.county ? [row.county] : []
  return values.map((value) => value.trim()).filter((value) => value.length > 0)
}

function displayCounty(row: { county: string | null; counties: string[] | null }): string | null {
  return countyValues(row)[0] ?? null
}

function rowMatchesCounty(
  row: { county: string | null; counties: string[] | null },
  counties: ReadonlySet<string>,
): 'match' | 'missing' | 'miss' {
  const values = countyValues(row)
  if (values.length === 0) return 'missing'
  return values.some((value) => counties.has(normalizeCountyName(value))) ? 'match' : 'miss'
}

export function makePulseRepo(db: Db, firmId: string) {
  async function getAlert(
    alertId: string,
    opts: { includeSourceRevoked?: boolean } = {},
  ): Promise<AlertJoinedRow> {
    const rows = await db
      .select({
        alertId: pulseFirmAlert.id,
        pulseId: pulse.id,
        alertStatus: pulseFirmAlert.status,
        matchedCount: pulseFirmAlert.matchedCount,
        needsReviewCount: pulseFirmAlert.needsReviewCount,
        source: pulse.source,
        sourceUrl: pulse.sourceUrl,
        publishedAt: pulse.publishedAt,
        aiSummary: pulse.aiSummary,
        verbatimQuote: pulse.verbatimQuote,
        parsedJurisdiction: pulse.parsedJurisdiction,
        parsedCounties: pulse.parsedCounties,
        parsedForms: pulse.parsedForms,
        parsedEntityTypes: pulse.parsedEntityTypes,
        parsedOriginalDueDate: pulse.parsedOriginalDueDate,
        parsedNewDueDate: pulse.parsedNewDueDate,
        parsedEffectiveFrom: pulse.parsedEffectiveFrom,
        confidence: pulse.confidence,
        pulseStatus: pulse.status,
        reviewedBy: pulse.reviewedBy,
        reviewedAt: pulse.reviewedAt,
        isSample: pulse.isSample,
      })
      .from(pulseFirmAlert)
      .innerJoin(pulse, eq(pulseFirmAlert.pulseId, pulse.id))
      .where(and(eq(pulseFirmAlert.firmId, firmId), eq(pulseFirmAlert.id, alertId)))
      .limit(1)

    const row = rows[0]
    const allowed =
      row?.pulseStatus === 'approved' ||
      (opts.includeSourceRevoked === true && row?.pulseStatus === 'source_revoked')
    if (!row || !allowed) throw new PulseRepoError('not_found')
    return row
  }

  async function withEffectiveDueDates<T extends CandidateRow>(
    rows: readonly T[],
  ): Promise<Array<T & EffectiveCandidateRow>> {
    const overlays = await listActiveOverlayDueDates(
      db,
      firmId,
      rows.map((row) => row.obligationId),
    )
    return rows.map((row) => ({
      ...row,
      baseCurrentDueDate: row.currentDueDate,
      currentDueDate: overlays.get(row.obligationId) ?? row.currentDueDate,
    }))
  }

  function rowHasRelevantDueDate(row: EffectiveCandidateRow, alert: AlertJoinedRow): boolean {
    return (
      sameTimestamp(row.currentDueDate, alert.parsedOriginalDueDate) ||
      sameTimestamp(row.baseCurrentDueDate, alert.parsedOriginalDueDate) ||
      sameTimestamp(row.currentDueDate, alert.parsedNewDueDate)
    )
  }

  function rowAlreadyHasOverlay(row: EffectiveCandidateRow, alert: AlertJoinedRow): boolean {
    return (
      !sameTimestamp(row.currentDueDate, alert.parsedOriginalDueDate) &&
      (sameTimestamp(row.baseCurrentDueDate, alert.parsedOriginalDueDate) ||
        sameTimestamp(row.currentDueDate, alert.parsedNewDueDate))
    )
  }

  async function listCandidateRows(alert: AlertJoinedRow): Promise<PulseAffectedClientRow[]> {
    const forms = alert.parsedForms
    const entityTypes = toClientEntityTypes(alert.parsedEntityTypes)
    if (forms.length === 0 || entityTypes.length === 0) return []

    const rows = await db
      .select({
        obligationId: obligationInstance.id,
        clientId: client.id,
        clientName: client.name,
        state: obligationInstance.jurisdiction,
        county: client.county,
        counties: clientFilingProfile.countiesJson,
        entityType: client.entityType,
        taxType: obligationInstance.taxType,
        currentDueDate: obligationInstance.currentDueDate,
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
          eq(obligationInstance.jurisdiction, alert.parsedJurisdiction),
          inArray(client.entityType, entityTypes),
          inArray(obligationInstance.taxType, forms),
          inArray(obligationInstance.status, OPEN_STATUSES),
        ),
      )
      .orderBy(asc(obligationInstance.currentDueDate), asc(client.name))

    const counties = new Set(alert.parsedCounties.map(normalizeCountyName))
    const effectiveRows = await withEffectiveDueDates(rows as CandidateRow[])
    return effectiveRows
      .map((row): PulseAffectedClientRow | null => {
        if (!rowHasRelevantDueDate(row, alert)) return null
        if (rowAlreadyHasOverlay(row, alert)) {
          return {
            obligationId: row.obligationId,
            clientId: row.clientId,
            clientName: row.clientName,
            state: row.state,
            county: displayCounty(row),
            entityType: row.entityType,
            taxType: row.taxType,
            currentDueDate: row.currentDueDate,
            status: row.status,
            newDueDate: alert.parsedNewDueDate,
            matchStatus: 'already_applied',
            reason: 'This obligation already has an active due-date overlay.',
          }
        }
        if (counties.size > 0) {
          const countyMatch = rowMatchesCounty(row, counties)
          if (countyMatch === 'missing') {
            return {
              obligationId: row.obligationId,
              clientId: row.clientId,
              clientName: row.clientName,
              state: row.state,
              county: displayCounty(row),
              entityType: row.entityType,
              taxType: row.taxType,
              currentDueDate: row.currentDueDate,
              status: row.status,
              newDueDate: alert.parsedNewDueDate,
              matchStatus: 'needs_review',
              reason: 'Client county is missing; confirm county applicability before applying.',
            }
          }
          if (countyMatch === 'miss') return null
        }

        return {
          obligationId: row.obligationId,
          clientId: row.clientId,
          clientName: row.clientName,
          state: row.state,
          county: displayCounty(row),
          entityType: row.entityType,
          taxType: row.taxType,
          currentDueDate: row.currentDueDate,
          status: row.status,
          newDueDate: alert.parsedNewDueDate,
          matchStatus: 'eligible',
          reason: null,
        }
      })
      .filter((row): row is PulseAffectedClientRow => row !== null)
  }

  async function listApplicationRows(pulseId: string): Promise<PulseAffectedClientRow[]> {
    const rows = await db
      .select({
        id: pulseApplication.id,
        obligationId: pulseApplication.obligationInstanceId,
        clientId: pulseApplication.clientId,
        clientName: client.name,
        state: obligationInstance.jurisdiction,
        county: client.county,
        counties: clientFilingProfile.countiesJson,
        entityType: client.entityType,
        taxType: obligationInstance.taxType,
        currentDueDate: obligationInstance.currentDueDate,
        status: obligationInstance.status,
        appliedAt: pulseApplication.appliedAt,
        revertedAt: pulseApplication.revertedAt,
        beforeDueDate: pulseApplication.beforeDueDate,
        afterDueDate: pulseApplication.afterDueDate,
      })
      .from(pulseApplication)
      .innerJoin(
        obligationInstance,
        eq(pulseApplication.obligationInstanceId, obligationInstance.id),
      )
      .innerJoin(client, eq(pulseApplication.clientId, client.id))
      .leftJoin(
        clientFilingProfile,
        eq(obligationInstance.clientFilingProfileId, clientFilingProfile.id),
      )
      .where(and(eq(pulseApplication.firmId, firmId), eq(pulseApplication.pulseId, pulseId)))
      .orderBy(asc(client.name), asc(pulseApplication.appliedAt))

    const overlays = await listActiveOverlayDueDates(
      db,
      firmId,
      rows.map((row) => row.obligationId),
    )

    return rows.map((row: ApplicationRow) => ({
      obligationId: row.obligationId,
      clientId: row.clientId,
      clientName: row.clientName,
      state: row.state,
      county: displayCounty(row),
      entityType: row.entityType,
      taxType: row.taxType,
      currentDueDate: overlays.get(row.obligationId) ?? row.currentDueDate,
      newDueDate: row.afterDueDate,
      status: row.status,
      matchStatus: applicationStatus(row),
      reason: row.revertedAt ? 'This Pulse application has been reverted.' : 'Already applied.',
    }))
  }

  async function listSelectedRows(obligationIds: readonly string[]): Promise<CandidateRow[]> {
    if (obligationIds.length === 0) return []

    return db
      .select({
        obligationId: obligationInstance.id,
        clientId: client.id,
        clientName: client.name,
        state: obligationInstance.jurisdiction,
        county: client.county,
        counties: clientFilingProfile.countiesJson,
        entityType: client.entityType,
        taxType: obligationInstance.taxType,
        currentDueDate: obligationInstance.currentDueDate,
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
          inArray(obligationInstance.id, obligationIds),
        ),
      )
      .orderBy(asc(obligationInstance.currentDueDate), asc(client.name))
  }

  async function listActiveApplicationIds(
    pulseId: string,
    obligationIds: readonly string[],
  ): Promise<Set<string>> {
    if (obligationIds.length === 0) return new Set()

    const rows = await db
      .select({ obligationId: pulseApplication.obligationInstanceId })
      .from(pulseApplication)
      .where(
        and(
          eq(pulseApplication.firmId, firmId),
          eq(pulseApplication.pulseId, pulseId),
          inArray(pulseApplication.obligationInstanceId, obligationIds),
          isNull(pulseApplication.revertedAt),
        ),
      )
      .orderBy(asc(pulseApplication.appliedAt))

    return new Set(rows.map((row) => row.obligationId))
  }

  async function listRevertedApplicationIds(
    pulseId: string,
    obligationIds: readonly string[],
  ): Promise<Map<string, string>> {
    if (obligationIds.length === 0) return new Map()

    const rows = await db
      .select({
        id: pulseApplication.id,
        obligationId: pulseApplication.obligationInstanceId,
      })
      .from(pulseApplication)
      .where(
        and(
          eq(pulseApplication.firmId, firmId),
          eq(pulseApplication.pulseId, pulseId),
          inArray(pulseApplication.obligationInstanceId, obligationIds),
          isNotNull(pulseApplication.revertedAt),
        ),
      )
      .orderBy(asc(pulseApplication.appliedAt))

    return new Map(rows.map((row) => [row.obligationId, row.id]))
  }

  async function listFreshEligibleRows(
    alert: AlertJoinedRow,
    obligationIds: readonly string[],
    confirmedReviewIds: ReadonlySet<string> = new Set(),
  ): Promise<PulseAffectedClientRow[]> {
    if (obligationIds.length === 0) throw new PulseRepoError('no_eligible')

    const rows = await withEffectiveDueDates(await listSelectedRows(obligationIds))
    const rowsById = new Map(rows.map((row) => [row.obligationId, row]))
    if (rowsById.size !== obligationIds.length) throw new PulseRepoError('conflict')

    const activeApplicationIds = await listActiveApplicationIds(alert.pulseId, obligationIds)
    const forms = new Set(alert.parsedForms)
    const entityTypes = new Set(toClientEntityTypes(alert.parsedEntityTypes))
    const counties = new Set(alert.parsedCounties.map(normalizeCountyName))

    return obligationIds.map((obligationId) => {
      const row = rowsById.get(obligationId)
      if (!row) throw new PulseRepoError('conflict')
      if (activeApplicationIds.has(row.obligationId)) throw new PulseRepoError('conflict')
      if (row.state !== alert.parsedJurisdiction) throw new PulseRepoError('conflict')
      if (!forms.has(row.taxType)) throw new PulseRepoError('conflict')
      if (!entityTypes.has(row.entityType)) throw new PulseRepoError('conflict')
      if (!isOpenObligationStatus(row.status)) throw new PulseRepoError('conflict')
      if (!sameTimestamp(row.currentDueDate, alert.parsedOriginalDueDate)) {
        throw new PulseRepoError('conflict')
      }
      if (counties.size > 0) {
        const countyMatch = rowMatchesCounty(row, counties)
        if (countyMatch === 'missing') {
          if (!confirmedReviewIds.has(row.obligationId)) throw new PulseRepoError('conflict')
        } else if (countyMatch === 'miss') {
          throw new PulseRepoError('conflict')
        }
      }

      return {
        obligationId: row.obligationId,
        clientId: row.clientId,
        clientName: row.clientName,
        state: row.state,
        county: displayCounty(row),
        entityType: row.entityType,
        taxType: row.taxType,
        currentDueDate: row.currentDueDate,
        status: row.status,
        newDueDate: alert.parsedNewDueDate,
        matchStatus: 'eligible',
        reason: null,
      }
    })
  }

  async function buildDetail(alert: AlertJoinedRow): Promise<PulseDetailRow> {
    const affected = new Map<string, PulseAffectedClientRow>()
    for (const row of await listCandidateRows(alert)) affected.set(row.obligationId, row)
    for (const row of await listApplicationRows(alert.pulseId)) {
      if (alert.alertStatus === 'reverted' || row.matchStatus !== 'reverted') {
        affected.set(row.obligationId, row)
      }
    }

    return {
      alert: toAlert(alert),
      jurisdiction: alert.parsedJurisdiction,
      counties: alert.parsedCounties,
      forms: alert.parsedForms,
      entityTypes: toClientEntityTypes(alert.parsedEntityTypes),
      originalDueDate: alert.parsedOriginalDueDate,
      newDueDate: alert.parsedNewDueDate,
      effectiveFrom: alert.parsedEffectiveFrom,
      sourceExcerpt: alert.verbatimQuote,
      reviewedAt: alert.reviewedAt,
      affectedClients: Array.from(affected.values()).toSorted(compareAffected),
    }
  }

  async function refreshAlertCounts(
    alertId: string,
    alert: AlertJoinedRow,
  ): Promise<{
    matchedCount: number
    needsReviewCount: number
  }> {
    const detail = await buildDetail(alert)
    const matchedCount = detail.affectedClients.filter(
      (row) => row.matchStatus === 'eligible',
    ).length
    const needsReviewCount = detail.affectedClients.filter(
      (row) => row.matchStatus === 'needs_review',
    ).length

    await db
      .update(pulseFirmAlert)
      .set({ matchedCount, needsReviewCount })
      .where(and(eq(pulseFirmAlert.firmId, firmId), eq(pulseFirmAlert.id, alertId)))
    return { matchedCount, needsReviewCount }
  }

  async function listPulseDigestRecipients(): Promise<string[]> {
    const rows = await db
      .select({ email: user.email })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(
        and(
          eq(member.organizationId, firmId),
          eq(member.status, 'active'),
          inArray(member.role, ['owner', 'partner', 'manager']),
        ),
      )
      .orderBy(asc(user.email))

    return Array.from(new Set((rows as AlertRecipientRow[]).map((row) => row.email)))
  }

  async function getPriorityReview(alertId: string): Promise<PulsePriorityReviewRow | null> {
    const rows = await db
      .select({
        id: pulsePriorityReview.id,
        alertId: pulsePriorityReview.alertId,
        pulseId: pulsePriorityReview.pulseId,
        status: pulsePriorityReview.status,
        priorityScore: pulsePriorityReview.priorityScore,
        priorityReasonsJson: pulsePriorityReview.priorityReasonsJson,
        selectedObligationIdsJson: pulsePriorityReview.selectedObligationIdsJson,
        confirmedObligationIdsJson: pulsePriorityReview.confirmedObligationIdsJson,
        excludedObligationIdsJson: pulsePriorityReview.excludedObligationIdsJson,
        note: pulsePriorityReview.note,
        requestedBy: pulsePriorityReview.requestedBy,
        reviewedBy: pulsePriorityReview.reviewedBy,
        reviewedAt: pulsePriorityReview.reviewedAt,
      })
      .from(pulsePriorityReview)
      .where(and(eq(pulsePriorityReview.firmId, firmId), eq(pulsePriorityReview.alertId, alertId)))
      .limit(1)

    return rows[0] ? toPriorityReview(rows[0] as PriorityReviewJoinedRow) : null
  }

  function assertPriorityReviewableAlert(alert: AlertJoinedRow): void {
    if (
      alert.pulseStatus === 'source_revoked' ||
      alert.alertStatus === 'applied' ||
      alert.alertStatus === 'dismissed' ||
      alert.alertStatus === 'reverted'
    ) {
      throw new PulseRepoError('conflict')
    }
  }

  async function upsertPriorityReview(
    alert: AlertJoinedRow,
    input: {
      status: PulsePriorityReviewStatus
      selectedObligationIds?: string[]
      confirmedObligationIds?: string[]
      excludedObligationIds?: string[]
      note?: string | null
      requestedBy?: string | null
      reviewedBy?: string | null
      reviewedAt?: Date | null
      preparerRequested?: boolean
      sourceNeedsAttention?: boolean
      now?: Date
    },
  ): Promise<PulsePriorityReviewRow> {
    const now = input.now ?? new Date()
    const score = scorePulsePriority({
      matchedCount: alert.matchedCount,
      needsReviewCount: alert.needsReviewCount,
      confidence: alert.confidence,
      ...(input.preparerRequested !== undefined
        ? { preparerRequested: input.preparerRequested }
        : {}),
      ...(input.sourceNeedsAttention !== undefined
        ? { sourceNeedsAttention: input.sourceNeedsAttention }
        : {}),
    })
    const row: NewPulsePriorityReview = {
      id: crypto.randomUUID(),
      firmId,
      alertId: alert.alertId,
      pulseId: alert.pulseId,
      status: input.status,
      priorityScore: score.score,
      priorityReasonsJson: score.reasons,
      selectedObligationIdsJson: input.selectedObligationIds ?? [],
      confirmedObligationIdsJson: input.confirmedObligationIds ?? [],
      excludedObligationIdsJson: input.excludedObligationIds ?? [],
      note: normalizePriorityNote(input.note),
      requestedBy: input.requestedBy ?? null,
      reviewedBy: input.reviewedBy ?? null,
      reviewedAt: input.reviewedAt ?? null,
      createdAt: now,
      updatedAt: now,
    }

    await db
      .insert(pulsePriorityReview)
      .values(row)
      .onConflictDoUpdate({
        target: [pulsePriorityReview.firmId, pulsePriorityReview.alertId],
        set: {
          status: input.status,
          priorityScore: score.score,
          priorityReasonsJson: score.reasons,
          selectedObligationIdsJson: input.selectedObligationIds ?? [],
          confirmedObligationIdsJson: input.confirmedObligationIds ?? [],
          excludedObligationIdsJson: input.excludedObligationIds ?? [],
          note: normalizePriorityNote(input.note),
          ...(input.requestedBy !== undefined ? { requestedBy: input.requestedBy } : {}),
          ...(input.reviewedBy !== undefined ? { reviewedBy: input.reviewedBy } : {}),
          ...(input.reviewedAt !== undefined ? { reviewedAt: input.reviewedAt } : {}),
          updatedAt: now,
        },
      })

    const review = await getPriorityReview(alert.alertId)
    if (!review) throw new PulseRepoError('not_found')
    return review
  }

  function validatePrioritySelection(
    detail: PulseDetailRow,
    input: {
      selectedObligationIds: readonly string[]
      confirmedObligationIds?: readonly string[]
      excludedObligationIds?: readonly string[]
    },
  ): {
    selectedObligationIds: string[]
    confirmedObligationIds: string[]
    excludedObligationIds: string[]
  } {
    const selectedObligationIds = uniqueStrings(input.selectedObligationIds)
    const confirmedObligationIds = uniqueStrings(input.confirmedObligationIds)
    const excludedObligationIds = uniqueStrings(input.excludedObligationIds)
    if (selectedObligationIds.length === 0) throw new PulseRepoError('no_eligible')

    const affectedById = new Map(detail.affectedClients.map((row) => [row.obligationId, row]))
    const selectedSet = new Set(selectedObligationIds)
    for (const obligationId of excludedObligationIds) {
      if (!affectedById.has(obligationId) || selectedSet.has(obligationId)) {
        throw new PulseRepoError('conflict')
      }
    }
    for (const obligationId of confirmedObligationIds) {
      const row = affectedById.get(obligationId)
      if (!row || !selectedSet.has(obligationId) || row.matchStatus !== 'needs_review') {
        throw new PulseRepoError('conflict')
      }
    }

    const confirmedSet = new Set(confirmedObligationIds)
    for (const obligationId of selectedObligationIds) {
      const row = affectedById.get(obligationId)
      if (!row || (row.matchStatus !== 'eligible' && row.matchStatus !== 'needs_review')) {
        throw new PulseRepoError('conflict')
      }
      if (row.matchStatus === 'needs_review' && !confirmedSet.has(obligationId)) {
        throw new PulseRepoError('conflict')
      }
    }

    return { selectedObligationIds, confirmedObligationIds, excludedObligationIds }
  }

  return {
    firmId,

    async createSeedAlert(input: PulseSeedInput): Promise<{ pulseId: string; alertId: string }> {
      const pulseId = input.pulseId ?? crypto.randomUUID()
      const alertId = input.alertId ?? crypto.randomUUID()
      const reviewedAt = input.reviewedAt ?? input.publishedAt

      const pulseRow: NewPulse = {
        id: pulseId,
        source: input.source,
        sourceUrl: input.sourceUrl,
        rawR2Key: input.rawR2Key ?? null,
        publishedAt: input.publishedAt,
        aiSummary: input.aiSummary,
        verbatimQuote: input.verbatimQuote,
        parsedJurisdiction: input.parsedJurisdiction,
        parsedCounties: input.parsedCounties,
        parsedForms: input.parsedForms,
        parsedEntityTypes: input.parsedEntityTypes,
        parsedOriginalDueDate: input.parsedOriginalDueDate,
        parsedNewDueDate: input.parsedNewDueDate,
        parsedEffectiveFrom: input.parsedEffectiveFrom ?? null,
        confidence: input.confidence,
        status: 'approved',
        reviewedBy: input.reviewedBy ?? null,
        reviewedAt,
        requiresHumanReview: input.requiresHumanReview ?? true,
        isSample: input.isSample ?? true,
      }
      const alertRow: NewPulseFirmAlert = {
        id: alertId,
        pulseId,
        firmId,
        status: 'matched',
        matchedCount: input.matchedCount ?? 0,
        needsReviewCount: input.needsReviewCount ?? 0,
      }

      await db.batch([
        db.insert(pulse).values(pulseRow),
        db.insert(pulseFirmAlert).values(alertRow),
      ])
      const alert = await getAlert(alertId)
      await refreshAlertCounts(alertId, alert)
      return { pulseId, alertId }
    },

    async listAlerts(opts: { limit?: number } = {}): Promise<PulseAlertRow[]> {
      const limit = Math.min(Math.max(opts.limit ?? 5, 1), 20)
      const now = new Date()
      const rows = await db
        .select({
          alertId: pulseFirmAlert.id,
          pulseId: pulse.id,
          alertStatus: pulseFirmAlert.status,
          matchedCount: pulseFirmAlert.matchedCount,
          needsReviewCount: pulseFirmAlert.needsReviewCount,
          source: pulse.source,
          sourceUrl: pulse.sourceUrl,
          publishedAt: pulse.publishedAt,
          aiSummary: pulse.aiSummary,
          verbatimQuote: pulse.verbatimQuote,
          parsedJurisdiction: pulse.parsedJurisdiction,
          parsedCounties: pulse.parsedCounties,
          parsedForms: pulse.parsedForms,
          parsedEntityTypes: pulse.parsedEntityTypes,
          parsedOriginalDueDate: pulse.parsedOriginalDueDate,
          parsedNewDueDate: pulse.parsedNewDueDate,
          parsedEffectiveFrom: pulse.parsedEffectiveFrom,
          confidence: pulse.confidence,
          pulseStatus: pulse.status,
          reviewedBy: pulse.reviewedBy,
          reviewedAt: pulse.reviewedAt,
          isSample: pulse.isSample,
        })
        .from(pulseFirmAlert)
        .innerJoin(pulse, eq(pulseFirmAlert.pulseId, pulse.id))
        .where(
          and(
            eq(pulseFirmAlert.firmId, firmId),
            eq(pulse.status, 'approved'),
            or(
              inArray(pulseFirmAlert.status, ['matched', 'partially_applied']),
              and(eq(pulseFirmAlert.status, 'snoozed'), lte(pulseFirmAlert.snoozedUntil, now)),
            ),
          ),
        )
        .orderBy(desc(pulseFirmAlert.updatedAt), desc(pulse.publishedAt))
        .limit(limit)

      return rows.map((row) => toAlert(row))
    },

    async listHistory(
      opts: { limit?: number; status?: PulseFirmAlertStatus } = {},
    ): Promise<PulseAlertRow[]> {
      const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100)
      const statusFilter = opts.status ? eq(pulseFirmAlert.status, opts.status) : undefined
      const rows = await db
        .select({
          alertId: pulseFirmAlert.id,
          pulseId: pulse.id,
          alertStatus: pulseFirmAlert.status,
          matchedCount: pulseFirmAlert.matchedCount,
          needsReviewCount: pulseFirmAlert.needsReviewCount,
          source: pulse.source,
          sourceUrl: pulse.sourceUrl,
          publishedAt: pulse.publishedAt,
          aiSummary: pulse.aiSummary,
          verbatimQuote: pulse.verbatimQuote,
          parsedJurisdiction: pulse.parsedJurisdiction,
          parsedCounties: pulse.parsedCounties,
          parsedForms: pulse.parsedForms,
          parsedEntityTypes: pulse.parsedEntityTypes,
          parsedOriginalDueDate: pulse.parsedOriginalDueDate,
          parsedNewDueDate: pulse.parsedNewDueDate,
          parsedEffectiveFrom: pulse.parsedEffectiveFrom,
          confidence: pulse.confidence,
          pulseStatus: pulse.status,
          reviewedBy: pulse.reviewedBy,
          reviewedAt: pulse.reviewedAt,
          isSample: pulse.isSample,
        })
        .from(pulseFirmAlert)
        .innerJoin(pulse, eq(pulseFirmAlert.pulseId, pulse.id))
        .where(
          and(
            eq(pulseFirmAlert.firmId, firmId),
            inArray(pulse.status, ['approved', 'source_revoked']),
            ...(statusFilter ? [statusFilter] : []),
          ),
        )
        .orderBy(desc(pulse.publishedAt), desc(pulseFirmAlert.updatedAt))
        .limit(limit)

      return rows.map((row) => toAlert(row))
    },

    async listSourceStates(): Promise<PulseSourceStateRow[]> {
      const rows = await db.select().from(pulseSourceState).orderBy(asc(pulseSourceState.sourceId))
      return rows.map(toSourceState)
    },

    async listSourceSignals(
      opts: PulseSourceSignalListInput = {},
    ): Promise<PulseSourceSignalRow[]> {
      const ops = makePulseOpsRepo(db)
      return ops.listSourceSignals(opts)
    },

    async getSourceSignal(signalId: string): Promise<PulseSourceSignalRow | null> {
      const ops = makePulseOpsRepo(db)
      return ops.getSourceSignal(signalId)
    },

    async reviewSourceSignalForRule(input: {
      signalId: string
      ruleId: string
      reviewDecisionId: string
    }): Promise<PulseSourceSignalRow> {
      const ops = makePulseOpsRepo(db)
      return ops.reviewSourceSignalForRule(input)
    },

    async getDetail(alertId: string): Promise<PulseDetailRow> {
      const alert = await getAlert(alertId, { includeSourceRevoked: true })
      return buildDetail(alert)
    },

    async listPriorityQueue(opts: { limit?: number } = {}): Promise<PulsePriorityQueueItemRow[]> {
      const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100)
      const rows = await db
        .select({
          alertId: pulseFirmAlert.id,
          pulseId: pulse.id,
          alertStatus: pulseFirmAlert.status,
          matchedCount: pulseFirmAlert.matchedCount,
          needsReviewCount: pulseFirmAlert.needsReviewCount,
          source: pulse.source,
          sourceUrl: pulse.sourceUrl,
          publishedAt: pulse.publishedAt,
          aiSummary: pulse.aiSummary,
          verbatimQuote: pulse.verbatimQuote,
          parsedJurisdiction: pulse.parsedJurisdiction,
          parsedCounties: pulse.parsedCounties,
          parsedForms: pulse.parsedForms,
          parsedEntityTypes: pulse.parsedEntityTypes,
          parsedOriginalDueDate: pulse.parsedOriginalDueDate,
          parsedNewDueDate: pulse.parsedNewDueDate,
          parsedEffectiveFrom: pulse.parsedEffectiveFrom,
          confidence: pulse.confidence,
          pulseStatus: pulse.status,
          reviewedBy: pulse.reviewedBy,
          reviewedAt: pulse.reviewedAt,
          isSample: pulse.isSample,
          sourceHealthStatus: pulseSourceState.healthStatus,
          reviewId: pulsePriorityReview.id,
          reviewStatus: pulsePriorityReview.status,
          reviewPriorityScore: pulsePriorityReview.priorityScore,
          reviewPriorityReasonsJson: pulsePriorityReview.priorityReasonsJson,
          reviewSelectedObligationIdsJson: pulsePriorityReview.selectedObligationIdsJson,
          reviewConfirmedObligationIdsJson: pulsePriorityReview.confirmedObligationIdsJson,
          reviewExcludedObligationIdsJson: pulsePriorityReview.excludedObligationIdsJson,
          reviewNote: pulsePriorityReview.note,
          reviewRequestedBy: pulsePriorityReview.requestedBy,
          reviewReviewedBy: pulsePriorityReview.reviewedBy,
          reviewReviewedAt: pulsePriorityReview.reviewedAt,
        })
        .from(pulseFirmAlert)
        .innerJoin(pulse, eq(pulseFirmAlert.pulseId, pulse.id))
        .leftJoin(pulseSourceState, eq(pulse.source, pulseSourceState.sourceId))
        .leftJoin(
          pulsePriorityReview,
          and(
            eq(pulsePriorityReview.firmId, firmId),
            eq(pulsePriorityReview.alertId, pulseFirmAlert.id),
          ),
        )
        .where(
          and(
            eq(pulseFirmAlert.firmId, firmId),
            eq(pulse.status, 'approved'),
            inArray(pulseFirmAlert.status, ['matched', 'partially_applied']),
          ),
        )
        .orderBy(desc(pulseFirmAlert.updatedAt), desc(pulse.publishedAt))
        .limit(100)

      return rows
        .map((row): PulsePriorityQueueItemRow | null => {
          const alertRow: AlertJoinedRow = {
            alertId: row.alertId,
            pulseId: row.pulseId,
            alertStatus: row.alertStatus,
            matchedCount: row.matchedCount,
            needsReviewCount: row.needsReviewCount,
            source: row.source,
            sourceUrl: row.sourceUrl,
            publishedAt: row.publishedAt,
            aiSummary: row.aiSummary,
            verbatimQuote: row.verbatimQuote,
            parsedJurisdiction: row.parsedJurisdiction,
            parsedCounties: row.parsedCounties,
            parsedForms: row.parsedForms,
            parsedEntityTypes: row.parsedEntityTypes,
            parsedOriginalDueDate: row.parsedOriginalDueDate,
            parsedNewDueDate: row.parsedNewDueDate,
            parsedEffectiveFrom: row.parsedEffectiveFrom,
            confidence: row.confidence,
            pulseStatus: row.pulseStatus,
            reviewedBy: row.reviewedBy,
            reviewedAt: row.reviewedAt,
            isSample: row.isSample,
          }
          const review =
            row.reviewId === null
              ? null
              : toPriorityReview({
                  id: row.reviewId,
                  alertId: row.alertId,
                  pulseId: row.pulseId,
                  status: row.reviewStatus!,
                  priorityScore: row.reviewPriorityScore!,
                  priorityReasonsJson: row.reviewPriorityReasonsJson,
                  selectedObligationIdsJson: row.reviewSelectedObligationIdsJson,
                  confirmedObligationIdsJson: row.reviewConfirmedObligationIdsJson,
                  excludedObligationIdsJson: row.reviewExcludedObligationIdsJson,
                  note: row.reviewNote,
                  requestedBy: row.reviewRequestedBy,
                  reviewedBy: row.reviewReviewedBy,
                  reviewedAt: row.reviewReviewedAt,
                })
          const score = scorePulsePriority({
            matchedCount: row.matchedCount,
            needsReviewCount: row.needsReviewCount,
            confidence: row.confidence,
            preparerRequested: review?.requestedBy !== null && review?.requestedBy !== undefined,
            sourceNeedsAttention: false,
          })
          if (score.score <= 0 && !review) return null
          return {
            alert: toAlert(alertRow),
            level: score.level,
            priorityScore: score.score,
            priorityReasons: score.reasons,
            review,
          }
        })
        .filter((row): row is PulsePriorityQueueItemRow => row !== null)
        .toSorted((left, right) => {
          const scoreDelta = right.priorityScore - left.priorityScore
          if (scoreDelta !== 0) return scoreDelta
          return right.alert.publishedAt.getTime() - left.alert.publishedAt.getTime()
        })
        .slice(0, limit)
    },

    async requestPriorityReview(input: {
      alertId: string
      userId: string
      now?: Date
    }): Promise<PulsePriorityReviewRow> {
      const alert = await getAlert(input.alertId)
      assertPriorityReviewableAlert(alert)
      const sourceNeedsAttention = sourceWatcherPrioritySignal(alert.source)
      const current = await getPriorityReview(input.alertId)
      return upsertPriorityReview(alert, {
        status: 'open',
        requestedBy: input.userId,
        reviewedBy: null,
        reviewedAt: null,
        preparerRequested: true,
        sourceNeedsAttention,
        ...(current
          ? {
              selectedObligationIds: current.selectedObligationIds,
              confirmedObligationIds: current.confirmedObligationIds,
              excludedObligationIds: current.excludedObligationIds,
              note: current.note,
            }
          : {}),
        ...(input.now !== undefined ? { now: input.now } : {}),
      })
    },

    async reviewPriorityMatches(input: {
      alertId: string
      selectedObligationIds: string[]
      confirmedObligationIds?: string[]
      excludedObligationIds?: string[]
      note?: string | null
      userId: string
      now?: Date
    }): Promise<PulsePriorityReviewRow> {
      const alert = await getAlert(input.alertId)
      assertPriorityReviewableAlert(alert)
      const detail = await buildDetail(alert)
      const selection = validatePrioritySelection(detail, input)
      const sourceNeedsAttention = sourceWatcherPrioritySignal(alert.source)
      const current = await getPriorityReview(input.alertId)
      return upsertPriorityReview(alert, {
        status: 'reviewed',
        ...selection,
        reviewedBy: input.userId,
        reviewedAt: input.now ?? new Date(),
        preparerRequested: current?.requestedBy !== null && current?.requestedBy !== undefined,
        sourceNeedsAttention,
        ...(input.note !== undefined ? { note: input.note } : {}),
        ...(input.now !== undefined ? { now: input.now } : {}),
      })
    },

    async applyReviewed(input: {
      alertId: string
      userId: string
      now?: Date
    }): Promise<PulseApplyResult> {
      const review = await getPriorityReview(input.alertId)
      if (!review || review.status !== 'reviewed') throw new PulseRepoError('conflict')
      const result = await this.apply({
        alertId: input.alertId,
        obligationIds: review.selectedObligationIds,
        confirmedObligationIds: review.confirmedObligationIds,
        userId: input.userId,
        ...(input.now !== undefined ? { now: input.now } : {}),
      })
      await db
        .update(pulsePriorityReview)
        .set({ status: 'applied', updatedAt: input.now ?? new Date() })
        .where(
          and(
            eq(pulsePriorityReview.firmId, firmId),
            eq(pulsePriorityReview.alertId, input.alertId),
          ),
        )
      return result
    },

    async apply(input: {
      alertId: string
      obligationIds: string[]
      confirmedObligationIds?: string[]
      userId: string
      now?: Date
    }): Promise<PulseApplyResult> {
      const alert = await getAlert(input.alertId)
      const now = input.now ?? new Date()
      const detail = await buildDetail(alert)
      const requestedIds = Array.from(new Set(input.obligationIds))
      const confirmedReviewIds = new Set(input.confirmedObligationIds ?? [])
      const affectedById = new Map(detail.affectedClients.map((row) => [row.obligationId, row]))
      const selectedApplicableCount = requestedIds.filter((obligationId) => {
        const row = affectedById.get(obligationId)
        return (
          row?.matchStatus === 'eligible' ||
          (row?.matchStatus === 'needs_review' && confirmedReviewIds.has(obligationId))
        )
      }).length
      if (selectedApplicableCount === 0) {
        const selectedConflict = requestedIds.some((obligationId) => affectedById.has(obligationId))
        throw new PulseRepoError(selectedConflict ? 'conflict' : 'no_eligible')
      }
      for (const obligationId of requestedIds) {
        const row = affectedById.get(obligationId)
        if (!row) throw new PulseRepoError('conflict')
        if (
          row.matchStatus !== 'eligible' &&
          !(row.matchStatus === 'needs_review' && confirmedReviewIds.has(obligationId))
        ) {
          throw new PulseRepoError('conflict')
        }
      }
      const eligible = await listFreshEligibleRows(alert, requestedIds, confirmedReviewIds)
      const reactivatedApplicationIds = await listRevertedApplicationIds(
        alert.pulseId,
        eligible.map((row) => row.obligationId),
      )

      const revertExpiresAt = new Date(now.getTime() + REVERT_WINDOW_MS)
      const exceptionRuleId = crypto.randomUUID()
      const exception: NewExceptionRule = {
        id: exceptionRuleId,
        firmId,
        sourcePulseId: alert.pulseId,
        jurisdiction: alert.parsedJurisdiction,
        counties: alert.parsedCounties,
        affectedForms: alert.parsedForms,
        affectedEntityTypes: alert.parsedEntityTypes,
        overrideType: 'extend_due_date',
        overrideValueJson: {
          originalDueDate: toDateOnly(alert.parsedOriginalDueDate),
          newDueDate: toDateOnly(alert.parsedNewDueDate),
        },
        overrideDueDate: alert.parsedNewDueDate,
        effectiveFrom: alert.parsedEffectiveFrom,
        effectiveUntil: null,
        status: 'applied',
        sourceUrl: alert.sourceUrl,
        verbatimQuote: alert.verbatimQuote,
      }
      const applications: NewPulseApplication[] = eligible.map((row) => ({
        id: reactivatedApplicationIds.get(row.obligationId) ?? crypto.randomUUID(),
        pulseId: alert.pulseId,
        obligationInstanceId: row.obligationId,
        clientId: row.clientId,
        firmId,
        appliedBy: input.userId,
        appliedAt: now,
        beforeDueDate: row.currentDueDate,
        afterDueDate: alert.parsedNewDueDate,
      }))
      const newApplications = applications.filter(
        (row) => !reactivatedApplicationIds.has(row.obligationInstanceId),
      )
      const exceptionApplications: NewObligationExceptionApplication[] = eligible.map((row) => ({
        id: crypto.randomUUID(),
        firmId,
        obligationInstanceId: row.obligationId,
        exceptionRuleId,
        appliedAt: now,
        appliedByUserId: input.userId,
        revertedAt: null,
        revertedByUserId: null,
      }))
      const evidence: NewEvidenceLink[] = eligible.map((row) => ({
        id: crypto.randomUUID(),
        firmId,
        obligationInstanceId: row.obligationId,
        aiOutputId: null,
        sourceType: 'pulse_apply',
        sourceId: alert.pulseId,
        sourceUrl: alert.sourceUrl,
        verbatimQuote: alert.verbatimQuote,
        rawValue: toDateOnly(row.currentDueDate),
        normalizedValue: toDateOnly(alert.parsedNewDueDate),
        confidence: alert.confidence,
        model: null,
        matrixVersion: null,
        verifiedAt: alert.reviewedAt,
        verifiedBy: alert.reviewedBy,
        appliedAt: now,
        appliedBy: input.userId,
      }))
      const audits: NewAuditEvent[] = eligible.map((row, index) => ({
        id: crypto.randomUUID(),
        firmId,
        actorId: input.userId,
        entityType: 'pulse_application',
        entityId: applications[index]!.id,
        action: 'pulse.apply',
        beforeJson: {
          obligationId: row.obligationId,
          currentDueDate: toDateOnly(row.currentDueDate),
        },
        afterJson: {
          pulseId: alert.pulseId,
          obligationId: row.obligationId,
          currentDueDate: toDateOnly(alert.parsedNewDueDate),
        },
        reason: null,
        ipHash: null,
        userAgentHash: null,
      }))
      const recipients = await listPulseDigestRecipients()
      const emailId = crypto.randomUUID()
      const email: NewEmailOutbox = {
        id: emailId,
        firmId,
        externalId: `pulse:${firmId}:${alert.pulseId}:${now.getTime()}`,
        type: 'pulse_digest',
        status: 'pending',
        payloadJson: {
          event: 'pulse_applied',
          recipients,
          pulseId: alert.pulseId,
          alertId: alert.alertId,
          source: alert.source,
          sourceUrl: alert.sourceUrl,
          summary: alert.aiSummary,
          appliedAt: now.toISOString(),
          appliedBy: input.userId,
          revertExpiresAt: revertExpiresAt.toISOString(),
          obligations: eligible.map((row) => ({
            obligationId: row.obligationId,
            clientId: row.clientId,
            clientName: row.clientName,
            beforeDueDate: toDateOnly(row.currentDueDate),
            afterDueDate: toDateOnly(alert.parsedNewDueDate),
            taxType: row.taxType,
          })),
        },
      }

      const totalEligibleBefore = detail.affectedClients.filter(
        (row) => row.matchStatus === 'eligible',
      ).length
      const selectedEligibleCount = requestedIds.filter(
        (obligationId) => affectedById.get(obligationId)?.matchStatus === 'eligible',
      ).length
      const selectedNeedsReviewCount = requestedIds.filter(
        (obligationId) => affectedById.get(obligationId)?.matchStatus === 'needs_review',
      ).length
      const remainingMatchedCount = Math.max(totalEligibleBefore - selectedEligibleCount, 0)
      const remainingNeedsReviewCount = Math.max(
        alert.needsReviewCount - selectedNeedsReviewCount,
        0,
      )
      const nextStatus: PulseFirmAlertStatus =
        remainingMatchedCount + remainingNeedsReviewCount > 0 ? 'partially_applied' : 'applied'
      const queries: BatchItem<'sqlite'>[] = []
      for (const chunk of chunkRows([exception], EXCEPTION_RULE_BATCH_SIZE)) {
        queries.push(db.insert(exceptionRule).values(chunk))
      }
      for (const chunk of chunkRows(exceptionApplications, EXCEPTION_APPLICATION_BATCH_SIZE)) {
        queries.push(db.insert(obligationExceptionApplication).values(chunk))
      }
      for (const chunk of chunkRows(newApplications, APPLICATION_BATCH_SIZE)) {
        queries.push(db.insert(pulseApplication).values(chunk))
      }
      for (const chunk of chunkRows(
        Array.from(reactivatedApplicationIds.values()),
        APPLICATION_BATCH_SIZE,
      )) {
        queries.push(
          db
            .update(pulseApplication)
            .set({
              appliedBy: input.userId,
              appliedAt: now,
              revertedBy: null,
              revertedAt: null,
              beforeDueDate: alert.parsedOriginalDueDate,
              afterDueDate: alert.parsedNewDueDate,
            })
            .where(
              and(
                eq(pulseApplication.firmId, firmId),
                eq(pulseApplication.pulseId, alert.pulseId),
                inArray(pulseApplication.id, chunk),
                isNotNull(pulseApplication.revertedAt),
              ),
            ),
        )
      }
      for (const chunk of chunkRows(evidence, EVIDENCE_BATCH_SIZE)) {
        queries.push(db.insert(evidenceLink).values(chunk))
      }
      for (const chunk of chunkRows(audits, AUDIT_BATCH_SIZE)) {
        queries.push(db.insert(auditEvent).values(chunk))
      }
      for (const chunk of chunkRows([email], EMAIL_BATCH_SIZE)) {
        queries.push(db.insert(emailOutbox).values(chunk))
      }
      queries.push(
        db
          .update(pulseFirmAlert)
          .set({
            status: nextStatus,
            matchedCount: remainingMatchedCount,
            needsReviewCount: remainingNeedsReviewCount,
          })
          .where(and(eq(pulseFirmAlert.firmId, firmId), eq(pulseFirmAlert.id, input.alertId))),
      )

      await db.batch(toNonEmptyBatch(queries))
      const updatedAlert = await getAlert(input.alertId)
      return {
        alert: toAlert(updatedAlert),
        appliedCount: eligible.length,
        auditIds: audits.map((row) => row.id),
        evidenceIds: evidence.map((row) => row.id),
        applicationIds: applications.map((row) => row.id),
        emailOutboxId: emailId,
        revertExpiresAt,
      }
    },

    async dismiss(input: {
      alertId: string
      userId: string
      reason: string
      now?: Date
    }): Promise<PulseDismissResult> {
      const alert = await getAlert(input.alertId)
      const now = input.now ?? new Date()
      const auditId = crypto.randomUUID()
      await db.batch([
        db
          .update(pulseFirmAlert)
          .set({
            status: 'dismissed',
            dismissedBy: input.userId,
            dismissedAt: now,
          })
          .where(and(eq(pulseFirmAlert.firmId, firmId), eq(pulseFirmAlert.id, input.alertId))),
        db.insert(auditEvent).values({
          id: auditId,
          firmId,
          actorId: input.userId,
          entityType: 'pulse_firm_alert',
          entityId: input.alertId,
          action: 'pulse.dismiss',
          beforeJson: { status: alert.alertStatus },
          afterJson: { status: 'dismissed', pulseId: alert.pulseId },
          reason: input.reason,
          ipHash: null,
          userAgentHash: null,
        }),
      ])
      const updated = await getAlert(input.alertId)
      return { alert: toAlert(updated), auditId }
    },

    async snooze(input: {
      alertId: string
      userId: string
      until: Date
      reason: string
      now?: Date
    }): Promise<PulseDismissResult> {
      const alert = await getAlert(input.alertId)
      const now = input.now ?? new Date()
      if (input.until.getTime() <= now.getTime()) throw new PulseRepoError('conflict')
      const auditId = crypto.randomUUID()
      await db.batch([
        db
          .update(pulseFirmAlert)
          .set({
            status: 'snoozed',
            snoozedUntil: input.until,
          })
          .where(and(eq(pulseFirmAlert.firmId, firmId), eq(pulseFirmAlert.id, input.alertId))),
        db.insert(auditEvent).values({
          id: auditId,
          firmId,
          actorId: input.userId,
          entityType: 'pulse_firm_alert',
          entityId: input.alertId,
          action: 'pulse.snooze',
          beforeJson: { status: alert.alertStatus },
          afterJson: {
            status: 'snoozed',
            pulseId: alert.pulseId,
            snoozedUntil: input.until.toISOString(),
          },
          reason: input.reason,
          ipHash: null,
          userAgentHash: null,
        }),
      ])
      const updated = await getAlert(input.alertId)
      return { alert: toAlert(updated), auditId }
    },

    async revert(input: {
      alertId: string
      userId: string
      now?: Date
    }): Promise<PulseRevertResult> {
      const alert = await getAlert(input.alertId)
      const now = input.now ?? new Date()
      const applications = await db
        .select({
          id: pulseApplication.id,
          obligationId: pulseApplication.obligationInstanceId,
          clientId: pulseApplication.clientId,
          appliedAt: pulseApplication.appliedAt,
          beforeDueDate: pulseApplication.beforeDueDate,
          afterDueDate: pulseApplication.afterDueDate,
          currentDueDate: obligationInstance.currentDueDate,
        })
        .from(pulseApplication)
        .innerJoin(
          obligationInstance,
          eq(pulseApplication.obligationInstanceId, obligationInstance.id),
        )
        .where(
          and(
            eq(pulseApplication.firmId, firmId),
            eq(obligationInstance.firmId, firmId),
            eq(pulseApplication.pulseId, alert.pulseId),
            isNull(pulseApplication.revertedAt),
          ),
        )
        .orderBy(asc(pulseApplication.appliedAt))

      if (applications.length === 0) throw new PulseRepoError('no_eligible')
      const firstAppliedAt = applications[0]!.appliedAt
      if (now.getTime() > firstAppliedAt.getTime() + REVERT_WINDOW_MS) {
        throw new PulseRepoError('revert_expired')
      }
      const exceptionRows = await db
        .select({
          id: obligationExceptionApplication.id,
          obligationId: obligationExceptionApplication.obligationInstanceId,
          exceptionRuleId: obligationExceptionApplication.exceptionRuleId,
          overrideDueDate: exceptionRule.overrideDueDate,
        })
        .from(obligationExceptionApplication)
        .innerJoin(
          exceptionRule,
          eq(obligationExceptionApplication.exceptionRuleId, exceptionRule.id),
        )
        .where(
          and(
            eq(obligationExceptionApplication.firmId, firmId),
            inArray(
              obligationExceptionApplication.obligationInstanceId,
              applications.map((row) => row.obligationId),
            ),
            isNull(obligationExceptionApplication.revertedAt),
            eq(exceptionRule.sourcePulseId, alert.pulseId),
            inArray(exceptionRule.status, ['verified', 'applied']),
          ),
        )
        .orderBy(asc(obligationExceptionApplication.appliedAt))
      const exceptionByObligation = new Map(exceptionRows.map((row) => [row.obligationId, row]))
      if (
        applications.some((row) => {
          const activeException = exceptionByObligation.get(row.obligationId)
          return (
            !activeException?.overrideDueDate ||
            !sameTimestamp(activeException.overrideDueDate, row.afterDueDate)
          )
        })
      ) {
        throw new PulseRepoError('conflict')
      }

      const evidence: NewEvidenceLink[] = applications.map((row) => ({
        id: crypto.randomUUID(),
        firmId,
        obligationInstanceId: row.obligationId,
        aiOutputId: null,
        sourceType: 'pulse_revert',
        sourceId: alert.pulseId,
        sourceUrl: alert.sourceUrl,
        verbatimQuote: alert.verbatimQuote,
        rawValue: toDateOnly(row.afterDueDate),
        normalizedValue: toDateOnly(row.beforeDueDate),
        confidence: alert.confidence,
        model: null,
        matrixVersion: null,
        verifiedAt: alert.reviewedAt,
        verifiedBy: alert.reviewedBy,
        appliedAt: now,
        appliedBy: input.userId,
      }))
      const audits: NewAuditEvent[] = applications.map((row) => ({
        id: crypto.randomUUID(),
        firmId,
        actorId: input.userId,
        entityType: 'pulse_application',
        entityId: row.id,
        action: 'pulse.revert',
        beforeJson: {
          pulseId: alert.pulseId,
          obligationId: row.obligationId,
          currentDueDate: toDateOnly(row.afterDueDate),
        },
        afterJson: {
          pulseId: alert.pulseId,
          obligationId: row.obligationId,
          currentDueDate: toDateOnly(row.beforeDueDate),
        },
        reason: null,
        ipHash: null,
        userAgentHash: null,
      }))

      const queries: BatchItem<'sqlite'>[] = []
      queries.push(
        db
          .update(pulseApplication)
          .set({ revertedAt: now, revertedBy: input.userId })
          .where(
            and(
              eq(pulseApplication.firmId, firmId),
              eq(pulseApplication.pulseId, alert.pulseId),
              isNull(pulseApplication.revertedAt),
            ),
          ),
      )
      queries.push(
        db
          .update(obligationExceptionApplication)
          .set({ revertedAt: now, revertedByUserId: input.userId })
          .where(
            and(
              eq(obligationExceptionApplication.firmId, firmId),
              inArray(
                obligationExceptionApplication.id,
                exceptionRows.map((row) => row.id),
              ),
              isNull(obligationExceptionApplication.revertedAt),
            ),
          ),
      )
      queries.push(
        db
          .update(exceptionRule)
          .set({ status: 'retracted' })
          .where(
            and(
              eq(exceptionRule.firmId, firmId),
              inArray(
                exceptionRule.id,
                Array.from(new Set(exceptionRows.map((row) => row.exceptionRuleId))),
              ),
              eq(exceptionRule.sourcePulseId, alert.pulseId),
            ),
          ),
      )
      for (const chunk of chunkRows(evidence, EVIDENCE_BATCH_SIZE)) {
        queries.push(db.insert(evidenceLink).values(chunk))
      }
      for (const chunk of chunkRows(audits, AUDIT_BATCH_SIZE)) {
        queries.push(db.insert(auditEvent).values(chunk))
      }
      queries.push(
        db
          .update(pulseFirmAlert)
          .set({ status: 'matched' })
          .where(and(eq(pulseFirmAlert.firmId, firmId), eq(pulseFirmAlert.id, input.alertId))),
      )

      await db.batch(toNonEmptyBatch(queries))
      let updated = await getAlert(input.alertId)
      const counts = await refreshAlertCounts(input.alertId, updated)
      updated = { ...updated, ...counts }
      return {
        alert: toAlert(updated),
        revertedCount: applications.length,
        auditIds: audits.map((row) => row.id),
        evidenceIds: evidence.map((row) => row.id),
      }
    },

    async reactivate(input: {
      alertId: string
      userId: string
      now?: Date
    }): Promise<PulseDismissResult> {
      const alert = await getAlert(input.alertId)
      const now = input.now ?? new Date()
      if (alert.alertStatus !== 'reverted') throw new PulseRepoError('conflict')

      const auditId = crypto.randomUUID()
      await db.batch([
        db
          .update(pulseFirmAlert)
          .set({
            status: 'matched',
            snoozedUntil: null,
            dismissedBy: null,
            dismissedAt: null,
          })
          .where(and(eq(pulseFirmAlert.firmId, firmId), eq(pulseFirmAlert.id, input.alertId))),
        db.insert(auditEvent).values({
          id: auditId,
          firmId,
          actorId: input.userId,
          entityType: 'pulse_firm_alert',
          entityId: input.alertId,
          action: 'pulse.reactivate',
          beforeJson: { status: alert.alertStatus },
          afterJson: {
            status: 'matched',
            pulseId: alert.pulseId,
            reactivatedAt: now.toISOString(),
          },
          reason: null,
          ipHash: null,
          userAgentHash: null,
        }),
      ])

      let updated = await getAlert(input.alertId)
      const counts = await refreshAlertCounts(input.alertId, updated)
      updated = { ...updated, ...counts }
      return { alert: toAlert(updated), auditId }
    },
  }
}

export type PulseRepo = ReturnType<typeof makePulseRepo>

export function makePulseOpsRepo(db: Db) {
  async function getPulse(pulseId: string) {
    const rows = await db.select().from(pulse).where(eq(pulse.id, pulseId)).limit(1)
    return rows[0]
  }

  async function existingUserId(actorId: string | null | undefined): Promise<string | null> {
    if (!actorId) return null
    const rows = await db.select({ id: user.id }).from(user).where(eq(user.id, actorId)).limit(1)
    return rows[0]?.id ?? null
  }

  async function refreshFirmAlertsForPulse(pulseId: string): Promise<number> {
    const row = await getPulse(pulseId)
    if (!row || row.status !== 'approved') throw new PulseRepoError('not_found')

    const forms = row.parsedForms
    const entityTypes = toClientEntityTypes(row.parsedEntityTypes)
    if (forms.length === 0 || entityTypes.length === 0) return 0

    const candidates = await db
      .select({
        firmId: obligationInstance.firmId,
        obligationId: obligationInstance.id,
        currentDueDate: obligationInstance.currentDueDate,
        county: client.county,
        counties: clientFilingProfile.countiesJson,
      })
      .from(obligationInstance)
      .innerJoin(client, eq(obligationInstance.clientId, client.id))
      .leftJoin(
        clientFilingProfile,
        eq(obligationInstance.clientFilingProfileId, clientFilingProfile.id),
      )
      .where(
        and(
          eq(obligationInstance.jurisdiction, row.parsedJurisdiction),
          inArray(client.entityType, entityTypes),
          inArray(obligationInstance.taxType, forms),
          inArray(obligationInstance.status, OPEN_STATUSES),
          isNull(client.deletedAt),
        ),
      )

    const counties = new Set(row.parsedCounties.map(normalizeCountyName))
    const counts = new Map<string, { matchedCount: number; needsReviewCount: number }>()
    const candidatesByFirm = new Map<string, AllFirmCandidateRow[]>()
    for (const candidate of candidates as AllFirmCandidateRow[]) {
      const group = candidatesByFirm.get(candidate.firmId) ?? []
      group.push(candidate)
      candidatesByFirm.set(candidate.firmId, group)
    }
    const firmCountEntries = await Promise.all(
      Array.from(candidatesByFirm.entries()).map(async ([candidateFirmId, firmCandidates]) => {
        const count = { matchedCount: 0, needsReviewCount: 0 }
        const overlays = await listActiveOverlayDueDates(
          db,
          candidateFirmId,
          firmCandidates.map((candidate) => candidate.obligationId),
        )
        for (const candidate of firmCandidates) {
          const currentDueDate = overlays.get(candidate.obligationId) ?? candidate.currentDueDate
          if (!sameTimestamp(currentDueDate, row.parsedOriginalDueDate)) continue
          if (counties.size > 0) {
            const countyMatch = rowMatchesCounty(candidate, counties)
            if (countyMatch === 'missing') count.needsReviewCount += 1
            else if (countyMatch === 'match') count.matchedCount += 1
          } else {
            count.matchedCount += 1
          }
        }
        return [candidateFirmId, count] as const
      }),
    )
    for (const [candidateFirmId, count] of firmCountEntries) {
      counts.set(candidateFirmId, count)
    }

    let alertCount = 0
    const alertWrites = []
    for (const [matchedFirmId, count] of counts) {
      if (count.matchedCount + count.needsReviewCount === 0) continue
      alertCount += 1
      const alertRow: NewPulseFirmAlert = {
        id: crypto.randomUUID(),
        pulseId,
        firmId: matchedFirmId,
        status: 'matched',
        matchedCount: count.matchedCount,
        needsReviewCount: count.needsReviewCount,
      }
      alertWrites.push(
        db
          .insert(pulseFirmAlert)
          .values(alertRow)
          .onConflictDoUpdate({
            target: [pulseFirmAlert.firmId, pulseFirmAlert.pulseId],
            set: {
              status: 'matched',
              matchedCount: count.matchedCount,
              needsReviewCount: count.needsReviewCount,
            },
          }),
      )
    }
    await Promise.all(alertWrites)
    return alertCount
  }

  async function getSourceStateRow(sourceId: string): Promise<PulseSourceStateRow | undefined> {
    const rows = await db
      .select()
      .from(pulseSourceState)
      .where(eq(pulseSourceState.sourceId, sourceId))
      .limit(1)
    const row = rows[0]
    return row ? toSourceState(row) : undefined
  }

  async function listFirmPulseDigestRecipients(firmId: string): Promise<string[]> {
    const rows = await db
      .select({ email: user.email })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(
        and(
          eq(member.organizationId, firmId),
          eq(member.status, 'active'),
          inArray(member.role, ['owner', 'partner', 'manager']),
        ),
      )
      .orderBy(asc(user.email))

    return Array.from(new Set((rows as AlertRecipientRow[]).map((row) => row.email)))
  }

  async function listFirmPulseNotificationRecipients(
    firmId: string,
  ): Promise<PulseNotificationRecipientRow[]> {
    const rows = await db
      .select({
        userId: member.userId,
        email: user.email,
        inAppEnabled: notificationPreference.inAppEnabled,
        pulseEnabled: notificationPreference.pulseEnabled,
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .leftJoin(
        notificationPreference,
        and(
          eq(notificationPreference.firmId, firmId),
          eq(notificationPreference.userId, member.userId),
        ),
      )
      .where(
        and(
          eq(member.organizationId, firmId),
          eq(member.status, 'active'),
          inArray(member.role, ['owner', 'partner', 'manager']),
        ),
      )
      .orderBy(asc(user.email))

    return Array.from(
      new Map(
        (rows as PulseNotificationRecipientRow[])
          .filter((row) => (row.inAppEnabled ?? true) && (row.pulseEnabled ?? true))
          .map((row) => [row.userId, row]),
      ).values(),
    )
  }

  async function buildPulseAlertNotifications(
    approvedPulse: Pulse,
    alerts: readonly {
      id: string
      firmId: string
      matchedCount: number
      needsReviewCount: number
    }[],
    now: Date,
  ): Promise<NewInAppNotification[]> {
    const alertIds = alerts.map((alert) => alert.id)
    if (alertIds.length === 0) return []

    const existing = await db
      .select({
        userId: inAppNotification.userId,
        entityId: inAppNotification.entityId,
      })
      .from(inAppNotification)
      .where(
        and(
          eq(inAppNotification.entityType, 'pulse_firm_alert'),
          inArray(inAppNotification.entityId, alertIds),
        ),
      )
    const existingKeys = new Set(existing.map((row) => `${row.entityId}:${row.userId}`))
    const recipientEntries = await Promise.all(
      alerts.map(async (alert) => ({
        alert,
        recipients: await listFirmPulseNotificationRecipients(alert.firmId),
      })),
    )

    return recipientEntries.flatMap(({ alert, recipients }) => {
      const impactedCount = alert.matchedCount + alert.needsReviewCount
      const title = `New Pulse alert: ${approvedPulse.source}`
      const body =
        impactedCount > 0
          ? `${approvedPulse.aiSummary} ${impactedCount} client${impactedCount === 1 ? '' : 's'} may be affected.`
          : approvedPulse.aiSummary

      return recipients
        .filter((recipient) => !existingKeys.has(`${alert.id}:${recipient.userId}`))
        .map(
          (recipient): NewInAppNotification => ({
            id: crypto.randomUUID(),
            firmId: alert.firmId,
            userId: recipient.userId,
            type: 'pulse_alert',
            entityType: 'pulse_firm_alert',
            entityId: alert.id,
            title,
            body,
            href: `/rules?tab=pulse&alert=${encodeURIComponent(alert.id)}`,
            metadataJson: {
              pulseId: approvedPulse.id,
              source: approvedPulse.source,
              sourceUrl: approvedPulse.sourceUrl,
              matchedCount: alert.matchedCount,
              needsReviewCount: alert.needsReviewCount,
              approvedAt: now.toISOString(),
            },
          }),
        )
    })
  }

  async function queueFirmPulseReviewMessages(
    approvedPulse: Pulse,
    alerts: readonly {
      id: string
      firmId: string
      matchedCount: number
      needsReviewCount: number
    }[],
    now: Date,
  ): Promise<void> {
    if (alerts.length === 0) return

    const reviewEmails = await Promise.all(
      alerts.map(
        async (alert): Promise<NewEmailOutbox> => ({
          id: crypto.randomUUID(),
          firmId: alert.firmId,
          externalId: `pulse-review:${alert.firmId}:${approvedPulse.id}:${now.getTime()}`,
          type: 'pulse_digest',
          status: 'pending',
          payloadJson: {
            event: 'pulse_ready_for_firm_review',
            recipients: await listFirmPulseDigestRecipients(alert.firmId),
            alertId: alert.id,
            pulseId: approvedPulse.id,
            source: approvedPulse.source,
            sourceUrl: approvedPulse.sourceUrl,
            summary: approvedPulse.aiSummary,
            readyAt: now.toISOString(),
            matchedCount: alert.matchedCount,
            needsReviewCount: alert.needsReviewCount,
            obligations: (await listApprovedDigestObligations(approvedPulse, alert.firmId)).map(
              (obligation) => ({
                obligationId: obligation.obligationId,
                clientId: obligation.clientId,
                clientName: obligation.clientName,
                state: obligation.state,
                county: obligation.county,
                currentDueDate: toDateOnly(obligation.currentDueDate),
                newDueDate: toDateOnly(approvedPulse.parsedNewDueDate),
                taxType: obligation.taxType,
                matchStatus: obligation.matchStatus,
                reason: obligation.reason,
              }),
            ),
          },
        }),
      ),
    )
    const reviewNotifications = await buildPulseAlertNotifications(approvedPulse, alerts, now)
    const writes: BatchItem<'sqlite'>[] = []
    for (const chunk of chunkRows(reviewEmails, EMAIL_BATCH_SIZE)) {
      writes.push(db.insert(emailOutbox).values(chunk))
    }
    for (const chunk of chunkRows(reviewNotifications, NOTIFICATION_BATCH_SIZE)) {
      writes.push(db.insert(inAppNotification).values(chunk))
    }
    if (writes.length > 0) await db.batch(toNonEmptyBatch(writes))
  }

  async function listApprovedDigestObligations(
    row: Pulse,
    firmId: string,
  ): Promise<PulseDigestObligationRow[]> {
    const forms = row.parsedForms
    const entityTypes = toClientEntityTypes(row.parsedEntityTypes)
    if (forms.length === 0 || entityTypes.length === 0) return []

    const candidates = await db
      .select({
        obligationId: obligationInstance.id,
        clientId: client.id,
        clientName: client.name,
        state: obligationInstance.jurisdiction,
        county: client.county,
        counties: clientFilingProfile.countiesJson,
        taxType: obligationInstance.taxType,
        currentDueDate: obligationInstance.currentDueDate,
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
          eq(obligationInstance.jurisdiction, row.parsedJurisdiction),
          inArray(client.entityType, entityTypes),
          inArray(obligationInstance.taxType, forms),
          inArray(obligationInstance.status, OPEN_STATUSES),
          isNull(client.deletedAt),
        ),
      )
      .orderBy(asc(obligationInstance.currentDueDate), asc(client.name))

    const overlays = await listActiveOverlayDueDates(
      db,
      firmId,
      candidates.map((candidate) => candidate.obligationId),
    )
    const counties = new Set(row.parsedCounties.map(normalizeCountyName))
    return candidates
      .map((candidate): PulseDigestObligationRow | null => {
        const currentDueDate = overlays.get(candidate.obligationId) ?? candidate.currentDueDate
        if (!sameTimestamp(currentDueDate, row.parsedOriginalDueDate)) return null
        if (counties.size > 0) {
          const countyMatch = rowMatchesCounty(candidate, counties)
          if (countyMatch === 'missing') {
            return {
              obligationId: candidate.obligationId,
              clientId: candidate.clientId,
              clientName: candidate.clientName,
              state: candidate.state,
              county: displayCounty(candidate),
              counties: candidate.counties,
              taxType: candidate.taxType,
              currentDueDate,
              matchStatus: 'needs_review',
              reason: 'Client county is missing; confirm county applicability before applying.',
            }
          }
          if (countyMatch === 'miss') return null
        }

        return {
          obligationId: candidate.obligationId,
          clientId: candidate.clientId,
          clientName: candidate.clientName,
          state: candidate.state,
          county: displayCounty(candidate),
          counties: candidate.counties,
          taxType: candidate.taxType,
          currentDueDate,
          matchStatus: 'eligible',
          reason: null,
        }
      })
      .filter((candidate): candidate is PulseDigestObligationRow => candidate !== null)
  }

  async function writePulseAlertAuditForOps(input: {
    pulseId: string
    actorId: string | null
    opsActorId?: string | null
    action: 'pulse.reject' | 'pulse.quarantine' | 'pulse.source_revoked'
    beforeStatus: string
    afterStatus: string
    reason?: string | null
  }): Promise<void> {
    const alerts = await db
      .select({
        id: pulseFirmAlert.id,
        firmId: pulseFirmAlert.firmId,
        status: pulseFirmAlert.status,
        matchedCount: pulseFirmAlert.matchedCount,
        needsReviewCount: pulseFirmAlert.needsReviewCount,
      })
      .from(pulseFirmAlert)
      .where(eq(pulseFirmAlert.pulseId, input.pulseId))
    if (alerts.length === 0) return

    await db.insert(auditEvent).values(
      alerts.map((alert) => ({
        id: crypto.randomUUID(),
        firmId: alert.firmId,
        actorId: input.actorId,
        entityType: 'pulse_firm_alert',
        entityId: alert.id,
        action: input.action,
        beforeJson: {
          pulseId: input.pulseId,
          pulseStatus: input.beforeStatus,
          alertStatus: alert.status,
          matchedCount: alert.matchedCount,
          needsReviewCount: alert.needsReviewCount,
        },
        afterJson: {
          pulseId: input.pulseId,
          pulseStatus: input.afterStatus,
          alertStatus: alert.status,
          ...(input.opsActorId ? { opsActorId: input.opsActorId } : {}),
        },
        reason: input.reason ?? null,
        ipHash: null,
        userAgentHash: null,
      })),
    )
  }

  return {
    async ensureSourceState(input: PulseSourceStateInput): Promise<PulseSourceStateRow> {
      const now = input.now ?? new Date()
      const row: NewPulseSourceState = {
        sourceId: input.sourceId,
        tier: input.tier,
        jurisdiction: input.jurisdiction,
        enabled: input.enabled ?? true,
        cadenceMs: input.cadenceMs,
        healthStatus: 'healthy',
        nextCheckAt: now,
      }
      await db
        .insert(pulseSourceState)
        .values(row)
        .onConflictDoUpdate({
          target: pulseSourceState.sourceId,
          set: {
            tier: input.tier,
            jurisdiction: input.jurisdiction,
            cadenceMs: input.cadenceMs,
            ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
          },
        })
      const state = await getSourceStateRow(input.sourceId)
      if (!state) throw new PulseRepoError('not_found')
      return state
    },

    async getSourceState(sourceId: string): Promise<PulseSourceStateRow | undefined> {
      return getSourceStateRow(sourceId)
    },

    async listSourceStates(): Promise<PulseSourceStateRow[]> {
      const rows = await db.select().from(pulseSourceState).orderBy(asc(pulseSourceState.sourceId))
      return rows.map(toSourceState)
    },

    async recordSourceSuccess(input: {
      sourceId: string
      checkedAt?: Date
      nextCheckAt: Date
      changed: boolean
      etag?: string | null
      lastModified?: string | null
    }): Promise<void> {
      const checkedAt = input.checkedAt ?? new Date()
      await db
        .update(pulseSourceState)
        .set({
          healthStatus: 'healthy',
          lastCheckedAt: checkedAt,
          lastSuccessAt: checkedAt,
          ...(input.changed ? { lastChangeDetectedAt: checkedAt } : {}),
          nextCheckAt: input.nextCheckAt,
          consecutiveFailures: 0,
          lastError: null,
          ...(input.etag !== undefined ? { etag: input.etag } : {}),
          ...(input.lastModified !== undefined ? { lastModified: input.lastModified } : {}),
        })
        .where(eq(pulseSourceState.sourceId, input.sourceId))
    },

    async recordSourceFailure(input: {
      sourceId: string
      checkedAt?: Date
      nextCheckAt: Date
      error: string
    }): Promise<void> {
      const checkedAt = input.checkedAt ?? new Date()
      const current = await getSourceStateRow(input.sourceId)
      const consecutiveFailures = (current?.consecutiveFailures ?? 0) + 1
      await db
        .update(pulseSourceState)
        .set({
          lastCheckedAt: checkedAt,
          nextCheckAt: input.nextCheckAt,
          consecutiveFailures,
          lastError: input.error.slice(0, 500),
        })
        .where(eq(pulseSourceState.sourceId, input.sourceId))
    },

    async createSourceSnapshot(input: PulseSourceSnapshotInput): Promise<{
      snapshot: PulseSourceSnapshotRow
      inserted: boolean
    }> {
      const id = input.id ?? crypto.randomUUID()
      const row: NewPulseSourceSnapshot = {
        id,
        sourceId: input.sourceId,
        externalId: input.externalId,
        title: input.title,
        officialSourceUrl: input.officialSourceUrl,
        publishedAt: input.publishedAt,
        fetchedAt: input.fetchedAt,
        contentHash: input.contentHash,
        rawR2Key: input.rawR2Key,
        parseStatus: 'pending_extract',
      }

      await db
        .insert(pulseSourceSnapshot)
        .values(row)
        .onConflictDoNothing({
          target: [
            pulseSourceSnapshot.sourceId,
            pulseSourceSnapshot.externalId,
            pulseSourceSnapshot.contentHash,
          ],
        })

      const rows = await db
        .select()
        .from(pulseSourceSnapshot)
        .where(
          and(
            eq(pulseSourceSnapshot.sourceId, input.sourceId),
            eq(pulseSourceSnapshot.externalId, input.externalId),
            eq(pulseSourceSnapshot.contentHash, input.contentHash),
          ),
        )
        .limit(1)
      const snapshot = rows[0]
      if (!snapshot) throw new PulseRepoError('not_found')
      return { snapshot: toSnapshot(snapshot), inserted: snapshot.id === id }
    },

    async createSourceSignal(input: PulseSourceSignalInput): Promise<{
      signal: PulseSourceSignalRow
      inserted: boolean
    }> {
      const id = input.id ?? crypto.randomUUID()
      const row: NewPulseSourceSignal = {
        id,
        sourceId: input.sourceId,
        externalId: input.externalId,
        title: input.title,
        officialSourceUrl: input.officialSourceUrl,
        publishedAt: input.publishedAt,
        fetchedAt: input.fetchedAt,
        contentHash: input.contentHash,
        rawR2Key: input.rawR2Key,
        tier: input.tier,
        jurisdiction: input.jurisdiction,
        signalType: input.signalType ?? 'anticipated_pulse',
        status: 'open',
        linkedPulseId: null,
      }

      await db
        .insert(pulseSourceSignal)
        .values(row)
        .onConflictDoNothing({
          target: [
            pulseSourceSignal.sourceId,
            pulseSourceSignal.externalId,
            pulseSourceSignal.contentHash,
          ],
        })

      const rows = await db
        .select()
        .from(pulseSourceSignal)
        .where(
          and(
            eq(pulseSourceSignal.sourceId, input.sourceId),
            eq(pulseSourceSignal.externalId, input.externalId),
            eq(pulseSourceSignal.contentHash, input.contentHash),
          ),
        )
        .limit(1)
      const signal = rows[0]
      if (!signal) throw new PulseRepoError('not_found')
      return { signal: toSourceSignal(signal), inserted: signal.id === id }
    },

    async listSourceSignals(
      opts: PulseSourceSignalListInput = {},
    ): Promise<PulseSourceSignalRow[]> {
      const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100)
      const statusFilter = opts.status ? eq(pulseSourceSignal.status, opts.status) : undefined
      const rows = await db
        .select()
        .from(pulseSourceSignal)
        .where(statusFilter)
        .orderBy(desc(pulseSourceSignal.publishedAt), desc(pulseSourceSignal.createdAt))
        .limit(limit)
      return rows.map(toSourceSignal)
    },

    async getSourceSignal(signalId: string): Promise<PulseSourceSignalRow | null> {
      const rows = await db
        .select()
        .from(pulseSourceSignal)
        .where(eq(pulseSourceSignal.id, signalId))
        .limit(1)
      return rows[0] ? toSourceSignal(rows[0]) : null
    },

    async linkSourceSignal(input: {
      signalId: string
      pulseId: string
    }): Promise<PulseSourceSignalRow> {
      const linkedPulse = await getPulse(input.pulseId)
      if (!linkedPulse) throw new PulseRepoError('not_found')
      await db
        .update(pulseSourceSignal)
        .set({ status: 'linked', linkedPulseId: input.pulseId })
        .where(eq(pulseSourceSignal.id, input.signalId))
      const rows = await db
        .select()
        .from(pulseSourceSignal)
        .where(eq(pulseSourceSignal.id, input.signalId))
        .limit(1)
      const row = rows[0]
      if (!row) throw new PulseRepoError('not_found')
      return toSourceSignal(row)
    },

    async dismissSourceSignal(signalId: string): Promise<PulseSourceSignalRow> {
      await db
        .update(pulseSourceSignal)
        .set({ status: 'dismissed' })
        .where(eq(pulseSourceSignal.id, signalId))
      const rows = await db
        .select()
        .from(pulseSourceSignal)
        .where(eq(pulseSourceSignal.id, signalId))
        .limit(1)
      const row = rows[0]
      if (!row) throw new PulseRepoError('not_found')
      return toSourceSignal(row)
    },

    async reviewSourceSignalForRule(input: {
      signalId: string
      ruleId: string
      reviewDecisionId: string
    }): Promise<PulseSourceSignalRow> {
      await db
        .update(pulseSourceSignal)
        .set({
          status: 'reviewed',
          reviewedRuleId: input.ruleId,
          reviewDecisionId: input.reviewDecisionId,
        })
        .where(eq(pulseSourceSignal.id, input.signalId))
      const row = await this.getSourceSignal(input.signalId)
      if (!row) throw new PulseRepoError('not_found')
      return row
    },

    async linkOpenSignalsToPulses(
      opts: { windowDays?: number } = {},
    ): Promise<PulseSignalLinkResult> {
      const windowMs = (opts.windowDays ?? 30) * 24 * 60 * 60 * 1000
      const signals = await db
        .select()
        .from(pulseSourceSignal)
        .where(eq(pulseSourceSignal.status, 'open'))
        .orderBy(desc(pulseSourceSignal.publishedAt))
        .limit(100)
      const linkedResults = await Promise.all(
        signals.map(async (signal) => {
          const earliest = new Date(signal.publishedAt.getTime() - windowMs)
          const latest = new Date(signal.publishedAt.getTime() + windowMs)
          const candidates = await db
            .select({ id: pulse.id })
            .from(pulse)
            .where(
              and(
                inArray(pulse.status, ['pending_review', 'approved']),
                eq(pulse.parsedJurisdiction, signal.jurisdiction),
                gte(pulse.publishedAt, earliest),
                lte(pulse.publishedAt, latest),
              ),
            )
            .orderBy(desc(pulse.publishedAt))
            .limit(1)
          const candidate = candidates[0]
          if (!candidate) return 0
          await db
            .update(pulseSourceSignal)
            .set({ status: 'linked', linkedPulseId: candidate.id })
            .where(eq(pulseSourceSignal.id, signal.id))
          return 1
        }),
      )
      const linked = linkedResults.filter((count) => count > 0).length
      return { linked, inspected: signals.length }
    },

    async setSourceEnabled(input: {
      sourceId: string
      enabled: boolean
      now?: Date
    }): Promise<void> {
      const now = input.now ?? new Date()
      await db
        .update(pulseSourceState)
        .set({
          enabled: input.enabled,
          healthStatus: input.enabled ? 'healthy' : 'paused',
          nextCheckAt: input.enabled ? now : null,
          ...(input.enabled ? { lastError: null } : {}),
        })
        .where(eq(pulseSourceState.sourceId, input.sourceId))
    },

    async revokeSourcePulses(input: {
      sourceId: string
      actorId: string
      reason?: string | null
      now?: Date
    }): Promise<{ revokedCount: number }> {
      const actorUserId = await existingUserId(input.actorId)
      const rows = await db
        .select({ id: pulse.id, status: pulse.status })
        .from(pulse)
        .where(
          and(
            eq(pulse.source, input.sourceId),
            inArray(pulse.status, ['pending_review', 'approved', 'quarantined']),
          ),
        )
      await db
        .update(pulse)
        .set({
          status: 'source_revoked',
          reviewedBy: actorUserId,
          reviewedAt: input.now ?? new Date(),
        })
        .where(
          and(
            eq(pulse.source, input.sourceId),
            inArray(pulse.status, ['pending_review', 'approved', 'quarantined']),
          ),
        )
      await Promise.all(
        rows.map((row) =>
          writePulseAlertAuditForOps({
            pulseId: row.id,
            actorId: actorUserId,
            opsActorId: actorUserId ? null : input.actorId,
            action: 'pulse.source_revoked',
            beforeStatus: row.status,
            afterStatus: 'source_revoked',
            reason: input.reason ?? null,
          }),
        ),
      )
      return { revokedCount: rows.length }
    },

    async getSourceSnapshot(snapshotId: string): Promise<PulseSourceSnapshotRow | undefined> {
      const rows = await db
        .select()
        .from(pulseSourceSnapshot)
        .where(eq(pulseSourceSnapshot.id, snapshotId))
        .limit(1)
      const row = rows[0]
      return row ? toSnapshot(row) : undefined
    },

    async listFailedSourceSnapshots(
      opts: { limit?: number } = {},
    ): Promise<PulseSourceSnapshotRow[]> {
      const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100)
      const rows = await db
        .select()
        .from(pulseSourceSnapshot)
        .where(eq(pulseSourceSnapshot.parseStatus, 'failed'))
        .orderBy(desc(pulseSourceSnapshot.updatedAt), desc(pulseSourceSnapshot.createdAt))
        .limit(limit)
      return rows.map(toSnapshot)
    },

    async updateSourceSnapshotStatus(
      snapshotId: string,
      patch: {
        parseStatus: PulseSourceSnapshotStatus
        pulseId?: string | null
        aiOutputId?: string | null
        failureReason?: string | null
      },
    ): Promise<void> {
      await db
        .update(pulseSourceSnapshot)
        .set({
          parseStatus: patch.parseStatus,
          ...(patch.pulseId !== undefined ? { pulseId: patch.pulseId } : {}),
          ...(patch.aiOutputId !== undefined ? { aiOutputId: patch.aiOutputId } : {}),
          ...(patch.failureReason !== undefined ? { failureReason: patch.failureReason } : {}),
        })
        .where(eq(pulseSourceSnapshot.id, snapshotId))
    },

    async createPulseForFirmReviewFromExtract(
      input: PulseExtractInput,
    ): Promise<{ pulseId: string; alertCount: number }> {
      const pulseId = crypto.randomUUID()
      const pulseRow: NewPulse = {
        id: pulseId,
        source: input.source,
        sourceUrl: input.sourceUrl,
        rawR2Key: input.rawR2Key ?? null,
        publishedAt: input.publishedAt,
        aiSummary: input.aiSummary,
        verbatimQuote: input.verbatimQuote,
        parsedJurisdiction: input.parsedJurisdiction,
        parsedCounties: input.parsedCounties,
        parsedForms: input.parsedForms,
        parsedEntityTypes: input.parsedEntityTypes,
        parsedOriginalDueDate: input.parsedOriginalDueDate,
        parsedNewDueDate: input.parsedNewDueDate,
        parsedEffectiveFrom: input.parsedEffectiveFrom ?? null,
        confidence: input.confidence,
        status: 'approved',
        reviewedBy: null,
        reviewedAt: null,
        requiresHumanReview: input.requiresHumanReview ?? true,
        isSample: input.isSample ?? false,
      }
      await db.batch([
        db.insert(pulse).values(pulseRow),
        db
          .update(pulseSourceSnapshot)
          .set({
            parseStatus: 'extracted',
            pulseId,
            aiOutputId: input.aiOutputId ?? null,
            failureReason: null,
          })
          .where(eq(pulseSourceSnapshot.id, input.snapshotId)),
      ])
      const inserted = await getPulse(pulseId)
      if (!inserted) throw new PulseRepoError('not_found')
      const alertCount = await refreshFirmAlertsForPulse(pulseId)
      const alerts = await db
        .select({
          id: pulseFirmAlert.id,
          firmId: pulseFirmAlert.firmId,
          matchedCount: pulseFirmAlert.matchedCount,
          needsReviewCount: pulseFirmAlert.needsReviewCount,
        })
        .from(pulseFirmAlert)
        .where(eq(pulseFirmAlert.pulseId, pulseId))
      await queueFirmPulseReviewMessages(inserted, alerts, new Date())
      return { pulseId, alertCount }
    },

    async listPendingPulses(opts: { limit?: number } = {}): Promise<PulseReviewRow[]> {
      const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100)
      const rows = await db
        .select()
        .from(pulse)
        .where(eq(pulse.status, 'pending_review'))
        .orderBy(desc(pulse.publishedAt), desc(pulse.createdAt))
        .limit(limit)
      return rows.map((row) => ({
        pulseId: row.id,
        source: row.source,
        sourceUrl: row.sourceUrl,
        rawR2Key: row.rawR2Key,
        publishedAt: row.publishedAt,
        summary: row.aiSummary,
        sourceExcerpt: row.verbatimQuote,
        jurisdiction: row.parsedJurisdiction,
        counties: row.parsedCounties,
        forms: row.parsedForms,
        entityTypes: row.parsedEntityTypes,
        originalDueDate: row.parsedOriginalDueDate,
        newDueDate: row.parsedNewDueDate,
        effectiveFrom: row.parsedEffectiveFrom,
        confidence: row.confidence,
        status: row.status,
        requiresHumanReview: row.requiresHumanReview,
        createdAt: row.createdAt,
      }))
    },

    async getPulseReview(pulseId: string): Promise<PulseReviewRow | undefined> {
      const rows = await db.select().from(pulse).where(eq(pulse.id, pulseId)).limit(1)
      const row = rows[0]
      if (!row) return undefined
      return {
        pulseId: row.id,
        source: row.source,
        sourceUrl: row.sourceUrl,
        rawR2Key: row.rawR2Key,
        publishedAt: row.publishedAt,
        summary: row.aiSummary,
        sourceExcerpt: row.verbatimQuote,
        jurisdiction: row.parsedJurisdiction,
        counties: row.parsedCounties,
        forms: row.parsedForms,
        entityTypes: row.parsedEntityTypes,
        originalDueDate: row.parsedOriginalDueDate,
        newDueDate: row.parsedNewDueDate,
        effectiveFrom: row.parsedEffectiveFrom,
        confidence: row.confidence,
        status: row.status,
        requiresHumanReview: row.requiresHumanReview,
        createdAt: row.createdAt,
      }
    },

    async approvePulse(input: {
      pulseId: string
      reviewedBy: string
      now?: Date
    }): Promise<{ alertCount: number }> {
      const now = input.now ?? new Date()
      const reviewedByUserId = await existingUserId(input.reviewedBy)
      await db
        .update(pulse)
        .set({
          status: 'approved',
          reviewedBy: reviewedByUserId,
          reviewedAt: now,
          requiresHumanReview: false,
        })
        .where(eq(pulse.id, input.pulseId))
      const pulseRows = await db.select().from(pulse).where(eq(pulse.id, input.pulseId)).limit(1)
      const approvedPulse = pulseRows[0]
      if (!approvedPulse) throw new PulseRepoError('not_found')
      const alertCount = await refreshFirmAlertsForPulse(input.pulseId)
      const alerts = await db
        .select({
          id: pulseFirmAlert.id,
          firmId: pulseFirmAlert.firmId,
          matchedCount: pulseFirmAlert.matchedCount,
          needsReviewCount: pulseFirmAlert.needsReviewCount,
        })
        .from(pulseFirmAlert)
        .where(eq(pulseFirmAlert.pulseId, input.pulseId))
      if (alerts.length > 0) {
        const audits: NewAuditEvent[] = alerts.map((alert) => ({
          id: crypto.randomUUID(),
          firmId: alert.firmId,
          actorId: reviewedByUserId,
          entityType: 'pulse_firm_alert',
          entityId: alert.id,
          action: 'pulse.approve',
          beforeJson: { pulseId: input.pulseId, status: 'pending_review' },
          afterJson: {
            pulseId: input.pulseId,
            status: 'matched',
            matchedCount: alert.matchedCount,
            needsReviewCount: alert.needsReviewCount,
            ...(reviewedByUserId ? {} : { opsActorId: input.reviewedBy }),
          },
          reason: null,
          ipHash: null,
          userAgentHash: null,
        }))
        const approvedEmails = await Promise.all(
          alerts.map(
            async (alert): Promise<NewEmailOutbox> => ({
              id: crypto.randomUUID(),
              firmId: alert.firmId,
              externalId: `pulse-approved:${alert.firmId}:${input.pulseId}:${now.getTime()}`,
              type: 'pulse_digest',
              status: 'pending',
              payloadJson: {
                event: 'pulse_approved',
                recipients: await listFirmPulseDigestRecipients(alert.firmId),
                alertId: alert.id,
                pulseId: input.pulseId,
                source: approvedPulse.source,
                sourceUrl: approvedPulse.sourceUrl,
                summary: approvedPulse.aiSummary,
                approvedAt: now.toISOString(),
                approvedBy: input.reviewedBy,
                matchedCount: alert.matchedCount,
                needsReviewCount: alert.needsReviewCount,
                obligations: (await listApprovedDigestObligations(approvedPulse, alert.firmId)).map(
                  (obligation) => ({
                    obligationId: obligation.obligationId,
                    clientId: obligation.clientId,
                    clientName: obligation.clientName,
                    state: obligation.state,
                    county: obligation.county,
                    currentDueDate: toDateOnly(obligation.currentDueDate),
                    newDueDate: toDateOnly(approvedPulse.parsedNewDueDate),
                    taxType: obligation.taxType,
                    matchStatus: obligation.matchStatus,
                    reason: obligation.reason,
                  }),
                ),
              },
            }),
          ),
        )
        const approvedNotifications = await buildPulseAlertNotifications(approvedPulse, alerts, now)
        const writes: BatchItem<'sqlite'>[] = [db.insert(auditEvent).values(audits)]
        for (const chunk of chunkRows(approvedEmails, EMAIL_BATCH_SIZE)) {
          writes.push(db.insert(emailOutbox).values(chunk))
        }
        for (const chunk of chunkRows(approvedNotifications, NOTIFICATION_BATCH_SIZE)) {
          writes.push(db.insert(inAppNotification).values(chunk))
        }
        await db.batch(toNonEmptyBatch(writes))
      }
      return { alertCount }
    },

    async rejectPulse(input: {
      pulseId: string
      reviewedBy: string
      reason?: string | null
      now?: Date
    }): Promise<void> {
      const rows = await db.select().from(pulse).where(eq(pulse.id, input.pulseId)).limit(1)
      const current = rows[0]
      if (!current) throw new PulseRepoError('not_found')
      const reviewedByUserId = await existingUserId(input.reviewedBy)
      await db
        .update(pulse)
        .set({
          status: 'rejected',
          reviewedBy: reviewedByUserId,
          reviewedAt: input.now ?? new Date(),
        })
        .where(eq(pulse.id, input.pulseId))
      await writePulseAlertAuditForOps({
        pulseId: input.pulseId,
        actorId: reviewedByUserId,
        opsActorId: reviewedByUserId ? null : input.reviewedBy,
        action: 'pulse.reject',
        beforeStatus: current.status,
        afterStatus: 'rejected',
        reason: input.reason ?? null,
      })
    },

    async quarantinePulse(input: {
      pulseId: string
      actorId: string
      reason?: string | null
      now?: Date
    }): Promise<void> {
      const rows = await db.select().from(pulse).where(eq(pulse.id, input.pulseId)).limit(1)
      const current = rows[0]
      if (!current) throw new PulseRepoError('not_found')
      const actorUserId = await existingUserId(input.actorId)
      await db
        .update(pulse)
        .set({
          status: 'quarantined',
          reviewedBy: actorUserId,
          reviewedAt: input.now ?? new Date(),
        })
        .where(eq(pulse.id, input.pulseId))
      await writePulseAlertAuditForOps({
        pulseId: input.pulseId,
        actorId: actorUserId,
        opsActorId: actorUserId ? null : input.actorId,
        action: 'pulse.quarantine',
        beforeStatus: current.status,
        afterStatus: 'quarantined',
        reason: input.reason ?? null,
      })
    },
  }
}

export type PulseOpsRepo = ReturnType<typeof makePulseOpsRepo>
