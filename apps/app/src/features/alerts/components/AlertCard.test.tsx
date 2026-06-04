import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { PulseAffectedClient, PulseAlertPublic } from '@duedatehq/contracts'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

import { AlertCard } from './AlertCard'

// AlertCard no longer fetches its own detail — affected-client rows are passed
// in as a prop (batch-loaded by the parent), so no react-query mock is needed.

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
    ...overrides,
  }
}

function affectedClient(
  clientName: string,
  overrides: Partial<PulseAffectedClient> = {},
): PulseAffectedClient {
  return {
    obligationId: '99999999-9999-4999-8999-999999999999',
    clientId: '88888888-8888-4888-8888-888888888888',
    clientName,
    state: 'CA',
    county: null,
    entityType: 'llc',
    taxType: '1065',
    currentDueDate: '2026-03-15',
    newDueDate: '2026-10-15',
    status: 'pending',
    matchStatus: 'eligible',
    reason: null,
    ...overrides,
  }
}

function renderCard(
  alert: PulseAlertPublic,
  props: Omit<Partial<ComponentProps<typeof AlertCard>>, 'alert' | 'onReview'> = {},
) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)

  act(() => {
    root?.render(
      <AppI18nProvider>
        <AlertCard alert={alert} onReview={() => {}} {...props} />
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

describe('AlertCard readiness', () => {
  it('shows ready, needs-details, and review-only readiness chips', () => {
    renderCard(baseAlert())
    expect(document.body.textContent).toContain('Ready to apply')

    act(() => {
      root?.render(
        <AppI18nProvider>
          <AlertCard
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
          <AlertCard
            alert={baseAlert({
              actionMode: 'review_only',
              firmImpact: 'review_only',
              applyReadiness: { status: 'not_applicable', missing: [] },
            })}
            onReview={() => {}}
          />
        </AppI18nProvider>,
      )
    })
    expect(document.body.textContent).toContain('Review only')
  })

  it('hides readiness on history and already-actioned alerts', () => {
    renderCard(baseAlert(), { showReadiness: false })
    expect(document.body.textContent).not.toContain('Ready to apply')

    act(() => {
      root?.render(
        <AppI18nProvider>
          <AlertCard alert={baseAlert({ status: 'applied' })} onReview={() => {}} />
        </AppI18nProvider>,
      )
    })
    expect(document.body.textContent).toContain('Applied')
    expect(document.body.textContent).not.toContain('Ready to apply')
  })

  it('labels no-current-match alerts as review/no-action rows', () => {
    renderCard(
      baseAlert({
        firmImpact: 'no_current_match',
        matchedCount: 0,
        needsReviewCount: 0,
        applyReadiness: { status: 'needs_details', missing: ['affected_clients'] },
      }),
    )

    expect(document.body.textContent).toContain('No current match')
    expect(document.body.textContent).toContain('No matching open deadlines in this practice')
    expect(document.body.textContent).not.toContain('Ready to apply')
  })

  it('shows merged duplicate source update count without source names', () => {
    renderCard(baseAlert({ duplicateSourceSnapshotCount: 2 }))

    expect(document.body.textContent).toContain('Merged 2 similar source updates')
    expect(document.body.textContent).not.toContain('policy-watch')
  })

  it('lists affected-client names passed in from the batch (no per-card fetch)', () => {
    renderCard(baseAlert(), {
      affectedClients: [affectedClient('Acme Holdings'), affectedClient('Beta Partners')],
    })

    expect(document.body.textContent).toContain('Acme Holdings')
    expect(document.body.textContent).toContain('Beta Partners')
  })
})
