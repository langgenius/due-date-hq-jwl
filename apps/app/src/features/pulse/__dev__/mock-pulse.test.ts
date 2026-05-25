import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import type { FirmPublic } from '@duedatehq/contracts'

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
})
