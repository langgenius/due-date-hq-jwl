import { describe, expect, it } from 'vitest'

import {
  clientDetailPath,
  clientIdFromRouteKey,
  clientNameSlug,
  findClientByRouteKey,
  isClientIdRouteKey,
} from './client-url'

describe('client-url', () => {
  it('builds readable client detail paths from names', () => {
    expect(clientNameSlug('Pacific Trust')).toBe('pacific-trust')
    expect(clientNameSlug('Arbor & Vale LLC')).toBe('arbor-and-vale-llc')
    expect(
      clientDetailPath({
        id: '24000000-0000-4000-8000-000000000001',
        name: 'Bright Studio S-Corp',
      }),
    ).toBe('/clients/bright-studio-s-corp-24000000-0000-4000-8000-000000000001')
  })

  it('resolves legacy ids, id-suffixed readable keys, and unique old slugs', () => {
    const clients = [
      { id: '13000000-0000-4000-8000-000000000005', name: 'Pacific Trust' },
      { id: '24000000-0000-4000-8000-000000000001', name: 'Bright Studio S-Corp' },
    ]

    expect(isClientIdRouteKey(clients[0]!.id)).toBe(true)
    expect(clientIdFromRouteKey(`pacific-trust-${clients[0]!.id}`)).toBe(clients[0]!.id)
    expect(findClientByRouteKey(clients, clients[0]!.id)?.name).toBe('Pacific Trust')
    expect(findClientByRouteKey(clients, `pacific-trust-${clients[0]!.id}`)?.name).toBe(
      'Pacific Trust',
    )
    expect(findClientByRouteKey(clients, 'bright-studio-s-corp')?.id).toBe(clients[1]!.id)
  })

  it('does not guess when a legacy readable slug matches multiple clients', () => {
    const clients = [
      { id: '13000000-0000-4000-8000-000000000005', name: 'Pacific Trust' },
      { id: '24000000-0000-4000-8000-000000000001', name: 'Pacific Trust' },
    ]

    expect(findClientByRouteKey(clients, 'pacific-trust')).toBeNull()
    expect(findClientByRouteKey(clients, `pacific-trust-${clients[1]!.id}`)?.id).toBe(
      clients[1]!.id,
    )
  })
})
