import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

import {
  extensionDecisionEvidenceDescription,
  extensionDecisionEvidenceDetails,
  readExtensionDecisionEvidence,
} from './extension-decision-evidence'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

function renderExtensionEvidence(input: {
  normalizedValue: string | null
  rawValue: string | null
}) {
  const summary = readExtensionDecisionEvidence(input)
  if (!summary) throw new Error('Expected extension decision evidence summary')

  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)

  act(() => {
    root?.render(
      <AppI18nProvider>
        <p>{extensionDecisionEvidenceDescription(summary)}</p>
        <dl>
          {extensionDecisionEvidenceDetails(summary).map((detail) => (
            <div key={detail.id}>
              <dt>{detail.label}</dt>
              <dd>{detail.value}</dd>
            </div>
          ))}
        </dl>
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

describe('extension decision evidence', () => {
  it('formats extension decision JSON as a readable summary', () => {
    renderExtensionEvidence({
      rawValue: null,
      normalizedValue: JSON.stringify({
        decision: 'applied',
        memo: null,
        source: null,
        internalTargetDate: '2026-03-10',
        paymentStillDue: true,
      }),
    })

    expect(document.body.textContent).toContain('Extension plan saved')
    expect(document.body.textContent).toContain('Internal extension target date')
    expect(document.body.textContent).toContain('2026-03-10')
    expect(document.body.textContent).toContain('Payment still due by original deadline')
    expect(document.body.textContent).not.toContain('"decision"')
    expect(document.body.textContent).not.toContain('"paymentStillDue"')
  })

  it('falls back to the legacy expected extended due date field', () => {
    renderExtensionEvidence({
      rawValue: null,
      normalizedValue: JSON.stringify({
        decision: 'applied',
        expectedExtendedDueDate: '2026-03-01',
        paymentStillDue: true,
      }),
    })

    expect(document.body.textContent).toContain('2026-03-01')
  })
})
