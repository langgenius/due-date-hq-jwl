import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { PulseAlertPublic } from '@duedatehq/contracts'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

import { AlertDecisionStatusNotice } from './AlertReadinessStatus'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

function alert(overrides: Partial<PulseAlertPublic> = {}): PulseAlertPublic {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    pulseId: '22222222-2222-4222-8222-222222222222',
    status: 'matched',
    sourceStatus: 'approved',
    changeKind: 'deadline_shift',
    actionMode: 'due_date_overlay',
    firmImpact: 'matched',
    title: 'CA deadline relief',
    source: 'CA FTB',
    sourceUrl: 'https://example.com/source',
    summary: 'California posted deadline relief.',
    publishedAt: '2026-05-01T00:00:00.000Z',
    matchedCount: 1,
    needsReviewCount: 0,
    applyReadiness: { status: 'ready', missing: [] },
    duplicateSourceSnapshotCount: 0,
    confidence: 0.92,
    isSample: false,
    jurisdiction: 'CA',
    taxAreas: [],
    forms: [],
    ...overrides,
  }
}

function renderNotice(input: PulseAlertPublic) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)

  act(() => {
    root?.render(
      <AppI18nProvider>
        <AlertDecisionStatusNotice alert={input} />
      </AppI18nProvider>,
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

describe('AlertDecisionStatusNotice', () => {
  it('explains needs-details due-date alerts separately from review-only alerts', () => {
    renderNotice(
      alert({
        applyReadiness: { status: 'needs_details', missing: ['affected_clients'] },
      }),
    )
    expect(document.body.textContent).toContain('Needs deadline selection')
    expect(document.body.textContent).toContain('choose the deadlines before Apply is enabled')

    act(() => {
      root?.render(
        <AppI18nProvider>
          <AlertDecisionStatusNotice
            alert={alert({
              actionMode: 'review_only',
              firmImpact: 'review_only',
              applyReadiness: { status: 'not_applicable', missing: [] },
            })}
          />
        </AppI18nProvider>,
      )
    })
    expect(document.body.textContent).toContain('Review only')
    expect(document.body.textContent).toContain('no deadline overlay will be applied')
  })

  it('shows ready-to-apply copy after deadline selection is confirmed', () => {
    renderNotice(alert())

    expect(document.body.textContent).toContain('Ready to apply')
    expect(document.body.textContent).toContain('Continue to Apply when ready')
  })

  it('shows no-current-match as review without Apply copy', () => {
    renderNotice(
      alert({
        firmImpact: 'no_current_match',
        matchedCount: 0,
        needsReviewCount: 0,
        applyReadiness: { status: 'needs_details', missing: ['affected_clients'] },
      }),
    )

    expect(document.body.textContent).toContain('No current match')
    expect(document.body.textContent).toContain('No matching open deadlines')
    expect(document.body.textContent).toContain('confirm this firm has no affected open deadlines')
    expect(document.body.textContent).not.toContain('Continue to Apply when ready')
  })

  it('does not show apply readiness for already-actioned alerts', () => {
    renderNotice(alert({ status: 'applied' }))

    expect(document.body.textContent).not.toContain('Ready to apply')
    expect(document.body.textContent).not.toContain('Continue to Apply when ready')
  })
})
