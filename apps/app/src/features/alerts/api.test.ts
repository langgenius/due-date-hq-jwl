import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const rpcMocks = vi.hoisted(() => ({
  listAlertsQueryOptions: vi.fn((args: { input: unknown }) => ({
    queryKey: ['pulse', 'listAlerts', args.input],
  })),
}))

vi.mock('@/lib/rpc', () => ({
  orpc: {
    audit: { key: () => ['audit'] },
    calendar: { key: () => ['calendar'] },
    dashboard: { load: { key: () => ['dashboard', 'load'] } },
    obligations: { key: () => ['obligations'] },
    reminders: { key: () => ['reminders'] },
    workload: { key: () => ['workload'] },
    pulse: {
      key: () => ['pulse'],
      activeCount: { key: () => ['pulse', 'activeCount'] },
      getDetail: { key: () => ['pulse', 'getDetail'] },
      listHistory: { key: () => ['pulse', 'listHistory'] },
      listPriorityQueue: { key: () => ['pulse', 'listPriorityQueue'] },
      listAlerts: {
        key: () => ['pulse', 'listAlerts'],
        queryOptions: rpcMocks.listAlertsQueryOptions,
      },
    },
  },
}))

import {
  buildAlertsHistoryInfiniteInput,
  buildAlertsListInfiniteInput,
  useAlertsInvalidation,
  useAlertsListQueryOptions,
} from './api'

describe('useAlertsListQueryOptions', () => {
  it('keeps undefined input so the server default applies', () => {
    useAlertsListQueryOptions()

    expect(rpcMocks.listAlertsQueryOptions).toHaveBeenLastCalledWith({ input: undefined })
  })

  it('allows the dashboard hero limit now supported by the contract', () => {
    const options = useAlertsListQueryOptions(50)

    expect(rpcMocks.listAlertsQueryOptions).toHaveBeenLastCalledWith({ input: { limit: 50 } })
    expect(options.queryKey).toEqual(['pulse', 'listAlerts', { limit: 50 }])
  })

  it('clamps oversized limits to the listAlerts contract maximum', () => {
    useAlertsListQueryOptions(51)

    expect(rpcMocks.listAlertsQueryOptions).toHaveBeenLastCalledWith({ input: { limit: 50 } })
  })

  it('normalizes non-positive and fractional limits before building the query', () => {
    useAlertsListQueryOptions(0)
    expect(rpcMocks.listAlertsQueryOptions).toHaveBeenLastCalledWith({ input: { limit: 1 } })

    useAlertsListQueryOptions(2.9)
    expect(rpcMocks.listAlertsQueryOptions).toHaveBeenLastCalledWith({ input: { limit: 2 } })
  })
})

describe('alerts infinite-query input builders', () => {
  it('omits the cursor on the first page at the contract-max page size', () => {
    expect(buildAlertsListInfiniteInput(null)).toEqual({ limit: 50 })
    expect(buildAlertsHistoryInfiniteInput(null)).toEqual({ limit: 50 })
  })

  it('threads a cursor into subsequent pages', () => {
    expect(buildAlertsListInfiniteInput('cursor-2')).toEqual({ limit: 50, cursor: 'cursor-2' })
    expect(buildAlertsHistoryInfiniteInput('cursor-2')).toEqual({ limit: 50, cursor: 'cursor-2' })
  })
})

describe('useAlertsInvalidation', () => {
  it('stale-marks the pulse namespace without refetching and actively refetches only list/count/queue/detail surfaces', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const spy = vi.spyOn(client, 'invalidateQueries')
    let invalidate: (() => void) | null = null

    function Probe() {
      invalidate = useAlertsInvalidation()
      return null
    }

    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    act(() => {
      root.render(createElement(QueryClientProvider, { client }, createElement(Probe)))
    })
    act(() => {
      invalidate?.()
    })

    // The whole pulse namespace is marked stale but NOT refetched — a blanket
    // active invalidation re-fired every mounted pulse query (list, source
    // health, batch, every seeded per-row detail) on each mutation.
    expect(spy).toHaveBeenCalledWith({ queryKey: ['pulse'], refetchType: 'none' })
    expect(spy).not.toHaveBeenCalledWith({ queryKey: ['pulse'] })

    for (const key of [
      ['pulse', 'listAlerts'],
      ['pulse', 'listHistory'],
      ['pulse', 'activeCount'],
      ['pulse', 'listPriorityQueue'],
      ['pulse', 'getDetail'],
      ['dashboard', 'load'],
      ['obligations'],
      ['calendar'],
      ['workload'],
      ['reminders'],
      ['audit'],
    ]) {
      expect(spy).toHaveBeenCalledWith({ queryKey: key })
    }

    act(() => {
      root.unmount()
    })
    container.remove()
  })
})
