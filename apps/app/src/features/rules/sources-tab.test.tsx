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

beforeEach(() => {
  bootstrapI18n()
  rpcMocks.listSourcesQueryFn.mockReset()
  rpcMocks.listSourcesQueryFn.mockResolvedValue([])
  rpcMocks.listRulesQueryFn.mockReset()
  rpcMocks.listRulesQueryFn.mockResolvedValue([])
  rpcMocks.sourceCoverageQueryFn.mockReset()
  rpcMocks.sourceCoverageQueryFn.mockResolvedValue({ coverage: [] })
  rpcMocks.sourceHealthQueryFn.mockReset()
  rpcMocks.sourceHealthQueryFn.mockResolvedValue({ sources: [] })
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

describe('SourcesTab (positive coverage only)', () => {
  it('never surfaces source failures to the customer — no needs-attention banner or re-check, even for a failing source', async () => {
    // Source health is an internal/dev concern: a failing watcher must NOT bleed
    // into the customer-facing Sources view as a red banner or a re-check lever.
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
          healthStatus: 'failing',
          lastCheckedAt: '2026-05-01T09:20:00.000Z',
          lastSuccessAt: '2026-05-01T07:20:00.000Z',
          nextCheckAt: '2026-05-01T10:20:00.000Z',
          consecutiveFailures: 14,
          lastError: 'robots.txt disallows /news',
        },
      ],
    })

    await render(<SourcesTab />)
    // KPI strip always renders once the source query settles — a stable anchor
    // proving the tab mounted before we assert on absences.
    await waitForText('Sources monitored')

    expect(document.body.textContent).not.toContain('Needs attention')
    expect(document.body.textContent).not.toContain('robots.txt disallows /news')
    expect(
      Array.from(document.querySelectorAll('button')).some((button) =>
        button.textContent?.includes('Re-check now'),
      ),
    ).toBe(false)
  })

  it('does not query or render the internal jurisdiction coverage matrix', async () => {
    rpcMocks.sourceCoverageQueryFn.mockResolvedValue({
      coverage: [
        {
          jurisdiction: 'CA',
          coverageLevel: 'standard',
          requiredRoles: ['primary_web_news', 'email_signal'],
          coveredRoles: ['primary_web_news'],
          missingRoles: ['email_signal'],
          missingReason: 'Email subscription not verified',
          sourceIds: ['ca.ftb.news'],
        },
      ],
    })

    await render(<SourcesTab />)
    await waitForText('Sources monitored')

    expect(rpcMocks.sourceCoverageQueryFn).not.toHaveBeenCalled()
    expect(document.body.textContent).not.toContain('Coverage by jurisdiction')
    expect(document.body.textContent).not.toContain('Which watcher roles')
    expect(document.body.textContent).not.toContain('Catch up still-open windows')
    expect(document.body.textContent).not.toContain('Email subscription not verified')
  })
})
