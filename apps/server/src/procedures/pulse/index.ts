import { ORPCError } from '@orpc/server'
import {
  ErrorCodes,
  PulseAlertPublicSchema,
  PulseRuleMatchSchema,
  type PulseAffectedClient,
  type PulseAlertPublic,
  type PulseAlertSourceCoverage,
  type PulseFirmAlertStatus,
  type PulseMorningSweepBriefing,
  type PulseMorningSweepOutput,
  type PulsePriorityQueueItem,
  type PulsePriorityReason,
  type PulsePriorityReview,
  type PulseRuleMatch,
  type PulseSourceHealth,
  type PulseStatus,
} from '@duedatehq/contracts'
import { createAI, type MorningSweepInput } from '@duedatehq/ai'
import { planHasFeature } from '@duedatehq/core/plan-entitlements'
import { enqueueDashboardBriefRefresh } from '../../jobs/dashboard-brief/enqueue'
import { runPulseIngest } from '../../jobs/pulse/ingest'
import {
  alertSourceAdapterMetadataById,
  listAlertSourceCoverage,
  visibleRegulatorySourceAdapters,
} from '../../jobs/pulse/rule-source-adapters'
import { requireTenant, type RpcContext } from '../_context'
import { requireCurrentFirmRole } from '../_permissions'
import { requirePriorityPulseMatching, requireProductionPulse } from '../_plan-gates'
import { os } from '../_root'

interface PulseAlertRow {
  id: string
  pulseId: string
  status: PulseAlertPublic['status']
  sourceStatus: PulseAlertPublic['sourceStatus']
  changeKind: PulseAlertPublic['changeKind']
  actionMode: PulseAlertPublic['actionMode']
  title: string
  source: string
  sourceUrl: string
  summary: string
  publishedAt: Date
  matchedCount: number
  needsReviewCount: number
  applyReadiness: PulseAlertPublic['applyReadiness']
  duplicateSourceSnapshotCount: number
  confidence: number
  isSample: boolean
  // 2026-05-25 (Yuqi Alerts #9): mirrors the repo's PulseAlertRow
  // jurisdiction field (`FED` or state/DC). Local interface stays a
  // structural twin of the repo type (history-deep separation;
  // merging the two is a refactor task on its own).
  jurisdiction: string
  // 2026-06-05 (Tax area filter): mirrors the repo's PulseAlertRow.taxAreas —
  // server-derived service-line buckets. Same structural-twin caveat as above.
  taxAreas: PulseAlertPublic['taxAreas']
  // 2026-06-05 (Affecting facts cell): mirrors the repo PulseAlertRow.forms —
  // AI-parsed forms surfaced for the card's "Affecting" cell.
  forms: PulseAlertPublic['forms']
}

const SOURCE_LABELS: Record<string, string> = {
  'irs.disaster': 'IRS Disaster Relief',
  'irs.newsroom': 'IRS Newsroom',
  'irs.guidance': 'IRS Guidance',
  'irs.tips': 'IRS Tax Tips',
  'ca.ftb.newsroom': 'CA FTB Newsroom',
  'ca.ftb.tax_news': 'CA FTB Tax News',
  'ca.cdtfa.news': 'CA CDTFA News',
  'tx.cpa.rss': 'TX Comptroller News',
  'fl.dor.tips': 'FL DOR Tax Tips',
  'wa.dor.news': 'WA DOR News',
  'wa.dor.whats_new': 'WA DOR What’s New',
  'ma.dor.press': 'MA DOR Press',
  'fema.declarations': 'FEMA declarations',
  'fed.irs_newswire': 'IRS Newswire',
  'ny.dtf.press': 'NY DTF Press',
  'ny.email_services': 'NY Tax Department Email Services',
  'oh.temporary_announcements': 'Ohio Department of Taxation Tax Alerts',
  'fl.tips': 'Florida DOR Tax Information Publications',
  'wa.news': 'Washington DOR News Releases',
  'ma.temporary_announcements': 'Massachusetts DOR Press Releases',
  'tx.temporary_announcements': 'Texas Comptroller News',
  'govdelivery.inbound': 'GovDelivery inbound email',
  'govdelivery.inbound.unmatched': 'GovDelivery unmatched email',
}
const PULSE_REVIEW_ROLES = ['owner', 'partner', 'manager'] as const

interface PulseAffectedClientRow {
  obligationId: string
  clientId: string
  clientName: string
  state: string | null
  county: string | null
  entityType: PulseAffectedClient['entityType']
  taxType: string
  currentDueDate: Date
  newDueDate: Date | null
  status: PulseAffectedClient['status']
  matchStatus: PulseAffectedClient['matchStatus']
  reason: string | null
}

interface PulsePriorityReasonRow {
  key: PulsePriorityReason['key']
  points: number
  label: string
}

