import type {
  ClientPublic,
  ObligationInstancePublic,
  ObligationQueueRow,
  OpportunityPublic,
  PulseAffectedClient,
  PulseDetail,
} from '@duedatehq/contracts'

const OPEN_OBLIGATION_STATUSES = new Set<ObligationInstancePublic['status']>([
  'pending',
  'in_progress',
  'extended',
  'waiting_on_client',
  'review',
])

const EXTENSION_FILED_STATES = new Set<ObligationInstancePublic['extensionState']>([
  'filed',
  'accepted',
])
const PAYMENT_SETTLED_STATES = new Set<ObligationInstancePublic['paymentState']>([
  'confirmed',
  'not_applicable',
])

/**
 * Anti-pattern #1 in the product model: extension does NOT extend payment.
 * An obligation hits this risk when its filing extension is on the wire
 * (filed/accepted) but the payment side is not yet settled.
 */
export function findExtensionWithoutPaymentObligations(
  obligations: readonly ObligationInstancePublic[],
): ObligationInstancePublic[] {
  return obligations.filter(
    (obligation) =>
      EXTENSION_FILED_STATES.has(obligation.extensionState) &&
      !PAYMENT_SETTLED_STATES.has(obligation.paymentState),
  )
}

export type ClientWorkPlanSummary = {
  openCount: number
  overdueOpenCount: number
  needsReviewCount: number
  projectedExposureCents: number
  exposureNeedsInputCount: number
  estimatedTaxDueCents: number
  paymentTrackCount: number
  nextDueDate: string | null
}

export type ClientPulseMatch = {
  alertId: string
  title: string
  source: string
  sourceUrl: string
  publishedAt: string
  confidence: number
  status: PulseAffectedClient['matchStatus']
  taxType: string
  currentDueDate: string
  newDueDate: string
  reason: string | null
}

export type ClientContactPlan = {
  primaryContact: string | null
  internalOwner: string | null
  missing: Array<'primary_contact' | 'internal_owner' | 'fallback_contact'>
}

export function buildClientWorkPlanSummary(
  obligations: readonly ObligationInstancePublic[],
  asOfDate: string,
): ClientWorkPlanSummary {
  const open = obligations.filter((obligation) => OPEN_OBLIGATION_STATUSES.has(obligation.status))
  const nextDueDate =
    open
      .map((obligation) => obligation.currentDueDate)
      .toSorted((left, right) => left.localeCompare(right))[0] ?? null

  return {
    openCount: open.length,
    overdueOpenCount: open.filter((obligation) => obligation.currentDueDate < asOfDate).length,
    needsReviewCount: open.filter(
      (obligation) => obligation.status === 'review' || obligation.readiness === 'needs_review',
    ).length,
    projectedExposureCents: open.reduce(
      (total, obligation) => total + (obligation.estimatedExposureCents ?? 0),
      0,
    ),
    exposureNeedsInputCount: open.filter(
      (obligation) => obligation.exposureStatus === 'needs_input',
    ).length,
    estimatedTaxDueCents: open.reduce(
      (total, obligation) => total + (obligation.estimatedTaxDueCents ?? 0),
      0,
    ),
    paymentTrackCount: open.filter(
      (obligation) =>
        obligation.estimatedTaxDueCents !== null || obligation.estimatedExposureCents !== null,
    ).length,
    nextDueDate,
  }
}

export function buildClientPulseMatches(
  details: readonly PulseDetail[],
  clientId: string,
): ClientPulseMatch[] {
  return details
    .flatMap((detail) =>
      detail.affectedClients
        .filter((row) => row.clientId === clientId)
        .map((row) => ({
          alertId: detail.alert.id,
          title: detail.alert.title,
          source: detail.alert.source,
          sourceUrl: detail.alert.sourceUrl,
          publishedAt: detail.alert.publishedAt,
          confidence: detail.alert.confidence,
          status: row.matchStatus,
          taxType: row.taxType,
          currentDueDate: row.currentDueDate,
          newDueDate: row.newDueDate,
          reason: row.reason,
        })),
    )
    .toSorted((left, right) => right.publishedAt.localeCompare(left.publishedAt))
}

