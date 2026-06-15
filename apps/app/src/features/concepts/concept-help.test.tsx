import { act } from 'react'
import type { ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

import { ConceptHelp, ConceptLabel } from './concept-help'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

function render(children: ReactNode) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  act(() => {
    root?.render(
      <QueryClientProvider client={client}>
        <AppI18nProvider>{children}</AppI18nProvider>
      </QueryClientProvider>,
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

describe('ConceptHelp', () => {
  it('renders an accessible explanation trigger and opens the concept popover', () => {
    render(<ConceptHelp concept="smartPriority" />)

    const trigger = document.querySelector('button[aria-label="Explain Smart Priority"]')
    expect(trigger).toBeInstanceOf(HTMLButtonElement)

    act(() => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })

    expect(document.body.textContent).toContain('Smart Priority')
    expect(document.body.textContent).toContain("DueDateHQ's deterministic ordering score")
  })

  it('renders inline concept labels with the visible label text', () => {
    render(<ConceptLabel concept="evidence">Evidence</ConceptLabel>)

    expect(document.body.textContent).toContain('Evidence')
    expect(document.querySelector('button[aria-label="Explain Evidence"]')).toBeInstanceOf(
      HTMLButtonElement,
    )
  })
})
