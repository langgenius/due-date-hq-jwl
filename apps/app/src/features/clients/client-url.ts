import type { ClientPublic } from '@duedatehq/contracts'

const CLIENT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

export function clientDetailPath(client: Pick<ClientPublic, 'name'>): string {
  return `/clients/${encodeURIComponent(clientNameSlug(client.name))}`
}

export function isClientIdRouteKey(value: string): boolean {
  return CLIENT_ID_RE.test(value)
}

export function findClientByRouteKey(
  clients: readonly Pick<ClientPublic, 'id' | 'name'>[],
  routeKey: string,
): Pick<ClientPublic, 'id' | 'name'> | null {
  if (isClientIdRouteKey(routeKey)) {
    return clients.find((client) => client.id === routeKey) ?? null
  }
  const normalizedRouteKey = clientNameSlug(routeKey)
  return clients.find((client) => clientNameSlug(client.name) === normalizedRouteKey) ?? null
}
