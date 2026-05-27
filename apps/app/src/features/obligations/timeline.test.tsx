import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { AuditEventPublic } from '@duedatehq/contracts'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

import type { ObligationStatus } from './status-control'
import { ObligationTimeline } from './timeline'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

const statusLabels: Record<ObligationStatus, string> = {
  pending: 'Not started',
  in_progress: 'In progress',
  waiting_on_client: 'Waiting on client',
  blocked: 'Blocked',
  review: 'In review',
  done: 'Filed',
  completed: 'Completed',
  paid: 'Paid',
  extended: 'Extended',
  not_applicable: 'Not applicable',
}

function renderTimeline(events: AuditEventPublic[]) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)

  act(() => {
    root?.render(
      <AppI18nProvider>
        <ObligationTimeline
          currentStatus="pending"
          events={events}
          labels={statusLabels}
          practiceTimezone="America/Los_Angeles"
        />
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

describe('ObligationTimeline', () => {
  it('renders CPA-readable labels for other audit activity', () => {
    renderTimeline([
      {
        id: '11111111-1111-4111-8111-111111111111',
        firmId: 'firm_1',
        actorId: 'user_1',
        actorLabel: 'Sarah Martinez',
        actorType: 'user',
        previousActorType: null,
        aiEventMetadata: null,
        entityType: 'obligation_instance',
        entityId: '20000000-0000-4000-8000-000000000013',
        action: 'obligation.extension.decided',
        beforeJson: { status: 'pending' },
        afterJson: { status: 'extended' },
        reason: null,
        ipHash: null,
        userAgentHash: null,
        createdAt: '2026-05-20T05:46:49.000Z',
      },
    ])

    expect(document.body.textContent).toContain('Other activity')
    expect(document.body.textContent).toContain('Extension plan saved')
    expect(document.body.textContent).toContain('Sarah Martinez')
    expect(document.body.textContent).not.toContain('obligation.extension.decided')
  })
})
