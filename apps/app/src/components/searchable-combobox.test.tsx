import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  SearchableCombobox,
  type SearchableComboboxOption,
} from '@duedatehq/ui/components/ui/combobox'

// Why this test exists
// --------------------
// `SearchableCombobox` is the wave-2 audit-drain primitive that
// replaces ad-hoc `<DropdownMenu>` + scroll-hunting pickers across the
// app (Q3.4 export client picker, Q4.3 bulk Assign-owner, R5.3 new-rule
// tax-type). It owns the popover lifecycle, the cmdk search filter,
// the empty state, and the keyboard-driven selection model.
//
// What this test catches in jsdom:
//   - The trigger renders the placeholder when value is null.
//   - The trigger renders the selected option's label when value
//     resolves to an option.
//   - When the option resolves the trigger drops the placeholder-
//     muted text-color class.
//   - `renderTrigger` override is used when provided.
//   - The trigger carries role=combobox + aria-expanded for AT.
//
// What this test does NOT catch (and why):
//   - The actual popover open / search / select flow runs inside Base
//     UI's Portal + cmdk's filter. Both need a layout-aware DOM that
//     jsdom doesn't fully provide (Base UI focus-trap, popover
//     positioning). Those paths are exercised by the consumer e2e
//     suites — `obligations.spec` covers the export dialog and the
//     bulk-action toolbar; `rules.library.spec` will cover the new-
//     rule modal once R5.3 lands in CI.

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

afterEach(() => {
  if (root) {
    act(() => root?.unmount())
  }
  container?.remove()
  root = null
  container = null
  document.body.replaceChildren()
})

function render(children: React.ReactNode) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  act(() => {
    root?.render(children)
  })
}

const OPTIONS: readonly SearchableComboboxOption[] = [
  { value: 'a', label: 'Acme Holdings', meta: 'CA' },
  { value: 'b', label: 'Beacon Trust', meta: 'NY' },
  { value: 'c', label: 'Cascade LLC', meta: 'WA' },
]

function findTrigger(): HTMLButtonElement {
  const trigger = container?.querySelector('button[role="combobox"]')
  if (!(trigger instanceof HTMLButtonElement)) {
    throw new Error('SearchableCombobox trigger button not found')
  }
  return trigger
}

describe('SearchableCombobox trigger rendering', () => {
  it('renders the placeholder text when value is null', () => {
    render(
      <SearchableCombobox
        value={null}
        onValueChange={() => {}}
        options={OPTIONS}
        placeholder="Select client"
      />,
    )

    const trigger = findTrigger()
    expect(trigger.textContent).toContain('Select client')
    // Placeholder rows use the muted tertiary text color.
    const label = trigger.querySelector('span')
    expect(label?.className).toContain('text-text-tertiary')
  })

  it("renders the selected option's label when value matches", () => {
    render(
      <SearchableCombobox
        value="b"
        onValueChange={() => {}}
        options={OPTIONS}
        placeholder="Select client"
      />,
    )

    const trigger = findTrigger()
    expect(trigger.textContent).toContain('Beacon Trust')
    expect(trigger.textContent).not.toContain('Select client')
    const label = trigger.querySelector('span')
    expect(label?.className).toContain('text-text-primary')
  })

  it('lets renderTrigger override the displayed trigger contents', () => {
    render(
      <SearchableCombobox
        value="a"
        onValueChange={() => {}}
        options={OPTIONS}
        placeholder="Select client"
        renderTrigger={(selected) =>
          selected ? `${selected.label} — ${selected.meta ?? ''}` : 'pick one'
        }
      />,
    )

    const trigger = findTrigger()
    expect(trigger.textContent).toContain('Acme Holdings — CA')
  })

  it('exposes role=combobox + aria-expanded for assistive tech', () => {
    render(
      <SearchableCombobox
        id="my-picker"
        value={null}
        onValueChange={() => {}}
        options={OPTIONS}
        placeholder="Select client"
        ariaLabel="Pick a client"
      />,
    )

    const trigger = findTrigger()
    expect(trigger.getAttribute('role')).toBe('combobox')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.getAttribute('aria-label')).toBe('Pick a client')
    expect(trigger.id).toBe('my-picker')
  })

  it('honors disabled={true} on the trigger', () => {
    const onValueChange = vi.fn()
    render(
      <SearchableCombobox
        value={null}
        onValueChange={onValueChange}
        options={OPTIONS}
        placeholder="Select client"
        disabled
      />,
    )

    const trigger = findTrigger()
    expect(trigger.disabled).toBe(true)
  })
})
