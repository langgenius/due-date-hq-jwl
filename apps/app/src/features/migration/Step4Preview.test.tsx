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
  it('links single-state rule review warnings to the matching Rule Library jurisdiction', () => {
    renderPreview({
      batchId: '550e8400-e29b-41d4-a716-446655440001',
      clientsToCreate: 1,
      obligationsToCreate: 1,
      skippedRows: 0,
      errors: [],
      ruleReviewWarnings: [
        {
          state: 'TX',
          entityType: 'c_corp',
          affectedClientCount: 1,
          taxTypes: ['tx_state_franchise_or_entity_tax'],
          reason: 'rules_pending_review',
        },
      ],
    })

    expect(document.body.textContent).toContain(
      'Review rules before some state deadlines can be generated',
    )
    expect(document.body.textContent).toContain('tx_state_franchise_or_entity_tax')
    const link = document.querySelector('a[href*="/rules/library"]')
    expect(link?.getAttribute('href')).toBe(
      '/rules/library?view=rules&library=pending_review&jur=TX',
    )
  })
})
