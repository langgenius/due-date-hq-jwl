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
  // 2026-05-24 (critique P0): "All on track" was showing on clients
  // whose statutory date was missed but `currentDueDate` had shifted
  // forward (post-extension). `overdueOpenCount` only checks the
  // current/effective date so post-extension rows looked fine — even
  // when no extension was actually on the wire. These three counts
  // expose the truthful picture:
  //   - statutoryLateUnextendedCount: red — past statutory, no
  //     extension filed or accepted (real lateness, anti-pattern #3
  //     "Filed ≠ Done" should never lie green)
  //   - extensionPaymentDueCount: amber — extension filed but payment
  //     not yet settled (anti-pattern #1: extension ≠ payment extended)
  //   - extensionFiledOpenCount: informational — at least one row is
  //     on an extension, so the header can say "Extended" instead of
  //     leaning on the absence of red
  // The header pill consumes these in priority order; see
  // renderClientHeaderSubLine in ClientFactsWorkspace.
  statutoryLateUnextendedCount: number
  extensionPaymentDueCount: number
  extensionFiledOpenCount: number
  needsReviewCount: number
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
  newDueDate: string | null
  reason: string | null
}

type ClientContactPlan = {
  primaryContact: string | null
  internalOwner: string | null
  missing: Array<'primary_contact' | 'internal_owner' | 'fallback_contact'>
}

export type ClientHeaderContactItem = {
  kind: 'contact' | 'email' | 'phone' | 'address'
  value: string
}

const RAW_CLIENT_DETAIL_TOKENS = new Set([
  'address_line_1',
  'addressline1',
  'city',
  'email',
  'postal_code',
  'postalcode',
  'primary_contact_email',
  'primary_contact_name',
  'primary_phone',
])

function cleanClientHeaderText(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  const normalized = trimmed.toLowerCase().replace(/[\s-]+/g, '_')
  return RAW_CLIENT_DETAIL_TOKENS.has(normalized) ? null : trimmed
}

function looksLikeClientHeaderEmail(value: string | null | undefined): value is string {
  const cleaned = cleanClientHeaderText(value)
  return Boolean(cleaned && /.+@.+\..+/.test(cleaned))
}

function looksLikeClientHeaderPhone(value: string | null | undefined): value is string {
  const cleaned = cleanClientHeaderText(value)
  if (!cleaned) return false
  const digits = cleaned.replace(/\D/g, '')
  return digits.length >= 3
}

function formatClientHeaderAddress(client: ClientPublic): string | null {
  const line1 = cleanClientHeaderText(client.addressLine1)
  const city = cleanClientHeaderText(client.city)
  const postalCode = cleanClientHeaderText(client.postalCode)
  const cityLine = [city, postalCode].filter(Boolean).join(' ')
  return [line1, cityLine || null].filter(Boolean).join(', ') || null
}

