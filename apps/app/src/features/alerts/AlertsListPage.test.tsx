import { act } from 'react'
import type { ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PulseSourceHealth } from '@duedatehq/contracts'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

import { AlertsListPage } from './AlertsListPage'

const rpcMocks = vi.hoisted(() => ({
  listAlertsQueryFn: vi.fn(),
  listHistoryQueryFn: vi.fn(),
  listSourceHealthQueryFn: vi.fn(),
}))

vi.mock('@/lib/rpc', () => ({
  orpc: {
    audit: { key: () => ['audit'] },
    dashboard: { load: { key: () => ['dashboard', 'load'] } },
    obligations: { list: { key: () => ['obligations', 'list'] } },
    pulse: {
      key: () => ['pulse'],
      listAlerts: {
        queryOptions: (args: { input: unknown }) => ({
          queryKey: ['pulse', 'listAlerts', args.input],
          queryFn: rpcMocks.listAlertsQueryFn,
        }),
      },
      listHistory: {
        queryOptions: (args: { input: unknown }) => ({
          queryKey: ['pulse', 'listHistory', args.input],
          queryFn: rpcMocks.listHistoryQueryFn,
        }),
      },
      listSourceHealth: {
        queryOptions: () => ({
          queryKey: ['pulse', 'listSourceHealth'],
          queryFn: rpcMocks.listSourceHealthQueryFn,
        }),
      },
    },
  },
}))

vi.mock('./DrawerProvider', () => ({
  useAlertDrawer: () => ({ alertId: null, openDrawer: vi.fn(), closeDrawer: vi.fn() }),
}))

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

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

async function render(children: ReactNode, initialEntry = '/alerts') {
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
  rpcMocks.listAlertsQueryFn.mockReset()
  rpcMocks.listHistoryQueryFn.mockReset()
  rpcMocks.listSourceHealthQueryFn.mockReset()
  rpcMocks.listAlertsQueryFn.mockResolvedValue({ alerts: [] })
  rpcMocks.listHistoryQueryFn.mockResolvedValue({ alerts: [] })
  rpcMocks.listSourceHealthQueryFn.mockResolvedValue({ sources: [] })
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

describe('AlertsListPage source health display', () => {
  it('uses the active alert query on the active alerts surface', async () => {
    await render(<AlertsListPage embedded />)

    await waitForText('All clear')
    expect(rpcMocks.listAlertsQueryFn).toHaveBeenCalled()
    expect(rpcMocks.listHistoryQueryFn).not.toHaveBeenCalled()
  })

  it('uses the handled history query on the history surface', async () => {
    await render(<AlertsListPage embedded historyMode />)

    await waitForText('All clear')
    expect(rpcMocks.listHistoryQueryFn).toHaveBeenCalled()
    expect(rpcMocks.listAlertsQueryFn).not.toHaveBeenCalled()
  })

  it('keeps legacy degraded and failing source health out of the CPA Pulse surface', async () => {
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

    await render(<AlertsListPage embedded />)

    await waitForText('All clear')
    expect(document.body.textContent).not.toContain('Pulse source needs attention')
    expect(document.body.textContent).not.toContain('IRS Disaster Relief')
    expect(document.body.textContent).not.toContain('Review sources')
    expect(document.body.textContent).not.toContain('Pulse source checks degraded')
    expect(document.body.textContent).not.toContain('FEMA Declarations')
  })
})
