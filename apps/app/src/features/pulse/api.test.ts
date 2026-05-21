import { describe, expect, it, vi } from 'vitest'

const rpcMocks = vi.hoisted(() => ({
  listAlertsQueryOptions: vi.fn((args: { input: unknown }) => ({
    queryKey: ['pulse', 'listAlerts', args.input],
  })),
}))

vi.mock('@/lib/rpc', () => ({
  orpc: {
    pulse: {
      listAlerts: {
        queryOptions: rpcMocks.listAlertsQueryOptions,
      },
    },
  },
}))

import { usePulseListAlertsQueryOptions } from './api'

describe('usePulseListAlertsQueryOptions', () => {
  it('keeps undefined input so the server default applies', () => {
    usePulseListAlertsQueryOptions()

    expect(rpcMocks.listAlertsQueryOptions).toHaveBeenLastCalledWith({ input: undefined })
  })

  it('clamps oversized limits to the listAlerts contract maximum', () => {
    const options = usePulseListAlertsQueryOptions(50)

    expect(rpcMocks.listAlertsQueryOptions).toHaveBeenLastCalledWith({ input: { limit: 20 } })
    expect(options.queryKey).toEqual(['pulse', 'listAlerts', { limit: 20 }])
  })

  it('normalizes non-positive and fractional limits before building the query', () => {
    usePulseListAlertsQueryOptions(0)
    expect(rpcMocks.listAlertsQueryOptions).toHaveBeenLastCalledWith({ input: { limit: 1 } })

    usePulseListAlertsQueryOptions(2.9)
    expect(rpcMocks.listAlertsQueryOptions).toHaveBeenLastCalledWith({ input: { limit: 2 } })
  })
})
