import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import type { FirmPublic, PulseAlertPublic, PulseSourceHealth } from '@duedatehq/contracts'

import { orpc } from '@/lib/rpc'
import { seedPulseMock } from './mock-pulse'

describe('seedPulseMock', () => {
  it('does not create a global deadline badge for an unseeded deadline queue', () => {
    const queryClient = new QueryClient()

    seedPulseMock(queryClient)

    const firms = queryClient.getQueryData<FirmPublic[]>(
      orpc.firms.listMine.queryKey({ input: undefined }),
    )

    expect(firms?.[0]?.openObligationCount).toBe(0)
  })

  it('seeds the dashboard alert limit and source families used by the mock alerts', () => {
    const queryClient = new QueryClient()

    seedPulseMock(queryClient)

    const alerts = queryClient.getQueryData<{ alerts: PulseAlertPublic[] }>(
      orpc.pulse.listAlerts.queryKey({ input: { limit: 50 } }),
    )
    const sourceHealth = queryClient.getQueryData<{ sources: PulseSourceHealth[] }>(
      orpc.pulse.listSourceHealth.queryKey({ input: undefined }),
    )

    expect(alerts?.alerts).toHaveLength(5)
    expect(sourceHealth?.sources.map((source) => source.sourceId)).toEqual([
      'irs.disaster',
      'ca.ftb.newsroom',
      'ny.dtf.press',
      'fl.dor.tips',
    ])
  })
})
