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
  RuleSource,
} from '@duedatehq/contracts'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'
import {
  KeyboardShellContext,
  type KeyboardShellContextValue,
} from '@/components/patterns/keyboard-shell/state'

import { RulesLibraryRoute } from './rules.library'

const rpcMocks = vi.hoisted(() => ({
  coverageQueryFn: vi.fn(),
  listSourcesQueryFn: vi.fn(),
  listTemporaryRulesQueryFn: vi.fn(),
  listRulesQueryFn: vi.fn(),
  listConcreteDraftsQueryFn: vi.fn(),
  draftConcreteRuleMutationFn: vi.fn(),
  acceptTemplateMutationFn: vi.fn(),
  verifyCandidateMutationFn: vi.fn(),
  rejectTemplateMutationFn: vi.fn(),
  rejectCandidateMutationFn: vi.fn(),
  previewRuleImpactQueryFn: vi.fn(),
  previewBulkRuleImpactQueryFn: vi.fn(),
  bulkAcceptTemplatesMutationFn: vi.fn(),
  bulkVerifyCandidatesMutationFn: vi.fn(),
  createCustomRuleMutationFn: vi.fn(),
  diffAgainstPredecessorQueryFn: vi.fn(),
  listCatalogReleaseQueryFn: vi.fn(),
}))

const nuqsMocks = vi.hoisted(() => ({
  search: '',
  rule: null as string | null,
  entity: null as string | null,
  jurisdiction: null as string | null,
  scope: null as 'all' | 'active' | 'review' | 'missing' | null,
  setSearch: vi.fn(),
  setRule: vi.fn(),
  setEntity: vi.fn(),
  setJurisdiction: vi.fn(),
  setScope: vi.fn(),
}))

const toastMocks = vi.hoisted(() => ({
  loading: vi.fn(() => 'accept-rule-toast'),
  success: vi.fn(),
  error: vi.fn(),
  dismiss: vi.fn(),
}))

