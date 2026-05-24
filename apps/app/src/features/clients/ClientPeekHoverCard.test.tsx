import { act } from 'react'
import type { ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MockInstance } from 'vitest'
import { ClientPublicSchema, ObligationInstancePublicSchema } from '@duedatehq/contracts'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

import { ClientPeekBody } from './ClientPeekHoverCard'
import { clientDetailPath } from './client-url'

const rpcMocks = vi.hoisted(() => ({
  clientGetQueryFn: vi.fn(),
  obligationsListByClientQueryFn: vi.fn(),
}))

vi.mock('@/lib/rpc', () => ({
  orpc: {
    clients: {
      get: {
        queryOptions: () => ({
          queryKey: ['clients', 'get'],
          queryFn: rpcMocks.clientGetQueryFn,
        }),
      },
    },
    obligations: {
      listByClient: {
        queryOptions: () => ({
          queryKey: ['obligations', 'listByClient'],
          queryFn: rpcMocks.obligationsListByClientQueryFn,
        }),
      },
    },
  },
}))

vi.mock('@/routes/clients', () => ({
  useEntityLabels: () => ({
    s_corp: 'S corp',
  }),
}))

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const client = {
  id: '24000000-0000-4000-8000-000000000001',
  firmId: 'mock_firm_brightline',
  name: 'Bright Studio S-Corp',
  ein: '12-3456789',
  state: 'CA',
  county: null,
  entityType: 's_corp',
  legalEntity: null,
  taxClassification: 's_corp',
  taxYearType: 'calendar',
  fiscalYearEndMonth: null,
  fiscalYearEndDay: null,
  externalClientId: null,
  addressLine1: null,
  city: null,
  postalCode: null,
  primaryPhone: null,
  sourceStatus: null,
  email: 'ops@example.com',
  notes: null,
  assigneeId: null,
  assigneeName: 'Riley',
  ownerCount: null,
  hasForeignAccounts: false,
  hasPayroll: false,
  hasSalesTax: false,
  has1099Vendors: false,
  hasK1Activity: false,
  primaryContactName: null,
  primaryContactEmail: null,
  importanceWeight: 2,
  lateFilingCountLast12mo: 0,
  estimatedTaxLiabilityCents: null,
  estimatedTaxLiabilitySource: null,
  equityOwnerCount: null,
  migrationBatchId: null,
  filingProfiles: [],
  createdAt: '2026-05-01T08:00:00.000Z',
  updatedAt: '2026-05-01T08:00:00.000Z',
  deletedAt: null,
}

const obligation = {
  id: '24000000-0000-4000-8000-000000000101',
  firmId: 'mock_firm_brightline',
  clientId: client.id,
  clientFilingProfileId: null,
  taxType: 'federal_1120s',
  taxYear: 2026,
  taxYearType: 'calendar',
  fiscalYearEndMonth: null,
  fiscalYearEndDay: null,
  taxPeriodStart: '2026-01-01',
  taxPeriodEnd: '2026-12-31',
  taxPeriodKind: 'calendar',
  taxPeriodSource: 'client_default',
  taxPeriodReviewReason: null,
  ruleId: null,
  ruleVersion: null,
  rulePeriod: null,
  generationSource: 'manual',
  jurisdiction: 'FED',
  obligationType: 'filing',
  formName: 'Form 1120-S',
  authority: 'IRS',
  filingDueDate: '2026-05-30',
  paymentDueDate: null,
  sourceEvidence: null,
  recurrence: 'annual',
  riskLevel: 'med',
  baseDueDate: '2026-05-30',
  currentDueDate: '2026-05-30',
  status: 'pending',
  blockedByObligationInstanceId: null,
  readiness: 'ready',
  extensionDecision: 'not_considered',
  extensionMemo: null,
  extensionSource: null,
  extensionInternalTargetDate: null,
  extensionDecidedAt: null,
  extensionDecidedByUserId: null,
  extensionState: 'not_applicable',
  extensionFormName: null,
  extensionFiledAt: null,
  extensionAcceptedAt: null,
  prepStage: 'not_started',
  reviewStage: 'not_required',
  reviewerUserId: null,
  reviewCompletedAt: null,
  paymentState: 'not_applicable',
  paymentConfirmedAt: null,
  efileState: 'not_applicable',
  efileAuthorizationForm: null,
  efileSubmittedAt: null,
  efileAcceptedAt: null,
  efileRejectedAt: null,
  migrationBatchId: null,
  estimatedTaxDueCents: null,
  estimatedExposureCents: null,
  exposureStatus: 'ready',
  penaltyBreakdown: [],
  missingPenaltyFacts: [],
  penaltySourceRefs: [],
  penaltyFormulaLabel: null,
  penaltyFactsVersion: null,
  accruedPenaltyCents: null,
  accruedPenaltyStatus: 'ready',
  accruedPenaltyBreakdown: [],
  penaltyAsOfDate: '2026-05-24',
  penaltyFormulaVersion: null,
  exposureCalculatedAt: null,
  createdAt: '2026-05-01T08:00:00.000Z',
  updatedAt: '2026-05-01T08:00:00.000Z',
}

const parsedClient = ClientPublicSchema.parse(client)
const parsedObligation = ObligationInstancePublicSchema.parse(obligation)

let root: Root | null = null
let container: HTMLDivElement | null = null
let queryClient: QueryClient | null = null
let consoleErrorSpy: MockInstance<typeof console.error> | null = null

function render(children: ReactNode) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const queryClientInstance = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient = queryClientInstance

  act(() => {
    root?.render(
      <MemoryRouter>
        <QueryClientProvider client={queryClientInstance}>
          <AppI18nProvider>{children}</AppI18nProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    )
  })
}

async function waitForPeekContent({
  clientHref,
  obligationsHref,
  attempts = 25,
}: {
  clientHref: string
  obligationsHref: string
  attempts?: number
}): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  const hasClientName = document.body.textContent?.includes('Bright Studio S-Corp')
  const hasClientLink = document.querySelector(`a[href="${clientHref}"]`)
  const hasObligationsLink = document.querySelector(`a[href="${obligationsHref}"]`)
  if ((hasClientName && hasClientLink && hasObligationsLink) || attempts <= 1) {
    return
  }
  return waitForPeekContent({ clientHref, obligationsHref, attempts: attempts - 1 })
}

beforeEach(() => {
  bootstrapI18n()
  rpcMocks.clientGetQueryFn.mockResolvedValue(parsedClient)
  rpcMocks.obligationsListByClientQueryFn.mockResolvedValue([parsedObligation])
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  if (root) {
    act(() => root?.unmount())
  }
  queryClient?.clear()
  container?.remove()
  consoleErrorSpy?.mockRestore()
  root = null
  container = null
  queryClient = null
  consoleErrorSpy = null
  document.body.replaceChildren()
  activateLocale('en')
  vi.clearAllMocks()
})

describe('ClientPeekHoverCard', () => {
  it('renders Link-backed buttons without Base UI native-button warnings', async () => {
    render(<ClientPeekBody clientId={parsedClient.id} />)

    const clientHref = clientDetailPath(parsedClient)
    const obligationsHref = `/deadlines?client=${parsedClient.id}`
    await waitForPeekContent({ clientHref, obligationsHref })

    expect(document.body.textContent).toContain('Bright Studio S-Corp')
    expect(document.querySelector(`a[href="${clientHref}"]`)).toBeInstanceOf(HTMLAnchorElement)
    expect(document.querySelector(`a[href="${obligationsHref}"]`)).toBeInstanceOf(HTMLAnchorElement)
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('expected a native <button>'),
    )
  })
})
