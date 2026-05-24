import type {
  OpportunityKind,
  OpportunityListOutput,
  OpportunityPublic,
} from '@duedatehq/contracts'
import type { ClientRow } from '@duedatehq/ports/clients'
import type { ObligationInstanceRow } from '@duedatehq/ports/obligations'
import { requireTenant } from '../_context'
import { os } from '../_root'

type OpportunityClientInput = Pick<
  ClientRow,
  | 'id'
  | 'name'
  | 'entityType'
  | 'state'
  | 'assigneeName'
  | 'importanceWeight'
  | 'lateFilingCountLast12mo'
  | 'estimatedTaxLiabilityCents'
  | 'equityOwnerCount'
>

type OpportunityObligationInput = Pick<
  ObligationInstanceRow,
  'id' | 'clientId' | 'status' | 'readiness' | 'jurisdiction'
>

const KIND_ORDER: Record<OpportunityKind, number> = {
  retention_check_in: 1,
  scope_review: 2,
  advisory_conversation: 3,
}

const SEVERITY_ORDER: Record<OpportunityPublic['severity'], number> = {
  high: 1,
  medium: 2,
  low: 3,
}

function clientHref(clientId: string): string {
  return `/clients/${encodeURIComponent(clientId)}`
}

function clientShell(client: OpportunityClientInput): OpportunityPublic['client'] {
  return {
    id: client.id,
    name: client.name,
    entityType: client.entityType,
    state: client.state,
    assigneeName: client.assigneeName,
  }
}

function baseAction(clientId: string): OpportunityPublic['primaryAction'] {
  return { label: 'Open client', href: clientHref(clientId) }
}

function countDistinct(values: Array<string | null>): number {
  return new Set(values.filter((value): value is string => Boolean(value))).size
}

export function buildClientOpportunities(input: {
  client: OpportunityClientInput
  obligations: readonly OpportunityObligationInput[]
}): OpportunityPublic[] {
  const { client, obligations } = input
  const openObligations = obligations.filter(
    (obligation) => !['done', 'paid', 'not_applicable'].includes(obligation.status),
  )
  const waitingCount = obligations.filter(
    (obligation) => obligation.status === 'waiting_on_client' || obligation.readiness === 'waiting',
  ).length
  const jurisdictionCount = countDistinct(obligations.map((obligation) => obligation.jurisdiction))
  const opportunities: OpportunityPublic[] = []

  if (waitingCount >= 2 || client.lateFilingCountLast12mo >= 2) {
    opportunities.push({
      id: `retention_check_in:client:${client.id}`,
      kind: 'retention_check_in',
      client: clientShell(client),
      title: 'Relationship check-in candidate',
      // 2026-05-24 (critique P2 — clarify): every row used to print
      // the same string regardless of whether waiting=0 or lateFilings=3.
      // Two different clients showed verbatim identical text and the
      // CPA had to read the evidence chips to tell why each was on the
      // list. Build the summary from the dominant signal so the row
      // earns its trust.
      summary: retentionCheckInSummary(waitingCount, client.lateFilingCountLast12mo),
      timing: waitingCount >= 2 ? 'now' : 'next_30_days',
      severity: waitingCount >= 3 || client.lateFilingCountLast12mo >= 3 ? 'high' : 'medium',
      evidence: [
        { label: 'Waiting items', value: String(waitingCount) },
        { label: 'Late filings in 12 months', value: String(client.lateFilingCountLast12mo) },
      ],
      primaryAction: baseAction(client.id),
    })
  }

  if (openObligations.length >= 4 || jurisdictionCount >= 2) {
    opportunities.push({
      id: `scope_review:client:${client.id}`,
      kind: 'scope_review',
      client: clientShell(client),
      title: 'Review engagement scope before renewal',
      summary: scopeReviewSummary(openObligations.length, jurisdictionCount),
      timing: 'next_quarter',
      severity: openObligations.length >= 6 || jurisdictionCount >= 3 ? 'high' : 'medium',
      evidence: [
        { label: 'Open obligations', value: String(openObligations.length) },
        { label: 'Jurisdictions', value: String(jurisdictionCount) },
      ],
      primaryAction: baseAction(client.id),
    })
  }

  if (
    client.importanceWeight >= 3 ||
    (client.estimatedTaxLiabilityCents !== null && client.estimatedTaxLiabilityCents > 0) ||
    (client.equityOwnerCount !== null && client.equityOwnerCount >= 2)
  ) {
    opportunities.push({
      id: `advisory_conversation:client:${client.id}`,
      kind: 'advisory_conversation',
      client: clientShell(client),
      title: 'Consider an advisory conversation',
      summary: advisoryConversationSummary({
        importanceWeight: client.importanceWeight,
        estimatedTaxLiabilityCents: client.estimatedTaxLiabilityCents,
        equityOwnerCount: client.equityOwnerCount,
      }),
      timing: 'next_quarter',
      severity: client.importanceWeight >= 3 ? 'medium' : 'low',
      evidence: [
        { label: 'Client importance', value: String(client.importanceWeight) },
        {
          label: 'Owner count',
          value: client.equityOwnerCount === null ? 'Not set' : String(client.equityOwnerCount),
        },
      ],
      primaryAction: baseAction(client.id),
    })
  }

  return opportunities
}

