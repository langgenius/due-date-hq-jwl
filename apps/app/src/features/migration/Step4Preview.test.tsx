import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { I18nProvider } from '@lingui/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { DryRunSummary } from '@duedatehq/contracts'

import { activateLocale, i18n } from '../../i18n/i18n'
import { Step4Preview } from './Step4Preview'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

beforeEach(() => {
  activateLocale('en')
})

afterEach(() => {
  if (root) {
    act(() => root?.unmount())
  }
  container?.remove()
  root = null
  container = null
  document.body.replaceChildren()
})

function renderPreview(summary: DryRunSummary) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)

  act(() => {
    root?.render(
      <MemoryRouter>
        <I18nProvider i18n={i18n}>
          <Step4Preview
            summary={summary}
            duplicateHandling="skip"
            onDuplicateHandlingChange={() => {}}
          />
        </I18nProvider>
      </MemoryRouter>,
    )
  })
}

describe('Step4Preview rule review warnings', () => {
  it('summarizes rule review warnings without showing a Rule Library button', () => {
    renderPreview({
      batchId: '550e8400-e29b-41d4-a716-446655440001',
      clientsToCreate: 1,
      obligationsToCreate: 1,
      historicalDeadlinesSkipped: 0,
      rolledForwardDeadlines: 0,
      skippedRows: 0,
      errors: [],
      ruleReviewWarnings: [
        {
          state: 'TX',
          entityType: 'c_corp',
          affectedClientCount: 1,
          taxTypes: ['tx_state_franchise_or_entity_tax', 'tx_state_sales_use_tax'],
          reason: 'rules_pending_review',
        },
        {
          state: 'TX',
          entityType: 'c_corp',
          affectedClientCount: 1,
          taxTypes: ['tx_state_withholding_tax'],
          reason: 'no_matching_rule',
        },
      ],
    })

    expect(document.body.textContent).toContain('Some state deadlines need rule review')
    expect(document.body.textContent).toContain(
      '1 client has state deadlines waiting on rule review.',
    )
    expect(document.body.textContent).toContain('TX')
    expect(document.body.textContent).toContain('C corp')
    expect(document.body.textContent).toContain('3 state rule types')
    expect(document.body.textContent).not.toContain('tx_state_franchise_or_entity_tax')
    const link = document.querySelector('a[href*="/rules/library"]')
    expect(link).toBeNull()
  })

  it('explains past deadlines rolled forward into monitoring', () => {
    renderPreview({
      batchId: '550e8400-e29b-41d4-a716-446655440001',
      clientsToCreate: 1,
      obligationsToCreate: 1,
      historicalDeadlinesSkipped: 0,
      rolledForwardDeadlines: 2,
      skippedRows: 0,
      errors: [],
      ruleReviewWarnings: [],
    })

    expect(document.body.textContent).toContain(
      '2 past deadlines will be created as next monitoring deadlines',
    )
    expect(document.body.textContent).not.toContain('historical deadlines could not be created')
  })

  it('previews the clients that will be created with deadline counts', () => {
    renderPreview({
      batchId: '550e8400-e29b-41d4-a716-446655440001',
      clientsToCreate: 5,
      obligationsToCreate: 9,
      historicalDeadlinesSkipped: 0,
      rolledForwardDeadlines: 0,
      skippedRows: 0,
      errors: [],
      ruleReviewWarnings: [],
      clientsPreview: [
        {
          name: 'Marin Harbor Analytics LLC',
          ein: '99-1000001',
          entityType: 'llc',
          state: 'CA',
          taxTypes: ['federal_1065', 'ca_franchise_tax'],
          obligationCount: 3,
        },
        {
          name: 'Austin Foundry Inc',
          ein: '99-1000003',
          entityType: 'c_corp',
          state: 'TX',
          taxTypes: ['federal_1120'],
          obligationCount: 1,
        },
      ],
    })

    expect(document.body.textContent).toContain('Clients to create')
    expect(document.body.textContent).toContain('Marin Harbor Analytics LLC')
    expect(document.body.textContent).toContain('LLC')
    expect(document.body.textContent).toContain('3 deadlines')
    expect(document.body.textContent).toContain('Austin Foundry Inc')
    expect(document.body.textContent).toContain('C corp')
    expect(document.body.textContent).toContain('1 deadline')
    // clientsToCreate (5) exceeds the 2 preview rows → "+ 3 more clients".
    expect(document.body.textContent).toContain('3 more clients')
  })

  it('lists existing-client conflicts with skip / import-as-new controls', () => {
    renderPreview({
      batchId: '550e8400-e29b-41d4-a716-446655440001',
      clientsToCreate: 2,
      obligationsToCreate: 4,
      historicalDeadlinesSkipped: 0,
      rolledForwardDeadlines: 0,
      skippedRows: 0,
      errors: [],
      ruleReviewWarnings: [],
      clientConflicts: [
        {
          ein: '99-1000001',
          incomingName: 'Acme LLC',
          existingClientId: '550e8400-e29b-41d4-a716-446655440099',
          existingClientName: 'Acme LLC (existing)',
        },
      ],
    })

    expect(document.body.textContent).toContain('Already in your client list')
    expect(document.body.textContent).toContain('Acme LLC (existing)')
    expect(document.body.textContent).toContain('Skip duplicates')
    expect(document.body.textContent).toContain('Import as new')
  })
})
