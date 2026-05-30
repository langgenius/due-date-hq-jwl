import { describe, expect, it } from 'vitest'

import {
  normalizeClientIdFilters,
  normalizeClientOwnerFilters,
  normalizeClientStateFilters,
  normalizeClientsQueryFilters,
  nullableQueryArray,
} from './client-query-state'

describe('client query state', () => {
  it('normalizes shared client route filters before they reach the workspace model', () => {
    expect(
      normalizeClientsQueryFilters({
        clients: [' client_1 ', 'client_1', '', 'x'.repeat(121)],
        entity: ['llc', 'invalid'],
        state: [' ca ', 'all', 'ny'],
        readiness: ['ready', 'done'],
        source: ['imported', 'synced'],
        owner: [' Casey ', 'Casey', ''],
        pulse: ['affected', 'unknown'],
      }),
    ).toEqual({
      search: '',
      clientFilters: ['client_1'],
      entityFilters: ['llc'],
      stateFilters: ['CA', 'NY'],
      readinessFilters: ['ready'],
      sourceFilters: ['imported'],
      ownerFilters: ['Casey'],
      alertFilters: ['affected'],
    })
  })

  it('keeps individual URL filter normalizers consistent with the aggregate contract', () => {
    expect(normalizeClientIdFilters([' a ', 'a', 'b'])).toEqual(['a', 'b'])
    expect(normalizeClientStateFilters(['ca', 'ALL', ' tx '])).toEqual(['CA', 'TX'])
    expect(normalizeClientOwnerFilters(['', 'Maya ', 'Maya'])).toEqual(['Maya'])
  })

  it('maps empty arrays to nullable nuqs patches', () => {
    expect(nullableQueryArray([])).toBeNull()
    expect(nullableQueryArray(['client_1'])).toEqual(['client_1'])
  })
})
