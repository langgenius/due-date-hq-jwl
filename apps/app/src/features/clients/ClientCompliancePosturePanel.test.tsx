import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ClientPublic } from '@duedatehq/contracts'
import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

import { ClientCompliancePosturePanel } from './ClientCompliancePosturePanel'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

function client(overrides: Partial<ClientPublic> = {}): ClientPublic {
  return {
    id: 'client_1',
    firmId: 'firm_1',
    name: 'Acme LLC',
    ein: '12-3456789',
    state: 'CA',
    county: 'Alameda',
    entityType: 'llc',
    legalEntity: 'multi_member_llc',
    taxClassification: 'partnership',
    taxYearType: 'calendar',
    fiscalYearEndMonth: null,
    fiscalYearEndDay: null,
    email: 'owner@example.com',
    notes: null,
    externalClientId: null,
    addressLine1: null,
    city: null,
    postalCode: null,
    primaryPhone: null,
    sourceStatus: null,
    assigneeId: 'user_1',
    assigneeName: 'Casey',
    ownerCount: 2,
    hasForeignAccounts: false,
    hasPayroll: false,
    hasSalesTax: false,
    has1099Vendors: false,
    hasK1Activity: false,
    primaryContactName: 'Owner Example',
    primaryContactEmail: 'owner@example.com',
    importanceWeight: 2,
    lateFilingCountLast12mo: 0,
    estimatedTaxLiabilityCents: 1200000,
    estimatedTaxLiabilitySource: 'manual',
    equityOwnerCount: null,
    migrationBatchId: null,
    filingProfiles: [],
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  }
}

function renderPanel(props: { client: ClientPublic }) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)

  act(() => {
    root?.render(
      <AppI18nProvider>
        <ClientCompliancePosturePanel {...props} />
      </AppI18nProvider>,
    )
  })
}

beforeEach(() => {
  bootstrapI18n()
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

describe('ClientCompliancePosturePanel', () => {
  it('renders client identity facts and the tax attributes section', () => {
    renderPanel({ client: client() })

    expect(document.body.textContent).toContain('Federal EIN')
    expect(document.body.textContent).toContain('12-3456789')
    expect(document.body.textContent).toContain('Tax year')
    expect(document.body.textContent).toContain('Calendar year')
    expect(document.body.textContent).toContain('Owners')
    expect(document.body.textContent).toContain('2 owners')
    expect(document.body.textContent).toContain('Client since')
    expect(document.body.textContent).toContain('Apr 2026')

    // 2026-06-11: the panel now surfaces a "Tax attributes" section with chips
    // for the activity types that drive deadline generation (re-added in the
    // redesign — ClientCompliancePosturePanel.tsx). The old combined "Activity
    // that adds deadlines" heading is gone, but the individual tags are shown.
    expect(document.body.textContent).not.toContain('Activity that adds deadlines')
    expect(document.body.textContent).toContain('Tax attributes')
    expect(document.body.textContent).toContain('Foreign accounts')
    expect(document.body.textContent).toContain('Payroll')
    expect(document.body.textContent).toContain('1099 vendors')
    expect(document.body.textContent).toContain('K-1 activity')
  })

  it('keeps late-filing risk visible as a scan-only footer', () => {
    renderPanel({
      client: client({
        lateFilingCountLast12mo: 2,
      }),
    })

    expect(document.body.textContent).toContain('2 late filings in 12mo')
  })
})