const PULSE_MATCH_ACTIVE_STATUSES: ReadonlySet<PulseAffectedClient['matchStatus']> = new Set([
  'eligible',
  'needs_review',
])

export function buildPulseMatchesByClient(
  details: readonly PulseDetail[],
): Map<string, ClientPulseMatch[]> {
  const byClient = new Map<string, ClientPulseMatch[]>()
  for (const detail of details) {
    for (const row of detail.affectedClients) {
      if (!PULSE_MATCH_ACTIVE_STATUSES.has(row.matchStatus)) continue
      const match: ClientPulseMatch = {
        alertId: detail.alert.id,
        title: detail.alert.title,
        source: detail.alert.source,
        sourceUrl: detail.alert.sourceUrl,
        publishedAt: detail.alert.publishedAt,
        confidence: detail.alert.confidence,
        status: row.matchStatus,
        taxType: row.taxType,
        currentDueDate: row.currentDueDate,
        newDueDate: row.newDueDate,
        reason: row.reason,
      }
      const bucket = byClient.get(row.clientId)
      if (bucket) bucket.push(match)
      else byClient.set(row.clientId, [match])
    }
  }
  for (const matches of byClient.values()) {
    matches.sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))
  }
  return byClient
}

export type ClientObligationListSummary = {
  openCount: number
  // `overdueCount` is rows where `daysUntilDue < 0` — past the
  // statutory due date but not yet completed. Surfaces as the "At
  // risk" action signal on the list page. (Blocked rows aren't
  // fetched by the list route's `OPEN_OBLIGATION_STATUSES`, so we
  // don't count them here; see docs/Design/clients-list-summary-strip-redesign.md.)
  overdueCount: number
  // Rows in `waiting_on_client` status — the CPA is blocked on
  // information from the client. Surfaces as the "Waiting on client"
  // action signal.
  waitingOnClientCount: number
  nextDueDate: string | null
  nextTaxType: string | null
}

export function buildClientObligationListSummaries(
  rows: readonly ObligationQueueRow[],
): Map<string, ClientObligationListSummary> {
  const byClient = new Map<string, ClientObligationListSummary>()
  for (const row of rows) {
    if (!OPEN_OBLIGATION_STATUSES.has(row.status)) continue
    const isOverdue = row.daysUntilDue < 0
    const isWaiting = row.status === 'waiting_on_client'
    const existing = byClient.get(row.clientId)
    if (!existing) {
      byClient.set(row.clientId, {
        openCount: 1,
        overdueCount: isOverdue ? 1 : 0,
        waitingOnClientCount: isWaiting ? 1 : 0,
        nextDueDate: row.currentDueDate,
        nextTaxType: row.taxType,
      })
      continue
    }
    existing.openCount += 1
    if (isOverdue) existing.overdueCount += 1
    if (isWaiting) existing.waitingOnClientCount += 1
    if (!existing.nextDueDate || row.currentDueDate < existing.nextDueDate) {
      existing.nextDueDate = row.currentDueDate
      existing.nextTaxType = row.taxType
    }
  }
  return byClient
}

export function buildOpportunityCountByClient(
  opportunities: readonly OpportunityPublic[],
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const opportunity of opportunities) {
    counts.set(opportunity.client.id, (counts.get(opportunity.client.id) ?? 0) + 1)
  }
  return counts
}

export function buildClientContactPlan(client: ClientPublic): ClientContactPlan {
  const missing: ClientContactPlan['missing'] = []
  if (!client.email) missing.push('primary_contact')
  if (!client.assigneeName) missing.push('internal_owner')
  missing.push('fallback_contact')

  return {
    primaryContact: client.email,
    internalOwner: client.assigneeName,
    missing,
  }
}
