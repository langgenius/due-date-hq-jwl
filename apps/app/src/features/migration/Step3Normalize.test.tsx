import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { HotkeysProvider } from '@tanstack/react-hotkeys'
import { I18nProvider } from '@lingui/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { activateLocale, i18n } from '../../i18n/i18n'
import { Step3Normalize } from './Step3Normalize'
import type { NormalizeState } from './state'

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

function renderStep(normalize: NormalizeState) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)

  act(() => {
    root?.render(
      <HotkeysProvider>
        <I18nProvider i18n={i18n}>
          <Step3Normalize
            normalize={normalize}
            matrix={[
              {
                entityType: 'c_corp',
                state: 'TX',
                taxTypes: ['federal_1120', 'tx_state_franchise_or_entity_tax'],
                needsReview: true,
                confidence: 0.7,
                matrixVersion: 'v1.0',
                enabled: true,
                appliedClientCount: 1,
                applicationMode: 'federal_return_type_plus_state',
              },
            ]}
            onToggleApplyToAll={vi.fn()}
          />
        </I18nProvider>
      </HotkeysProvider>,
    )
  })
}

describe('Step3Normalize matrix state context', () => {
  it('shows when matrix suggestions add state context to a federal return type', () => {
    renderStep({ status: 'success', rows: [], applyToAll: {}, errorBanner: null })

    expect(document.body.textContent).toContain('State context added')
    expect(document.body.textContent).toContain(
      'These defaults apply only to rows without tax types',
    )
    expect(document.body.textContent).toContain('tx_state_franchise_or_entity_tax')
  })

  it('shows normalization fallbacks as read-only import outcomes', () => {
    renderStep({
      status: 'success',
      applyToAll: {},
      errorBanner: null,
      rows: [
        {
          id: '550e8400-e29b-41d4-a716-446655440010',
          batchId: '550e8400-e29b-41d4-a716-446655440001',
          field: 'entity_type',
          rawValue: 'Nonprofit',
          normalizedValue: 'other',
          confidence: 0.25,
          model: null,
          promptVersion: 'preset@v1',
          reasoning: 'No entity type match; marked as Other for review.',
          userOverridden: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440011',
          batchId: '550e8400-e29b-41d4-a716-446655440001',
          field: 'state',
          rawValue: 'Unknown',
          normalizedValue: null,
          confidence: null,
          model: null,
          promptVersion: 'preset@v1',
          reasoning: 'No state match.',
          userOverridden: false,
          createdAt: new Date().toISOString(),
        },
      ],
    })

    expect(document.body.textContent).toContain('2 values could not be matched confidently')
    expect(document.body.textContent).toContain('Nonprofit')
    expect(document.body.textContent).toContain('Other')
    expect(document.body.textContent).toContain('Using Other')
    expect(document.body.textContent).toContain('No state match')
    expect(document.body.textContent).toContain('No state deadlines')
    expect(document.querySelector('section[aria-label="Entity types"]')?.textContent).not.toContain(
      'Needs review',
    )
    expect(document.querySelector('input[type="text"]')).toBeNull()
  })
})