interface PulsePriorityReviewRow {
  id: string
  alertId: string
  pulseId: string
  status: PulsePriorityReview['status']
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

interface PulsePriorityQueueItemRow {
  alert: PulseAlertRow
  level: PulsePriorityQueueItem['level']
  priorityScore: number
  priorityReasons: PulsePriorityReasonRow[]
  review: PulsePriorityReviewRow | null
}

type PulseRepoErrorShape = Error & {
  code:
    | 'not_found'
    | 'conflict'
    | 'revert_expired'
    | 'no_eligible'
    | 'review_only'
    | 'needs_details'
}

const REVIEW_UNAVAILABLE_ALERT_STATUSES: ReadonlySet<PulseFirmAlertStatus> = new Set([
  'dismissed',
  'reverted',
])

function pulseRepoErrorCode(error: unknown): PulseRepoErrorShape['code'] | null {
  if (!(error instanceof Error) || !('code' in error)) return null
  const { code } = error
  if (
    code === 'not_found' ||
    code === 'conflict' ||
    code === 'revert_expired' ||
    code === 'no_eligible' ||
    code === 'review_only' ||
    code === 'needs_details'
  ) {
    return code
  }
  return null
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function dateFromDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

function firmImpactForAlert(
  row: Pick<PulseAlertRow, 'actionMode' | 'matchedCount' | 'needsReviewCount'>,
): PulseAlertPublic['firmImpact'] {
  if (row.actionMode === 'review_only') return 'review_only'
  if (row.needsReviewCount > 0) return 'needs_review'
  if (row.matchedCount > 0) return 'matched'
  return 'no_current_match'
}

function toAlertPublic(row: PulseAlertRow): PulseAlertPublic {
  return {
    id: row.id,
    pulseId: row.pulseId,
    status: row.status,
    sourceStatus: row.sourceStatus,
    changeKind: row.changeKind,
    actionMode: row.actionMode,
    firmImpact: firmImpactForAlert(row),
    title: row.title,
    source: SOURCE_LABELS[row.source] ?? row.source,
    sourceUrl: row.sourceUrl,
    summary: row.summary,
    publishedAt: row.publishedAt.toISOString(),
    matchedCount: row.matchedCount,
    needsReviewCount: row.needsReviewCount,
    applyReadiness: row.applyReadiness,
    duplicateSourceSnapshotCount: row.duplicateSourceSnapshotCount,
    confidence: row.confidence,
    isSample: row.isSample,
    // 2026-05-25 (Yuqi Alerts #9): plumb jurisdiction through to the
    // public row so the alerts list page can group/filter without
    // losing federal Pulse rows.
    jurisdiction: row.jurisdiction,
    // 2026-06-05 (Tax area filter): derived service-line buckets (computed in
    // the repo's toAlert from reverify-rule citations). Surfaced so the alerts
    // list can filter by practice area; raw rule ids stay server-side.
    taxAreas: row.taxAreas,
    // 2026-06-05 (Affecting facts cell): surface AI-parsed forms so the card's
    // "Affecting" cell renders from the list payload (no per-card detail fetch).
    forms: row.forms,
  }
}

/**
 * Map repo alert rows to the public output shape, dropping (and loudly logging)
 * any row that fails the output contract rather than letting a single malformed
 * row fail the whole `z.array(...)` and 500 the entire endpoint for every firm.
 * Pulse fields are AI-extracted, so one bad value (the production incident was a
 * garbage `parsedJurisdiction` like `f!` on a federal IRS pulse) must degrade to
 * "one missing alert", never "every alert down". The dropped row is logged for
 * repair; the write-path normalization + a data backfill remove it at the source.
 */
function toPublicAlertsSafely(rows: PulseAlertRow[], endpoint: string): PulseAlertPublic[] {
  const alerts: PulseAlertPublic[] = []
  for (const row of rows) {
    const parsed = PulseAlertPublicSchema.safeParse(toAlertPublic(row))
    if (parsed.success) {
      alerts.push(parsed.data)
      continue
    }
    console.error('pulse.alert.dropped_invalid_output', {
      endpoint,
      pulseId: row.pulseId,
      alertId: row.id,
      source: row.source,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        code: issue.code,
      })),
    })
  }
  return alerts
}

function toAffectedClientPublic(row: PulseAffectedClientRow): PulseAffectedClient {
  return {
    obligationId: row.obligationId,
    clientId: row.clientId,
    clientName: row.clientName,
    state: row.state,
    county: row.county,
    entityType: row.entityType,
    taxType: row.taxType,
    currentDueDate: toDateOnly(row.currentDueDate),
    newDueDate: row.newDueDate ? toDateOnly(row.newDueDate) : null,
    status: row.status,
    matchStatus: row.matchStatus,
    reason: row.reason,
  }
}

function toPriorityReasonPublic(row: PulsePriorityReasonRow): PulsePriorityReason {
  return {
    key: row.key,
    points: row.points,
    label: row.label,
  }
}

function toPriorityReviewPublic(row: PulsePriorityReviewRow): PulsePriorityReview {
  return {
    id: row.id,
    alertId: row.alertId,
    pulseId: row.pulseId,
    status: row.status,
    priorityScore: row.priorityScore,
    priorityReasons: row.priorityReasons.map(toPriorityReasonPublic),
    selectedObligationIds: row.selectedObligationIds,
    confirmedObligationIds: row.confirmedObligationIds,
    excludedObligationIds: row.excludedObligationIds,
    note: row.note,
    requestedBy: row.requestedBy,
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
  }
}

function toPriorityQueueItemPublic(row: PulsePriorityQueueItemRow): PulsePriorityQueueItem {
  return {
    alert: toAlertPublic(row.alert),
    level: row.level,
    priorityScore: row.priorityScore,
    priorityReasons: row.priorityReasons.map(toPriorityReasonPublic),
    review: row.review ? toPriorityReviewPublic(row.review) : null,
  }
}

function toIsoOrNull(date: Date | null): string | null {
  return date ? date.toISOString() : null
}

const PULSE_MUTATION_LOCK_TTL_MS = 60_000

// Serializes mutating Pulse operations on a single alert. The lock key is
// per-(firm, alert) and deliberately omits the action: apply and revert on the
// same alert must block each other (the cross race that no DB unique constraint
// guards), not only apply-vs-apply. Backed by a D1 conditional upsert
// (scoped.mutationLock) so acquisition is atomic — the prior KV get-then-put
// had a TOCTOU window where two callers could both pass the read. The TTL
// self-heals the lock if a holder dies mid-mutation. When the lock repo is not
// wired (test scoped doubles), fall back to running directly under the DB
// constraints, matching the other optional scoped repos.
async function withPulseMutationLock<T>(
  scoped: ReturnType<typeof requireTenant>['scoped'],
  input: { firmId: string; alertId: string },
  run: () => Promise<T>,
): Promise<T> {
  const locks = scoped.mutationLock
  if (!locks) return run()
  const key = `pulse:lock:${input.firmId}:${input.alertId}`
  if (!(await locks.tryAcquire(key, PULSE_MUTATION_LOCK_TTL_MS))) {
    throw new ORPCError('CONFLICT', { message: ErrorCodes.PULSE_APPLY_CONFLICT })
  }
  try {
    return await run()
  } finally {
    await locks.release(key).catch(() => undefined)
  }
}

function mapPulseError(error: unknown): never {
  const code = pulseRepoErrorCode(error)
  if (code) {
    if (code === 'not_found') {
      throw new ORPCError('NOT_FOUND', { message: ErrorCodes.PULSE_NOT_FOUND })
    }
    if (code === 'conflict') {
      throw new ORPCError('CONFLICT', { message: ErrorCodes.PULSE_APPLY_CONFLICT })
    }
    if (code === 'revert_expired') {
      throw new ORPCError('CONFLICT', { message: ErrorCodes.PULSE_REVERT_EXPIRED })
    }
    if (code === 'no_eligible') {
      throw new ORPCError('BAD_REQUEST', { message: ErrorCodes.PULSE_NO_ELIGIBLE_OBLIGATIONS })
    }
    if (code === 'review_only') {
      throw new ORPCError('BAD_REQUEST', { message: ErrorCodes.PULSE_REVIEW_ONLY })
    }
    if (code === 'needs_details') {
      throw new ORPCError('BAD_REQUEST', { message: ErrorCodes.PULSE_NEEDS_DETAILS })
    }
  }
  throw error
}

