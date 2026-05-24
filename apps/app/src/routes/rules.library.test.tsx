import { act } from 'react'
import type { ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
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

const toastMocks = vi.hoisted(() => ({
  loading: vi.fn(() => 'accept-rule-toast'),
  success: vi.fn(),
  error: vi.fn(),
  dismiss: vi.fn(),
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
    (candidate): candidate is HTMLButtonElement => candidate.textContent?.trim() === name,
  )
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
  rpcMocks.acceptTemplateMutationFn.mockReset()
  rpcMocks.acceptTemplateMutationFn.mockResolvedValue({})
  rpcMocks.verifyCandidateMutationFn.mockReset()
  rpcMocks.verifyCandidateMutationFn.mockResolvedValue({})
  rpcMocks.rejectTemplateMutationFn.mockReset()
  rpcMocks.rejectTemplateMutationFn.mockResolvedValue({})
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
    await waitForText('Start review (2)')

    await clickButton('Start review (2)')
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
    await waitForText('Start review (1)')

    await clickButton('Start review (1)')
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
    await waitForText('Start review (2)')

    await clickButton('Start review (2)')
    await waitForText('1 / 2')

    await clickButton('Skip')
    await waitForText('2 / 2')

    const callsBeforeFinish = rpcMocks.listRulesQueryFn.mock.calls.length
    await clickButton('Finish')

    await waitForAssertion(() => {
      expect(rpcMocks.listRulesQueryFn.mock.calls.length).toBeGreaterThan(callsBeforeFinish)
    })
    expect(findButton('Finish')).toBeUndefined()
  })
})
