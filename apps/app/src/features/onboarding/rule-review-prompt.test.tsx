import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'
import { RuleReviewPrompt, type JurisdictionReviewItem } from './rule-review-prompt'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

function renderPrompt(jurisdictions: JurisdictionReviewItem[]) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)

  act(() => {
    root?.render(
      <AppI18nProvider>
        <RuleReviewPrompt
          totalRulesActivated={jurisdictions.length}
          jurisdictions={jurisdictions}
          onReview={vi.fn()}
          onSkip={vi.fn()}
        />
      </AppI18nProvider>,
    )
  })
}

function visibleButtonText(): string[] {
  return Array.from(document.querySelectorAll('button')).map(
    (button) => button.textContent?.trim().replace(/\s+/g, ' ') ?? '',
  )
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

describe('RuleReviewPrompt', () => {
  it('keeps short jurisdiction lists in the review CTA', () => {
    renderPrompt([{ code: 'FED' }, { code: 'AL' }, { code: 'AK' }])

    expect(visibleButtonText()).toContain('Review FED + AL + AK now')
  })

  it('summarizes long jurisdiction lists in the review CTA', () => {
    renderPrompt([{ code: 'FED' }, { code: 'AL' }, { code: 'AK' }, { code: 'AZ' }])

    expect(visibleButtonText()).toContain('Review 4 states')
    expect(visibleButtonText()).not.toContain('Review FED + AL + AK + AZ now')
  })
})
