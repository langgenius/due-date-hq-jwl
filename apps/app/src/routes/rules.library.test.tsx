import { act } from 'react'
import type { ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ObligationRule, RuleConcreteDraft, RuleCoverageRow } from '@duedatehq/contracts'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

import { RulesLibraryRoute } from './rules.library'

const rpcMocks = vi.hoisted(() => ({
  coverageQueryFn: vi.fn(),
  listSourcesQueryFn: vi.fn(),
  listRulesQueryFn: vi.fn(),
  listConcreteDraftsQueryFn: vi.fn(),
  acceptTemplateMutationFn: vi.fn(),
  verifyCandidateMutationFn: vi.fn(),
  rejectTemplateMutationFn: vi.fn(),
  createCustomRuleMutationFn: vi.fn(),
}))

const nuqsMocks = vi.hoisted(() => ({
  search: '',
  rule: null as string | null,
  entity: null as string | null,
  setSearch: vi.fn(),
  setRule: vi.fn(),
  setEntity: vi.fn(),
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
      coverage: {
        queryOptions: () => ({
          queryKey: ['rules', 'coverage'],
          queryFn: rpcMocks.coverageQueryFn,
        }),
      },
      listSources: {
        queryOptions: () => ({
          queryKey: ['rules', 'listSources'],
          queryFn: rpcMocks.listSourcesQueryFn,
        }),
      },
      listRules: {
        queryOptions: () => ({
          queryKey: ['rules', 'listRules'],
          queryFn: rpcMocks.listRulesQueryFn,
        }),
      },
      listConcreteDrafts: {
        queryOptions: ({ input }: { input: unknown }) => ({
          queryKey: ['rules', 'listConcreteDrafts', input],
          queryFn: rpcMocks.listConcreteDraftsQueryFn,
        }),
      },
      acceptTemplate: {
        mutationOptions: (options: Record<string, unknown>) => ({
          mutationFn: rpcMocks.acceptTemplateMutationFn,
          ...options,
        }),
      },
      verifyCandidate: {
        mutationOptions: (options: Record<string, unknown>) => ({
          mutationFn: rpcMocks.verifyCandidateMutationFn,
          ...options,
        }),
      },
      rejectTemplate: {
        mutationOptions: (options: Record<string, unknown>) => ({
          mutationFn: rpcMocks.rejectTemplateMutationFn,
          ...options,
        }),
      },
      createCustomRule: {
        mutationOptions: (options: Record<string, unknown>) => ({
          mutationFn: rpcMocks.createCustomRuleMutationFn,
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
      if (key === 'q') return [nuqsMocks.search, nuqsMocks.setSearch]
      if (key === 'rule') return [nuqsMocks.rule, nuqsMocks.setRule]
      if (key === 'entity') return [nuqsMocks.entity, nuqsMocks.setEntity]
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

function obligationRule(overrides: Partial<ObligationRule>): ObligationRule {
  return {
    id: 'az.individual_income_return.candidate.2026',
    title: 'Arizona individual income tax return',
    jurisdiction: 'AZ',
    entityApplicability: ['individual'],
    taxType: 'income_tax',
    formName: 'Form 140',
    eventType: 'filing',
    isFiling: true,
    isPayment: false,
    taxYear: 2026,
    applicableYear: 2026,
    ruleTier: 'basic',
    status: 'candidate',
    coverageStatus: 'full',
    riskLevel: 'med',
    requiresApplicabilityReview: false,
    dueDateLogic: {
      kind: 'source_defined_calendar',
      description: 'Official source publishes the annual due date.',
      holidayRollover: 'source_adjusted',
    },
    extensionPolicy: {
      available: false,
      paymentExtended: false,
      notes: 'No extension policy in this fixture.',
    },
    sourceIds: ['az.income_tax'],
    evidence: [
      {
        sourceId: 'az.income_tax',
        authorityRole: 'basis',
        locator: { kind: 'html', heading: 'Due Date for Calendar Year Filers' },
        summary: 'Arizona individual income tax due date.',
        sourceExcerpt: 'Returns are due by April 15, 2026.',
        retrievedAt: '2026-05-22',
      },
    ],
    defaultTip: 'File by the statutory due date.',
    quality: {
      filingPaymentDistinguished: true,
      extensionHandled: true,
      calendarFiscalSpecified: true,
      holidayRolloverHandled: true,
      crossVerified: true,
      exceptionChannel: true,
    },
    verifiedBy: 'test',
    verifiedAt: '2026-01-01',
    nextReviewOn: '2027-01-01',
    version: 1,
    ...overrides,
  }
}

function concreteDraft(overrides: Partial<RuleConcreteDraft> = {}): RuleConcreteDraft {
  return {
    aiOutputId: '11111111-1111-4111-8111-111111111111',
    dueDateLogic: {
      kind: 'fixed_date',
      date: '2026-04-15',
      holidayRollover: 'source_adjusted',
    },
    extensionPolicy: {
      available: true,
      durationMonths: 6,
      paymentExtended: false,
      formName: 'Arizona extension',
      notes: 'Extended filing due date is October 15, 2026.',
    },
    coverageStatus: 'full',
    requiresApplicabilityReview: false,
    quality: {
      filingPaymentDistinguished: true,
      extensionHandled: true,
      calendarFiscalSpecified: true,
      holidayRolloverHandled: true,
      crossVerified: true,
      exceptionChannel: true,
    },
    sourceHeading: 'Due Date for Calendar Year Filers',
    sourceExcerpt: 'Your 2025 individual income tax return is due by midnight on April 15, 2026.',
    confidence: 0.92,
    reasoning: 'The official source states the filing due date and extended filing due date.',
    ...overrides,
  }
}

async function render(children: ReactNode) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

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

const coverageRows: RuleCoverageRow[] = []

beforeEach(() => {
  bootstrapI18n()
  rpcMocks.coverageQueryFn.mockReset()
  rpcMocks.coverageQueryFn.mockResolvedValue(coverageRows)
  rpcMocks.listSourcesQueryFn.mockReset()
  rpcMocks.listSourcesQueryFn.mockResolvedValue([])
  rpcMocks.listRulesQueryFn.mockReset()
  rpcMocks.listRulesQueryFn.mockResolvedValue([])
  rpcMocks.listConcreteDraftsQueryFn.mockReset()
  rpcMocks.listConcreteDraftsQueryFn.mockResolvedValue([])
  rpcMocks.acceptTemplateMutationFn.mockReset()
  rpcMocks.acceptTemplateMutationFn.mockResolvedValue({})
  rpcMocks.verifyCandidateMutationFn.mockReset()
  rpcMocks.verifyCandidateMutationFn.mockResolvedValue({})
  rpcMocks.rejectTemplateMutationFn.mockReset()
  rpcMocks.rejectTemplateMutationFn.mockResolvedValue({})
  rpcMocks.createCustomRuleMutationFn.mockReset()
  rpcMocks.createCustomRuleMutationFn.mockResolvedValue({})
  nuqsMocks.search = ''
  nuqsMocks.rule = null
  nuqsMocks.entity = null
  nuqsMocks.setSearch.mockReset()
  nuqsMocks.setRule.mockReset()
  nuqsMocks.setEntity.mockReset()
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

describe('RulesLibraryRoute', () => {
  it('shows cached AI concrete drafts in the selected rule detail', async () => {
    const rule = obligationRule({})
    nuqsMocks.rule = rule.id
    rpcMocks.listRulesQueryFn.mockResolvedValue([rule])
    rpcMocks.listConcreteDraftsQueryFn.mockResolvedValue([
      {
        ruleId: rule.id,
        sourceId: 'az.income_tax',
        sourceSignalId: null,
        draft: concreteDraft(),
      },
    ])

    await render(<RulesLibraryRoute />)
    await waitForText('AI concrete draft')
    await waitForText('April 15, 2026')

    expect(document.body.textContent).not.toContain('AI concrete draft is not ready.')
    expect(rpcMocks.listConcreteDraftsQueryFn).toHaveBeenCalled()
  })
})
