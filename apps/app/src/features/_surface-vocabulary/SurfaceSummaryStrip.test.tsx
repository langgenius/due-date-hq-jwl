import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SurfaceSummaryStrip } from './SurfaceSummaryStrip'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

function mount(node: React.ReactNode) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  act(() => {
    root?.render(<MemoryRouter>{node}</MemoryRouter>)
  })
}

afterEach(() => {
  if (root) act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
  document.body.replaceChildren()
})

describe('SurfaceSummaryStrip', () => {
  const reactKeySpreadWarning = 'A props object containing a "key" prop is being spread into JSX'

  it('renders the label and each item', () => {
    mount(
      <SurfaceSummaryStrip
        label="Coverage"
        items={[
          { key: 'a', value: 3, label: 'active' },
          { key: 'p', value: 12, label: 'needs review', tone: 'review' },
        ]}
      />,
    )
    expect(container?.textContent).toContain('Coverage')
    expect(container?.textContent).toContain('3')
    expect(container?.textContent).toContain('active')
    expect(container?.textContent).toContain('12')
    expect(container?.textContent).toContain('needs review')
  })

  it('passes React keys directly instead of through child prop spreads', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      mount(
        <SurfaceSummaryStrip
          label="Coverage"
          items={[{ key: 'total', value: 10, label: 'total' }]}
        />,
      )

      expect(
        consoleError.mock.calls.some(([message]) =>
          String(message).includes(reactKeySpreadWarning),
        ),
      ).toBe(false)
    } finally {
      consoleError.mockRestore()
    }
  })

  it('shows the "All caught up" zero-state when items is empty', () => {
    mount(<SurfaceSummaryStrip label="Clients" items={[]} />)
    expect(container?.textContent).toContain('All caught up')
  })

  it('renders skeletons when loading is true', () => {
    mount(<SurfaceSummaryStrip label="Clients" items={[]} loading />)
    expect(container?.querySelector('[aria-label="Loading"]')).toBeTruthy()
  })

  it('renders an item with onClick as a button', () => {
    const onClick = vi.fn()
    mount(
      <SurfaceSummaryStrip
        label="Clients"
        items={[{ key: 'a', value: 5, label: 'at risk', onClick }]}
      />,
    )
    const button = container?.querySelector('button')
    expect(button).toBeTruthy()
    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('renders an item with href as a link', () => {
    mount(
      <SurfaceSummaryStrip
        label="Clients"
        items={[{ key: 'a', value: 1, label: 'paused', href: '/rules/sources' }]}
      />,
    )
    const link = container?.querySelector('a')
    expect(link?.getAttribute('href')).toBe('/rules/sources')
  })

  it('mutes zero-value items even when a non-muted tone is requested', () => {
    mount(
      <SurfaceSummaryStrip
        label="Clients"
        items={[{ key: 'r', value: 0, label: 'needs review', tone: 'review' }]}
      />,
    )
    const numberSpan = container?.querySelector('.tabular-nums')
    // Zero items render with text-text-muted (the override in toneToClass).
    expect(numberSpan?.className).toContain('text-text-muted')
  })

  it('renders the detail link when detailHref + detailLabel provided', () => {
    mount(
      <SurfaceSummaryStrip
        label="Sources"
        items={[{ key: 'h', value: 88, label: 'watched' }]}
        detailHref="/rules/sources"
        detailLabel="View sources"
      />,
    )
    const link = container?.querySelector('a[href="/rules/sources"]')
    expect(link?.textContent).toContain('View sources')
  })
})