// 2026-05-24 (critique P2 — clarify): facts-driven summary builders.
// Each picks the dominant signal that triggered the opportunity so
// the row's prose matches the evidence below it.
function retentionCheckInSummary(waitingCount: number, lateFilingCount: number): string {
  if (waitingCount >= 3) {
    return `${waitingCount} obligations are currently waiting on this client — a partner-level conversation will move things forward faster than another nudge.`
  }
  if (waitingCount >= 2) {
    return `${waitingCount} obligations are waiting on this client. Worth a check-in before the next cycle to surface what's blocking them.`
  }
  if (lateFilingCount >= 3) {
    return `${lateFilingCount} late filings in the last 12 months. A scope or service conversation is more useful than another reminder.`
  }
  // lateFilingCount === 2 by the trigger condition above
  return `${lateFilingCount} late filings in the last 12 months. Surface the pattern before the next cycle.`
}

function scopeReviewSummary(openObligationCount: number, jurisdictionCount: number): string {
  if (openObligationCount >= 6 && jurisdictionCount >= 3) {
    return `${openObligationCount} open obligations across ${jurisdictionCount} jurisdictions. A scope, staffing, or service-package review is worth scheduling.`
  }
  if (jurisdictionCount >= 3) {
    return `Workload spans ${jurisdictionCount} jurisdictions. A scope review is the right conversation before renewal — not a pricing benchmark.`
  }
  if (openObligationCount >= 6) {
    return `${openObligationCount} open obligations on this client. Scope, staffing, or service-package review is the next conversation.`
  }
  // openObligationCount >= 4 or jurisdictionCount >= 2 by trigger
  if (jurisdictionCount >= 2) {
    return `Workload spans ${jurisdictionCount} jurisdictions and ${openObligationCount} open obligations. Worth a scope check before renewal.`
  }
  return `${openObligationCount} open obligations on this client. Worth a scope check before renewal.`
}

// `ADVISORY_GUARDRAIL_TAIL` is appended to every advisory_conversation
// summary regardless of which factors triggered it. The guardrail is
// compliance copy — DueDateHQ must not appear to be generating tax
// strategy or avoidance advice. Tested via the
// "does not generate tax strategies" assertion in index.test.ts.
const ADVISORY_GUARDRAIL_TAIL =
  ' DueDateHQ does not generate tax strategies or avoidance advice here.'

