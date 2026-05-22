import { describe, expect, it } from 'vitest'
import { dashboardBriefDebounceKey } from './dashboard-brief/enqueue'
import { shouldEnqueueScheduledDashboardBrief } from './cron'
import { assertQueueDispatchable } from './queue'

function batch(messages: Array<{ body?: unknown }>) {
  return {
    queue: 'due-date-hq-email-staging',
    messages,
  }
}

describe('queue consumer', () => {
  it('rejects unknown message contracts', () => {
    expect(() => assertQueueDispatchable(batch([{ body: { type: 'test' } }]))).toThrow(
      'No queue dispatcher is implemented',
    )
  })

  it('allows empty batches', () => {
    expect(() => assertQueueDispatchable(batch([]))).not.toThrow()
  })

  it('allows dashboard brief refresh messages', () => {
    expect(() =>
      assertQueueDispatchable(
        batch([
          {
            body: {
              type: 'dashboard.brief.refresh',
              firmId: 'firm_1',
              scope: 'firm',
              reason: 'manual_refresh',
              idempotencyKey: 'key',
              requestedAt: '2026-04-29T00:00:00.000Z',
            },
          },
        ]),
      ),
    ).not.toThrow()
  })

  it('allows Pulse extract and email flush messages', () => {
    expect(() =>
      assertQueueDispatchable(
        batch([
          { body: { type: 'pulse.extract', snapshotId: 'snapshot-1' } },
          { body: { type: 'email.flush' } },
        ]),
      ),
    ).not.toThrow()
  })

  it('allows rule concrete draft generation messages', () => {
    expect(() =>
      assertQueueDispatchable(
        batch([
          {
            body: {
              type: 'rule.concreteDraft.generate',
              ruleId: 'ca.business_income_return.candidate.2026',
              sourceId: 'ca.ftb_business_due_dates',
              reason: 'prewarm',
            },
          },
        ]),
      ),
    ).not.toThrow()
  })

  it('allows rule registry reconcile and catalog sync messages', () => {
    expect(() =>
      assertQueueDispatchable(
        batch([
          {
            body: {
              type: 'rule.registry.source.reconcile',
              runId: 'run-1',
              sourceId: 'ca.ftb_business_due_dates',
              reason: 'weekly',
            },
          },
          {
            body: {
              type: 'rule.registry.catalog.sync',
              reason: 'scheduled',
            },
          },
        ]),
      ),
    ).not.toThrow()
  })

  it('debounces dashboard brief refreshes at firm and scope granularity', () => {
    const first = dashboardBriefDebounceKey({
      firmId: 'firm_1',
      scope: 'firm',
    })
    const second = dashboardBriefDebounceKey({
      firmId: 'firm_1',
      scope: 'firm',
    })
    expect(first).toBe(second)
    expect(first).toBe('dashboard-brief:debounce:firm_1:firm:firm')
  })

  it('skips scheduled dashboard briefs on weekends unless risk is critical', () => {
    expect(
      shouldEnqueueScheduledDashboardBrief({
        timezone: 'UTC',
        now: new Date('2026-04-25T07:00:00.000Z'),
        hasCriticalRisk: false,
      }),
    ).toBe(false)
    expect(
      shouldEnqueueScheduledDashboardBrief({
        timezone: 'UTC',
        now: new Date('2026-04-25T07:00:00.000Z'),
        hasCriticalRisk: true,
      }),
    ).toBe(true)
  })
})