export function buildClientHeaderContactItems(client: ClientPublic): ClientHeaderContactItem[] {
  const items: ClientHeaderContactItem[] = []
  const contactName = cleanClientHeaderText(client.primaryContactName)
  const primaryContactEmail = looksLikeClientHeaderEmail(client.primaryContactEmail)
    ? client.primaryContactEmail.trim()
    : null
  const fallbackEmail = looksLikeClientHeaderEmail(client.email) ? client.email.trim() : null
  const email = primaryContactEmail ?? fallbackEmail
  const phone = looksLikeClientHeaderPhone(client.primaryPhone) ? client.primaryPhone.trim() : null
  const address = formatClientHeaderAddress(client)

  if (contactName) items.push({ kind: 'contact', value: contactName })
  if (email) items.push({ kind: 'email', value: email })
  if (phone) items.push({ kind: 'phone', value: phone })
  if (address) items.push({ kind: 'address', value: address })

  return items
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

  // Open rows whose statutory (base) date is in the past — independent
  // of any extension shift of currentDueDate. Splitting this out from
  // overdueOpenCount lets the header pill detect "missed statutory but
  // post-extension date is still future" — the case where the old
  // truthful-but-incomplete pill quietly went green.
  const statutoryLateOpen = open.filter((obligation) => obligation.baseDueDate < asOfDate)
  const statutoryLateUnextendedCount = statutoryLateOpen.filter(
    (obligation) => !EXTENSION_FILED_STATES.has(obligation.extensionState),
  ).length
  const extensionFiledOpenCount = open.filter((obligation) =>
    EXTENSION_FILED_STATES.has(obligation.extensionState),
  ).length
  const extensionPaymentDueCount = findExtensionWithoutPaymentObligations(open).length

  return {
    openCount: open.length,
    overdueOpenCount: open.filter((obligation) => obligation.currentDueDate < asOfDate).length,
    statutoryLateUnextendedCount,
    extensionPaymentDueCount,
    extensionFiledOpenCount,
    needsReviewCount: open.filter(
      (obligation) => obligation.status === 'review' || obligation.readiness === 'needs_review',
    ).length,
    estimatedTaxDueCents: open.reduce(
      (total, obligation) => total + (obligation.estimatedTaxDueCents ?? 0),
      0,
    ),
    paymentTrackCount: open.filter((obligation) => obligation.estimatedTaxDueCents !== null).length,
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
  // 2026-05-23: status of the earliest-non-terminal obligation. Surfaces
  // on the /clients list as a colored pill inside the NEXT DUE cell so
  // the CPA can tell *why* a row is "Xd late" (blocked / waiting / in
  // review / ...) without opening the drawer. Tracks the same row whose
  // due date populates `nextDueDate`.
  nextDueStatus: ObligationInstancePublic['status'] | null
  // 2026-05-23: count of obligations the firm has already filed or
  // closed out for this client. Pairs with `openCount` on the /clients
  // list — answers "how many done?" alongside "how many in-flight?".
  // Counts rows whose status is `done` or `completed` (terminal states
  // in the workflow).
  doneCount: number
}

// 2026-05-23: terminal-state statuses contribute to `doneCount` but
// not to `openCount` or `nextDueDate`. Kept in sync with the list
// route's widened query input (`OBLIGATIONS_LIST_INPUT.status`).
const DONE_OBLIGATION_STATUSES = new Set<ObligationInstancePublic['status']>(['done', 'completed'])

export function buildClientObligationListSummaries(
  rows: readonly ObligationQueueRow[],
): Map<string, ClientObligationListSummary> {
  const byClient = new Map<string, ClientObligationListSummary>()
  const ensure = (clientId: string): ClientObligationListSummary => {
    const existing = byClient.get(clientId)
    if (existing) return existing
    const fresh: ClientObligationListSummary = {
      openCount: 0,
      overdueCount: 0,
      waitingOnClientCount: 0,
      nextDueDate: null,
      nextTaxType: null,
      nextDueStatus: null,
      doneCount: 0,
    }
    byClient.set(clientId, fresh)
    return fresh
  }
  for (const row of rows) {
    const isOpen = OPEN_OBLIGATION_STATUSES.has(row.status)
    const isDone = DONE_OBLIGATION_STATUSES.has(row.status)
    if (!isOpen && !isDone) continue
    const summary = ensure(row.clientId)
    if (isDone) {
      summary.doneCount += 1
      continue
    }
    // Open row: count it, then maybe update next-due tracking.
    summary.openCount += 1
    if (row.daysUntilDue < 0) summary.overdueCount += 1
    if (row.status === 'waiting_on_client') summary.waitingOnClientCount += 1
    if (!summary.nextDueDate || row.currentDueDate < summary.nextDueDate) {
      summary.nextDueDate = row.currentDueDate
      summary.nextTaxType = row.taxType
      // Capture the status of WHICHEVER row populates nextDueDate so
      // the inline pill matches the date next to it. Done rows are
      // explicitly excluded above so this only tracks open statuses.
      summary.nextDueStatus = row.status
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