export function isPulseReviewRequestAvailable(input: {
  alertStatus: PulseFirmAlertStatus
  sourceStatus: PulseStatus
}): boolean {
  return (
    input.sourceStatus !== 'source_revoked' &&
    !REVIEW_UNAVAILABLE_ALERT_STATUSES.has(input.alertStatus)
  )
}

function normalizeReviewNote(value: string | undefined): string | null {
  const note = value?.trim()
  return note ? note : null
}

function pulseReviewNotificationBody(input: {
  requesterName: string
  note: string | null
}): string {
  const base = `${input.requesterName} requested Partner/Manager review for this Pulse.`
  return input.note ? `${base} Note: ${input.note}` : base
}

function uniqueEmails(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function newestDate(dates: readonly (Date | null | undefined)[]): Date | null {
  return dates.reduce<Date | null>((latest, date) => {
    if (!date) return latest
    if (!latest || date.getTime() > latest.getTime()) return date
    return latest
  }, null)
}

function toCoveragePublic(
  row: ReturnType<typeof listAlertSourceCoverage>[number],
  states: Map<
    string,
    {
      lastCheckedAt?: Date | null
      lastSuccessAt?: Date | null
      lastError?: string | null
    }
  >,
): PulseAlertSourceCoverage {
  const publicSourceIds = row.sourceIds.filter(
    (sourceId) => !row.hiddenPolicyWatchSourceIds.includes(sourceId),
  )
  const sourceStates = publicSourceIds.map((sourceId) => states.get(sourceId)).filter(Boolean)
  const lastCheckedAt = newestDate(sourceStates.map((state) => state?.lastCheckedAt))
  const lastSuccessAt = newestDate(sourceStates.map((state) => state?.lastSuccessAt))
  const failureRows = sourceStates.filter((state) => state?.lastError)
  const lastFailureAt = newestDate(failureRows.map((state) => state?.lastCheckedAt))
  const lastError = failureRows.find((state) => state?.lastError)?.lastError ?? null
  return {
    jurisdiction: row.jurisdiction,
    status: row.status,
    coverageLevel: row.coverageLevel,
    parserStatus: row.parserStatus,
    requiredRoles: [...row.requiredRoles],
    coveredRoles: [...row.coveredRoles],
    missingRoles: [...row.missingRoles],
    roleDetails: row.roleDetails.map((detail) => ({
      role: detail.role,
      status: detail.status,
      sourceIds: [...detail.sourceIds],
      reason: detail.reason,
    })),
    explicitLiveSourceIds: [...row.explicitLiveSourceIds],
    primaryWebSourceIds: [...row.primaryWebSourceIds],
    emailSignalSourceIds: [...row.emailSignalSourceIds],
    ruleSourceWatchIds: [...row.ruleSourceWatchIds],
    guidanceNoticeSourceIds: [...row.guidanceNoticeSourceIds],
    taxTypeSourceIds: [...row.taxTypeSourceIds],
    reliefOrDisasterSourceIds: [...row.reliefOrDisasterSourceIds],
    rightsWindowSourceIds: [...row.rightsWindowSourceIds],
    multiAgencySourceIds: [...row.multiAgencySourceIds],
    sourceIds: publicSourceIds,
    lastCheckedAt: toIsoOrNull(lastCheckedAt),
    lastSuccessAt: toIsoOrNull(lastSuccessAt),
    lastFailureAt: toIsoOrNull(lastFailureAt),
    lastError,
    missingReason: row.missingReason,
  }
}

function pulseReviewEmailText(input: {
  alertTitle: string
  requesterName: string
  note: string | null
  alertUrl: string
}): string {
  const lines = [
    `${input.requesterName} requested Partner/Manager review for this Pulse: ${input.alertTitle}.`,
  ]
  if (input.note) lines.push('', `Note: ${input.note}`)
  lines.push('', `Open Pulse review: ${input.alertUrl}`)
  return lines.join('\n')
}

const listAlerts = os.pulse.listAlerts.handler(async ({ input, context }) => {
  const { scoped } = requireTenant(context)
  const { alerts, nextCursor } = await scoped.pulse.listAlerts({
    ...(input?.limit === undefined ? {} : { limit: input.limit }),
    ...(input?.cursor == null ? {} : { cursor: input.cursor }),
  })
  return { alerts: toPublicAlertsSafely(alerts, 'listAlerts'), nextCursor }
})

const activeCount = os.pulse.activeCount.handler(async ({ context }) => {
  const { scoped } = requireTenant(context)
  const count = await scoped.pulse.countActiveAlerts()
  return { count }
})

const listHistory = os.pulse.listHistory.handler(async ({ input, context }) => {
  const { scoped } = requireTenant(context)
  const { alerts, nextCursor } = await scoped.pulse.listHistory({
    ...(input?.limit === undefined ? {} : { limit: input.limit }),
    ...(input?.status === undefined ? {} : { status: input.status }),
    ...(input?.cursor == null ? {} : { cursor: input.cursor }),
  })
  return { alerts: toPublicAlertsSafely(alerts, 'listHistory'), nextCursor }
})

async function listSourceHealthForScopedRepo(
  scoped: ReturnType<typeof requireTenant>['scoped'],
): Promise<{ sources: PulseSourceHealth[] }> {
  const persisted = new Map(
    (await scoped.pulse.listSourceStates()).map((row) => [row.sourceId, row]),
  )
  const sources: PulseSourceHealth[] = visibleRegulatorySourceAdapters.map((adapter) => {
    const state = persisted.get(adapter.id)
    const metadata = alertSourceAdapterMetadataById.get(adapter.id)
    const healthStatus =
      state?.enabled === false || state?.healthStatus === 'paused'
        ? 'paused'
        : (state?.healthStatus ?? 'healthy')
    return {
      sourceId: adapter.id,
      label: metadata?.label ?? SOURCE_LABELS[adapter.id] ?? adapter.id,
      tier: adapter.tier,
      jurisdiction: adapter.jurisdiction,
      purpose: metadata?.purpose ?? 'rule_source_watch',
      primaryWeb: metadata?.primaryWeb ?? adapter.fetcher !== 'govdelivery',
      relatedSourceIds: [...(metadata?.relatedSourceIds ?? [])],
      enabled: state?.enabled ?? true,
      healthStatus,
      lastCheckedAt: toIsoOrNull(state?.lastCheckedAt ?? null),
      lastSuccessAt: toIsoOrNull(state?.lastSuccessAt ?? null),
      nextCheckAt: toIsoOrNull(state?.nextCheckAt ?? null),
      consecutiveFailures: state?.consecutiveFailures ?? 0,
      lastError: state?.lastError ?? null,
    }
  })
  return { sources }
}

const listSourceHealth = os.pulse.listSourceHealth.handler(async ({ context }) => {
  const { scoped } = requireTenant(context)
  return listSourceHealthForScopedRepo(scoped)
})

const listAlertSourceCoverageHandler = os.pulse.listAlertSourceCoverage.handler(
  async ({ context }) => {
    const { scoped } = requireTenant(context)
    const persisted = new Map(
      (await scoped.pulse.listSourceStates()).map((row) => [row.sourceId, row]),
    )
    return {
      coverage: listAlertSourceCoverage().map((row) => toCoveragePublic(row, persisted)),
    }
  },
)

const retrySourceHealth = os.pulse.retrySourceHealth.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, PULSE_REVIEW_ROLES)
  const { scoped } = requireTenant(context)
  const adapter = visibleRegulatorySourceAdapters.find(
    (candidate) => candidate.id === input.sourceId,
  )
  if (!adapter) {
    throw new ORPCError('NOT_FOUND', { message: ErrorCodes.PULSE_NOT_FOUND })
  }

  await runPulseIngest(context.env, [adapter], { force: true })
  return listSourceHealthForScopedRepo(scoped)
})

