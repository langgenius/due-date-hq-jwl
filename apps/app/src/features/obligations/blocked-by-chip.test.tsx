import { act } from 'react'
import type { ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

import { BlockedByChip } from './blocked-by-chip'

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

  act(() => {
    root?.render(<AppI18nProvider>{children}</AppI18nProvider>)
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

describe('BlockedByChip', () => {
  it('explains that the linked deadline is blocking the current row', () => {
    const onOpen = vi.fn()

    render(
      <BlockedByChip
        parentObligationId="12345678-abcd-4abc-8abc-123456789abc"
        parentLabel="Arbor & Vale LLC · Form 1065"
        onOpen={onOpen}
      />,
    )

    const button = document.querySelector('button')

    expect(button).toBeInstanceOf(HTMLButtonElement)
    expect(button?.textContent).toContain('Blocked by: Arbor & Vale LLC · Form 1065')
    expect(button?.getAttribute('title')).toBe(
      'Open the deadline blocking this row: Arbor & Vale LLC · Form 1065.',
    )
    expect(button?.getAttribute('aria-label')).toBe(
      'Open the deadline blocking this row: Arbor & Vale LLC · Form 1065.',
    )

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })

    expect(onOpen).toHaveBeenCalledWith('12345678-abcd-4abc-8abc-123456789abc')
  })
})
