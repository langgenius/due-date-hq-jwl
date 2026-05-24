import { act } from 'react'
import type { ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { DashboardTopRow } from '@duedatehq/contracts'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

import { DashboardActionsList } from './actions-list'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const dashboardRow: DashboardTopRow = {
  obligationId: '23000000-0000-4000-8000-000000000006',
  clientId: '23000000-0000-4000-8000-000000000106',
  clientName: 'Summit Events LLC',
  clientEmail: null,
  taxType: 'ca_llc_annual_tax',
  currentDueDate: '2026-05-23',
  status: 'review',
  missingPenaltyFacts: [],
  penaltySourceRefs: [],
  penaltyFormulaLabel: 'California LLC annual tax penalty',
  penaltyFactsVersion: 'penalty-facts-v1',
  accruedPenaltyCents: 0,
  accruedPenaltyStatus: 'ready',
  accruedPenaltyBreakdown: [],
  penaltyAsOfDate: '2026-05-23',
  penaltyFormulaVersion: 'penalty-v3-allstates-2026q2',
  severity: 'high',
  evidenceCount: 1,
  primaryEvidence: null,
  smartPriority: {
    version: 'smart-priority-v1',
    score: 42,
    rank: 1,
    factors: [
      {
        key: 'urgency',
        label: 'Due today',
        weight: 0.7,
        rawValue: '0 days',
        normalized: 1,
        contribution: 70,
        sourceLabel: 'Due date',
      },
    ],
  },
}

let root: Root | null = null
let container: HTMLDivElement | null = null

function render(children: ReactNode) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)

  act(() => {
    root?.render(
      <MemoryRouter>
        <AppI18nProvider>{children}</AppI18nProvider>
      </MemoryRouter>,
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

describe('DashboardActionsList', () => {
  it('does not render the expanded detail target as a real button', () => {
    render(
      <DashboardActionsList
        rows={[dashboardRow]}
        asOfDate="2026-05-23"
        isLoading={false}
        totalThisWeek={1}
        totalOpen={1}
        canRunMigration={false}
        onOpenWizard={vi.fn()}
        onOpenObligation={vi.fn()}
        onOpenAllObligations={vi.fn()}
      />,
    )

    const detailId = `action-detail-${dashboardRow.obligationId}`
    const summary = document.querySelector(`[aria-controls="${detailId}"]`)
    expect(summary).toBeInstanceOf(HTMLElement)

    act(() => {
      if (!(summary instanceof HTMLElement)) throw new Error('Missing dashboard action row')
      summary.focus()
    })

    const detail = document.getElementById(detailId)
    expect(detail).toBeInstanceOf(HTMLDivElement)
    expect(detail?.getAttribute('role')).toBe('button')
    expect(detail?.querySelector('button')).toBeNull()
    expect(detail?.querySelector('[data-slot="tooltip-trigger"]')?.tagName).toBe('SPAN')
  })
})
