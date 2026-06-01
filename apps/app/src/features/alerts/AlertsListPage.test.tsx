import { act } from 'react'
import type { ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PulseAlertPublic, PulseDetail, PulseSourceHealth } from '@duedatehq/contracts'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

import { AlertsListPage } from './AlertsListPage'

const rpcMocks = vi.hoisted(() => ({
  listAlertsQueryFn: vi.fn(),
  listHistoryQueryFn: vi.fn(),
  listSourceHealthQueryFn: vi.fn(),
  getDetailsBatchQueryFn: vi.fn(),
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
      getDetailsBatch: {
        queryOptions: (args: { input: unknown }) => ({
          queryKey: ['pulse', 'getDetailsBatch', args.input],
          queryFn: rpcMocks.getDetailsBatchQueryFn,
        }),
      },
      getDetail: {
        queryKey: (args: { input: unknown }) => ['pulse', 'getDetail', args.input],
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

const SEED_ALERT_ID = '12121212-1212-4121-8121-121212121212'

function listAlert(): PulseAlertPublic {
  return {
    id: SEED_ALERT_ID,
    pulseId: '34343434-3434-4343-8343-343434343434',
    status: 'matched',
    sourceStatus: 'approved',
    changeKind: 'deadline_shift',
    actionMode: 'due_date_overlay',
    firmImpact: 'matched',
    title: 'Seeded CA relief',
    source: 'CA FTB',
    sourceUrl: 'https://example.com/source',
    summary: 'California posted deadline relief.',
    publishedAt: '2026-05-01T00:00:00.000Z',
    matchedCount: 1,
    needsReviewCount: 0,
    applyReadiness: { status: 'ready', missing: [] },
    duplicateSourceSnapshotCount: 0,
    confidence: 0.9,
    isSample: false,
    jurisdiction: 'CA',
  }
}

function alertDetail(): PulseDetail {
  return {
    alert: listAlert(),
    jurisdiction: 'CA',
    counties: [],
    forms: ['1065'],
    entityTypes: ['llc'],
    originalDueDate: '2026-03-15',
    newDueDate: '2026-10-15',
    effectiveFrom: null,
    effectiveUntil: null,
    affectedRuleIds: [],
    structuredChange: null,
    sourceExcerpt: 'Excerpt.',
    reviewedAt: null,
    applyReadiness: { status: 'ready', missing: [] },
    affectedClients: [
      {
        obligationId: '99999999-9999-4999-8999-999999999999',
        clientId: '88888888-8888-4888-8888-888888888888',
        clientName: 'Seeded Client Co',
        state: 'CA',
        county: null,
        entityType: 'llc',
        taxType: '1065',
        currentDueDate: '2026-03-15',
        newDueDate: '2026-10-15',
        status: 'pending',
        matchStatus: 'eligible',
        reason: null,
      },
    ],
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

  return client
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
  rpcMocks.getDetailsBatchQueryFn.mockReset()
  rpcMocks.listAlertsQueryFn.mockResolvedValue({ alerts: [] })
  rpcMocks.listHistoryQueryFn.mockResolvedValue({ alerts: [] })
  rpcMocks.listSourceHealthQueryFn.mockResolvedValue({ sources: [] })
  rpcMocks.getDetailsBatchQueryFn.mockResolvedValue({ details: [] })
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

describe('AlertsListPage affected-client batching', () => {
  it('renders names from one batch and seeds each getDetail cache for instant drawer open', async () => {
    const detail = alertDetail()
    rpcMocks.listAlertsQueryFn.mockResolvedValue({ alerts: [detail.alert] })
    rpcMocks.getDetailsBatchQueryFn.mockResolvedValue({ details: [detail] })

    const client = await render(<AlertsListPage embedded />)

    // The card shows the affected-client name pulled from the BATCH (no
    // per-card getDetail), and the batch fired exactly once.
    await waitForText('Seeded Client Co')
    expect(rpcMocks.getDetailsBatchQueryFn).toHaveBeenCalledTimes(1)

    // The drawer's per-alert getDetail cache is pre-seeded from the batch, so
    // opening the drawer is a cache hit instead of a re-fetch.
    expect(client.getQueryData(['pulse', 'getDetail', { alertId: SEED_ALERT_ID }])).toEqual(detail)
  })
})
