import { ORPCError } from '@orpc/server'
import {
  ErrorCodes,
  type PulseAffectedClient,
  type PulseAlertPublic,
  type PulseFirmAlertStatus,
  type PulsePriorityQueueItem,
  type PulsePriorityReason,
  type PulsePriorityReview,
  type PulseSourceHealth,
  type PulseStatus,
} from '@duedatehq/contracts'
import { planHasFeature } from '@duedatehq/core/plan-entitlements'
import { enqueueDashboardBriefRefresh } from '../../jobs/dashboard-brief/enqueue'
import { runPulseIngest } from '../../jobs/pulse/ingest'
import { visibleRegulatorySourceAdapters } from '../../jobs/pulse/rule-source-adapters'
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
  confidence: number
  isSample: boolean
  // 2026-05-25 (Yuqi Alerts #9): mirrors the repo's PulseAlertRow
  // jurisdiction field. Local interface stays a structural twin of
  // the repo type (history-deep separation; merging the two is a
  // refactor task on its own).
  jurisdiction: string
}

const SOURCE_LABELS: Record<string, string> = {
  'irs.disaster': 'IRS Disaster Relief',
  'irs.newsroom': 'IRS Newsroom',
  'irs.guidance': 'IRS Guidance',
  'ca.ftb.newsroom': 'CA FTB Newsroom',
  'ca.ftb.tax_news': 'CA FTB Tax News',
  'ca.cdtfa.news': 'CA CDTFA News',
  'tx.cpa.rss': 'TX Comptroller News',
  'fl.dor.tips': 'FL DOR Tax Tips',
  'wa.dor.news': 'WA DOR News',
  'wa.dor.whats_new': 'WA DOR What’s New',
  'ma.dor.press': 'MA DOR Press',
  'fema.declarations': 'FEMA declarations',
  'ny.dtf.press': 'NY DTF Press',
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

function toAlertPublic(row: PulseAlertRow): PulseAlertPublic {
  return {
    id: row.id,
    pulseId: row.pulseId,
    status: row.status,
    sourceStatus: row.sourceStatus,
    changeKind: row.changeKind,
    actionMode: row.actionMode,
    title: row.title,
    source: row.source,
    sourceUrl: row.sourceUrl,
    summary: row.summary,
    publishedAt: row.publishedAt.toISOString(),
    matchedCount: row.matchedCount,
    needsReviewCount: row.needsReviewCount,
    confidence: row.confidence,
    isSample: row.isSample,
    // 2026-05-25 (Yuqi Alerts #9): plumb jurisdiction through to the
    // public row so the alerts list page can group/filter by state.
    jurisdiction: row.jurisdiction,
  }
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

async function withPulseMutationLock<T>(
  context: RpcContext,
  input: { firmId: string; alertId: string; action: 'apply' | 'revert' },
  run: () => Promise<T>,
): Promise<T> {
  const key = `pulse:lock:${input.firmId}:${input.alertId}:${input.action}`
  if (await context.env.CACHE.get(key)) {
    throw new ORPCError('CONFLICT', { message: ErrorCodes.PULSE_APPLY_CONFLICT })
  }
  await context.env.CACHE.put(key, String(Date.now()), { expirationTtl: 60 })
  try {
    return await run()
  } finally {
    await context.env.CACHE.delete(key).catch(() => undefined)
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
  const opts = input?.limit === undefined ? {} : { limit: input.limit }
  const alerts = await scoped.pulse.listAlerts(opts)
  return { alerts: alerts.map(toAlertPublic) }
})

const activeCount = os.pulse.activeCount.handler(async ({ context }) => {
  const { scoped } = requireTenant(context)
  const count = await scoped.pulse.countActiveAlerts()
  return { count }
})

const listHistory = os.pulse.listHistory.handler(async ({ input, context }) => {
  const { scoped } = requireTenant(context)
  const alerts = await scoped.pulse.listHistory({
    ...(input?.limit === undefined ? {} : { limit: input.limit }),
    ...(input?.status === undefined ? {} : { status: input.status }),
  })
  return { alerts: alerts.map(toAlertPublic) }
})

async function listSourceHealthForScopedRepo(
  scoped: ReturnType<typeof requireTenant>['scoped'],
): Promise<{ sources: PulseSourceHealth[] }> {
  const persisted = new Map(
    (await scoped.pulse.listSourceStates()).map((row) => [row.sourceId, row]),
  )
  const sources: PulseSourceHealth[] = visibleRegulatorySourceAdapters.map((adapter) => {
    const state = persisted.get(adapter.id)
    const healthStatus =
      state?.enabled === false || state?.healthStatus === 'paused' ? 'paused' : 'healthy'
    return {
      sourceId: adapter.id,
      label: SOURCE_LABELS[adapter.id] ?? adapter.id,
      tier: adapter.tier,
      jurisdiction: adapter.jurisdiction,
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
    const { scoped, tenant } = requireTenant(context)
    requireProductionPulse(tenant.plan)
    try {
      const detail = await scoped.pulse.reviewDueDateOverlayDetails({
        alertId: input.alertId,
        originalDueDate: dateFromDateOnly(input.originalDueDate),
        newDueDate: dateFromDateOnly(input.newDueDate),
        forms: input.forms,
        entityTypes: input.entityTypes,
        counties: input.counties ?? [],
        note: input.note ?? null,
        userId,
        ...(input.affectedRuleIds !== undefined ? { affectedRuleIds: input.affectedRuleIds } : {}),
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
      context,
      { firmId: tenant.firmId, alertId: input.alertId, action: 'apply' },
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
      context,
      { firmId: tenant.firmId, alertId: input.alertId, action: 'apply' },
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
      reason: input.reason,
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
      reason: input.reason,
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

const markReviewed = os.pulse.markReviewed.handler(async ({ input, context }) => {
  const { userId } = await requireCurrentFirmRole(context, PULSE_REVIEW_ROLES)
  const { scoped, tenant } = requireTenant(context)
  requireProductionPulse(tenant.plan)
  try {
    const result = await scoped.pulse.markReviewed({
      alertId: input.alertId,
      userId,
      reason: input.reason,
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
      context,
      { firmId: tenant.firmId, alertId: input.alertId, action: 'revert' },
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
  requireProductionPulse(tenant.plan)
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
    const href = `/rules?tab=pulse&alert=${encodeURIComponent(alert.id)}`
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

export const pulseHandlers = {
  listAlerts,
  activeCount,
  listHistory,
  listSourceHealth,
  retrySourceHealth,
  getDetail,
  getDetailsBatch,
  listPriorityQueue,
  reviewPriorityMatches,
  reviewDueDateOverlayDetails,
  applyReviewed,
  apply,
  dismiss,
  snooze,
  markReviewed,
  revert,
  reactivate,
  requestReview,
}
