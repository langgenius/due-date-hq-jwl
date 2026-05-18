import { act } from 'react'
import type { ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SMART_PRIORITY_DEFAULT_PROFILE,
  type FirmPublic,
  type PulseSourceHealth,
} from '@duedatehq/contracts'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

import { PulseChangesTab } from './AlertsListPage'

const rpcMocks = vi.hoisted(() => ({
  listHistoryQueryFn: vi.fn(),
  listMineQueryFn: vi.fn(),
  listSourceHealthQueryFn: vi.fn(),
  retrySourceHealthMutationFn: vi.fn(),
}))
const nuqsMocks = vi.hoisted(() => ({
  setSourceReviewParam: vi.fn(),
  sourceReviewParam: '1' as '1' | null,
}))

vi.mock('nuqs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('nuqs')>()
  return {
    ...actual,
    useQueryState: () => [nuqsMocks.sourceReviewParam, nuqsMocks.setSourceReviewParam],
  }
})

vi.mock('@/lib/rpc', () => ({
  orpc: {
    audit: { key: () => ['audit'] },
    dashboard: { load: { key: () => ['dashboard', 'load'] } },
    obligations: { list: { key: () => ['obligations', 'list'] } },
    firms: {
      listMine: {
        queryOptions: () => ({
          queryKey: ['firms', 'listMine'],
          queryFn: rpcMocks.listMineQueryFn,
        }),
      },
    },
    pulse: {
      key: () => ['pulse'],
      listHistory: {
        queryOptions: () => ({
          queryKey: ['pulse', 'listHistory'],
          queryFn: rpcMocks.listHistoryQueryFn,
        }),
      },
      listSourceHealth: {
        queryOptions: () => ({
          queryKey: ['pulse', 'listSourceHealth'],
          queryFn: rpcMocks.listSourceHealthQueryFn,
        }),
      },
      retrySourceHealth: {
        mutationOptions: (options: Record<string, unknown>) => ({
          ...options,
          mutationFn: rpcMocks.retrySourceHealthMutationFn,
        }),
      },
    },
  },
}))

vi.mock('./DrawerProvider', () => ({
  usePulseDrawer: () => ({ openDrawer: vi.fn() }),
}))

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

function firm(overrides: Partial<FirmPublic> = {}): FirmPublic {
  return {
    id: 'firm_1',
    name: 'Test Firm',
    slug: 'test-firm',
    plan: 'team',
    seatLimit: 5,
    timezone: 'America/New_York',
    status: 'active',
    role: 'owner',
    ownerUserId: 'user_1',
    coordinatorCanSeeDollars: false,
    smartPriorityProfile: SMART_PRIORITY_DEFAULT_PROFILE,
    openObligationCount: 0,
    isCurrent: true,
    createdAt: '2026-05-03T00:00:00.000Z',
    updatedAt: '2026-05-03T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  }
}

function source(overrides: Partial<PulseSourceHealth> = {}): PulseSourceHealth {
  return {
    sourceId: 'irs.disaster',
    label: 'IRS Disaster Relief',
    tier: 'T1',
    jurisdiction: 'federal',
    enabled: true,
    healthStatus: 'degraded',
    lastCheckedAt: '2026-05-06T10:00:00.000Z',
    lastSuccessAt: '2026-05-05T10:00:00.000Z',
    nextCheckAt: '2026-05-06T11:00:00.000Z',
    consecutiveFailures: 2,
    lastError: 'selector drift',
    ...overrides,
  }
}

async function render(children: ReactNode, initialEntry = '/rules/pulse') {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  await act(async () => {
    root?.render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <QueryClientProvider client={client}>
          <AppI18nProvider>{children}</AppI18nProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    )
  })
}

async function waitForText(text: string, attempts = 100): Promise<void> {
  if (document.body.textContent?.includes(text)) return
  if (attempts > 0) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
    return waitForText(text, attempts - 1)
  }
  throw new Error(`Expected text not found: ${text}; body=${document.body.textContent ?? ''}`)
}

beforeEach(() => {
  bootstrapI18n()
  rpcMocks.listHistoryQueryFn.mockReset()
  rpcMocks.listMineQueryFn.mockReset()
  rpcMocks.listSourceHealthQueryFn.mockReset()
  rpcMocks.retrySourceHealthMutationFn.mockReset()
  nuqsMocks.setSourceReviewParam.mockReset()
  nuqsMocks.sourceReviewParam = '1'
  rpcMocks.listHistoryQueryFn.mockResolvedValue({ alerts: [] })
  rpcMocks.retrySourceHealthMutationFn.mockResolvedValue({ sources: [] })
})

afterEach(() => {
  if (root) {
    act(() => root?.unmount())
  }
  container?.remove()
  root = null
  container = null
  document.body.replaceChildren()
  activateLocale('en')
})

describe('PulseChangesTab source health review', () => {
  it('opens a T1 source review table for owner and manager roles', async () => {
    rpcMocks.listMineQueryFn.mockResolvedValue([firm({ role: 'owner' })])
    rpcMocks.listSourceHealthQueryFn.mockResolvedValue({
      sources: [
        source(),
        source({
          sourceId: 'fema.declarations',
          label: 'FEMA Declarations',
          tier: 'T2',
          healthStatus: 'failing',
        }),
      ],
    })

    await render(<PulseChangesTab embedded />, '/rules/pulse?sourceReview=1')

    await waitForText('Pulse source needs attention')
    expect(document.body.textContent).toContain('IRS Disaster Relief')
    expect(document.body.textContent).toContain('Last success')
    expect(document.body.textContent).toContain('Failures')
    expect(document.body.textContent).toContain('Check')
    expect(document.body.textContent).toContain('No client-matching Pulse changes right now.')
    expect(document.body.textContent).not.toContain('All clear')
    expect(document.body.textContent).not.toContain('FEMA Declarations')
  })

  it('uses passive degraded copy for non-manager roles', async () => {
    rpcMocks.listMineQueryFn.mockResolvedValue([firm({ role: 'preparer' })])
    rpcMocks.listSourceHealthQueryFn.mockResolvedValue({
      sources: [source(), source({ sourceId: 'fema.declarations', label: 'FEMA Declarations' })],
    })

    await render(<PulseChangesTab embedded />, '/rules/pulse?sourceReview=1')

    await waitForText('Pulse source checks degraded · Monitoring continues')
    expect(document.body.textContent).toContain('No client-matching Pulse changes right now.')
    expect(document.body.textContent).not.toContain('Pulse source needs attention')
    expect(document.body.textContent).not.toContain('IRS Disaster Relief')
    expect(document.body.textContent).not.toContain('Review sources')
    expect(document.body.textContent).not.toContain('All clear')
  })
})
