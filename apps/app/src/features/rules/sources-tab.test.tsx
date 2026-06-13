import { act } from 'react'
import type { ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

import { SourcesTab } from './sources-tab'

const rpcMocks = vi.hoisted(() => ({
  listSourcesQueryFn: vi.fn(),
  listRulesQueryFn: vi.fn(),
  sourceCoverageQueryFn: vi.fn(),
  sourceHealthQueryFn: vi.fn(),
  retrySourceHealthMutationFn: vi.fn(),
  catchUpStillOpenWindowsMutationFn: vi.fn(),
}))

vi.mock('@/lib/rpc', () => ({
  orpc: {
    rules: {
      listSources: {
        queryOptions: () => ({
          queryKey: ['rules', 'listSources'],
          queryFn: rpcMocks.listSourcesQueryFn,
        }),
      },
      listRules: {
        queryOptions: ({ input }: { input: unknown }) => ({
          queryKey: ['rules', 'listRules', input],
          queryFn: rpcMocks.listRulesQueryFn,
        }),
      },
    },
    pulse: {
      listSourceHealth: {
        key: () => ['pulse', 'listSourceHealth'],
        queryOptions: () => ({
          queryKey: ['pulse', 'listSourceHealth'],
          queryFn: rpcMocks.sourceHealthQueryFn,
        }),
      },
      listAlertSourceCoverage: {
        queryOptions: () => ({
          queryKey: ['pulse', 'listAlertSourceCoverage'],
          queryFn: rpcMocks.sourceCoverageQueryFn,
        }),
      },
      catchUpStillOpenWindows: {
        mutationOptions: (options: Record<string, unknown>) => ({
          mutationFn: rpcMocks.catchUpStillOpenWindowsMutationFn,
          ...options,
        }),
      },
      listAlerts: {
        key: () => ['pulse', 'listAlerts'],
      },
      activeCount: {
        key: () => ['pulse', 'activeCount'],
      },
      retrySourceHealth: {
        mutationOptions: (options: Record<string, unknown>) => ({
          mutationFn: rpcMocks.retrySourceHealthMutationFn,
          ...options,
        }),
      },
    },
  },
}))

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

async function render(children: ReactNode) {
  container = document.createElement('div')
  document.body.append(container)
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  root = createRoot(container)

  await act(async () => {
    root?.render(
      <QueryClientProvider client={queryClient}>
        <AppI18nProvider>
          <MemoryRouter>{children}</MemoryRouter>
        </AppI18nProvider>
      </QueryClientProvider>,
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

async function waitForTextToDisappear(text: string, attempts = 100): Promise<void> {
  if (!document.body.textContent?.includes(text)) return
  if (attempts > 0) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
    return waitForTextToDisappear(text, attempts - 1)
  }
  throw new Error(`Expected text to disappear: ${text}; body=${document.body.textContent ?? ''}`)
}

beforeEach(() => {
  bootstrapI18n()
  rpcMocks.listSourcesQueryFn.mockReset()
  rpcMocks.listSourcesQueryFn.mockResolvedValue([])
  rpcMocks.listRulesQueryFn.mockReset()
  rpcMocks.listRulesQueryFn.mockResolvedValue([])
  rpcMocks.sourceCoverageQueryFn.mockReset()
  rpcMocks.sourceCoverageQueryFn.mockResolvedValue({ coverage: [] })
  rpcMocks.sourceHealthQueryFn.mockReset()
  rpcMocks.retrySourceHealthMutationFn.mockReset()
  rpcMocks.catchUpStillOpenWindowsMutationFn.mockReset()
  rpcMocks.catchUpStillOpenWindowsMutationFn.mockResolvedValue({ materializedCount: 0 })
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

describe('SourcesTab source health retry', () => {
  it('removes the needs-attention banner when retry returns a healthy source list', async () => {
    rpcMocks.sourceHealthQueryFn.mockResolvedValue({
      sources: [
        {
          sourceId: 'tx.cpa.rss',
          label: 'TX Comptroller News',
          tier: 'T1',
          jurisdiction: 'TX',
          purpose: 'rule_source_watch',
          primaryWeb: true,
          relatedSourceIds: [],
          enabled: true,
          healthStatus: 'degraded',
          lastCheckedAt: '2026-05-01T09:20:00.000Z',
          lastSuccessAt: '2026-05-01T07:20:00.000Z',
          nextCheckAt: '2026-05-01T10:20:00.000Z',
          consecutiveFailures: 1,
          lastError: 'RSS returned 304 after one retry.',
        },
      ],
    })
    rpcMocks.retrySourceHealthMutationFn.mockResolvedValue({
      sources: [
        {
          sourceId: 'tx.cpa.rss',
          label: 'TX Comptroller News',
          tier: 'T1',
          jurisdiction: 'TX',
          purpose: 'rule_source_watch',
          primaryWeb: true,
          relatedSourceIds: [],
          enabled: true,
          healthStatus: 'healthy',
          lastCheckedAt: '2026-06-13T03:30:00.000Z',
          lastSuccessAt: '2026-06-13T03:30:00.000Z',
          nextCheckAt: '2026-06-13T04:30:00.000Z',
          consecutiveFailures: 0,
          lastError: null,
        },
      ],
    })

    await render(<SourcesTab />)
    await waitForText('Needs attention')
    await waitForText('TX Comptroller News')

    const retryButton = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Re-check now'),
    )
    expect(retryButton).toBeDefined()

    await act(async () => {
      retryButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(rpcMocks.retrySourceHealthMutationFn.mock.calls[0]?.[0]).toEqual({
      sourceId: 'tx.cpa.rss',
    })
    await waitForTextToDisappear('Needs attention')
  })
})