function advisoryConversationSummary(input: {
  importanceWeight: number
  estimatedTaxLiabilityCents: number | null
  equityOwnerCount: number | null
}): string {
  const hasLiability =
    input.estimatedTaxLiabilityCents !== null && input.estimatedTaxLiabilityCents > 0
  const hasOwners = input.equityOwnerCount !== null && input.equityOwnerCount >= 2
  const isImportant = input.importanceWeight >= 3
  let lead: string
  if (isImportant && hasLiability && hasOwners) {
    lead = `High importance, meaningful tax liability, and ${input.equityOwnerCount} owners — plenty of planning context.`
  } else if (isImportant && hasOwners) {
    lead = `High importance with ${input.equityOwnerCount} owners on file — enough planning context to justify a human-led advisory discussion.`
  } else if (hasLiability && hasOwners) {
    lead = `Meaningful tax liability and ${input.equityOwnerCount} owners — enough planning context to justify a human-led advisory discussion.`
  } else if (isImportant) {
    lead = 'Importance-weighted as a top client — worth a human-led advisory discussion.'
  } else if (hasLiability) {
    lead = 'Meaningful tax liability on the books — worth a human-led advisory discussion.'
  } else if (hasOwners) {
    lead = `${input.equityOwnerCount} owners on the equity sheet — enough complexity to justify a human-led advisory discussion.`
  } else {
    lead = 'This client has enough planning context to justify a human-led advisory discussion.'
  }
  return lead + ADVISORY_GUARDRAIL_TAIL
}

export function summarizeOpportunities(
  opportunities: readonly OpportunityPublic[],
): OpportunityListOutput['summary'] {
  return {
    total: opportunities.length,
    advisoryConversationCount: opportunities.filter(
      (opportunity) => opportunity.kind === 'advisory_conversation',
    ).length,
    scopeReviewCount: opportunities.filter((opportunity) => opportunity.kind === 'scope_review')
      .length,
    retentionCheckInCount: opportunities.filter(
      (opportunity) => opportunity.kind === 'retention_check_in',
    ).length,
  }
}

function sortOpportunities(a: OpportunityPublic, b: OpportunityPublic): number {
  return (
    SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
    KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
    a.client.name.localeCompare(b.client.name) ||
    a.id.localeCompare(b.id)
  )
}

const list = os.opportunities.list.handler(async ({ input, context }) => {
  const { scoped } = requireTenant(context)
  const limit = input?.limit ?? 12
  const clients = input?.clientId
    ? (await scoped.clients.findManyByIds([input.clientId])).slice(0, 1)
    : await scoped.clients.listByFirm({ limit: 100 })
  const clientIds = clients.map((client) => client.id)
  const obligationsByClient = new Map(
    await Promise.all(
      clientIds.map(async (clientId) => {
        const obligations = await scoped.obligations.listByClient(clientId)
        return [clientId, obligations] as const
      }),
    ),
  )
  const kindFilter = new Set(input?.kinds ?? [])

  // 2026-05-24 (critique P2): pull the user's active dismissal +
  // snooze set and drop matching opportunities post-compute. The
  // computed opportunity's `id` is the key we shadow against. Done
  // post-compute (instead of pre-filtering clients) so the summary
  // counts agree with the visible queue.
  const dismissalsRepo = scoped.opportunityDismissals
  const activeDismissalKeys = new Set(
    dismissalsRepo
      ? (await dismissalsRepo.listActive(new Date())).map((row) => row.opportunityKey)
      : [],
  )

  const filteredOpportunities = clients
    .flatMap((client) =>
      buildClientOpportunities({
        client,
        obligations: obligationsByClient.get(client.id) ?? [],
      }),
    )
    .filter((opportunity) => kindFilter.size === 0 || kindFilter.has(opportunity.kind))
    .filter((opportunity) => !activeDismissalKeys.has(opportunity.id))
    .toSorted(sortOpportunities)

  return {
    opportunities: filteredOpportunities.slice(0, limit),
    summary: summarizeOpportunities(filteredOpportunities),
  } satisfies OpportunityListOutput
})

// 2026-05-24 (critique P2): server clamps snooze ceiling to 90 days
// out so a typo can't park an opportunity in 2199. Repository UPSERT
// handles repeated calls — calling dismiss after snooze just
// overwrites the row.
const MAX_SNOOZE_MS = 90 * 24 * 60 * 60 * 1000

function clampSnoozeUntil(input: string, now: Date): Date {
  const requested = new Date(input)
  if (Number.isNaN(requested.getTime())) {
    // Defensive — the Zod schema rejects non-datetime strings, but
    // be explicit if someone bypasses it.
    return new Date(now.getTime() + MAX_SNOOZE_MS)
  }
  const minMs = now.getTime() + 60_000 // 1 minute floor
  const maxMs = now.getTime() + MAX_SNOOZE_MS
  return new Date(Math.min(Math.max(requested.getTime(), minMs), maxMs))
}