// Opt-in catch-up: re-materialize the still-open, high-value regulatory windows
// the firm missed by joining / importing clients after approval. Reuses the live
// fan-out (real counts, dismiss-safe). Empty input — pinned to the caller's firm.
const catchUpStillOpenWindows = os.pulse.catchUpStillOpenWindows.handler(async ({ context }) => {
  await requireCurrentFirmRole(context, PULSE_REVIEW_ROLES)
  const { scoped } = requireTenant(context)
  const materializedCount = await scoped.pulse.catchUpStillOpenWindows()
  return { materializedCount }
})

const getDetail = os.pulse.getDetail.handler(async ({ input, context }) => {
  const { scoped } = requireTenant(context)
  try {
    const detail = await scoped.pulse.getDetail(input.alertId)
    return {
      alert: toAlertPublic(detail.alert),
      jurisdiction: detail.jurisdiction,
      counties: detail.counties,
      forms: detail.forms,
      entityTypes: detail.entityTypes,
      originalDueDate: detail.originalDueDate ? toDateOnly(detail.originalDueDate) : null,
      newDueDate: detail.newDueDate ? toDateOnly(detail.newDueDate) : null,
      effectiveFrom: detail.effectiveFrom ? toDateOnly(detail.effectiveFrom) : null,
      effectiveUntil: detail.effectiveUntil ? toDateOnly(detail.effectiveUntil) : null,
      affectedRuleIds: detail.affectedRuleIds,
      reverifyRuleIds: detail.reverifyRuleIds,
      structuredChange: detail.structuredChange ?? null,
      sourceExcerpt: detail.sourceExcerpt,
      reviewedAt: detail.reviewedAt ? detail.reviewedAt.toISOString() : null,
      applyReadiness: detail.applyReadiness,
      affectedClients: detail.affectedClients.map(toAffectedClientPublic),
    }
  } catch (error) {
    return mapPulseError(error)
  }
})

// Approved, still-active pulses affecting one rule — backs the rule-review
// dialog's "proposed change" block. Lazy per-rule (the dialog opens one rule
// at a time). Dates serialize date-only, same as getDetail.
const listAlertsForRule = os.pulse.listAlertsForRule.handler(async ({ input, context }) => {
  const { scoped } = requireTenant(context)
  const matches = await scoped.pulse.listAlertsForRule({
    ruleId: input.ruleId,
    jurisdiction: input.jurisdiction,
    taxType: input.taxType,
    ...(input.formName === undefined ? {} : { formName: input.formName }),
  })
  // Safe-parse + drop, same resilience contract as `toPublicAlertsSafely`:
  // pulse fields are AI-extracted, so one garbage value (e.g. a non-UUID id or a
  // bad jurisdiction) must degrade to "one missing match", never 500 the whole
  // block for the firm. Dropped matches are logged for repair.
  const safe: PulseRuleMatch[] = []
  for (const match of matches) {
    const parsed = PulseRuleMatchSchema.safeParse({
      alert: toAlertPublic(match.alert),
      originalDueDate: match.originalDueDate ? toDateOnly(match.originalDueDate) : null,
      newDueDate: match.newDueDate ? toDateOnly(match.newDueDate) : null,
      effectiveFrom: match.effectiveFrom ? toDateOnly(match.effectiveFrom) : null,
      effectiveUntil: match.effectiveUntil ? toDateOnly(match.effectiveUntil) : null,
      sourceExcerpt: match.sourceExcerpt,
      matchReason: match.matchReason,
    })
    if (parsed.success) {
      safe.push(parsed.data)
    } else {
      console.error('[pulse.listAlertsForRule] dropped malformed match', {
        pulseId: match.alert.pulseId,
        issues: parsed.error.issues,
      })
    }
  }
  return { matches: safe }
})

// Batch counterpart — fans out N `scoped.pulse.getDetail(id)` calls
// in parallel inside the same worker invocation. Missing alerts are
// silently dropped from the result (the repo throws for not-found;
// `Promise.allSettled` lets the surviving alerts come back). The
// callsites on /clients (50 alerts → 50 useQueries) and
// /clients/[id] (30 alerts) collapse to a single round-trip
// (audit P1-4). Shape duplicated from `getDetail` above — extracting
// to a shared helper fights the inferred handler-output type so
// inline-twice is cheaper than the type plumbing.
const getDetailsBatch = os.pulse.getDetailsBatch.handler(async ({ input, context }) => {
  const { scoped } = requireTenant(context)
  if (input.alertIds.length === 0) return { details: [] }
  const settled = await Promise.allSettled(input.alertIds.map((id) => scoped.pulse.getDetail(id)))
  const details = settled.flatMap((result) => {
    if (result.status !== 'fulfilled') return []
    const detail = result.value
    return [
      {
        alert: toAlertPublic(detail.alert),
        jurisdiction: detail.jurisdiction,
        counties: detail.counties,
        forms: detail.forms,
        entityTypes: detail.entityTypes,
        originalDueDate: detail.originalDueDate ? toDateOnly(detail.originalDueDate) : null,
        newDueDate: detail.newDueDate ? toDateOnly(detail.newDueDate) : null,
        effectiveFrom: detail.effectiveFrom ? toDateOnly(detail.effectiveFrom) : null,
        effectiveUntil: detail.effectiveUntil ? toDateOnly(detail.effectiveUntil) : null,
        affectedRuleIds: detail.affectedRuleIds,
        reverifyRuleIds: detail.reverifyRuleIds,
        structuredChange: detail.structuredChange ?? null,
        sourceExcerpt: detail.sourceExcerpt,
        reviewedAt: detail.reviewedAt ? detail.reviewedAt.toISOString() : null,
        applyReadiness: detail.applyReadiness,
        affectedClients: detail.affectedClients.map(toAffectedClientPublic),
      },
    ]
  })
  return { details }
})

