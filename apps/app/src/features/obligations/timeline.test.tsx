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

function renderTimeline(events: AuditEventPublic[], currentStatus: ObligationStatus = 'pending') {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)

  act(() => {
    root?.render(
      <AppI18nProvider>
        <ObligationTimeline
          currentStatus={currentStatus}
          events={events}
          labels={statusLabels}
          practiceTimezone="America/Los_Angeles"
        />
      </AppI18nProvider>,
    )
  })
}

function statusChangedEvent(
  id: string,
  toStatus: ObligationStatus,
  createdAt: string,
): AuditEventPublic {
  return {
    id,
    firmId: 'firm_1',
    actorId: 'user_1',
    actorLabel: 'Sarah Martinez',
    entityType: 'obligation_instance',
    entityId: '20000000-0000-4000-8000-000000000013',
    action: 'status_changed',
    beforeJson: { status: 'pending' },
    afterJson: { status: toStatus },
    reason: null,
    ipHash: null,
    userAgentHash: null,
    createdAt,
  }
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
    // A row-creation event has no `afterJson.status` and so falls into
    // the "Other activity" bucket (covered by the `obligation.created`
    // audit action label). This is the canonical case the bucket exists
    // for — non-status-changing audit traffic.
    renderTimeline([
      {
        id: '11111111-1111-4111-8111-111111111111',
        firmId: 'firm_1',
        actorId: 'user_1',
        actorLabel: 'Sarah Martinez',
        entityType: 'obligation_instance',
        entityId: '20000000-0000-4000-8000-000000000013',
        action: 'obligation.created',
        beforeJson: null,
        afterJson: { something_else: true },
        reason: 'Migrated from CSV import',
        ipHash: null,
        userAgentHash: null,
        createdAt: '2026-05-20T05:46:49.000Z',
      },
    ])

    expect(document.body.textContent).toContain('Other activity')
    expect(document.body.textContent).toContain('Sarah Martinez')
    expect(document.body.textContent).toContain('Migrated from CSV import')
    expect(document.body.textContent).not.toContain('obligation.created')
  })

  it('groups `extended` status events under the In review milestone (not Other activity)', () => {
    // 2026-05-27 (Agent X3 milestone audit M-07): `extended` collapses
    // into the In review milestone per LIFECYCLE_V2_STATUSES. Pre-fix,
    // an `extended` audit event landed in "Other activity" — telling
    // the CPA the In review stage never happened on this row.
    renderTimeline(
      [
        statusChangedEvent(
          '55555555-5555-4555-8555-555555555555',
          'extended',
          '2026-05-20T05:46:49.000Z',
        ),
      ],
      'extended',
    )

    expect(document.body.textContent).toContain('In review')
    expect(document.body.textContent).not.toContain('Other activity')
  })

  // 2026-05-27 (Agent X3 milestone audit — regression locks for M-03/M-05/M-07/M-09).
  // These tests pin the legacy-status → v2-milestone collapse so a future
  // refactor that drops `not_applicable` / `in_progress` / `extended` from
  // `MILESTONE_MAP` (or remaps `paid → completed`) fails loudly here.
  it('groups `paid` status events under the Filed milestone (not Completed)', () => {
    renderTimeline(
      [
        statusChangedEvent(
          '22222222-2222-4222-8222-222222222222',
          'paid',
          '2026-05-21T10:00:00.000Z',
        ),
      ],
      'paid',
    )
    // Filed bucket should hold the event reason / "Status set to filed"
    // fallback line. We check that the rendered text contains "Filed"
    // (the milestone label) and does NOT contain "Other activity"
    // (which is what the pre-fix code would have rendered for paid).
    expect(document.body.textContent).toContain('Filed')
    expect(document.body.textContent).not.toContain('Other activity')
  })

  it('groups `in_progress` status events under the In review milestone', () => {
    renderTimeline(
      [
        statusChangedEvent(
          '33333333-3333-4333-8333-333333333333',
          'in_progress',
          '2026-05-22T10:00:00.000Z',
        ),
      ],
      'in_progress',
    )
    expect(document.body.textContent).toContain('In review')
    expect(document.body.textContent).not.toContain('Other activity')
  })

  it('groups `not_applicable` events under the Not started milestone', () => {
    renderTimeline(
      [
        statusChangedEvent(
          '44444444-4444-4444-8444-444444444444',
          'not_applicable',
          '2026-05-23T10:00:00.000Z',
        ),
      ],
      'not_applicable',
    )
    expect(document.body.textContent).toContain('Not started')
    expect(document.body.textContent).not.toContain('Other activity')
  })
})
