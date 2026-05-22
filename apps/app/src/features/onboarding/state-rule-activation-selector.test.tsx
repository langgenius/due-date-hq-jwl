import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RuleGenerationStateValues, type RuleGenerationState } from '@duedatehq/contracts'
import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'
import {
  StateRuleActivationSelector,
  sourceDefinedCalendarReviewStates,
} from './state-rule-activation-selector'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

function renderSelector(
  input: {
    selected?: RuleGenerationState[]
    onChange?: (states: RuleGenerationState[]) => void
  } = {},
) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const onChange = input.onChange ?? vi.fn()

  act(() => {
    root?.render(
      <AppI18nProvider>
        <StateRuleActivationSelector selected={input.selected ?? []} onChange={onChange} />
      </AppI18nProvider>,
    )
  })

  return { onChange }
}

function stateButton(name: string): HTMLButtonElement {
  const button = document.querySelector(`button[aria-label="${name}"]`)
  expect(button).toBeInstanceOf(HTMLButtonElement)
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Missing state button: ${name}`)
  return button
}

function selectAllButton(name = 'Select all states'): HTMLButtonElement {
  const button = document.querySelector(`button[aria-label="${name}"]`)
  expect(button).toBeInstanceOf(HTMLButtonElement)
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Missing button: ${name}`)
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
})

describe('StateRuleActivationSelector', () => {
  it('renders all states dark and unpressed by default', () => {
    renderSelector()

    const california = stateButton('California')
    const newYork = stateButton('New York')

    expect(california.getAttribute('aria-pressed')).toBe('false')
    expect(newYork.getAttribute('aria-pressed')).toBe('false')
    expect(california.className).toContain('bg-background-subtle')
  })

  it('emits selected states when a dark tile is clicked', () => {
    const { onChange } = renderSelector()

    act(() => {
      stateButton('California').click()
    })

    expect(onChange).toHaveBeenCalledWith(['CA'])
  })

  it('emits removal when a selected tile is clicked again', () => {
    const { onChange } = renderSelector({ selected: ['CA', 'TX'] })

    act(() => {
      stateButton('California, selected').click()
    })

    expect(onChange).toHaveBeenCalledWith(['TX'])
  })

  it('does not render selected-state tags above the map', () => {
    renderSelector({ selected: ['CA', 'TX'] })

    expect(document.querySelector('[aria-label="Selected states"]')).toBeNull()
    expect(document.querySelector('button[aria-label="Remove California"]')).toBeNull()
  })

  it('shows a Rule Library review hint when selected states include source-defined calendars', () => {
    renderSelector({ selected: ['CA'] })

    expect(document.body.textContent).toContain('Rule Library review required.')
    expect(document.body.textContent).toContain('official calendars')
  })

  it('hides the Rule Library review hint until a review-required state is selected', () => {
    renderSelector()

    expect(document.body.textContent).not.toContain('Rule Library review required.')
  })

  it('derives source-defined calendar review states from the rule catalog', () => {
    expect(sourceDefinedCalendarReviewStates(['CA', 'TX', 'CA'])).toEqual(['CA', 'TX'])
    expect(sourceDefinedCalendarReviewStates([])).toEqual([])
  })

  it('emits all rule-generation states when select all is clicked', () => {
    const { onChange } = renderSelector({ selected: ['CA'] })

    act(() => {
      selectAllButton().click()
    })

    expect(onChange).toHaveBeenCalledWith([...RuleGenerationStateValues])
  })

  it('emits empty selection when the all-selected toggle is clicked again', () => {
    const { onChange } = renderSelector({ selected: [...RuleGenerationStateValues] })

    const clearButton = selectAllButton('Clear all states')

    expect(clearButton.disabled).toBe(false)
    expect(clearButton.getAttribute('aria-pressed')).toBe('true')

    act(() => {
      clearButton.click()
    })

    expect(onChange).toHaveBeenCalledWith([])
  })
})