vi.mock('@/lib/rpc', () => ({
  orpc: {
    // RuleDetailInline now embeds the per-rule audit "Version history" panel,
    // which reads firms.listMine (permission gate) + audit.list. Stub both with
    // empty results so the rule-detail tests render without the panel throwing.
    audit: {
      key: () => ['audit'],
      list: {
        queryOptions: () => ({
          queryKey: ['audit', 'list'],
          queryFn: async () => ({ events: [], nextCursor: null }),
        }),
      },
    },
    firms: {
      listMine: {
        queryOptions: () => ({
          queryKey: ['firms', 'listMine'],
          queryFn: async () => [],
        }),
      },
    },
    dashboard: { load: { key: () => ['dashboard', 'load'] } },
    obligations: {
      key: () => ['obligations'],
      facets: { key: () => ['obligations', 'facets'] },
      list: { key: () => ['obligations', 'list'] },
    },
    // RuleDetailInline lazily queries pulse.listAlertsForRule for the
    // "proposed change" block. Stub it with no matches so the drawer
    // renders (the rule-detail tests assert other sections).
    pulse: {
      key: () => ['pulse'],
      listAlertsForRule: {
        queryOptions: ({ input }: { input: unknown }) => ({
          queryKey: ['pulse', 'listAlertsForRule', input],
          queryFn: async () => ({ matches: [] }),
        }),
      },
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
      listTemporaryRules: {
        queryOptions: () => ({
          queryKey: ['rules', 'listTemporaryRules'],
          queryFn: rpcMocks.listTemporaryRulesQueryFn,
        }),
      },
      listRules: {
        key: () => ['rules', 'listRules'],
        queryOptions: () => ({
          queryKey: ['rules', 'listRules'],
          queryFn: rpcMocks.listRulesQueryFn,
        }),
      },
      listReviewTasks: {
        key: () => ['rules', 'listReviewTasks'],
        queryOptions: ({ input }: { input: unknown }) => ({
          queryKey: ['rules', 'listReviewTasks', input],
          queryFn: async () => [],
        }),
      },
      listReviewDecisions: {
        key: () => ['rules', 'listReviewDecisions'],
      },
      listConcreteDrafts: {
        key: () => ['rules', 'listConcreteDrafts'],
        queryOptions: ({ input }: { input: unknown }) => ({
          queryKey: ['rules', 'listConcreteDrafts', input],
          queryFn: rpcMocks.listConcreteDraftsQueryFn,
        }),
      },
      listRuleNotes: {
        key: () => ['rules', 'listRuleNotes'],
        queryOptions: ({ input }: { input: unknown }) => ({
          queryKey: ['rules', 'listRuleNotes', input],
          queryFn: async () => ({ notes: [] }),
        }),
      },
      addRuleNote: {
        mutationOptions: (options: Record<string, unknown>) => ({
          mutationFn: vi.fn(),
          ...options,
        }),
      },
      draftConcreteRule: {
        mutationOptions: (options: Record<string, unknown>) => ({
          mutationFn: rpcMocks.draftConcreteRuleMutationFn,
          ...options,
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
      rejectCandidate: {
        mutationOptions: (options: Record<string, unknown>) => ({
          mutationFn: rpcMocks.rejectCandidateMutationFn,
          ...options,
        }),
      },
      previewRuleImpact: {
        queryOptions: ({ input }: { input: unknown }) => ({
          queryKey: ['rules', 'previewRuleImpact', input],
          queryFn: rpcMocks.previewRuleImpactQueryFn,
        }),
      },
      previewBulkRuleImpact: {
        queryOptions: ({ input }: { input: unknown }) => ({
          queryKey: ['rules', 'previewBulkRuleImpact', input],
          queryFn: rpcMocks.previewBulkRuleImpactQueryFn,
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
      diffAgainstPredecessor: {
        queryOptions: ({ input }: { input: unknown }) => ({
          queryKey: ['rules', 'diffAgainstPredecessor', input],
          queryFn: rpcMocks.diffAgainstPredecessorQueryFn,
        }),
      },
      listCatalogRelease: {
        queryOptions: () => ({
          queryKey: ['rules', 'listCatalogRelease'],
          queryFn: rpcMocks.listCatalogReleaseQueryFn,
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

vi.mock('sonner', () => ({
  toast: toastMocks,
}))

vi.mock('nuqs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('nuqs')>()
  return {
    ...actual,
    useQueryState: (key: string) => {
      if (key === 'q') return [nuqsMocks.search, nuqsMocks.setSearch]
      if (key === 'rule') return [nuqsMocks.rule, nuqsMocks.setRule]
      if (key === 'entity') return [nuqsMocks.entity, nuqsMocks.setEntity]
      if (key === 'jurisdiction') return [nuqsMocks.jurisdiction, nuqsMocks.setJurisdiction]
      if (key === 'scope') return [nuqsMocks.scope, nuqsMocks.setScope]
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

const keyboardShellTestValue: KeyboardShellContextValue = {
  commandPaletteOpen: false,
  shortcutHelpOpen: false,
  shortcutsBlocked: false,
  openCommandPalette: () => undefined,
  closeCommandPalette: () => undefined,
  openShortcutHelp: () => undefined,
  closeShortcutHelp: () => undefined,
}

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

function ruleSource(overrides: Partial<RuleSource> = {}): RuleSource {
  return {
    id: 'az.income_tax',
    jurisdiction: 'AZ',
    title: 'Arizona DOR Income Tax',
    url: 'https://azdor.gov/forms/individual-income-tax-highlights',
    sourceType: 'due_dates',
    acquisitionMethod: 'manual_review',
    cadence: 'pre_season',
    priority: 'critical',
    healthStatus: 'healthy',
    isEarlyWarning: false,
    domains: ['individual_income_return'],
    entityApplicability: ['individual'],
    authorityRole: 'basis',
    notificationChannels: ['practice_rule_review'],
    lastReviewedOn: '2026-05-22',
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

async function waitForSelector(selector: string, attempts = 100): Promise<void> {
  if (document.querySelector(selector)) return
  if (attempts > 0) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
    return waitForSelector(selector, attempts - 1)
  }
  throw new Error(`Expected selector not found: ${selector}`)
}

async function waitForButton(name: string, attempts = 100): Promise<void> {
  if (findButton(name)) return
  if (attempts > 0) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
    return waitForButton(name, attempts - 1)
  }
  const buttons = Array.from(document.querySelectorAll('button')).map(readableButtonText)
  throw new Error(`Expected button not found: ${name}; buttons=${buttons.join(', ')}`)
}

async function waitForAssertion(assertion: () => void, attempts = 100): Promise<void> {
  try {
    assertion()
  } catch (error) {
    if (attempts > 0) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })
      return waitForAssertion(assertion, attempts - 1)
    }
    throw error
  }
}

async function clickButton(name: string) {
  const button = findButton(name)
  expect(button).toBeDefined()
  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, resolve, reject }
}

function findButton(name: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll('button')).find(
    (candidate): candidate is HTMLButtonElement =>
      candidate.textContent?.trim() === name || readableButtonText(candidate) === name,
  )
}

function readableButtonText(button: HTMLButtonElement): string {
  return Array.from(button.childNodes)
    .map((node) => node.textContent?.trim())
    .filter((part): part is string => Boolean(part))
    .join(' ')
}

const coverageRows: RuleCoverageRow[] = []

function coverageRow(overrides: Partial<RuleCoverageRow>): RuleCoverageRow {
  return {
    jurisdiction: 'AZ',
    sourceCount: 1,
    verifiedRuleCount: 0,
    candidateCount: 0,
    highPrioritySourceCount: 1,
    missingSourceCount: 0,
    requiredSourceCount: 1,
    missingSourceDomains: [],
    sourceCoverageStatus: 'source_verified',
    activeRuleCount: 0,
    pendingReviewCount: 0,
    rejectedRuleCount: 0,
    archivedRuleCount: 0,
    customRuleCount: 0,
    entityCoverage: {
      llc: 'active',
      partnership: 'active',
      s_corp: 'active',
      c_corp: 'active',
      sole_prop: 'active',
      individual: 'none',
      trust: 'none',
    },
    entitySourceCoverage: {
      llc: 'rule_active',
      partnership: 'rule_active',
      s_corp: 'rule_active',
      c_corp: 'rule_active',
      sole_prop: 'rule_active',
      individual: 'missing_source',
      trust: 'missing_source',
    },
    ...overrides,
  }
}

beforeEach(() => {
  bootstrapI18n()
  rpcMocks.coverageQueryFn.mockReset()
  rpcMocks.coverageQueryFn.mockResolvedValue(coverageRows)
  rpcMocks.listSourcesQueryFn.mockReset()
  rpcMocks.listSourcesQueryFn.mockResolvedValue([])
  rpcMocks.listTemporaryRulesQueryFn.mockReset()
  rpcMocks.listTemporaryRulesQueryFn.mockResolvedValue([])
  rpcMocks.listRulesQueryFn.mockReset()
  rpcMocks.listRulesQueryFn.mockResolvedValue([])
  rpcMocks.listConcreteDraftsQueryFn.mockReset()
  rpcMocks.listConcreteDraftsQueryFn.mockResolvedValue([])
  rpcMocks.draftConcreteRuleMutationFn.mockReset()
  rpcMocks.draftConcreteRuleMutationFn.mockResolvedValue(null)
  rpcMocks.acceptTemplateMutationFn.mockReset()
  rpcMocks.acceptTemplateMutationFn.mockResolvedValue({})
  rpcMocks.verifyCandidateMutationFn.mockReset()
  rpcMocks.verifyCandidateMutationFn.mockResolvedValue({})
  rpcMocks.rejectTemplateMutationFn.mockReset()
  rpcMocks.rejectTemplateMutationFn.mockResolvedValue({})
  rpcMocks.rejectCandidateMutationFn.mockReset()
  rpcMocks.rejectCandidateMutationFn.mockResolvedValue({})
  rpcMocks.diffAgainstPredecessorQueryFn.mockReset()
  rpcMocks.diffAgainstPredecessorQueryFn.mockResolvedValue({
    hasPredecessor: false,
    classification: 'new',
    fields: [],
  })
  rpcMocks.listCatalogReleaseQueryFn.mockReset()
  rpcMocks.listCatalogReleaseQueryFn.mockResolvedValue(null)
  rpcMocks.previewRuleImpactQueryFn.mockReset()
  rpcMocks.previewRuleImpactQueryFn.mockResolvedValue({
    selectedCount: 1,
    acceptReadyCount: 1,
    skipped: [],
    jurisdictionCounts: [{ key: 'CA', count: 1 }],
    entityCounts: [{ key: 'individual', count: 1 }],
    formCounts: [{ key: 'Form 540', count: 1 }],
    reviewReasonCounts: [],
    classificationCounts: { new: 1, date_only: 0, substantive: 0 },
    sourceCount: 1,
    estimatedObligationCount: 1,
    affectedClientCount: 1,
  })
  rpcMocks.previewBulkRuleImpactQueryFn.mockReset()
  rpcMocks.previewBulkRuleImpactQueryFn.mockResolvedValue({
    selectedCount: 2,
    acceptReadyCount: 2,
    skipped: [],
    jurisdictionCounts: [{ key: 'AZ', count: 2 }],
    entityCounts: [{ key: 'individual', count: 2 }],
    formCounts: [{ key: 'Form 140', count: 2 }],
    reviewReasonCounts: [],
    classificationCounts: { new: 2, date_only: 0, substantive: 0 },
    sourceCount: 1,
    estimatedObligationCount: 2,
    affectedClientCount: 2,
  })
  rpcMocks.bulkAcceptTemplatesMutationFn.mockReset()
  rpcMocks.bulkAcceptTemplatesMutationFn.mockResolvedValue({ accepted: [], skipped: [] })
  rpcMocks.bulkVerifyCandidatesMutationFn.mockReset()
  rpcMocks.bulkVerifyCandidatesMutationFn.mockResolvedValue({ verified: [], skipped: [] })
  rpcMocks.createCustomRuleMutationFn.mockReset()
  rpcMocks.createCustomRuleMutationFn.mockResolvedValue({})
  toastMocks.loading.mockReset()
  toastMocks.loading.mockReturnValue('accept-rule-toast')
  toastMocks.success.mockReset()
  toastMocks.error.mockReset()
  toastMocks.dismiss.mockReset()
  nuqsMocks.search = ''
  nuqsMocks.rule = null
  nuqsMocks.entity = null
  nuqsMocks.jurisdiction = null
  nuqsMocks.scope = null
  nuqsMocks.setSearch.mockReset()
  nuqsMocks.setRule.mockReset()
  nuqsMocks.setEntity.mockReset()
  nuqsMocks.setJurisdiction.mockReset()
  nuqsMocks.setScope.mockReset()
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
  it('does not show zeroed review metrics while the initial catalog loads', async () => {
    const rulesRequest = deferred<ObligationRule[]>()
    const coverageRequest = deferred<RuleCoverageRow[]>()
    const sourcesRequest = deferred<RuleSource[]>()
    const rule = obligationRule({
      id: 'az.individual_income_return.candidate.2026',
      title: 'Arizona individual income tax return',
      jurisdiction: 'AZ',
    })
    rpcMocks.listRulesQueryFn.mockReturnValue(rulesRequest.promise)
    rpcMocks.coverageQueryFn.mockReturnValue(coverageRequest.promise)
    rpcMocks.listSourcesQueryFn.mockReturnValue(sourcesRequest.promise)

    await render(<RulesLibraryRoute />)

    expect(document.querySelector('[aria-busy="true"]')).toBeDefined()
    expect(document.querySelector('[title="0 need review"]')).toBeNull()

    await act(async () => {
      rulesRequest.resolve([rule])
      coverageRequest.resolve([coverageRow({ jurisdiction: 'AZ' })])
      sourcesRequest.resolve([ruleSource()])
      await Promise.all([rulesRequest.promise, coverageRequest.promise, sourcesRequest.promise])
    })

    await waitForSelector('[title="1 rule to review"]')
    expect(document.querySelector('[aria-busy="true"]')).toBeNull()
  })

  // 2026-06-10 (Pencil O0pyRO overview): the grouped jurisdiction table
  // (collapsible state rows) retired — the "All jurisdictions" overview is
  // now a summary dashboard (stats band + recent changes), and rule rows
  // only render after drilling into a jurisdiction via the rail.
  it('renders the overview as a summary dashboard without a rule table', async () => {
    const federalRule = obligationRule({
      id: 'fed.1040.return.2026',
      title: 'Federal individual income tax return',
      jurisdiction: 'FED',
      formName: 'Federal Row Form',
      sourceIds: ['irs.1040'],
      evidence: [
        {
          sourceId: 'irs.1040',
          authorityRole: 'basis',
          locator: { kind: 'html', heading: 'Federal due dates' },
          summary: 'Federal individual income tax due date.',
          sourceExcerpt: 'Returns are due by April 15, 2026.',
          retrievedAt: '2026-05-22',
        },
      ],
    })
    const stateRule = obligationRule({
      id: 'az.individual_income_return.candidate.2026',
      title: 'Arizona individual income tax return',
      jurisdiction: 'AZ',
      formName: 'Arizona Row Form',
      reviewedAt: new Date().toISOString(),
    })
    rpcMocks.listRulesQueryFn.mockResolvedValue([federalRule, stateRule])

    await render(<RulesLibraryRoute />)
    await waitForText('Federal')
    await waitForText('Arizona')
    await waitForText('2 rules need your review')
    await waitForText('Coverage')
    await waitForText('Recent changes')
    await waitForText('Last 30 days')

    // No rule table on the overview — drilling into a rail jurisdiction
    // is what swaps in the working console with the per-state table.
    expect(document.querySelector('table')).toBeNull()
    expect(findButton('Federal 1')).toBeDefined()
    expect(findButton('Arizona 1')).toBeDefined()
  })

  it('keeps the selected jurisdiction table in a scrollable flex pane', async () => {
    nuqsMocks.jurisdiction = 'FED'
    const federalRule = obligationRule({
      id: 'fed.1040.return.active.2026',
      title: 'Federal individual income tax return',
      jurisdiction: 'FED',
      formName: 'Form 1040',
      status: 'active',
      version: 2,
    })
    rpcMocks.listRulesQueryFn.mockResolvedValue([federalRule])

    await render(<RulesLibraryRoute />)
    // 2026-06-10 (oJL8o per-state table): the Form column retired — rows
    // carry Rule name / Type / Effective / Last modified / Severity /
    // Status, so wait on the stripped rule title instead of the form code.
    await waitForText('Individual income tax return')

    const rightPane = Array.from(document.querySelectorAll('div')).find(
      (el) =>
        typeof el.className === 'string' &&
        el.className.includes('min-h-0 min-w-0 flex-1 flex-col') &&
        el.textContent?.includes('Federal'),
    )
    let tableFrame = document.querySelector('table')?.parentElement ?? null
    while (
      tableFrame &&
      typeof tableFrame.className === 'string' &&
      !tableFrame.className.includes('border-divider-subtle')
    ) {
      tableFrame = tableFrame.parentElement
    }

    expect(rightPane?.className).toContain('min-h-0')
    expect(tableFrame?.className).toContain('min-h-0')
    expect(tableFrame?.className).toContain('flex-1')
    expect(tableFrame?.className).toContain('overflow-y-auto')
    expect(tableFrame?.textContent).toContain('Income Tax')
    expect(tableFrame?.textContent).not.toContain('v2')
  })

  it('defaults a selected jurisdiction to review when pending rules exist', async () => {
    nuqsMocks.jurisdiction = 'FED'
    const activeRule = obligationRule({
      id: 'fed.1040.return.active.2026',
      title: 'Federal individual income tax return',
      jurisdiction: 'FED',
      formName: 'Form 1040',
      status: 'active',
    })
    const reviewRule = obligationRule({
      id: 'fed.disaster_relief.candidate.2026',
      title: 'Federal disaster tax relief candidate watch',
      jurisdiction: 'FED',
      formName: 'IRS disaster relief notice',
      status: 'candidate',
    })
    rpcMocks.listRulesQueryFn.mockResolvedValue([activeRule, reviewRule])

    await render(<RulesLibraryRoute />)
    await waitForText('Disaster tax relief candidate watch')

    const rowTexts = Array.from(document.querySelectorAll('tbody tr')).map(
      (row) => row.textContent ?? '',
    )
    const reviewIndex = rowTexts.findIndex((text) =>
      text.includes('Disaster tax relief candidate watch'),
    )
    const activeIndex = rowTexts.findIndex((text) => text.includes('Individual income tax return'))

    expect(reviewIndex).toBeGreaterThanOrEqual(0)
    expect(activeIndex).toBe(-1)
  })

  it('falls back to active for a selected jurisdiction with no pending review rules', async () => {
    nuqsMocks.jurisdiction = 'AK'
    const activeRule = obligationRule({
      id: 'ak.business_income_return.active.2026',
      title: 'Alaska business income tax return',
      jurisdiction: 'AK',
      formName: 'Alaska business form',
      status: 'active',
    })
    rpcMocks.listRulesQueryFn.mockResolvedValue([activeRule])

    await render(<RulesLibraryRoute />)
    await waitForText('Business income tax return')

    expect(document.body.textContent).not.toContain('No rules in Alaska for this view.')
  })

  it('sets the jurisdiction scope to review first when switching states from the rail', async () => {
    const activeAlaskaRule = obligationRule({
      id: 'ak.business_income_return.active.2026',
      title: 'Alaska business income tax return',
      jurisdiction: 'AK',
      status: 'active',
    })
    const pendingAlabamaRule = obligationRule({
      id: 'al.individual_income_return.candidate.2026',
      title: 'Alabama individual income tax return',
      jurisdiction: 'AL',
      status: 'candidate',
    })
    rpcMocks.listRulesQueryFn.mockResolvedValue([pendingAlabamaRule, activeAlaskaRule])

    await render(<RulesLibraryRoute />)
    await waitForText('Alabama')

    const alabamaButton = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Alabama'),
    )
    const alaskaButton = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Alaska'),
    )

    await act(async () => {
      alabamaButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await act(async () => {
      alaskaButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(nuqsMocks.setScope).toHaveBeenNthCalledWith(1, 'review')
    expect(nuqsMocks.setScope).toHaveBeenNthCalledWith(2, 'active')
  })

  it('lists rail jurisdictions with Federal first and states alphabetical', async () => {
    const federalRule = obligationRule({
      id: 'fed.1040.return.active.2026',
      title: 'Federal individual income tax return',
      jurisdiction: 'FED',
      status: 'active',
    })
    const activeAlaskaRule = obligationRule({
      id: 'ak.business_income_return.active.2026',
      title: 'Alaska business income tax return',
      jurisdiction: 'AK',
      status: 'active',
    })
    const pendingAlabamaRule = obligationRule({
      id: 'al.individual_income_return.candidate.2026',
      title: 'Alabama individual income tax return',
      jurisdiction: 'AL',
      status: 'candidate',
    })
    rpcMocks.listRulesQueryFn.mockResolvedValue([pendingAlabamaRule, activeAlaskaRule, federalRule])

    await render(<RulesLibraryRoute />)
    await waitForText('Federal')
    await waitForText('Alaska')
    await waitForText('Alabama')

    // 2026-06-10 (Pencil O0pyRO): the grouped table (and its fully-active-
    // first priority sort) retired — the jurisdictions RAIL is the
    // navigation surface now, with a Federal section above an alphabetical
    // States list (predictable lookup order, review counts shown per row).
    const buttons = Array.from(document.querySelectorAll('button'))
    const federalIndex = buttons.findIndex((b) => b.textContent?.includes('Federal'))
    const alabamaIndex = buttons.findIndex((b) => b.textContent?.includes('Alabama'))
    const alaskaIndex = buttons.findIndex((b) => b.textContent?.includes('Alaska'))

    expect(federalIndex).toBeGreaterThanOrEqual(0)
    expect(alabamaIndex).toBeGreaterThan(federalIndex)
    expect(alaskaIndex).toBeGreaterThan(alabamaIndex)
  })

  // 2026-06-10: the "auto-expands a state after batch review" walkthrough
  // test retired with the grouped table + the "Open review queue" CTA. The
  // one-at-a-time BatchReviewModal is no longer reachable from the UI (the
  // bulk-review list modal is the canonical entry; see the bulk-review test
  // below), and jurisdiction groups no longer expand in place — the rail
  // navigates to a per-state table instead.

  // 2026-06-10 (oJL8o per-state table): coverage gaps now render as gap
  // rows inside the selected jurisdiction's Missing scope, so these tests
  // drill into the state instead of expanding an overview group row.
  it('does not render add-rule gaps for not-applicable entity coverage', async () => {
    nuqsMocks.jurisdiction = 'AK'
    nuqsMocks.scope = 'missing'
    rpcMocks.coverageQueryFn.mockResolvedValue([
      coverageRow({
        jurisdiction: 'AK',
        sourceCoverageStatus: 'rule_pending_review',
        entityCoverage: {
          llc: 'review',
          partnership: 'review',
          s_corp: 'review',
          c_corp: 'review',
          sole_prop: 'review',
          individual: 'none',
          trust: 'none',
        },
        entitySourceCoverage: {
          llc: 'rule_pending_review',
          partnership: 'rule_pending_review',
          s_corp: 'rule_pending_review',
          c_corp: 'rule_pending_review',
          sole_prop: 'rule_pending_review',
          individual: 'not_applicable',
          trust: 'not_applicable',
        },
      }),
    ])

    await render(<RulesLibraryRoute />)
    await waitForText('Alaska')
    await waitForText('No rules in Alaska for this view.')

    expect(document.body.textContent).not.toContain('No rule defined for this entity in Alaska')
    expect(document.body.textContent).not.toContain('Add rule')
  })

  it('still renders add-rule gaps for applicable entity coverage without a rule', async () => {
    nuqsMocks.jurisdiction = 'AZ'
    nuqsMocks.scope = 'missing'
    rpcMocks.coverageQueryFn.mockResolvedValue([
      coverageRow({
        jurisdiction: 'AZ',
        entityCoverage: {
          llc: 'active',
          partnership: 'active',
          s_corp: 'active',
          c_corp: 'active',
          sole_prop: 'active',
          individual: 'none',
          trust: 'active',
        },
        entitySourceCoverage: {
          llc: 'rule_active',
          partnership: 'rule_active',
          s_corp: 'rule_active',
          c_corp: 'rule_active',
          sole_prop: 'rule_active',
          individual: 'missing_source',
          trust: 'rule_active',
        },
      }),
    ])

    await render(<RulesLibraryRoute />)
    await waitForText('Arizona')
    await waitForText('No rule defined for this entity in Arizona')

    expect(document.body.textContent).toContain('Add rule')
  })

  it('shows a scope-specific empty state when the Missing scope has no gaps', async () => {
    nuqsMocks.jurisdiction = 'AZ'
    nuqsMocks.scope = 'missing'
    rpcMocks.coverageQueryFn.mockResolvedValue([
      coverageRow({
        jurisdiction: 'AZ',
        entityCoverage: {
          llc: 'active',
          partnership: 'active',
          s_corp: 'active',
          c_corp: 'active',
          sole_prop: 'active',
          individual: 'active',
          trust: 'active',
        },
        entitySourceCoverage: {
          llc: 'rule_active',
          partnership: 'rule_active',
          s_corp: 'rule_active',
          c_corp: 'rule_active',
          sole_prop: 'rule_active',
          individual: 'rule_active',
          trust: 'rule_active',
        },
      }),
    ])
    rpcMocks.listRulesQueryFn.mockResolvedValue([
      obligationRule({
        id: 'az.individual_income_return.active.2026',
        status: 'active',
      }),
    ])

    await render(<RulesLibraryRoute />)
    // 2026-06-10: the dedicated `MissingRulesEmptyState` card retired with
    // the grouped overview table — a clean Missing scope now reads as the
    // per-state table's scoped empty row, never the global catalog-empty
    // state (which would wrongly suggest importing from sources).
    await waitForText('No rules in Arizona for this view.')

    expect(document.body.textContent).not.toContain('Your rule catalog is empty.')
    expect(document.body.textContent).not.toContain('Import from sources')
  })

  it('shows cached AI concrete drafts in the selected rule detail', async () => {
    const rule = obligationRule({})
    nuqsMocks.rule = rule.id
    rpcMocks.listRulesQueryFn.mockResolvedValue([rule])
    rpcMocks.listConcreteDraftsQueryFn.mockResolvedValue([
      {
        ruleId: rule.id,
        sourceId: 'az.income_tax',
        draft: concreteDraft(),
      },
    ])

    await render(<RulesLibraryRoute />)
    await waitForText('AI concrete draft')
    await waitForText('April 15, 2026')

    expect(document.body.textContent).not.toContain('AI concrete draft is not ready.')
    expect(rpcMocks.listConcreteDraftsQueryFn).toHaveBeenCalled()
  })

  it('opens official sources from evidence cards with an explicit click handler', async () => {
    const rule = obligationRule({})
    const source = ruleSource()
    const open = vi.spyOn(window, 'open').mockReturnValue(window)
    nuqsMocks.rule = rule.id
    rpcMocks.listRulesQueryFn.mockResolvedValue([rule])
    rpcMocks.listSourcesQueryFn.mockResolvedValue([source])

    await render(<RulesLibraryRoute />)
    await waitForText(source.title)

    const link = document.querySelector<HTMLAnchorElement>(
      `a[aria-label="Open official source: ${source.title}"]`,
    )
    expect(link).toBeDefined()

    await act(async () => {
      link?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })

    expect(open).toHaveBeenCalledWith(source.url, '_blank', 'noopener,noreferrer')
  })

  it('keeps evidence retrieval and source update timestamps out of the selected rule detail', async () => {
    const rule = obligationRule({
      evidence: [
        {
          sourceId: 'az.income_tax',
          authorityRole: 'basis',
          locator: { kind: 'html', heading: 'Due Date for Calendar Year Filers' },
          summary: 'Arizona individual income tax due date.',
          sourceExcerpt: 'Returns are due by April 15, 2026.',
          retrievedAt: '2026-05-22',
          sourceUpdatedOn: '2026-04-27',
        },
      ],
    })
    const source = ruleSource()
    nuqsMocks.rule = rule.id
    rpcMocks.listRulesQueryFn.mockResolvedValue([rule])
    rpcMocks.listSourcesQueryFn.mockResolvedValue([source])

    await render(<RulesLibraryRoute />)
    await waitForText(source.title)

    expect(document.body.textContent).not.toContain('retrieved 2026-05-22')
    expect(document.body.textContent).not.toContain('updated 2026-04-27')
  })

  it('keeps the current page in place when evidence opens with noopener', async () => {
    const rule = obligationRule({})
    const source = ruleSource()
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    nuqsMocks.rule = rule.id
    rpcMocks.listRulesQueryFn.mockResolvedValue([rule])
    rpcMocks.listSourcesQueryFn.mockResolvedValue([source])

    await render(<RulesLibraryRoute />)
    await waitForText(source.title)

    const link = document.querySelector<HTMLAnchorElement>(
      `a[aria-label="Open official source: ${source.title}"]`,
    )
    expect(link).toBeDefined()

    await act(async () => {
      link?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })

    expect(open).toHaveBeenCalledWith(source.url, '_blank', 'noopener,noreferrer')
    expect(window.location.href).toBe('http://localhost:3000/')
  })

  it('does not show seed review placeholders as practice review metadata', async () => {
    const rule = obligationRule({
      status: 'pending_review',
      verifiedBy: 'practice.owner_or_manager_required',
      verifiedAt: '2026-04-27',
    })
    nuqsMocks.rule = rule.id
    rpcMocks.listRulesQueryFn.mockResolvedValue([rule])

    await render(<RulesLibraryRoute />)
    await waitForText(rule.title)

    expect(document.body.textContent).not.toContain('Reviewed by')
    expect(document.body.textContent).not.toContain('Reviewed at')
    expect(document.body.textContent).not.toContain('practice.owner_or_manager_required')
  })

  it('does not show review metadata for default-active templates without practice review', async () => {
    const rule = obligationRule({
      id: 'fed.1040.return.2025',
      title: 'Federal Form 1040 individual income tax return',
      jurisdiction: 'FED',
      status: 'active',
      verifiedBy: 'practice.template_seed',
      verifiedAt: '2026-04-27',
      nextReviewOn: '2026-11-15',
    })
    nuqsMocks.rule = rule.id
    rpcMocks.listRulesQueryFn.mockResolvedValue([rule])

    await render(<RulesLibraryRoute />)
    await waitForText(rule.title)

    expect(document.body.textContent).not.toContain('Reviewed by')
    expect(document.body.textContent).not.toContain('Reviewed at')
    expect(document.body.textContent).not.toContain('Template verification')
    expect(document.body.textContent).not.toContain('practice.template_seed')
    expect(document.body.textContent).not.toContain('Next source review')
    expect(document.body.textContent).not.toContain('2026-11-15')
  })

  it('shows the reviewer name and audit timestamp for reviewed practice rules', async () => {
    const rule = obligationRule({
      status: 'active',
      verifiedBy: 'Sarah Martinez',
      verifiedAt: '2026-05-23',
      reviewedByName: 'Sarah Martinez',
      reviewedAt: '2026-05-23T14:08:09.000Z',
    })
    nuqsMocks.rule = rule.id
    rpcMocks.listRulesQueryFn.mockResolvedValue([rule])

    await render(<RulesLibraryRoute />)
    await waitForText('Sarah Martinez')

    expect(document.body.textContent).toContain('Reviewed by')
    expect(document.body.textContent).toContain('Sarah Martinez')
    expect(document.body.textContent).toContain('Reviewed at')
    expect(document.body.textContent).toContain('2026-05-23 10:08:09')
    expect(document.body.textContent).not.toContain('Next review')
    expect(document.body.textContent).not.toContain('Next source review')
  })

  // 2026-06-10: the one-at-a-time walkthrough ("Open review queue" →
  // "1 / 2" progress → Skip/Done) is no longer reachable — the bulk-review
  // list modal (Pencil `Oaey3`) is the canonical batch surface. The two
  // walkthrough tests were replaced by the bulk-modal test below; the
  // accept-toast contract moved to the rule-detail review dialog.

  it('uses the global toast surface for accept progress instead of an inline accept tooltip', async () => {
    const rule = obligationRule({
      id: 'az.individual_income_return.candidate.2026',
      title: 'Arizona individual income tax return',
      dueDateLogic: {
        kind: 'fixed_date',
        date: '2026-04-15',
        holidayRollover: 'source_adjusted',
      },
      sourceIds: [],
      evidence: [],
    })
    nuqsMocks.rule = rule.id
    const acceptRequest = deferred<Record<string, never>>()
    rpcMocks.listRulesQueryFn.mockResolvedValue([rule])
    rpcMocks.acceptTemplateMutationFn.mockReturnValueOnce(acceptRequest.promise)

    await render(<RulesLibraryRoute />)
    await waitForButton('Accept rule')

    // "Accept rule" opens the Confirm-accept review dialog; the actual
    // write fires from its "Activate rule" confirm CTA.
    await clickButton('Accept rule')
    await waitForText('Confirm accept')
    await clickButton('Activate rule')

    await waitForAssertion(() => {
      expect(toastMocks.loading).toHaveBeenCalledWith(
        'Accepting rule…',
        expect.objectContaining({
          style: expect.objectContaining({
            background: 'var(--state-accent-hover)',
            borderColor: 'var(--state-accent-hover-alt)',
          }),
        }),
      )
    })
    expect(document.body.textContent).not.toContain('Accepting rule…')

    await act(async () => {
      acceptRequest.resolve({})
      await acceptRequest.promise
    })

    await waitForAssertion(() => {
      expect(toastMocks.success).toHaveBeenCalledWith(
        // Accept closure copy (2026-07-02 ux-flow audit): "activated" +
        // the real generated-deadline count from the impact preview the
        // confirm dialog already showed (mock preview reports 1).
        'Rule activated — 1 deadline generated',
        expect.objectContaining({
          id: 'accept-rule-toast',
          style: expect.objectContaining({
            background: 'var(--state-success-hover)',
            borderColor: 'var(--state-success-hover-alt)',
          }),
        }),
      )
    })
    expect(document.body.textContent).not.toContain('Rule activated')
  })

  it('bulk accepts the selected rules from the review list modal and refreshes the catalog', async () => {
    nuqsMocks.jurisdiction = 'AZ'
    const firstRule = obligationRule({
      id: 'az.individual_income_return.candidate.2026',
      title: 'Arizona individual income tax return',
      dueDateLogic: {
        kind: 'fixed_date',
        date: '2026-04-15',
        holidayRollover: 'source_adjusted',
      },
      sourceIds: [],
      evidence: [],
    })
    const secondRule = obligationRule({
      id: 'az.franchise_tax_return.candidate.2026',
      title: 'Arizona franchise tax return',
      dueDateLogic: {
        kind: 'fixed_date',
        date: '2026-04-15',
        holidayRollover: 'source_adjusted',
      },
      sourceIds: [],
      evidence: [],
    })
    rpcMocks.listRulesQueryFn.mockResolvedValue([firstRule, secondRule])
    rpcMocks.bulkAcceptTemplatesMutationFn.mockResolvedValue({
      accepted: [firstRule.id, secondRule.id],
      skipped: [],
    })

    await render(<RulesLibraryRoute />)
    await waitForText('Individual income tax return')

    // The header tri-state checkbox selects every reviewable row, which
    // floats the bulk bar with its "Review N" CTA.
    const selectAll = document.querySelector('[aria-label="Select all rules needing review"]')
    expect(selectAll).toBeDefined()
    await act(async () => {
      selectAll?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    await waitForButton('Review 2')
    await clickButton('Review 2')
    await waitForText('Bulk review')

    // The shared review note is required before the batch can be applied.
    const noteField = document.querySelector('textarea')
    expect(noteField).toBeInstanceOf(HTMLTextAreaElement)
    const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')
    await act(async () => {
      descriptor?.set?.call(noteField, 'Reviewed against the source.')
      noteField?.dispatchEvent(new Event('input', { bubbles: true }))
    })

    const callsBeforeAccept = rpcMocks.listRulesQueryFn.mock.calls.length
    await waitForButton('Accept 2')
    await clickButton('Accept 2')

    await waitForAssertion(() => {
      expect(rpcMocks.bulkAcceptTemplatesMutationFn).toHaveBeenCalled()
    })
    const acceptInput = rpcMocks.bulkAcceptTemplatesMutationFn.mock.calls[0]?.[0] as {
      rules: Array<{ ruleId: string }>
      reviewNote: string
    }
    expect(acceptInput.reviewNote).toBe('Reviewed against the source.')
    expect(acceptInput.rules.map((entry) => entry.ruleId).toSorted()).toEqual(
      [firstRule.id, secondRule.id].toSorted(),
    )

    // Success invalidates the rules queries (catalog refetch) and closes
    // the modal via onComplete.
    await waitForAssertion(() => {
      expect(rpcMocks.listRulesQueryFn.mock.calls.length).toBeGreaterThan(callsBeforeAccept)
    })
    await waitForAssertion(() => {
      expect(toastMocks.success).toHaveBeenCalledWith('2 rules accepted')
    })
    await waitForAssertion(() => {
      expect(findButton('Accept 2')).toBeUndefined()
    })
  })
})