const listPriorityQueue = os.pulse.listPriorityQueue.handler(async ({ input, context }) => {
  const { scoped, tenant } = requireTenant(context)
  requirePriorityPulseMatching(tenant.plan)
  const opts = input?.limit === undefined ? {} : { limit: input.limit }
  return { items: (await scoped.pulse.listPriorityQueue(opts)).map(toPriorityQueueItemPublic) }
})

const reviewPriorityMatches = os.pulse.reviewPriorityMatches.handler(async ({ input, context }) => {
  const { userId } = await requireCurrentFirmRole(context, PULSE_REVIEW_ROLES)
  const { scoped, tenant } = requireTenant(context)
  requirePriorityPulseMatching(tenant.plan)
  try {
    const review = await scoped.pulse.reviewPriorityMatches({
      alertId: input.alertId,
      selectedObligationIds: input.selectedObligationIds,
      confirmedObligationIds: input.confirmedObligationIds ?? [],
      excludedObligationIds: input.excludedObligationIds ?? [],
      note: input.note ?? null,
      userId,
    })
    return toPriorityReviewPublic(review)
  } catch (error) {
    return mapPulseError(error)
  }
})

const reviewDueDateOverlayDetails = os.pulse.reviewDueDateOverlayDetails.handler(
  async ({ input, context }) => {
    const { userId } = await requireCurrentFirmRole(context, PULSE_REVIEW_ROLES)
    const { scoped } = requireTenant(context)
    try {
      const detail = await scoped.pulse.reviewDueDateOverlayDetails({
        alertId: input.alertId,
        newDueDate: dateFromDateOnly(input.newDueDate),
        selectedObligationIds: input.selectedObligationIds,
        confirmedObligationIds: input.confirmedObligationIds ?? [],
        excludedObligationIds: input.excludedObligationIds ?? [],
        note: input.note ?? null,
        userId,
      })
      return {
        alert: toAlertPublic(detail.alert),
        jurisdiction: detail.jurisdiction,
        counties: detail.counties,
        forms: detail.forms,
        entityTypes: detail.entityTypes,
        originalDueDate: detail.originalDueDate ? toDateOnly(detail.originalDueDate) : null,
        newDueDate: detail.newDueDate ? toDateOnly(detail.newDueDate) : null,
        effectiveFrom: detail.effectiveFrom ? toDateOnly(detail.effectiveFrom) : null,
        effectiveUntil: detail.effectiveUntil ? toDateOnly(detail.effectiveUntil) : null,
        affectedRuleIds: detail.affectedRuleIds,
        reverifyRuleIds: detail.reverifyRuleIds,
        structuredChange: detail.structuredChange ?? null,
        sourceExcerpt: detail.sourceExcerpt,
        reviewedAt: detail.reviewedAt ? detail.reviewedAt.toISOString() : null,
        applyReadiness: detail.applyReadiness,
        affectedClients: detail.affectedClients.map(toAffectedClientPublic),
      }
    } catch (error) {
      return mapPulseError(error)
    }
  },
)

const applyReviewed = os.pulse.applyReviewed.handler(async ({ input, context }) => {
  const { userId } = await requireCurrentFirmRole(context, PULSE_REVIEW_ROLES)
  const { scoped, tenant } = requireTenant(context)
  requirePriorityPulseMatching(tenant.plan)
  try {
    const result = await withPulseMutationLock(
      scoped,
      { firmId: tenant.firmId, alertId: input.alertId },
      () => scoped.pulse.applyReviewed({ alertId: input.alertId, userId }),
    )
    const output = {
      alert: toAlertPublic(result.alert),
      appliedCount: result.appliedCount,
      auditIds: result.auditIds,
      evidenceIds: result.evidenceIds,
      applicationIds: result.applicationIds,
      emailOutboxId: result.emailOutboxId,
      revertExpiresAt: result.revertExpiresAt.toISOString(),
    }
    await enqueueDashboardBriefRefresh(context.env, {
      firmId: tenant.firmId,
      reason: 'pulse_apply',
    }).catch(() => false)
    return output
  } catch (error) {
    return mapPulseError(error)
  }
})

const apply = os.pulse.apply.handler(async ({ input, context }) => {
  const { userId } = await requireCurrentFirmRole(context, PULSE_REVIEW_ROLES)
  const { scoped, tenant } = requireTenant(context)
  requireProductionPulse(tenant.plan)
  try {
    const result = await withPulseMutationLock(
      scoped,
      { firmId: tenant.firmId, alertId: input.alertId },
      () =>
        scoped.pulse.apply({
          alertId: input.alertId,
          obligationIds: input.obligationIds,
          confirmedObligationIds: input.confirmedObligationIds ?? [],
          userId,
        }),
    )
    const output = {
      alert: toAlertPublic(result.alert),
      appliedCount: result.appliedCount,
      auditIds: result.auditIds,
      evidenceIds: result.evidenceIds,
      applicationIds: result.applicationIds,
      emailOutboxId: result.emailOutboxId,
      revertExpiresAt: result.revertExpiresAt.toISOString(),
    }
    await enqueueDashboardBriefRefresh(context.env, {
      firmId: tenant.firmId,
      reason: 'pulse_apply',
    }).catch(() => false)
    return output
  } catch (error) {
    return mapPulseError(error)
  }
})

const dismiss = os.pulse.dismiss.handler(async ({ input, context }) => {
  const { userId } = await requireCurrentFirmRole(context, PULSE_REVIEW_ROLES)
  const { scoped, tenant } = requireTenant(context)
  requireProductionPulse(tenant.plan)
  try {
    const result = await scoped.pulse.dismiss({
      alertId: input.alertId,
      userId,
      ...(input.reason ? { reason: input.reason } : {}),
    })
    await enqueueDashboardBriefRefresh(context.env, {
      firmId: tenant.firmId,
      reason: 'pulse_dismiss',
    }).catch(() => false)
    return { alert: toAlertPublic(result.alert), auditId: result.auditId }
  } catch (error) {
    return mapPulseError(error)
  }
})

