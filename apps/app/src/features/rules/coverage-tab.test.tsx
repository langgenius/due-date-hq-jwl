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

function matrixHeaders(): string[] {
  const matrixTable = document.querySelectorAll('table')[1]
  return Array.from(matrixTable?.querySelectorAll('th') ?? []).map(
    (header) => header.textContent ?? '',
  )
}

function entityViewButton(label: string): HTMLButtonElement | undefined {
  const controls = document.querySelector('[aria-label="Entity coverage view"]')
  return Array.from(controls?.querySelectorAll('button') ?? []).find(
    (button): button is HTMLButtonElement => button.textContent === label,
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

describe('CoverageTab entity matrix', () => {
  it('defaults to the Business entity group', async () => {
    await render(<CoverageTab />)
    await waitForText('ENTITY COVERAGE')

    expect(matrixHeaders()).toEqual([
      'JURISDICTION',
      'LLC',
      'Partnership',
      'S-Corp',
      'C-Corp',
      'Sole prop',
    ])
  })

  it('switches the matrix to personal and all entity groups', async () => {
    await render(<CoverageTab />)
    await waitForText('ENTITY COVERAGE')

    const personalButton = entityViewButton('Personal & fiduciary')
    expect(personalButton).toBeInstanceOf(HTMLButtonElement)

    await act(async () => {
      personalButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })
    expect(matrixHeaders()).toEqual(['JURISDICTION', 'Individual', 'Trust'])

    const allButton = entityViewButton('All')
    await act(async () => {
      allButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })
    expect(matrixHeaders()).toEqual([
      'JURISDICTION',
      'Individual',
      'Trust',
      'LLC',
      'Partnership',
      'S-Corp',
      'C-Corp',
      'Sole prop',
    ])
  })
})