const dismiss = os.opportunities.dismiss.handler(async ({ input, context }) => {
  const { scoped, userId } = requireTenant(context)
  if (!scoped.opportunityDismissals) {
    throw new Error('Opportunity dismissals repo not wired into this tenant context.')
  }
  const row = await scoped.opportunityDismissals.upsert({
    opportunityKey: input.opportunityKey,
    kind: 'dismissed',
    snoozeUntil: null,
    reason: input.reason ?? null,
    createdByUserId: userId,
  })
  // 2026-05-24 (critique /polish): keep complete audit trail
  // (canonical product responsibility #6). A dismissed opportunity
  // is a user-driven mutation that hides product output from the
  // queue — has to be reviewable later.
  await scoped.audit.write({
    actorId: userId,
    entityType: 'opportunity',
    entityId: row.opportunityKey,
    action: 'opportunity.dismissed',
    ...(input.reason ? { reason: input.reason } : {}),
    after: { kind: row.kind, snoozeUntil: null },
  })
  return {
    opportunityKey: row.opportunityKey,
    kind: row.kind,
    snoozeUntil: row.snoozeUntil ? row.snoozeUntil.toISOString() : null,
  }
})

const snooze = os.opportunities.snooze.handler(async ({ input, context }) => {
  const { scoped, userId } = requireTenant(context)
  if (!scoped.opportunityDismissals) {
    throw new Error('Opportunity dismissals repo not wired into this tenant context.')
  }
  const snoozeUntil = clampSnoozeUntil(input.until, new Date())
  const row = await scoped.opportunityDismissals.upsert({
    opportunityKey: input.opportunityKey,
    kind: 'snoozed',
    snoozeUntil,
    reason: input.reason ?? null,
    createdByUserId: userId,
  })
  await scoped.audit.write({
    actorId: userId,
    entityType: 'opportunity',
    entityId: row.opportunityKey,
    action: 'opportunity.snoozed',
    ...(input.reason ? { reason: input.reason } : {}),
    after: { kind: row.kind, snoozeUntil: snoozeUntil.toISOString() },
  })
  return {
    opportunityKey: row.opportunityKey,
    kind: row.kind,
    snoozeUntil: row.snoozeUntil ? row.snoozeUntil.toISOString() : null,
  }
})

// 2026-05-24 (critique /polish — un-dismiss): undo a prior
// dismiss/snooze. The dismissal row deletion is the mutation; the
// audit log keeps the historical record (so dismiss + restore both
// land on /audit and reviewers can trace the round trip).
//
// Idempotent: restore-on-already-restored returns `restored: false`
// rather than an error — the UI can treat both outcomes as
// "operation complete."
const restore = os.opportunities.restore.handler(async ({ input, context }) => {
  const { scoped, userId } = requireTenant(context)
  if (!scoped.opportunityDismissals) {
    throw new Error('Opportunity dismissals repo not wired into this tenant context.')
  }
  const removed = await scoped.opportunityDismissals.delete(input.opportunityKey)
  if (removed) {
    await scoped.audit.write({
      actorId: userId,
      entityType: 'opportunity',
      entityId: input.opportunityKey,
      action: 'opportunity.restored',
      after: { kind: null, snoozeUntil: null },
    })
  }
  return { opportunityKey: input.opportunityKey, restored: removed }
})

const listDismissed = os.opportunities.listDismissed.handler(async ({ context }) => {
  const { scoped } = requireTenant(context)
  if (!scoped.opportunityDismissals) return { dismissals: [] }
  const rows = await scoped.opportunityDismissals.listActiveDetailed(new Date())
  return {
    dismissals: rows.map((row) => ({
      opportunityKey: row.opportunityKey,
      kind: row.kind,
      snoozeUntil: row.snoozeUntil ? row.snoozeUntil.toISOString() : null,
      reason: row.reason,
      createdAt: row.createdAt.toISOString(),
      createdByUserId: row.createdByUserId,
      createdByName: row.createdByName,
    })),
  }
})

export const opportunitiesHandlers = { list, dismiss, snooze, restore, listDismissed }