const snooze = os.pulse.snooze.handler(async ({ input, context }) => {
  const { userId } = await requireCurrentFirmRole(context, PULSE_REVIEW_ROLES)
  const { scoped, tenant } = requireTenant(context)
  requireProductionPulse(tenant.plan)
  try {
    const result = await scoped.pulse.snooze({
      alertId: input.alertId,
      userId,
      until: new Date(input.until),
      ...(input.reason ? { reason: input.reason } : {}),
    })
    await enqueueDashboardBriefRefresh(context.env, {
      firmId: tenant.firmId,
      reason: 'pulse_dismiss',
    }).catch(() => false)
    return { alert: toAlertPublic(result.alert), auditId: result.auditId }
  } catch (error) {
    return mapPulseError(error)
  }
})

// 2026-06-07 (Pencil g5kKJQ): bulk dismiss/snooze for the alerts list
// bulk-action bar. Loops the existing per-alert repo methods so every
// alert keeps its own audit event, collects successes + failedIds, and
// fires a single dashboard-brief refresh at the end. A failure on one
// alert never aborts the batch.
const bulkDismiss = os.pulse.bulkDismiss.handler(async ({ input, context }) => {
  const { userId } = await requireCurrentFirmRole(context, PULSE_REVIEW_ROLES)
  const { scoped, tenant } = requireTenant(context)
  requireProductionPulse(tenant.plan)
  const alerts: ReturnType<typeof toAlertPublic>[] = []
  const auditIds: string[] = []
  const failedIds: string[] = []
  for (const alertId of input.alertIds) {
    try {
      const result = await scoped.pulse.dismiss({
        alertId,
        userId,
        ...(input.reason ? { reason: input.reason } : {}),
      })
      alerts.push(toAlertPublic(result.alert))
      auditIds.push(result.auditId)
    } catch {
      failedIds.push(alertId)
    }
  }
  if (alerts.length > 0) {
    await enqueueDashboardBriefRefresh(context.env, {
      firmId: tenant.firmId,
      reason: 'pulse_dismiss',
    }).catch(() => false)
  }
  return { alerts, auditIds, failedIds }
})

const bulkSnooze = os.pulse.bulkSnooze.handler(async ({ input, context }) => {
  const { userId } = await requireCurrentFirmRole(context, PULSE_REVIEW_ROLES)
  const { scoped, tenant } = requireTenant(context)
  requireProductionPulse(tenant.plan)
  const until = new Date(input.until)
  const alerts: ReturnType<typeof toAlertPublic>[] = []
  const auditIds: string[] = []
  const failedIds: string[] = []
  for (const alertId of input.alertIds) {
    try {
      const result = await scoped.pulse.snooze({
        alertId,
        userId,
        until,
        ...(input.reason ? { reason: input.reason } : {}),
      })
      alerts.push(toAlertPublic(result.alert))
      auditIds.push(result.auditId)
    } catch {
      failedIds.push(alertId)
    }
  }
  if (alerts.length > 0) {
    await enqueueDashboardBriefRefresh(context.env, {
      firmId: tenant.firmId,
      reason: 'pulse_dismiss',
    }).catch(() => false)
  }
  return { alerts, auditIds, failedIds }
})

const markReviewed = os.pulse.markReviewed.handler(async ({ input, context }) => {
  const { userId } = await requireCurrentFirmRole(context, PULSE_REVIEW_ROLES)
  const { scoped, tenant } = requireTenant(context)
  try {
    const result = await scoped.pulse.markReviewed({
      alertId: input.alertId,
      userId,
      ...(input.reason ? { reason: input.reason } : {}),
    })
    await enqueueDashboardBriefRefresh(context.env, {
      firmId: tenant.firmId,
      reason: 'pulse_dismiss',
    }).catch(() => false)
    return { alert: toAlertPublic(result.alert), auditId: result.auditId }
  } catch (error) {
    return mapPulseError(error)
  }
})

const revert = os.pulse.revert.handler(async ({ input, context }) => {
  const { userId } = await requireCurrentFirmRole(context, PULSE_REVIEW_ROLES)
  const { scoped, tenant } = requireTenant(context)
  requireProductionPulse(tenant.plan)
  try {
    const result = await withPulseMutationLock(
      scoped,
      { firmId: tenant.firmId, alertId: input.alertId },
      () => scoped.pulse.revert({ alertId: input.alertId, userId }),
    )
    const output = {
      alert: toAlertPublic(result.alert),
      revertedCount: result.revertedCount,
      auditIds: result.auditIds,
      evidenceIds: result.evidenceIds,
    }
    await enqueueDashboardBriefRefresh(context.env, {
      firmId: tenant.firmId,
      reason: 'pulse_revert',
    }).catch(() => false)
    return output
  } catch (error) {
    return mapPulseError(error)
  }
})

const reactivate = os.pulse.reactivate.handler(async ({ input, context }) => {
  const { userId } = await requireCurrentFirmRole(context, PULSE_REVIEW_ROLES)
  const { scoped, tenant } = requireTenant(context)
  requireProductionPulse(tenant.plan)
  try {
    const result = await scoped.pulse.reactivate({ alertId: input.alertId, userId })
    await enqueueDashboardBriefRefresh(context.env, {
      firmId: tenant.firmId,
      reason: 'pulse_reactivate',
    }).catch(() => false)
    return { alert: toAlertPublic(result.alert), auditId: result.auditId }
  } catch (error) {
    return mapPulseError(error)
  }
})

