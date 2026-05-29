import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PulseAlertPublic } from '@duedatehq/contracts'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

import { PulseAlertCard } from './PulseAlertCard'

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: { affectedClients: [] } }),
}))

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

function baseAlert(overrides: Partial<PulseAlertPublic> = {}): PulseAlertPublic {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    pulseId: '22222222-2222-4222-8222-222222222222',
    status: 'matched',
    sourceStatus: 'approved',
    changeKind: 'deadline_shift',
    actionMode: 'due_date_overlay',
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
    ...overrides,
  }
}

function renderCard(alert: PulseAlertPublic) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)

  act(() => {
    root?.render(
      <AppI18nProvider>
        <PulseAlertCard alert={alert} onReview={() => {}} />
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

describe('PulseAlertCard readiness', () => {
  it('shows ready, needs-details, and review-only readiness chips', () => {
    renderCard(baseAlert())
    expect(document.body.textContent).toContain('Ready to apply')

    act(() => {
      root?.render(
        <AppI18nProvider>
          <PulseAlertCard
            alert={baseAlert({
              applyReadiness: { status: 'needs_details', missing: ['affected_clients'] },
            })}
            onReview={() => {}}
          />
        </AppI18nProvider>,
      )
    })
    expect(document.body.textContent).toContain('Needs deadline selection')

    act(() => {
      root?.render(
        <AppI18nProvider>
          <PulseAlertCard
            alert={baseAlert({
              actionMode: 'review_only',
              applyReadiness: { status: 'not_applicable', missing: [] },
            })}
            onReview={() => {}}
          />
        </AppI18nProvider>,
      )
    })
    expect(document.body.textContent).toContain('Review only')
  })

  it('shows merged duplicate source update count without source names', () => {
    renderCard(baseAlert({ duplicateSourceSnapshotCount: 2 }))

    expect(document.body.textContent).toContain('Merged 2 similar source updates')
    expect(document.body.textContent).not.toContain('policy-watch')
  })
})
