import { act } from 'react'
import type { ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { PulseAffectedClient } from '@duedatehq/contracts'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { AppI18nProvider } from '@/i18n/provider'

import { AffectedClientsTable } from './AffectedClientsTable'

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
    root?.render(
      <AppI18nProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </AppI18nProvider>,
    )
  })
}

beforeEach(() => {
  bootstrapI18n()
})

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
})

function makeRow(
  index: number,
  matchStatus: PulseAffectedClient['matchStatus'] = 'eligible',
): PulseAffectedClient {
  const hex = index.toString(16).padStart(12, '0')
  return {
    obligationId: `aaaaaaaa-aaaa-4aaa-8aaa-${hex}`,
    clientId: `bbbbbbbb-bbbb-4bbb-8bbb-${hex}`,
    clientName: `Client ${index}`,
    state: 'CA',
    county: null,
    entityType: 'individual',
    taxType: 'federal_1040',
    currentDueDate: '2026-04-15',
    newDueDate: '2026-10-15',
    status: 'pending',
    matchStatus,
    reason: matchStatus === 'needs_review' ? 'Mocked reason' : null,
  }
}

function renderTable(rows: PulseAffectedClient[]) {
  render(
    <AffectedClientsTable
      rows={rows}
      selection={new Set()}
      confirmedReviewIds={new Set()}
      onChangeSelection={() => {}}
      onToggleNeedsReviewConfirmation={() => {}}
    />,
  )
}

function bodyRows(): HTMLElement[] {
  // Header row also renders a <tr>; body rows carry data-status.
  return [...(container?.querySelectorAll('tr[data-status]') ?? [])] as HTMLElement[]
}

function expander(): HTMLButtonElement | null {
  return (
    ([...(container?.querySelectorAll('button') ?? [])] as HTMLButtonElement[]).find((b) =>
      /View all|Show fewer/.test(b.textContent ?? ''),
    ) ?? null
  )
}

describe('AffectedClientsTable collapse', () => {
  it('renders all rows with no expander at or below the threshold', () => {
    renderTable(Array.from({ length: 10 }, (_, i) => makeRow(i)))
    expect(bodyRows()).toHaveLength(10)
    expect(expander()).toBeNull()
  })

  it('collapses to 8 rows with a Show-all footer above the threshold', () => {
    renderTable(Array.from({ length: 12 }, (_, i) => makeRow(i)))
    expect(bodyRows()).toHaveLength(8)
    const toggle = expander()
    expect(toggle?.textContent).toContain('View all 12 affected clients')
    act(() => toggle?.click())
    expect(bodyRows()).toHaveLength(12)
    expect(expander()?.textContent).toContain('Show fewer')
  })

  it('never hides needs_review rows behind the fold', () => {
    // 11 eligible rows first, then a needs_review row LAST in server order —
    // collapsed, it must still be visible (sorted to the top).
    const rows = [...Array.from({ length: 11 }, (_, i) => makeRow(i)), makeRow(11, 'needs_review')]
    renderTable(rows)
    const visible = bodyRows()
    expect(visible).toHaveLength(8)
    expect(visible[0]?.getAttribute('data-status')).toBe('needs_review')
  })
})