export async function requestPulseReview(input: {
  context: RpcContext
  alertId: string
  note?: string | undefined
}): Promise<{ notificationCount: number; emailCount: number; auditId: string }> {
  const { members, tenant, userId } = await requireCurrentFirmRole(input.context, [
    'owner',
    'partner',
    'manager',
    'preparer',
  ])
  const { scoped } = requireTenant(input.context)
  const { notifications } = scoped
  if (!notifications) {
    throw new Error('Notifications repo methods are not available.')
  }

  try {
    const detail = await scoped.pulse.getDetail(input.alertId)
    const alert = toAlertPublic(detail.alert)
    if (
      !isPulseReviewRequestAvailable({
        alertStatus: alert.status,
        sourceStatus: alert.sourceStatus,
      })
    ) {
      throw new ORPCError('CONFLICT', { message: ErrorCodes.PULSE_REVIEW_UNAVAILABLE })
    }

    if (planHasFeature(tenant.plan, 'priorityPulseMatching')) {
      await scoped.pulse.requestPriorityReview({ alertId: input.alertId, userId })
    }

    const note = normalizeReviewNote(input.note)
    const actor = await members.findMembership(tenant.firmId, userId)
    const requesterName = actor?.name ?? 'A preparer'
    const reviewRequestId = crypto.randomUUID()
    const recipients = (await members.listMembers(tenant.firmId)).filter(
      (member) =>
        member.status === 'active' &&
        member.userId !== userId &&
        (member.role === 'owner' || member.role === 'partner' || member.role === 'manager'),
    )
    const href = `/alerts?alert=${encodeURIComponent(alert.id)}`
    const subject = `Review requested: ${alert.title}`
    await Promise.all(
      recipients.map((recipient) =>
        notifications.create({
          userId: recipient.userId,
          type: 'pulse_alert',
          entityType: 'pulse_firm_alert',
          entityId: alert.id,
          title: subject,
          body: pulseReviewNotificationBody({ requesterName, note }),
          href,
          metadataJson: {
            kind: 'pulse_review_request',
            alertId: alert.id,
            pulseId: alert.pulseId,
            requestedBy: userId,
            requestedByName: requesterName,
            reviewRequestId,
            note,
          },
        }),
      ),
    )

    const emailRecipients = uniqueEmails(recipients.map((recipient) => recipient.email))
    let emailCount = 0
    if (emailRecipients.length > 0) {
      const alertUrl = new URL(href, input.context.env.APP_URL).toString()
      const queuedEmail = await notifications.enqueueEmail({
        externalId: `pulse-review:${tenant.firmId}:${alert.id}:${reviewRequestId}`,
        type: 'pulse_review_request',
        payloadJson: {
          recipients: emailRecipients,
          subject,
          text: pulseReviewEmailText({
            alertTitle: alert.title,
            requesterName,
            note,
            alertUrl,
          }),
          alertId: alert.id,
          pulseId: alert.pulseId,
          href,
          requestedBy: userId,
          requestedByName: requesterName,
          reviewRequestId,
          note,
        },
      })
      if (queuedEmail.created) {
        emailCount = emailRecipients.length
        await input.context.env.EMAIL_QUEUE.send({ type: 'email.flush' }).catch(() => undefined)
      }
    }

    const { id: auditId } = await scoped.audit.write({
      actorId: userId,
      entityType: 'pulse_firm_alert',
      entityId: alert.id,
      action: 'pulse.review_requested',
      after: {
        alertId: alert.id,
        pulseId: alert.pulseId,
        requestedBy: userId,
        requestedByName: requesterName,
        recipientCount: recipients.length,
        emailCount,
        reviewRequestId,
        note,
      },
    })

    return { notificationCount: recipients.length, emailCount, auditId }
  } catch (error) {
    if (error instanceof ORPCError) throw error
    return mapPulseError(error)
  }
}

const requestReview = os.pulse.requestReview.handler(async ({ input, context }) =>
  requestPulseReview({
    context,
    alertId: input.alertId,
    ...(input.note !== undefined ? { note: input.note } : {}),
  }),
)

/**
 * 2026-06-04 round 50 (Yuqi "continue your phase 2 and 3" —
 * morning sweep AI summary): in-memory cache for the briefing
 * keyed by (firmId, day-bucket). Lives at module scope so within
 * a single Worker instance the same firm gets at most one LLM
 * call per UTC day. In production this would graduate to KV /
 * Durable Object storage so the cache survives Worker recycling
 * — for the v1 server endpoint, module-local is good enough to
 * validate the shape.
 */
const morningSweepCache = new Map<
  string,
  { briefing: PulseMorningSweepBriefing; generatedAt: string; alertCount: number }
>()

function morningSweepCacheKey(firmId: string, nowMs: number): string {
  const day = Math.floor(nowMs / (24 * 60 * 60 * 1000))
  return `${firmId}:${day}`
}

function severityFromAlert(alert: PulseAlertRow): 'high' | 'medium' | 'low' {
  // Mirror `aiConfidenceTier` thresholds from
  // apps/app/src/features/_surface-vocabulary/ai-confidence.ts so
  // the LLM gets the same impact-tier signal the UI uses. Low
  // confidence = HIGH IMPACT (model is unsure → CPA reviews).
  if (alert.confidence < 0.6) return 'high'
  if (alert.confidence < 0.85) return 'medium'
  return 'low'
}

function deterministicFallback(input: MorningSweepInput): PulseMorningSweepBriefing {
  // Identical shape to the client-side `composeBriefing` in
  // MorningSweepDialog.tsx so the dialog renders the same UX
  // when the AI gateway refuses / errors. Phase 1 logic lifted
  // server-side so the fallback stays in step with the LLM
  // expectations.
  const total = input.alerts.length
  if (total === 0) {
    return {
      headline: 'Quiet overnight — no new regulatory alerts in the last 24 hours.',
      bullets: [],
      topActions: [],
      footer: null,
    }
  }
  const highCount = input.alerts.filter((a) => a.severity === 'high').length
  const withClients = input.alerts.filter((a) => a.matchedClientCount > 0).length
  const bullets: string[] = []
  bullets.push(
    total === 1
      ? '1 new regulatory alert published overnight.'
      : `${total} new regulatory alerts published overnight.${
          highCount > 0 ? ` ${highCount} flagged HIGH IMPACT.` : ''
        }`,
  )
  bullets.push(
    withClients === 0
      ? 'None match your current client roster yet.'
      : withClients === 1
        ? '1 alert touches your client roster — review before client communication this morning.'
        : `${withClients} alerts touch your client roster — review these before client communication this morning.`,
  )
  const topActions = input.alerts.slice(0, 3).map((alert) => ({
    alertId: alert.id,
    title: alert.title,
    whyNow:
      alert.severity === 'high'
        ? 'HIGH IMPACT — verify the extracted fields against the source before applying any changes.'
        : alert.matchedClientCount > 0
          ? 'Affects your client roster — quick-confirm before client communication.'
          : 'Quick-confirm fields and apply when ready.',
    clientMentions: alert.affectedClientNames,
  }))
  return {
    headline:
      highCount > 0
        ? `${highCount} HIGH IMPACT among ${total} overnight alerts — start with the top action.`
        : `${total} overnight alerts — none flagged HIGH IMPACT.`,
    bullets,
    topActions,
    footer: null,
  }
}

