import { act } from 'react'
import type { ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { HotkeysProvider } from '@tanstack/react-hotkeys'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  ObligationRule,
  RuleConcreteDraft,
  RuleCoverageRow,
  RuleReviewTask,
} from '@duedatehq/contracts'

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
  listReviewTasksQueryFn: vi.fn(),
  listConcreteDraftsQueryFn: vi.fn(),
  draftConcreteRuleQueryFn: vi.fn(),
  acceptTemplateMutationFn: vi.fn(),
  verifyCandidateMutationFn: vi.fn(),
  rejectTemplateMutationFn: vi.fn(),
  previewBulkRuleImpactMutationFn: vi.fn(),
  bulkAcceptTemplatesMutationFn: vi.fn(),
  bulkVerifyCandidatesMutationFn: vi.fn(),
}))
const nuqsMocks = vi.hoisted(() => ({
  filter: 'all',
  search: '',
  library: null as string | null,
  jurisdictions: [] as string[],
  rule: null as string | null,
  setFilter: vi.fn(),
  setSearch: vi.fn(),
  setLibrary: vi.fn(),
  setJurisdictions: vi.fn(),
  setRule: vi.fn(),
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
      listReviewTasks: {
        queryOptions: ({ input }: { input: unknown }) => ({
          queryKey: ['rules', 'listReviewTasks', input],
          queryFn: rpcMocks.listReviewTasksQueryFn,
        }),
      },
      draftConcreteRule: {
        queryOptions: ({ input }: { input: unknown }) => ({
          queryKey: ['rules', 'draftConcreteRule', input],
          queryFn: rpcMocks.draftConcreteRuleQueryFn,
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
      bulkVerifyCandidates: {
        mutationOptions: (options: Record<string, unknown>) => ({
          mutationFn: rpcMocks.bulkVerifyCandidatesMutationFn,
          ...options,
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
      if (key === 'library') return [nuqsMocks.library, nuqsMocks.setLibrary]
      if (key === 'jur') return [nuqsMocks.jurisdictions, nuqsMocks.setJurisdictions]
      if (key === 'rule') return [nuqsMocks.rule, nuqsMocks.setRule]
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

function reviewTask(rule: ObligationRule, overrides: Partial<RuleReviewTask> = {}): RuleReviewTask {
  return {
    id: `task_${rule.id}`,
    ruleId: rule.id,
    templateVersion: rule.version,
    status: 'open',
    reason: 'new_template',
    rule,
    reviewNote: null,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
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
      available: false,
      paymentExtended: false,
      notes: 'No extension policy in this fixture.',
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
    sourceHeading: 'Due dates',
    sourceExcerpt: 'Returns are due on April 15, 2026.',
    confidence: 0.9,
    reasoning: 'The source states a fixed calendar due date.',
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

async function render(
  children: ReactNode,
  options: { queryRetry?: false | number; retryDelay?: number } = {},
) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const queryDefaults =
    options.retryDelay === undefined
      ? { retry: options.queryRetry ?? false }
      : { retry: options.queryRetry ?? false, retryDelay: options.retryDelay }
  const client = new QueryClient({
    defaultOptions: {
      queries: queryDefaults,
    },
  })

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

function setTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')
  // eslint-disable-next-line typescript-eslint/unbound-method -- React tests need the native setter.
  const setter = descriptor?.set
  if (!setter) {
    textarea.value = value
    return
  }
  setter.call(textarea, value)
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
  rpcMocks.listReviewTasksQueryFn.mockReset()
  rpcMocks.listReviewTasksQueryFn.mockResolvedValue([])
  rpcMocks.listConcreteDraftsQueryFn.mockReset()
  rpcMocks.listConcreteDraftsQueryFn.mockResolvedValue([])
  rpcMocks.draftConcreteRuleQueryFn.mockReset()
  rpcMocks.draftConcreteRuleQueryFn.mockResolvedValue(null)
  rpcMocks.acceptTemplateMutationFn.mockReset()
  rpcMocks.acceptTemplateMutationFn.mockResolvedValue({})
  rpcMocks.verifyCandidateMutationFn.mockReset()
  rpcMocks.verifyCandidateMutationFn.mockResolvedValue({})
  rpcMocks.rejectTemplateMutationFn.mockReset()
  rpcMocks.rejectTemplateMutationFn.mockResolvedValue({})
  rpcMocks.previewBulkRuleImpactMutationFn.mockReset()
  rpcMocks.previewBulkRuleImpactMutationFn.mockResolvedValue({
    selectedCount: 1,
    acceptReadyCount: 1,
    skipped: [],
    jurisdictionCounts: [{ key: 'CA', count: 1 }],
    entityCounts: [{ key: 'individual', count: 1 }],
    formCounts: [{ key: 'Form 540', count: 1 }],
    reviewReasonCounts: [],
    sourceCount: 1,
    estimatedObligationCount: 1,
  })
  rpcMocks.bulkAcceptTemplatesMutationFn.mockReset()
  rpcMocks.bulkAcceptTemplatesMutationFn.mockResolvedValue({ accepted: [], skipped: [] })
  rpcMocks.bulkVerifyCandidatesMutationFn.mockReset()
  rpcMocks.bulkVerifyCandidatesMutationFn.mockResolvedValue({ verified: [], skipped: [] })
  nuqsMocks.filter = 'all'
  nuqsMocks.search = ''
  nuqsMocks.library = null
  nuqsMocks.jurisdictions = []
  nuqsMocks.rule = null
  nuqsMocks.setFilter.mockReset()
  nuqsMocks.setSearch.mockReset()
  nuqsMocks.setLibrary.mockReset()
  nuqsMocks.setJurisdictions.mockReset()
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

  it('can constrain the table scroll region to remaining viewport height', async () => {
    await render(<CoverageTab fitViewport />)
    await waitForText('Entity coverage')

    const tableFrame = document.querySelector('[data-slot="table"]')?.closest('.rounded-md')

    expect(tableFrame?.className).toContain('overflow-auto')
    expect(tableFrame?.className).toContain('overscroll-contain')
    expect(tableFrame?.className).toContain('flex-1')
    expect(tableFrame?.className).toContain('min-h-0')
    expect(tableFrame?.className).not.toContain('max-h-[clamp')

    const tableFlexRow = tableFrame?.parentElement?.parentElement
    expect(tableFlexRow?.className).toContain('items-stretch')
    expect(tableFlexRow?.className).not.toContain('items-start')
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

  it('shows active and AI-draft-needed rules in expanded jurisdiction detail', async () => {
    rpcMocks.listRulesQueryFn.mockResolvedValue([
      obligationRule({
        id: 'ca.active.business.2026',
        title: 'California active business return',
        status: 'active',
      }),
      obligationRule({
        id: 'ca.pending.source-calendar.2026',
        title: 'California pending source-defined calendar',
        status: 'pending_review',
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
    await waitForText('Pending rules')
    await waitForText('pending source-defined calendar')
    await waitForText('AI draft needed')
    await waitForText('pending individual return')
  })

  it('shows the active rule queue when an active rule detail is open', async () => {
    const federalActiveRule = obligationRule({
      id: 'fed.active.individual.2026',
      title: 'Federal active individual return',
      jurisdiction: 'FED',
      status: 'active',
    })
    const californiaActiveRule = obligationRule({
      id: 'ca.active.business.2026',
      title: 'California active business return',
      status: 'active',
    })
    const californiaPendingRule = obligationRule({
      id: 'ca.pending.individual.2026',
      title: 'California pending individual return',
      status: 'pending_review',
    })
    nuqsMocks.rule = federalActiveRule.id
    rpcMocks.listRulesQueryFn.mockResolvedValue([
      federalActiveRule,
      californiaActiveRule,
      californiaPendingRule,
    ])
    rpcMocks.listReviewTasksQueryFn.mockResolvedValue([reviewTask(californiaPendingRule)])

    await render(<CoverageTab />)
    await waitForText('Active rule queue')
    await waitForText('Viewing 1 of 2')

    expect(document.body.textContent).not.toContain('Pending review queue')
    expect(document.body.textContent).not.toContain('Select batch-ready')
    expect(document.body.textContent).not.toContain('Review selected')
    await waitForText('active individual return')
    await waitForText('active business return')
    expect(document.body.textContent).not.toContain('pending individual return')
  })

  it('moves to the next active rule from the active queue', async () => {
    const federalActiveRule = obligationRule({
      id: 'fed.active.individual.2026',
      title: 'Federal active individual return',
      jurisdiction: 'FED',
      status: 'active',
    })
    const californiaActiveRule = obligationRule({
      id: 'ca.active.business.2026',
      title: 'California active business return',
      status: 'active',
    })
    nuqsMocks.rule = federalActiveRule.id
    rpcMocks.listRulesQueryFn.mockResolvedValue([federalActiveRule, californiaActiveRule])

    await render(<CoverageTab />)
    await waitForText('Active rule queue')

    const nextButton = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Next'),
    )
    expect(nextButton).toBeDefined()

    await act(async () => {
      nextButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(nuqsMocks.setRule).toHaveBeenCalledWith(californiaActiveRule.id)
  })

  it('switches from active to pending queue with the queue toggle', async () => {
    const activeRule = obligationRule({
      id: 'fed.active.individual.2026',
      title: 'Federal active individual return',
      jurisdiction: 'FED',
      status: 'active',
    })
    const pendingRule = obligationRule({
      id: 'ca.pending.individual.2026',
      title: 'California pending individual return',
      status: 'pending_review',
    })
    nuqsMocks.rule = activeRule.id
    rpcMocks.listRulesQueryFn.mockResolvedValue([activeRule, pendingRule])
    rpcMocks.listReviewTasksQueryFn.mockResolvedValue([reviewTask(pendingRule)])

    await render(<CoverageTab />)
    await waitForText('Active rule queue')

    const pendingTab = Array.from(document.querySelectorAll('button[role="tab"]')).find((button) =>
      button.textContent?.includes('Pending'),
    )
    expect(pendingTab).toBeDefined()

    await act(async () => {
      pendingTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(nuqsMocks.setRule).toHaveBeenCalledWith(pendingRule.id)
  })

  it('switches from pending to active queue with the queue toggle', async () => {
    const activeRule = obligationRule({
      id: 'fed.active.individual.2026',
      title: 'Federal active individual return',
      jurisdiction: 'FED',
      status: 'active',
    })
    const pendingRule = obligationRule({
      id: 'ca.pending.individual.2026',
      title: 'California pending individual return',
      status: 'pending_review',
    })
    nuqsMocks.rule = pendingRule.id
    rpcMocks.listRulesQueryFn.mockResolvedValue([activeRule, pendingRule])
    rpcMocks.listReviewTasksQueryFn.mockResolvedValue([reviewTask(pendingRule)])

    await render(<CoverageTab />)
    await waitForText('Pending review queue')

    const activeTab = Array.from(document.querySelectorAll('button[role="tab"]')).find((button) =>
      button.textContent?.includes('Active'),
    )
    expect(activeTab).toBeDefined()

    await act(async () => {
      activeTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(nuqsMocks.setRule).toHaveBeenCalledWith(activeRule.id)
  })

  it('selects visible bulk-reviewable pending rules from the review queue', async () => {
    const selectableRule = obligationRule({
      id: 'ca.pending.individual.2026',
      title: 'California pending individual return',
      status: 'pending_review',
    })
    const sourceChangedRule = obligationRule({
      id: 'ca.pending.source-changed.2026',
      title: 'California source changed rule',
      status: 'pending_review',
    })
    const sourceDefinedRule = obligationRule({
      id: 'fed.pending.source-defined.2026',
      title: 'Federal source-defined calendar',
      jurisdiction: 'FED',
      status: 'pending_review',
      dueDateLogic: {
        kind: 'source_defined_calendar',
        description: 'Official source publishes the annual calendar.',
        holidayRollover: 'source_adjusted',
      },
    })
    nuqsMocks.rule = selectableRule.id
    rpcMocks.listRulesQueryFn.mockResolvedValue([
      selectableRule,
      sourceChangedRule,
      sourceDefinedRule,
    ])
    rpcMocks.listReviewTasksQueryFn.mockResolvedValue([
      reviewTask(selectableRule),
      reviewTask(sourceChangedRule, { reason: 'source_changed' }),
      reviewTask(sourceDefinedRule),
    ])

    await render(<CoverageTab />)
    await waitForText('Pending review queue')

    const selectVisible = document.querySelector<HTMLInputElement>(
      'input[aria-label="Select visible batch-ready rules"]',
    )
    expect(selectVisible).not.toBeNull()

    await act(async () => {
      selectVisible?.click()
    })

    await waitForText('1 selected')
    const reviewSelected = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Review selected'),
    )
    expect(reviewSelected).toBeDefined()

    await act(async () => {
      reviewSelected?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    await waitForText('Review selected rules')
    const previewButton = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Preview'),
    )
    expect(previewButton).toBeDefined()

    await act(async () => {
      previewButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    await waitForText('1 ready')
    expect(rpcMocks.previewBulkRuleImpactMutationFn.mock.calls[0]?.[0]).toEqual({
      rules: [{ ruleId: selectableRule.id, expectedVersion: selectableRule.version }],
    })
  })

  it('keeps the rule detail open when the selected rule row is clicked again', async () => {
    const selectableRule = obligationRule({
      id: 'ca.pending.individual.2026',
      title: 'California pending individual return',
      status: 'pending_review',
    })
    nuqsMocks.rule = selectableRule.id
    rpcMocks.listRulesQueryFn.mockResolvedValue([selectableRule])
    rpcMocks.listReviewTasksQueryFn.mockResolvedValue([reviewTask(selectableRule)])

    await render(<CoverageTab />)
    await waitForText('Pending review queue')

    const selectedRuleButton = document.querySelector<HTMLButtonElement>(
      `button[title="${selectableRule.title}"]`,
    )
    expect(selectedRuleButton).not.toBeNull()

    await act(async () => {
      selectedRuleButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(nuqsMocks.setRule).not.toHaveBeenCalled()
  })

  it('renders source-defined and source-changed single-review rules without disabled checkboxes', async () => {
    const selectableRule = obligationRule({
      id: 'ca.pending.individual.2026',
      title: 'California pending individual return',
      status: 'pending_review',
    })
    const sourceChangedRule = obligationRule({
      id: 'ca.pending.source-changed.2026',
      title: 'California source changed rule',
      status: 'pending_review',
    })
    const sourceDefinedRule = obligationRule({
      id: 'fed.pending.source-defined.2026',
      title: 'Federal source-defined calendar',
      jurisdiction: 'FED',
      status: 'pending_review',
      dueDateLogic: {
        kind: 'source_defined_calendar',
        description: 'Official source publishes the annual calendar.',
        holidayRollover: 'source_adjusted',
      },
    })
    nuqsMocks.rule = selectableRule.id
    rpcMocks.listRulesQueryFn.mockResolvedValue([
      selectableRule,
      sourceChangedRule,
      sourceDefinedRule,
    ])
    rpcMocks.listReviewTasksQueryFn.mockResolvedValue([
      reviewTask(selectableRule),
      reviewTask(sourceChangedRule, { reason: 'source_changed' }),
      reviewTask(sourceDefinedRule),
    ])

    await render(<CoverageTab />)
    await waitForText('Pending review queue')

    expect(
      document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:disabled'),
    ).toHaveLength(0)
    await waitForText('AI draft needed')
    await waitForText('Single review')
    expect(
      Array.from(document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')).some(
        (input) => input.getAttribute('aria-label')?.includes('Federal source-defined calendar'),
      ),
    ).toBe(false)
  })

  it('allows source-defined rules with cached AI drafts to enter bulk review', async () => {
    const sourceDefinedRule = obligationRule({
      id: 'fed.pending.source-defined.2026',
      title: 'Federal source-defined calendar',
      jurisdiction: 'FED',
      status: 'pending_review',
      sourceIds: ['fed.source.2026'],
      dueDateLogic: {
        kind: 'source_defined_calendar',
        description: 'Official source publishes the annual calendar.',
        holidayRollover: 'source_adjusted',
      },
    })
    const draft = concreteDraft()
    nuqsMocks.rule = sourceDefinedRule.id
    rpcMocks.listRulesQueryFn.mockResolvedValue([sourceDefinedRule])
    rpcMocks.listReviewTasksQueryFn.mockResolvedValue([reviewTask(sourceDefinedRule)])
    rpcMocks.listConcreteDraftsQueryFn.mockResolvedValue([
      {
        ruleId: sourceDefinedRule.id,
        sourceId: 'fed.source.2026',
        sourceSignalId: 'source_signal_1',
        draft,
      },
    ])

    await render(<CoverageTab />)
    await waitForText('AI draft ready')

    const draftCheckbox = document.querySelector<HTMLInputElement>(
      'input[aria-label="Select AI draft rule Federal source-defined calendar"]',
    )
    expect(draftCheckbox).not.toBeNull()

    await act(async () => {
      draftCheckbox?.click()
    })
    await waitForText('1 selected')

    const reviewSelected = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Review selected'),
    )
    await act(async () => {
      reviewSelected?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await waitForText('AI CONCRETE DRAFTS')
    await waitForText('90% confidence')

    const textarea = document.querySelector<HTMLTextAreaElement>('textarea')
    await act(async () => {
      if (!textarea) return
      setTextareaValue(textarea, 'Reviewed cached AI draft.')
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
      textarea.dispatchEvent(new Event('change', { bubbles: true }))
    })
    const acceptSelected = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Accept selected'),
    )
    await act(async () => {
      acceptSelected?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(rpcMocks.bulkVerifyCandidatesMutationFn.mock.calls[0]?.[0]).toEqual({
      rules: [
        {
          ruleId: sourceDefinedRule.id,
          sourceId: 'fed.source.2026',
          sourceSignalId: 'source_signal_1',
          aiOutputId: draft.aiOutputId,
        },
      ],
      reviewNote: 'Reviewed cached AI draft.',
    })
    expect(rpcMocks.draftConcreteRuleQueryFn).not.toHaveBeenCalled()
  })

  it('does not auto-generate a draft when a source-defined rule is opened', async () => {
    const sourceDefinedRule = obligationRule({
      id: 'fed.pending.source-defined.2026',
      title: 'Federal source-defined calendar',
      jurisdiction: 'FED',
      status: 'pending_review',
      sourceIds: ['fed.source.2026'],
      dueDateLogic: {
        kind: 'source_defined_calendar',
        description: 'Official source publishes the annual calendar.',
        holidayRollover: 'source_adjusted',
      },
    })
    nuqsMocks.rule = sourceDefinedRule.id
    rpcMocks.listRulesQueryFn.mockResolvedValue([sourceDefinedRule])
    rpcMocks.listReviewTasksQueryFn.mockResolvedValue([reviewTask(sourceDefinedRule)])
    rpcMocks.listConcreteDraftsQueryFn.mockResolvedValue([])

    await render(<CoverageTab />)
    await waitForText('AI concrete draft')
    await waitForText('AI concrete draft is not ready.')
    await waitForText('AI draft needed')

    const draftCheckbox = document.querySelector<HTMLInputElement>(
      'input[aria-label="Select AI draft rule Federal source-defined calendar"]',
    )
    expect(draftCheckbox).toBeNull()
    expect(rpcMocks.draftConcreteRuleQueryFn).not.toHaveBeenCalled()
  })

  it('does not surface draft generation failures in the customer-facing path', async () => {
    const sourceDefinedRule = obligationRule({
      id: 'fed.pending.source-defined.2026',
      title: 'Federal source-defined calendar',
      jurisdiction: 'FED',
      status: 'pending_review',
      sourceIds: ['fed.source.2026'],
      dueDateLogic: {
        kind: 'source_defined_calendar',
        description: 'Official source publishes the annual calendar.',
        holidayRollover: 'source_adjusted',
      },
    })
    nuqsMocks.rule = sourceDefinedRule.id
    rpcMocks.listRulesQueryFn.mockResolvedValue([sourceDefinedRule])
    rpcMocks.listReviewTasksQueryFn.mockResolvedValue([reviewTask(sourceDefinedRule)])
    rpcMocks.listConcreteDraftsQueryFn.mockResolvedValue([])

    await render(<CoverageTab />, { queryRetry: 2, retryDelay: 1 })
    await waitForText('AI concrete draft is not ready.')
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })

    expect(rpcMocks.draftConcreteRuleQueryFn).not.toHaveBeenCalled()
  })
})
