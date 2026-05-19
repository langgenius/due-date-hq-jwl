import { act } from 'react'
import type { ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RuleCoverageRow } from '@duedatehq/contracts'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

import { CoverageTab } from './coverage-tab'

const rpcMocks = vi.hoisted(() => ({
  coverageQueryFn: vi.fn(),
  sourceHealthQueryFn: vi.fn(),
}))

vi.mock('@/lib/rpc', () => ({
  orpc: {
    rules: {
      coverage: {
        queryOptions: () => ({
          queryKey: ['rules', 'coverage'],
          queryFn: rpcMocks.coverageQueryFn,
        }),
      },
    },
    pulse: {
      listSourceHealth: {
        queryOptions: () => ({
          queryKey: ['pulse', 'listSourceHealth'],
          queryFn: rpcMocks.sourceHealthQueryFn,
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

const coverageRows: RuleCoverageRow[] = [
  {
    jurisdiction: 'FED',
    sourceCount: 2,
    verifiedRuleCount: 2,
    candidateCount: 1,
    highPrioritySourceCount: 1,
  },
  {
    jurisdiction: 'CA',
    sourceCount: 2,
    verifiedRuleCount: 2,
    candidateCount: 1,
    highPrioritySourceCount: 1,
  },
]

async function render(children: ReactNode) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  await act(async () => {
    root?.render(
      <QueryClientProvider client={client}>
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

function tableHeaders(): string[] {
  const table = document.querySelector('table')
  return Array.from(table?.querySelectorAll('thead th') ?? []).map(
    (header) => header.textContent ?? '',
  )
}

beforeEach(() => {
  bootstrapI18n()
  rpcMocks.coverageQueryFn.mockReset()
  rpcMocks.coverageQueryFn.mockResolvedValue(coverageRows)
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

describe('CoverageTab single-table layout', () => {
  it('renders the unified jurisdiction table with the ENTITY COVERAGE column', async () => {
    await render(<CoverageTab />)
    await waitForText('ENTITY COVERAGE')

    expect(tableHeaders()).toEqual([
      'JUR',
      'NAME',
      'ENTITY COVERAGE',
      'ACTIVE',
      'PENDING',
      'SOURCES',
      'STATUS',
    ])
  })

  it('renders an entity-coverage summary trigger per row', async () => {
    await render(<CoverageTab />)
    await waitForText('ENTITY COVERAGE')

    // Each row's ENTITY COVERAGE cell now renders a single popover trigger
    // (button) showing the text summary instead of 7 inline dots. Verify the
    // trigger exists and carries an accessible label naming the
    // jurisdiction so screen readers announce the target.
    const firstRow = document.querySelector('tbody tr')
    const entityCell = firstRow?.querySelectorAll('td')[2]
    const trigger = entityCell?.querySelector('button')
    expect(trigger).toBeInstanceOf(HTMLButtonElement)
    expect(trigger?.getAttribute('aria-label')).toMatch(/Open entity breakdown for /)
  })
})
