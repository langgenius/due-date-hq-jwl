import { act } from 'react'
import type { ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { HotkeysProvider } from '@tanstack/react-hotkeys'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ObligationRule, RuleCoverageRow } from '@duedatehq/contracts'

import {
  KeyboardShellContext,
  type KeyboardShellContextValue,
} from '@/components/patterns/keyboard-shell/state'
import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

import { CoverageTab } from './coverage-tab'

const rpcMocks = vi.hoisted(() => ({
  coverageQueryFn: vi.fn(),
  sourceHealthQueryFn: vi.fn(),
  listSourcesQueryFn: vi.fn(),
  listRulesQueryFn: vi.fn(),
}))
const nuqsMocks = vi.hoisted(() => ({
  filter: 'all',
  search: '',
  setFilter: vi.fn(),
  setSearch: vi.fn(),
  setRule: vi.fn(),
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

vi.mock('nuqs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('nuqs')>()
  return {
    ...actual,
    useQueryState: (key: string) => {
      if (key === 'filter') return [nuqsMocks.filter, nuqsMocks.setFilter]
      if (key === 'q') return [nuqsMocks.search, nuqsMocks.setSearch]
      return [null, nuqsMocks.setRule]
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

const coverageRows: RuleCoverageRow[] = [
  {
    jurisdiction: 'FED',
    sourceCount: 2,
    verifiedRuleCount: 2,
    candidateCount: 1,
    highPrioritySourceCount: 1,
    missingSourceCount: 2,
    requiredSourceCount: 10,
    sourceCoverageStatus: 'missing_source',
    missingSourceDomains: ['withholding'],
    entityCoverage: {
      llc: 'review',
      partnership: 'review',
      s_corp: 'active',
      c_corp: 'active',
      sole_prop: 'review',
      individual: 'review',
      trust: 'none',
    },
    entitySourceCoverage: {
      llc: 'rule_pending_review',
      partnership: 'rule_pending_review',
      s_corp: 'rule_active',
      c_corp: 'rule_active',
      sole_prop: 'source_registered',
      individual: 'rule_pending_review',
      trust: 'missing_source',
    },
  },
  {
    jurisdiction: 'CA',
    sourceCount: 2,
    verifiedRuleCount: 2,
    candidateCount: 1,
    highPrioritySourceCount: 1,
    missingSourceCount: 0,
    requiredSourceCount: 10,
    sourceCoverageStatus: 'rule_pending_review',
    missingSourceDomains: [],
    entityCoverage: {
      llc: 'review',
      partnership: 'review',
      s_corp: 'active',
      c_corp: 'active',
      sole_prop: 'review',
      individual: 'review',
      trust: 'none',
    },
    entitySourceCoverage: {
      llc: 'rule_pending_review',
      partnership: 'rule_pending_review',
      s_corp: 'rule_active',
      c_corp: 'rule_active',
      sole_prop: 'source_registered',
      individual: 'rule_pending_review',
      trust: 'source_registered',
    },
  },
]

function obligationRule(overrides: Partial<ObligationRule>): ObligationRule {
  return {
    id: 'ca.rule.2026',
    title: 'California base rule',
    jurisdiction: 'CA',
    entityApplicability: ['individual'],
    taxType: 'income_tax',
    formName: 'Form 540',
    eventType: 'filing',
    isFiling: true,
    isPayment: false,
    taxYear: 2026,
    applicableYear: 2026,
    ruleTier: 'basic',
    status: 'active',
    coverageStatus: 'full',
    riskLevel: 'med',
    requiresApplicabilityReview: false,
    dueDateLogic: {
      kind: 'fixed_date',
      date: '2026-04-15',
      holidayRollover: 'source_adjusted',
    },
    extensionPolicy: {
      available: false,
      paymentExtended: false,
      notes: 'No extension policy in this fixture.',
    },
    sourceIds: [],
    evidence: [],
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

const keyboardShellTestValue: KeyboardShellContextValue = {
  commandPaletteOpen: false,
  shortcutHelpOpen: false,
  shortcutsBlocked: false,
  openCommandPalette: () => undefined,
  closeCommandPalette: () => undefined,
  openShortcutHelp: () => undefined,
  closeShortcutHelp: () => undefined,
}

async function render(children: ReactNode) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  await act(async () => {
    root?.render(
      <QueryClientProvider client={client}>
        <AppI18nProvider>
          <MemoryRouter>
            <HotkeysProvider>
              <KeyboardShellContext.Provider value={keyboardShellTestValue}>
                {children}
              </KeyboardShellContext.Provider>
            </HotkeysProvider>
          </MemoryRouter>
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
  rpcMocks.listSourcesQueryFn.mockReset()
  rpcMocks.listSourcesQueryFn.mockResolvedValue([])
  rpcMocks.listRulesQueryFn.mockReset()
  rpcMocks.listRulesQueryFn.mockResolvedValue([])
  nuqsMocks.filter = 'all'
  nuqsMocks.search = ''
  nuqsMocks.setFilter.mockReset()
  nuqsMocks.setSearch.mockReset()
  nuqsMocks.setRule.mockReset()
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

describe('CoverageTab canonical layout', () => {
  it('renders the unified table with grouped Rules + Entity coverage columns', async () => {
    await render(<CoverageTab />)
    await waitForText('Entity coverage')

    // Single header row — Jurisdiction / Active / Pending / Source /
    // LLC / Partner. / S-Corp / C-Corp / Sole Prop / Individual /
    // Trust. The group-eyebrow strip ("Rules" / "Entity coverage")
    // was dropped — the section heading above the table already
    // names the grouping.
    expect(tableHeaders()).toEqual([
      'Jurisdiction',
      'Active',
      'Pending',
      'Source',
      'LLC',
      'Partner.',
      'S-Corp',
      'C-Corp',
      'Sole Prop',
      'Individual',
      'Trust',
    ])
  })

  it('renders 11 cells per row (Jurisdiction + Active + Pending + Source + 7 entity)', async () => {
    await render(<CoverageTab />)
    await waitForText('Entity coverage')

    const firstRow = document.querySelector('tbody tr')
    const cells = firstRow?.querySelectorAll('td') ?? []
    expect(cells.length).toBe(11)
  })

  it('renders the coverage table in its own scroll region', async () => {
    await render(<CoverageTab />)
    await waitForText('Entity coverage')

    const tableFrame = document.querySelector('[data-slot="table"]')?.closest('.rounded-md')

    expect(tableFrame?.className).toContain('overflow-auto')
    expect(tableFrame?.className).toContain('overscroll-auto')
    expect(tableFrame?.className).not.toContain('overflow-hidden')
  })

  it('separates missing-source and not-applicable states in the legend', async () => {
    await render(<CoverageTab />)
    await waitForText('Missing source')
    await waitForText('Not applicable')

    const missingSourceLegendIcon = document.querySelector(
      '[data-coverage-legend-icon="missing_source"]',
    )
    const notApplicableLegendIcon = document.querySelector(
      '[data-coverage-legend-icon="not_applicable"]',
    )

    expect(missingSourceLegendIcon?.classList.contains('lucide-x')).toBe(true)
    expect(notApplicableLegendIcon?.textContent?.trim()).toBe('—')
  })

  it('shows active and pending rules in expanded jurisdiction detail', async () => {
    rpcMocks.listRulesQueryFn.mockResolvedValue([
      obligationRule({
        id: 'ca.active.business.2026',
        title: 'California active business return',
        status: 'active',
      }),
      obligationRule({
        id: 'ca.active.source-calendar.2026',
        title: 'California active source-defined calendar',
        status: 'active',
        dueDateLogic: {
          kind: 'source_defined_calendar',
          description: 'Official source publishes the annual calendar.',
          holidayRollover: 'source_adjusted',
        },
      }),
      obligationRule({
        id: 'ca.pending.individual.2026',
        title: 'California pending individual return',
        status: 'pending_review',
      }),
    ])

    await render(<CoverageTab />)
    await waitForText('California')

    const californiaRow = Array.from(document.querySelectorAll('tbody tr')).find((row) =>
      row.textContent?.includes('California'),
    )
    expect(californiaRow).toBeDefined()

    await act(async () => {
      californiaRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    await waitForText('Active rules')
    await waitForText('active business return')
    await waitForText('active source-defined calendar')
    await waitForText('Due-date review')
    await waitForText('Pending rules')
    await waitForText('pending individual return')
  })
})
