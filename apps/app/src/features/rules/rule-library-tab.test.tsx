import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

import { RuleLibraryTab } from './rule-library-tab'

const rpcMocks = vi.hoisted(() => ({
  listRulesQueryFn: vi.fn(),
  listReviewTasksQueryFn: vi.fn(),
  previewBulkRuleImpactMutationFn: vi.fn(),
  bulkAcceptTemplatesMutationFn: vi.fn(),
}))

const nuqsMocks = vi.hoisted(() => ({
  library: 'pending_review',
  jurisdiction: [] as string[],
  origin: null as string | null,
  setLibrary: vi.fn(),
  setJurisdiction: vi.fn(),
  setOrigin: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('@/lib/rpc', () => ({
  orpc: {
    audit: { key: () => ['audit'] },
    dashboard: { load: { key: () => ['dashboard', 'load'] } },
    obligations: {
      key: () => ['obligations'],
      facets: { key: () => ['obligations', 'facets'] },
      list: { key: () => ['obligations', 'list'] },
    },
    rules: {
      key: () => ['rules'],
      listRules: {
        queryOptions: ({ input }: { input: unknown }) => ({
          queryKey: ['rules', 'listRules', input],
          queryFn: rpcMocks.listRulesQueryFn,
        }),
      },
      listReviewTasks: {
        queryOptions: ({ input }: { input: unknown }) => ({
          queryKey: ['rules', 'listReviewTasks', input],
          queryFn: rpcMocks.listReviewTasksQueryFn,
        }),
      },
      previewBulkRuleImpact: {
        mutationOptions: (options: Record<string, unknown>) => ({
          mutationFn: rpcMocks.previewBulkRuleImpactMutationFn,
          ...options,
        }),
      },
      bulkAcceptTemplates: {
        mutationOptions: (options: Record<string, unknown>) => ({
          mutationFn: rpcMocks.bulkAcceptTemplatesMutationFn,
          ...options,
        }),
      },
    },
  },
}))

vi.mock('nuqs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('nuqs')>()
  return {
    ...actual,
    useQueryState: (key: string) => {
      if (key === 'library') return [nuqsMocks.library, nuqsMocks.setLibrary]
      if (key === 'jur') return [nuqsMocks.jurisdiction, nuqsMocks.setJurisdiction]
      if (key === 'from') return [nuqsMocks.origin, nuqsMocks.setOrigin]
      return [null, vi.fn()]
    },
  }
})

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

beforeEach(() => {
  bootstrapI18n()
  rpcMocks.listRulesQueryFn.mockReset()
  rpcMocks.listRulesQueryFn.mockResolvedValue([])
  rpcMocks.listReviewTasksQueryFn.mockReset()
  rpcMocks.listReviewTasksQueryFn.mockResolvedValue([])
  rpcMocks.previewBulkRuleImpactMutationFn.mockReset()
  rpcMocks.bulkAcceptTemplatesMutationFn.mockReset()
  nuqsMocks.library = 'pending_review'
  nuqsMocks.jurisdiction = []
  nuqsMocks.origin = null
  nuqsMocks.setLibrary.mockReset()
  nuqsMocks.setJurisdiction.mockReset()
  nuqsMocks.setOrigin.mockReset()
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

describe('RuleLibraryTab layout', () => {
  it('renders the rule library table in its own scroll region', async () => {
    await render(<RuleLibraryTab />)
    await waitForText('No rules in the catalog yet.')

    const scrollRegion = document.querySelector('[data-slot="rule-library-table-scroll"]')
    const tableFrame = document.querySelector('[data-slot="table"]')?.closest('.rounded-md')

    expect(scrollRegion?.className).toContain('overflow-auto')
    expect(scrollRegion?.className).toContain('overscroll-auto')
    expect(tableFrame?.className).toContain('overflow-clip')
    expect(tableFrame?.className).not.toContain('overflow-hidden')
  })
})
