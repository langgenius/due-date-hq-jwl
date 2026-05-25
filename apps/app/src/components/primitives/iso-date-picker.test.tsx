import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'
import { IsoDatePicker } from './iso-date-picker'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

function renderPicker(onValueChange = vi.fn()) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)

  act(() => {
    root?.render(
      <AppI18nProvider>
        <IsoDatePicker value="2026-04-15" maxIsoDate="2026-04-15" onValueChange={onValueChange} />
      </AppI18nProvider>,
    )
  })

  return { onValueChange }
}

function buttonByText(text: string): HTMLButtonElement {
  const button = Array.from(document.querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.trim() === text,
  )
  expect(button).toBeInstanceOf(HTMLButtonElement)
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Missing button ${text}`)
  return button
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
  vi.clearAllMocks()
})

describe('IsoDatePicker maxIsoDate', () => {
  it('disables calendar dates after the max date', () => {
    const { onValueChange } = renderPicker()

    const trigger = buttonByText('2026-04-15')
    act(() => {
      trigger.click()
    })

    const afterMax = buttonByText('16')
    expect(afterMax.disabled).toBe(true)

    act(() => {
      afterMax.click()
    })

    expect(onValueChange).not.toHaveBeenCalled()
  })
})
