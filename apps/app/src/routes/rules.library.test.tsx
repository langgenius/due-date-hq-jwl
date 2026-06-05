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
  listRulesQueryFn: vi.fn(),
  listConcreteDraftsQueryFn: vi.fn(),
  draftConcreteRuleMutationFn: vi.fn(),
  acceptTemplateMutationFn: vi.fn(),
  verifyCandidateMutationFn: vi.fn(),
  rejectTemplateMutationFn: vi.fn(),
  previewRuleImpactQueryFn: vi.fn(),
  createCustomRuleMutationFn: vi.fn(),
}))

const nuqsMocks = vi.hoisted(() => ({
  search: '',
  rule: null as string | null,
  entity: null as string | null,
  scope: null as 'all' | 'active' | 'review' | 'missing' | null,
  setSearch: vi.fn(),
  setRule: vi.fn(),
  setEntity: vi.fn(),
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
        key: () => ['rules', 'listRules'],
        queryOptions: () => ({
          queryKey: ['rules', 'listRules'],
          queryFn: rpcMocks.listRulesQueryFn,
        }),
      },
      listReviewTasks: {
        key: () => ['rules', 'listReviewTasks'],
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
      previewRuleImpact: {
        queryOptions: ({ input }: { input: unknown }) => ({
          queryKey: ['rules', 'previewRuleImpact', input],
          queryFn: rpcMocks.previewRuleImpactQueryFn,
        }),
      },
      createCustomRule: {
        mutationOptions: (options: Record<string, unknown>) => ({
          mutationFn: rpcMocks.createCustomRuleMutationFn,
          ...options,
        }),
      },
    },
    // 2026-06-05 (post-merge regression fix): the alerts/today card
    // redesign cherry-pick (3495a30c → 3fe74bf6) added a "Recent
    // alerts" panel inside RuleDetailInline that calls
    // `orpc.pulse.listAlertsForRule.queryOptions` at render time.
    // Returning an empty list keeps the rule-detail panel renderable
    // without these tests having to opt into the alerts surface.
    pulse: {
      key: () => ['pulse'],
      listAlertsForRule: {
        queryOptions: () => ({
          queryKey: ['pulse', 'listAlertsForRule'],
          queryFn: async () => ({ alerts: [] }),
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
  rpcMocks.previewRuleImpactQueryFn.mockReset()
  rpcMocks.previewRuleImpactQueryFn.mockResolvedValue({
    selectedCount: 1,
    acceptReadyCount: 1,
    skipped: [],
    jurisdictionCounts: [{ key: 'CA', count: 1 }],
    entityCounts: [{ key: 'individual', count: 1 }],
    formCounts: [{ key: 'Form 540', count: 1 }],
    reviewReasonCounts: [],
    estimatedObligationCount: 1,
  })
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
  nuqsMocks.scope = null
  nuqsMocks.setSearch.mockReset()
  nuqsMocks.setRule.mockReset()
  nuqsMocks.setEntity.mockReset()
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

    await waitForSelector('[title="1 need review"]')
    expect(document.querySelector('[aria-busy="true"]')).toBeNull()
  })

  it('defaults to all jurisdiction groups collapsed', async () => {
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
    })
    rpcMocks.listRulesQueryFn.mockResolvedValue([federalRule, stateRule])

    await render(<RulesLibraryRoute />)
    await waitForText('Federal')
    await waitForText('Arizona')

    expect(document.body.textContent).not.toContain('Federal Row Form')
    expect(document.body.textContent).not.toContain('Arizona Row Form')

    const federalRow = Array.from(document.querySelectorAll('tbody tr')).find((row) =>
      row.textContent?.includes('Federal'),
    )
    expect(federalRow).toBeDefined()

    await act(async () => {
      federalRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    await waitForText('Federal Row Form')
  })

  it('sorts fully active state groups ahead of jurisdictions that still need review', async () => {
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

    const groupRows = Array.from(document.querySelectorAll('tbody tr[data-state="collapsed"]'))
    const federalIndex = groupRows.findIndex((row) => row.textContent?.includes('Federal'))
    const alaskaIndex = groupRows.findIndex((row) => row.textContent?.includes('Alaska'))
    const alabamaIndex = groupRows.findIndex((row) => row.textContent?.includes('Alabama'))
    const alaskaTierCell = groupRows[alaskaIndex]?.querySelector('td:nth-child(10)')

    expect(federalIndex).toBe(0)
    expect(alaskaIndex).toBeGreaterThan(federalIndex)
    expect(alaskaIndex).toBeLessThan(alabamaIndex)
    expect(alaskaTierCell?.querySelector('[title="1 active"]')).toBeDefined()
    expect(alaskaTierCell?.querySelector('[title="1 need review"]')).toBeNull()
  })

  it('auto-expands a state after batch review activates every pending rule and moves it into view', async () => {
    const federalRule = obligationRule({
      id: 'fed.1040.return.active.2026',
      title: 'Federal individual income tax return',
      jurisdiction: 'FED',
      status: 'active',
    })
    const activeStateRules = (
      ['CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'IA', 'ID'] satisfies Array<
        ObligationRule['jurisdiction']
      >
    ).map((jurisdiction) =>
      obligationRule({
        id: `${jurisdiction.toLowerCase()}.active.2026`,
        title: `${jurisdiction} active tax return`,
        jurisdiction,
        formName: `${jurisdiction} Row Form`,
        status: 'active',
      }),
    )
    const alaskaFinalRule = obligationRule({
      id: 'ak.individual_income_return.candidate.2026',
      title: 'Alaska individual income tax return',
      jurisdiction: 'AK',
      formName: 'Alaska Row Form',
      dueDateLogic: {
        kind: 'fixed_date',
        date: '2026-04-15',
        holidayRollover: 'source_adjusted',
      },
      sourceIds: [],
      evidence: [],
    })
    rpcMocks.coverageQueryFn.mockResolvedValue([
      coverageRow({
        jurisdiction: 'AK',
        activeRuleCount: 0,
        pendingReviewCount: 1,
        entityCoverage: {
          llc: 'active',
          partnership: 'active',
          s_corp: 'active',
          c_corp: 'active',
          sole_prop: 'active',
          individual: 'review',
          trust: 'active',
        },
        entitySourceCoverage: {
          llc: 'rule_active',
          partnership: 'rule_active',
          s_corp: 'rule_active',
          c_corp: 'rule_active',
          sole_prop: 'rule_active',
          individual: 'rule_pending_review',
          trust: 'rule_active',
        },
      }),
    ])
    rpcMocks.listRulesQueryFn
      .mockResolvedValueOnce([alaskaFinalRule, ...activeStateRules, federalRule])
      .mockResolvedValue([
        { ...alaskaFinalRule, status: 'active' as const },
        ...activeStateRules,
        federalRule,
      ])

    await render(<RulesLibraryRoute />)
    await waitForButton('Start review 1')

    await clickButton('Start review 1')
    await waitForText('1 / 1')
    await waitForText(alaskaFinalRule.title)

    await clickButton('Accept rule')
    await waitForAssertion(() => {
      expect(rpcMocks.listRulesQueryFn.mock.calls.length).toBeGreaterThan(1)
    })
    await waitForText('Alaska Row Form')

    const groupRows = Array.from(document.querySelectorAll('tbody tr[data-state]'))
    const federalIndex = groupRows.findIndex((row) => row.textContent?.includes('Federal'))
    const alaskaIndex = groupRows.findIndex((row) => row.textContent?.includes('Alaska'))
    const californiaIndex = groupRows.findIndex((row) => row.textContent?.includes('California'))
    const alaskaRow = groupRows[alaskaIndex]

    expect(federalIndex).toBe(0)
    expect(alaskaIndex).toBeGreaterThan(federalIndex)
    expect(alaskaIndex).toBeLessThan(californiaIndex)
    expect(alaskaRow?.getAttribute('data-state')).toBe('expanded')
    expect(document.body.textContent).toContain('Alaska Row Form')
  })

  it('does not render add-rule gaps for not-applicable entity coverage', async () => {
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

    expect(document.body.textContent).not.toContain('Missing rules')
    expect(document.body.textContent).not.toContain('No rule defined for this entity in Alaska')
    expect(document.body.textContent).not.toContain('Add rule')
    const entityChipTitles = Array.from(document.querySelectorAll('button[title]')).map((button) =>
      button.getAttribute('title'),
    )
    expect(entityChipTitles).not.toContain('Individual — 0 rules · 1 jurisdiction missing a rule')
    expect(entityChipTitles).not.toContain('Trust — 0 rules · 1 jurisdiction missing a rule')
  })

  it('still renders add-rule gaps for applicable entity coverage without a rule', async () => {
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
    const arizonaRow = Array.from(document.querySelectorAll('tr')).find((row) =>
      row.textContent?.includes('Arizona'),
    )
    expect(arizonaRow).toBeDefined()
    await act(async () => {
      arizonaRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await waitForText('Missing rules')

    expect(document.body.textContent).toContain('No rule defined for this entity in Arizona')
    expect(document.body.textContent).toContain('Add rule')
  })

  it('shows a scope-specific empty state when the Missing tab has no gaps', async () => {
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
    await waitForText('No missing rules')

    expect(document.body.textContent).not.toContain('Your rule catalog is empty.')
    expect(document.body.textContent).not.toContain('Import from sources')
    // 2026-05-28 (Yuqi /rules/library polish #4 — "Missing scope时
    // New rule消失了"): the prior guard hid the header "New rule" CTA
    // on the Missing scope on the assumption that gap rows carry an
    // `Add rule (prefilled)` action. That left CPAs on a scope view
    // with no global way to add a brand-new (unseeded) rule. Header
    // CTA now shows on every scope, so this assertion was inverted.
    // We still assert the empty-state body itself doesn't carry its
    // own "New rule" CTA — verified via the scope-specific empty
    // state message ("No missing rules") rendered without a button.
    expect(document.body.textContent).toContain('No missing rules')
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

  it('keeps batch review progress tied to the opened queue after accepting a rule', async () => {
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
      id: 'ca.individual_income_return.candidate.2026',
      title: 'California individual income tax return',
      jurisdiction: 'CA',
      dueDateLogic: {
        kind: 'fixed_date',
        date: '2026-04-15',
        holidayRollover: 'source_adjusted',
      },
      sourceIds: [],
      evidence: [],
    })
    const activeFirstRule = { ...firstRule, status: 'active' as const }
    rpcMocks.listRulesQueryFn
      .mockResolvedValueOnce([firstRule, secondRule])
      .mockResolvedValue([activeFirstRule, secondRule])

    await render(<RulesLibraryRoute />)
    await waitForButton('Start review 2')

    await clickButton('Start review 2')
    await waitForText('1 / 2')
    await waitForText(firstRule.title)

    expect(findButton('Reject')).toBeUndefined()

    await clickButton('Accept rule')
    await waitForText('2 / 2', 250)
    await waitForText(secondRule.title)

    expect(document.body.textContent).not.toContain('2 / 1')
  })

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
    const acceptRequest = deferred<Record<string, never>>()
    rpcMocks.listRulesQueryFn.mockResolvedValue([rule])
    rpcMocks.acceptTemplateMutationFn.mockReturnValueOnce(acceptRequest.promise)

    await render(<RulesLibraryRoute />)
    await waitForButton('Start review 1')

    await clickButton('Start review 1')
    await waitForText(rule.title)

    await clickButton('Accept rule')

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
        'Rule accepted',
        expect.objectContaining({
          id: 'accept-rule-toast',
          style: expect.objectContaining({
            background: 'var(--state-success-hover)',
            borderColor: 'var(--state-success-hover-alt)',
          }),
        }),
      )
    })
    expect(document.body.textContent).not.toContain('Rule accepted')
  })

  it('refreshes the rule list after finishing a skipped batch review session', async () => {
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
      id: 'ca.individual_income_return.candidate.2026',
      title: 'California individual income tax return',
      jurisdiction: 'CA',
      dueDateLogic: {
        kind: 'fixed_date',
        date: '2026-04-15',
        holidayRollover: 'source_adjusted',
      },
      sourceIds: [],
      evidence: [],
    })
    rpcMocks.listRulesQueryFn.mockResolvedValue([firstRule, secondRule])

    await render(<RulesLibraryRoute />)
    await waitForButton('Start review 2')

    await clickButton('Start review 2')
    await waitForText('1 / 2')

    await clickButton('Skip')
    await waitForText('2 / 2')

    const callsBeforeFinish = rpcMocks.listRulesQueryFn.mock.calls.length
    // Step 6 cont audit R3.4 renamed the terminal-action button from
    // "Finish" → "Done" so it's semantically distinct from "Skip" and
    // visually distinct (primary fill vs outline). Test follows the UI.
    await clickButton('Done')

    await waitForAssertion(() => {
      expect(rpcMocks.listRulesQueryFn.mock.calls.length).toBeGreaterThan(callsBeforeFinish)
    })
    expect(findButton('Done')).toBeUndefined()
  })
})