const morningSweepSummary = os.pulse.morningSweepSummary.handler(
  async ({ context }): Promise<PulseMorningSweepOutput> => {
    // 2026-06-05 (pre-CI green-up): `context.tenant` was removed when
    // main pulled the tenant lookup into `requireTenant`. Destructure
    // tenant from the helper (which already throws UNAUTHORIZED on a
    // missing firm context) and drop the now-redundant null check.
    const { scoped, tenant } = requireTenant(context)
    const nowMs = Date.now()
    const generatedAt = new Date(nowMs).toISOString()
    const cacheKey = morningSweepCacheKey(tenant.firmId, nowMs)
    const cached = morningSweepCache.get(cacheKey)
    if (cached) {
      return {
        briefing: cached.briefing,
        source: 'llm-cached',
        generatedAt: cached.generatedAt,
        alertCount: cached.alertCount,
      }
    }

    // Window: last 24h. Fetch a larger limit than usual so the
    // ranking has headroom; the schema caps the LLM input to 50.
    // 2026-06-05 (pre-CI green-up): main wrapped `listAlerts` in a
    // pagination envelope (`{ alerts, nextCursor }`) for the new
    // Load-more flow on /alerts. Destructure here so the existing
    // 24-h windowing logic still runs on the alerts array.
    const { alerts: allAlerts } = await scoped.pulse.listAlerts({ limit: 100 })
    const cutoffMs = nowMs - 24 * 60 * 60 * 1000
    const windowAlerts = allAlerts.filter((a: PulseAlertRow) => a.publishedAt.getTime() >= cutoffMs)
    // Phase 3 personalisation: fetch up to 5 affected client names
    // per alert in parallel. Per-detail fetches are bounded by the
    // window size (≤ 100 alerts × 5 clients) which is comfortable
    // for one briefing generation per morning.
    const topByImpact = [...windowAlerts]
      .toSorted((a, b) => {
        const tierWeight = (al: PulseAlertRow) =>
          severityFromAlert(al) === 'high' ? 3 : severityFromAlert(al) === 'medium' ? 2 : 1
        const diff = tierWeight(b) - tierWeight(a)
        if (diff !== 0) return diff
        return b.matchedCount + b.needsReviewCount - (a.matchedCount + a.needsReviewCount)
      })
      .slice(0, 50)
    const alertsWithClients: MorningSweepInput['alerts'] = await Promise.all(
      topByImpact.map(async (alert) => {
        // Phase 3 — pull affected client names from the detail
        // query. Empty-list fallback is fine; client mentions are
        // an enhancement, not a hard requirement.
        let names: string[] = []
        try {
          const detail = await scoped.pulse.getDetail(alert.id)
          // 2026-06-05 (pre-CI green-up): scoped.pulse.getDetail returns
          // the internal `PulseDetailRow` shape whose affectedClients use
          // `PulseAffectedClientRow` (with Date fields), not the public
          // `PulseAffectedClient` projection. We only need clientName
          // here so the row type is sufficient.
          names = (detail?.affectedClients ?? [])
            .map((c: PulseAffectedClientRow) => c.clientName)
            .filter((name, idx, arr) => name && arr.indexOf(name) === idx)
            .slice(0, 5)
        } catch {
          // Detail-fetch failure shouldn't block the briefing.
          names = []
        }
        return {
          id: alert.id,
          title: alert.title,
          summary: alert.summary || null,
          source: alert.source,
          jurisdiction: alert.jurisdiction,
          publishedAt: alert.publishedAt.toISOString(),
          severity: severityFromAlert(alert),
          changeKind: alert.changeKind,
          matchedClientCount: alert.matchedCount + alert.needsReviewCount,
          affectedClientNames: names,
        }
      }),
    )

    // 2026-06-05 (pre-CI green-up): origin/main pruned `firmName` from
    // `TenantContext` (it now lives on FirmMembershipRow). The morning-
    // sweep input still accepts `firmName: string | null` so passing
    // null keeps the LLM in "Your morning sweep" mode instead of the
    // personalised "Acme's morning sweep" phrasing. A follow-up that
    // joins the firm name in could promote this back.
    const input: MorningSweepInput = {
      firmName: null,
      generatedAt,
      alerts: alertsWithClients,
    }

    // Empty window → skip LLM, return deterministic message.
    if (input.alerts.length === 0) {
      const fallback = deterministicFallback(input)
      morningSweepCache.set(cacheKey, {
        briefing: fallback,
        generatedAt,
        alertCount: 0,
      })
      return {
        briefing: fallback,
        source: 'llm-fresh',
        generatedAt,
        alertCount: 0,
      }
    }

    const ai = createAI(context.env)
    const result = await ai.summarizeMorningSweep(input, { taskKind: 'pulse' })
    // 2026-06-05 (pre-CI green-up): main refactored AiRunResult from
    // a `kind`-discriminated union with `output` to a `refusal`-
    // discriminated union with `result`. The success branch is now
    // `{ result, refusal: null, … }`; the refusal branch is
    // `{ result: null, refusal, … }`. Discriminate on
    // `result.result !== null` so TypeScript narrows to the success
    // variant and `result.result.X` is accessible.
    if (result.result !== null) {
      const out = result.result
      const briefing: PulseMorningSweepBriefing = {
        headline: out.headline,
        bullets: out.bullets,
        topActions: out.topActions.map((a) => ({
          alertId: a.alertId,
          title: a.title,
          whyNow: a.whyNow,
          clientMentions: a.clientMentions ?? [],
        })),
        footer: out.footer ?? null,
      }
      morningSweepCache.set(cacheKey, {
        briefing,
        generatedAt,
        alertCount: input.alerts.length,
      })
      return {
        briefing,
        source: 'llm-fresh',
        generatedAt,
        alertCount: input.alerts.length,
      }
    }

    // Gateway refused / errored — fall back to the deterministic
    // template so the UI still renders something useful. Don't
    // cache the fallback so a retry next call can try the LLM
    // again (caching the fallback would lock the firm into the
    // template for the whole day).
    const fallback = deterministicFallback(input)
    return {
      briefing: fallback,
      source: 'fallback',
      generatedAt,
      alertCount: input.alerts.length,
    }
  },
)

export const pulseHandlers = {
  listAlerts,
  activeCount,
  listHistory,
  listSourceHealth,
  listAlertSourceCoverage: listAlertSourceCoverageHandler,
  retrySourceHealth,
  catchUpStillOpenWindows,
  getDetail,
  listAlertsForRule,
  getDetailsBatch,
  listPriorityQueue,
  reviewPriorityMatches,
  reviewDueDateOverlayDetails,
  applyReviewed,
  apply,
  dismiss,
  snooze,
  bulkDismiss,
  bulkSnooze,
  markReviewed,
  revert,
  reactivate,
  requestReview,
  morningSweepSummary,
}
