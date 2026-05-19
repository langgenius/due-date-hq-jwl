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
      summary:
        'Repeated waiting or late-filing signals make this client worth a partner-level service conversation before the next cycle.',
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
      summary:
        'The current workload footprint suggests a scope, staffing, or service-package review. This is a conversation cue, not a pricing benchmark.',
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
      summary:
        'This client has enough planning context to justify a human-led advisory discussion. DueDateHQ does not generate tax strategies or avoidance advice here.',
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

  const filteredOpportunities = clients
    .flatMap((client) =>
      buildClientOpportunities({
        client,
        obligations: obligationsByClient.get(client.id) ?? [],
      }),
    )
    .filter((opportunity) => kindFilter.size === 0 || kindFilter.has(opportunity.kind))
    .toSorted(sortOpportunities)

  return {
    opportunities: filteredOpportunities.slice(0, limit),
    summary: summarizeOpportunities(filteredOpportunities),
  } satisfies OpportunityListOutput
})

export const opportunitiesHandlers = { list }
