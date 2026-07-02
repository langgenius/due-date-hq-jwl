import { parseAsArrayOf, parseAsString, parseAsStringLiteral } from 'nuqs'

import type { ClientFilters } from './client-readiness'
import {
  CLIENT_ENTITY_TYPES,
  CLIENT_ALERT_FILTERS,
  CLIENT_READINESS_FILTERS,
  CLIENT_SOURCE_FILTERS,
  STATE_FILTER_ALL,
  isClientEntityType,
  isClientAlertFilter,
  isClientReadinessStatus,
  isClientSourceType,
} from './client-readiness'

const REPLACE_HISTORY_OPTIONS = { history: 'replace' } as const
const MAX_FILTER_VALUE_LENGTH = 120

export const CLIENT_LIST_LIMIT = 500

export const clientsSearchParamsParsers = {
  q: parseAsString.withDefault('').withOptions(REPLACE_HISTORY_OPTIONS),
  clients: parseAsArrayOf(parseAsString).withDefault([]).withOptions(REPLACE_HISTORY_OPTIONS),
  entity: parseAsArrayOf(parseAsStringLiteral(CLIENT_ENTITY_TYPES))
    .withDefault([])
    .withOptions(REPLACE_HISTORY_OPTIONS),
  state: parseAsArrayOf(parseAsString).withDefault([]).withOptions(REPLACE_HISTORY_OPTIONS),
  readiness: parseAsArrayOf(parseAsStringLiteral(CLIENT_READINESS_FILTERS))
    .withDefault([])
    .withOptions(REPLACE_HISTORY_OPTIONS),
  source: parseAsArrayOf(parseAsStringLiteral(CLIENT_SOURCE_FILTERS))
    .withDefault([])
    .withOptions(REPLACE_HISTORY_OPTIONS),
  pulse: parseAsArrayOf(parseAsStringLiteral(CLIENT_ALERT_FILTERS))
    .withDefault([])
    .withOptions(REPLACE_HISTORY_OPTIONS),
  owner: parseAsArrayOf(parseAsString).withDefault([]).withOptions(REPLACE_HISTORY_OPTIONS),
  importHistory: parseAsStringLiteral(['open']).withOptions(REPLACE_HISTORY_OPTIONS),
  // Archived-clients drawer (`?archived=open`) — deep-linkable like
  // importHistory so the archive toast's "View archived" action can land
  // straight on the drawer.
  archived: parseAsStringLiteral(['open']).withOptions(REPLACE_HISTORY_OPTIONS),
} as const

export function normalizeClientsQueryFilters(input: {
  q?: string
  clients: readonly string[]
  entity: readonly string[]
  state: readonly string[]
  readiness: readonly string[]
  source: readonly string[]
  owner: readonly string[]
  pulse: readonly string[]
}): ClientFilters {
  return {
    // `q` URL param flows through normalize → `filters.search` →
    // filterClients haystack match.
    search: input.q?.trim() ?? '',
    clientFilters: cleanStringFilters(input.clients),
    entityFilters: input.entity.filter(isClientEntityType),
    stateFilters: normalizeClientStateFilters(input.state),
    readinessFilters: input.readiness.filter(isClientReadinessStatus),
    sourceFilters: input.source.filter(isClientSourceType),
    ownerFilters: cleanStringFilters(input.owner),
    alertFilters: input.pulse.filter(isClientAlertFilter),
  }
}

export function normalizeClientIdFilters(values: readonly string[]): string[] {
  return cleanStringFilters(values)
}

export function normalizeClientStateFilters(values: readonly string[]): string[] {
  const allStateFilter = STATE_FILTER_ALL.toUpperCase()
  return cleanStringFilters(values)
    .map((state) => state.toUpperCase())
    .filter((state) => state !== allStateFilter)
}

export function normalizeClientOwnerFilters(values: readonly string[]): string[] {
  return cleanStringFilters(values)
}

export function nullableQueryArray<T>(values: readonly T[]): T[] | null {
  return values.length > 0 ? [...values] : null
}

function cleanStringFilters(values: readonly string[]): string[] {
  return [
    ...new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0 && value.length <= MAX_FILTER_VALUE_LENGTH),
    ),
  ]
}
