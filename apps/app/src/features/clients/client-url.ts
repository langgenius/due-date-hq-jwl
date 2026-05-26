import type { ClientPublic } from '@duedatehq/contracts'

const CLIENT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CLIENT_ID_SUFFIX_RE =
  /(?:^|-)([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

export function clientNameSlug(name: string): string {
  const slug = name
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'client'
}

export function clientRouteKey(client: Pick<ClientPublic, 'id' | 'name'>): string {
  return `${clientNameSlug(client.name)}-${client.id}`
}

export function clientDetailPath(client: Pick<ClientPublic, 'id' | 'name'>): string {
  return `/clients/${encodeURIComponent(clientRouteKey(client))}`
}

export function isClientIdRouteKey(value: string): boolean {
  return CLIENT_ID_RE.test(value)
}

export function clientIdFromRouteKey(value: string): string | null {
  if (isClientIdRouteKey(value)) return value
  return value.match(CLIENT_ID_SUFFIX_RE)?.[1] ?? null
}

export function findClientByRouteKey(
  clients: readonly Pick<ClientPublic, 'id' | 'name'>[],
  routeKey: string,
): Pick<ClientPublic, 'id' | 'name'> | null {
  const routeClientId = clientIdFromRouteKey(routeKey)
  if (routeClientId) return clients.find((client) => client.id === routeClientId) ?? null

  const normalizedRouteKey = clientNameSlug(routeKey)
  const matches = clients.filter((client) => clientNameSlug(client.name) === normalizedRouteKey)
  return matches.length === 1 ? matches[0]! : null
}
