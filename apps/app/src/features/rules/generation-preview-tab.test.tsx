import { act } from 'react'
import { MemoryRouter } from 'react-router'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnnualRolloverOutput, ClientPublic } from '@duedatehq/contracts'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

import { AnnualRolloverPanel } from './generation-preview-tab'

const rpcMocks = vi.hoisted(() => ({
  createAnnualRollover: vi.fn(),
  previewAnnualRollover: vi.fn(),
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
      createAnnualRollover: {
        mutationOptions: (options: Record<string, unknown>) => ({
          mutationFn: rpcMocks.createAnnualRollover,
          ...options,
        }),
      },
      previewAnnualRollover: {
        queryOptions: ({ input }: { input: unknown }) => ({
          queryKey: ['obligations', 'annual-rollover-preview', input],
          queryFn: () => rpcMocks.previewAnnualRollover(input),
        }),
      },
      facets: { key: () => ['obligations', 'facets'] },
      list: { key: () => ['obligations', 'list'] },
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

const clients: ClientPublic[] = [
  {
    id: '22222222-2222-4222-8222-222222222222',
    firmId: 'firm_123',
    name: 'Acme LLC',
    ein: null,
    state: 'CA',
    county: null,
    entityType: 'llc',
    legalEntity: 'multi_member_llc',
    taxClassification: 'partnership',
    taxYearType: 'calendar',
    fiscalYearEndMonth: null,
    fiscalYearEndDay: null,
    email: null,
    notes: null,
    externalClientId: null,
    addressLine1: null,
    city: null,
    postalCode: null,
    primaryPhone: null,
    sourceStatus: null,
    assigneeId: null,
    assigneeName: null,
    ownerCount: 2,
    hasForeignAccounts: false,
    hasPayroll: false,
    hasSalesTax: false,
    has1099Vendors: false,
    hasK1Activity: true,
    primaryContactName: null,
    primaryContactEmail: null,
    importanceWeight: 3,
    lateFilingCountLast12mo: 0,
    estimatedTaxLiabilityCents: 250_000,
    estimatedTaxLiabilitySource: 'manual',
    equityOwnerCount: 2,
    migrationBatchId: null,
    filingProfiles: [
      {
        id: '33333333-3333-4333-8333-333333333333',
        firmId: 'firm_123',
        clientId: '22222222-2222-4222-8222-222222222222',
        state: 'CA',
        counties: [],
        taxTypes: ['ca_100'],
        isPrimary: true,
        source: 'manual',
        migrationBatchId: null,
        archivedAt: null,
        createdAt: '2026-05-04T00:00:00.000Z',
        updatedAt: '2026-05-04T00:00:00.000Z',
      },
    ],
    createdAt: '2026-05-04T00:00:00.000Z',
    updatedAt: '2026-05-04T00:00:00.000Z',
    deletedAt: null,
  },
]

function annualResult(overrides: Partial<AnnualRolloverOutput> = {}): AnnualRolloverOutput {
  return {
    summary: {
      sourceFilingYear: 2026,
      targetFilingYear: 2027,
      seedObligationCount: 1,
      clientCount: 1,
      willCreateCount: 1,
      reviewCount: 0,
      duplicateCount: 0,
      skippedCount: 0,
      createdCount: 0,
    },
    rows: [
      {
        clientId: '22222222-2222-4222-8222-222222222222',
        clientName: 'Acme LLC',
        taxType: 'ca_100',
        sourceObligationIds: ['11111111-1111-4111-8111-111111111111'],
        preview: {
          clientId: '22222222-2222-4222-8222-222222222222',
          ruleId: 'ca_100_2027',
          ruleVersion: 3,
          ruleTitle: 'CA Form 100 annual filing',
          jurisdiction: 'CA',
          taxType: 'ca_100',
          matchedTaxType: 'ca_100',
          period: 'default',
          dueDate: '2027-04-15',
          taxPeriodStart: '2026-01-01',
          taxPeriodEnd: '2026-12-31',
          taxPeriodKind: 'calendar',
          taxPeriodSource: 'prior_obligation',
          taxPeriodReviewReason: null,
          eventType: 'filing',
          isFiling: true,
          isPayment: false,
          formName: 'Form 100',
          sourceIds: ['ca-ftb-100'],
          evidence: [
            {
              sourceId: 'ca-ftb-100',
              authorityRole: 'basis',
              locator: { kind: 'html', heading: 'Due dates' },
              summary: 'CA Form 100 due date',
              sourceExcerpt: 'File by the 15th day of the fourth month.',
              retrievedAt: '2026-04-27',
            },
          ],
          requiresReview: false,
          reminderReady: true,
          reviewReasons: [],
          missingClientFacts: [],
        },
        disposition: 'will_create',
        targetStatus: 'pending',
        duplicateObligationId: null,
        createdObligationId: null,
        skippedReason: null,
      },
    ],
    auditId: null,
    ...overrides,
  }
}

async function renderPanel() {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  await act(async () => {
    root?.render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <AppI18nProvider>
            <AnnualRolloverPanel clients={clients} />
          </AppI18nProvider>
        </QueryClientProvider>
      </MemoryRouter>,
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

function buttonByText(label: string): HTMLButtonElement {
  const button = Array.from(document.querySelectorAll('button')).find(
    (item): item is HTMLButtonElement => item.textContent === label,
  )
  if (!button) throw new Error(`Button not found: ${label}`)
  return button
}

beforeEach(() => {
  bootstrapI18n()
  rpcMocks.previewAnnualRollover.mockReset()
  rpcMocks.createAnnualRollover.mockReset()
  rpcMocks.previewAnnualRollover.mockResolvedValue(annualResult())
  rpcMocks.createAnnualRollover.mockResolvedValue(
    annualResult({
      summary: { ...annualResult().summary, createdCount: 1 },
      rows: [
        {
          ...annualResult().rows[0]!,
          createdObligationId: '33333333-3333-4333-8333-333333333333',
        },
      ],
      auditId: '44444444-4444-4444-8444-444444444444',
    }),
  )
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

describe('AnnualRolloverPanel', () => {
  it('renders the all-clients filter label instead of the internal sentinel', async () => {
    await renderPanel()
    await waitForText('All clients')

    expect(document.body.textContent).toContain('All clients')
    expect(document.body.textContent).not.toContain('__all_clients__')
  })

  it('defaults to the current and next filing years and renders preview summary', async () => {
    await renderPanel()
    await waitForText('CA Form 100 annual filing')

    const sourceInput = document.querySelector<HTMLInputElement>('#annual-source-year')
    const targetInput = document.querySelector<HTMLInputElement>('#annual-target-year')
    const sourceYear = new Date().getFullYear()

    expect(sourceInput?.value).toBe(String(sourceYear))
    expect(targetInput?.value).toBe(String(sourceYear + 1))
    expect(document.body.textContent).toContain('Source deadlines')
    expect(document.body.textContent).toContain('Will create')
  })

  it('renders help tooltips for annual rollover metrics and result columns', async () => {
    await renderPanel()
    await waitForText('CA Form 100 annual filing')

    const helpButtons = Array.from(document.querySelectorAll('button[aria-label^="Explain "]'))

    expect(helpButtons.map((button) => button.getAttribute('aria-label'))).toEqual(
      expect.arrayContaining(['Explain Source deadlines', 'Explain Status', 'Explain Deadlines']),
    )
    expect(helpButtons).toHaveLength(14)
  })

  it('generates rollover obligations and shows the Deadlines link state', async () => {
    await renderPanel()
    await waitForText('CA Form 100 annual filing')

    await act(async () => {
      buttonByText('Generate').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await waitForText('Open first created deadline')

    expect(rpcMocks.createAnnualRollover).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceFilingYear: new Date().getFullYear(),
        targetFilingYear: new Date().getFullYear() + 1,
      }),
      expect.anything(),
    )
  })
})
