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
            onUserEdit={vi.fn()}
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
    expect(document.body.textContent).toContain('federal return type')
    expect(document.body.textContent).toContain('tx_state_franchise_or_entity_tax')
  })
})
