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
          <Step4Preview summary={summary} />
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
      '1 client has state deadlines that need reviewed practice rules first.',
    )
    expect(document.body.textContent).toContain('TX')
    expect(document.body.textContent).toContain('C corp')
    expect(document.body.textContent).toContain('3 state rule types')
    expect(document.body.textContent).not.toContain('tx_state_franchise_or_entity_tax')
    const link = document.querySelector('a[href*="/rules/library"]')
    expect(link).toBeNull()
  })

  it('explains historical deadlines skipped by the monitoring start date', () => {
    renderPreview({
      batchId: '550e8400-e29b-41d4-a716-446655440001',
      clientsToCreate: 1,
      obligationsToCreate: 1,
      historicalDeadlinesSkipped: 2,
      skippedRows: 0,
      errors: [],
      ruleReviewWarnings: [],
    })

    expect(document.body.textContent).toContain(
      '2 historical deadlines before monitoring start will be skipped',
    )
  })
})
