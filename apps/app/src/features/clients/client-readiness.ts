import type { ClientCreateInput, ClientPublic } from '@duedatehq/contracts'

export const CLIENT_ENTITY_TYPES = [
  'llc',
  's_corp',
  'partnership',
  'c_corp',
  'sole_prop',
  'trust',
  'individual',
  'other',
] as const satisfies readonly ClientCreateInput['entityType'][]

export const ALL_ENTITIES = 'all'
export const STATE_FILTER_ALL = 'all'
export const CLIENT_READINESS_FILTERS = ['ready', 'needs_facts'] as const
export const CLIENT_SOURCE_FILTERS = ['imported', 'manual'] as const
export const CLIENT_ALERT_FILTERS = ['affected', 'clear'] as const
export const CLIENT_UNASSIGNED_OWNER_FILTER = '__unassigned__'

export type ClientEntityType = ClientCreateInput['entityType']
export type ClientSourceType = 'imported' | 'manual'
export type ClientReadinessStatus = 'ready' | 'needs_facts'
export type ClientAlertFilter = (typeof CLIENT_ALERT_FILTERS)[number]
type RequiredClientFact = 'state' | 'entityType'
type OptionalClientFact = 'ein' | 'owner' | 'email'

export type ClientReadiness = {
  status: ClientReadinessStatus
  missingRequiredFacts: RequiredClientFact[]
  optionalGaps: OptionalClientFact[]
}

type ClientFactsSummary = {
  total: number
  readyForRules: number
  needsFacts: number
  imported: number
  manual: number
  assigned: number
  statesCovered: number
}

export type ClientFactsModel = {
  readinessById: Map<string, ClientReadiness>
  stateOptions: string[]
  summary: ClientFactsSummary
}

export type ClientFilters = {
  search: string
  clientFilters: readonly string[]
  entityFilters: readonly ClientEntityType[]
  stateFilters: readonly string[]
  readinessFilters: readonly ClientReadinessStatus[]
  sourceFilters: readonly ClientSourceType[]
  ownerFilters: readonly string[]
  alertFilters: readonly ClientAlertFilter[]
}

type FilterClientsContext = {
  affectedClientIds?: ReadonlySet<string>
}

export function isClientEntityType(value: string): value is ClientEntityType {
  return CLIENT_ENTITY_TYPES.some((entityType) => entityType === value)
}

export function isClientReadinessStatus(value: string): value is ClientReadinessStatus {
  return CLIENT_READINESS_FILTERS.some((status) => status === value)
}

export function isClientSourceType(value: string): value is ClientSourceType {
  return CLIENT_SOURCE_FILTERS.some((source) => source === value)
}

export function isClientAlertFilter(value: string): value is ClientAlertFilter {
  return CLIENT_ALERT_FILTERS.some((option) => option === value)
}

export function getClientSourceType(client: ClientPublic): ClientSourceType {
  return client.migrationBatchId ? 'imported' : 'manual'
}

export function getClientFilingStates(client: ClientPublic): string[] {
  const profileStates = client.filingProfiles.map((profile) => profile.state)
  return Array.from(
    new Set([...profileStates, client.state].filter((state): state is string => Boolean(state))),
  )
}

export function getClientReadiness(client: ClientPublic): ClientReadiness {
  const missingRequiredFacts: RequiredClientFact[] = []
  const optionalGaps: OptionalClientFact[] = []

  if (getClientFilingStates(client).length === 0) missingRequiredFacts.push('state')
  if (!client.entityType) missingRequiredFacts.push('entityType')
  if (!client.ein) optionalGaps.push('ein')
  if (!client.assigneeName) optionalGaps.push('owner')
  if (!client.email) optionalGaps.push('email')

  return {
    status: missingRequiredFacts.length > 0 ? 'needs_facts' : 'ready',
    missingRequiredFacts,
    optionalGaps,
  }
}

export function buildClientFactsModel(clients: ClientPublic[]): ClientFactsModel {
  const readinessById = new Map<string, ClientReadiness>()
  const states = new Set<string>()
  const summary: ClientFactsSummary = {
    total: clients.length,
    readyForRules: 0,
    needsFacts: 0,
    imported: 0,
    manual: 0,
    assigned: 0,
    statesCovered: 0,
  }

  for (const client of clients) {
    const readiness = getClientReadiness(client)
    readinessById.set(client.id, readiness)

    if (readiness.status === 'ready') summary.readyForRules += 1
    else summary.needsFacts += 1

    if (client.migrationBatchId) summary.imported += 1
    else summary.manual += 1

    if (client.assigneeName) summary.assigned += 1
    for (const state of getClientFilingStates(client)) states.add(state)
  }

  const stateOptions = Array.from(states).toSorted()
  summary.statesCovered = stateOptions.length

  return {
    readinessById,
    stateOptions,
    summary,
  }
}

function getClientSearchHaystack(client: ClientPublic): string {
  return [
    client.name,
    client.ein,
    client.state,
    client.county,
    client.externalClientId,
    client.addressLine1,
    client.city,
    client.postalCode,
    client.primaryPhone,
    client.sourceStatus,
    ...client.filingProfiles.flatMap((profile) => [
      profile.state,
      ...profile.counties,
      ...profile.taxTypes,
      profile.source,
    ]),
    client.entityType,
    client.email,
    client.assigneeName,
    getClientSourceType(client),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function filterClients(
  clients: ClientPublic[],
  filters: ClientFilters,
  context: FilterClientsContext = {},
): ClientPublic[] {
  const normalizedSearch = filters.search.trim().toLowerCase()
  const clientFilterSet = new Set(filters.clientFilters)
  const entityFilterSet = new Set(filters.entityFilters)
  const stateFilterSet = new Set(
    filters.stateFilters
      .map((state) => state.trim().toUpperCase())
      .filter((state) => state.length > 0 && state !== STATE_FILTER_ALL),
  )
  const readinessFilterSet = new Set(filters.readinessFilters)
  const sourceFilterSet = new Set(filters.sourceFilters)
  const ownerFilterSet = new Set(filters.ownerFilters.filter((owner) => owner.trim().length > 0))
  const alertFilterSet = new Set(filters.alertFilters)
  const affectedClientIds = context.affectedClientIds

  return clients.filter((client) => {
    if (clientFilterSet.size > 0 && !clientFilterSet.has(client.id)) {
      return false
    }
    if (entityFilterSet.size > 0 && !entityFilterSet.has(client.entityType)) {
      return false
    }
    if (
      stateFilterSet.size > 0 &&
      !getClientFilingStates(client).some((state) => stateFilterSet.has(state))
    ) {
      return false
    }
    if (readinessFilterSet.size > 0 && !readinessFilterSet.has(getClientReadiness(client).status)) {
      return false
    }
    if (sourceFilterSet.size > 0 && !sourceFilterSet.has(getClientSourceType(client))) {
      return false
    }
    if (ownerFilterSet.size > 0) {
      const ownerValue = client.assigneeName ?? CLIENT_UNASSIGNED_OWNER_FILTER
      if (!ownerFilterSet.has(ownerValue)) return false
    }
    if (alertFilterSet.size > 0) {
      const isAffected = affectedClientIds?.has(client.id) ?? false
      const matchesAffected = alertFilterSet.has('affected') && isAffected
      const matchesClear = alertFilterSet.has('clear') && !isAffected
      if (!matchesAffected && !matchesClear) return false
    }
    if (normalizedSearch && !getClientSearchHaystack(client).includes(normalizedSearch)) {
      return false
    }
    return true
  })
}
