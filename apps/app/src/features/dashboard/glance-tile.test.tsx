import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { TriangleAlertIcon } from 'lucide-react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

import { GlanceTile } from './glance-tile'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  bootstrapI18n()
  activateLocale('en')
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function render(node: React.ReactNode) {
  act(() => {
    root.render(
      <AppI18nProvider>
        <MemoryRouter>{node}</MemoryRouter>
      </AppI18nProvider>,
    )
  })
}

describe('GlanceTile', () => {
  it('renders label, value, and sub', () => {
    render(
      <GlanceTile
        icon={TriangleAlertIcon}
        tone="warning"
        emphasis
        label="At risk"
        value="$11,840"
        sub="6 ready · 2 need inputs"
      />,
    )
    expect(container.textContent).toContain('At risk')
    expect(container.textContent).toContain('$11,840')
    expect(container.textContent).toContain('6 ready · 2 need inputs')
  })

  it('renders a skeleton (no value text) while value is undefined', () => {
    render(<GlanceTile icon={TriangleAlertIcon} label="At risk" value={undefined} />)
    expect(container.textContent).toContain('At risk')
    expect(container.querySelector('[aria-hidden]')).not.toBeNull()
  })

  it('renders as a link when href is set', () => {
    render(
      <GlanceTile
        icon={TriangleAlertIcon}
        label="Needs you"
        value="4 items"
        href="/deadlines?status=review"
        ariaLabel="View items needing your review"
      />,
    )
    const link = container.querySelector('a')
    expect(link).not.toBeNull()
    expect(link?.getAttribute('href')).toBe('/deadlines?status=review')
    expect(link?.getAttribute('aria-label')).toBe('View items needing your review')
  })

  it('renders as a static div when no href is set', () => {
    render(<GlanceTile icon={TriangleAlertIcon} label="Today" value="4 deadlines" />)
    expect(container.querySelector('a')).toBeNull()
    expect(container.textContent).toContain('4 deadlines')
  })
})
