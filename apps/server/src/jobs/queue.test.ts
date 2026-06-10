/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * The dead-letter drain test builds minimal Queue/Message/Env doubles; only the
 * fields the drain path actually reads (queue, body, attempts, ack/retry) are
 * populated, so the casts are deliberately narrowing.
 */
import { describe, expect, it, vi } from 'vitest'
import type { Env } from '../env'
import { dashboardBriefDebounceKey } from './dashboard-brief/enqueue'
import { shouldEnqueueScheduledDashboardBrief } from './cron'
import { assertQueueDispatchable, isPulseDeadLetterQueue, queue, queueMessageType } from './queue'

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

  it('allows Pulse per-source ingest scan messages', () => {
    expect(() =>
      assertQueueDispatchable(
        batch([
          {
            body: {
              type: 'pulse.ingest.source',
              sourceId: 'fema.declarations',
              reason: 'cadence_due',
            },
          },
          {
            // Host-grouped shape: several same-host sources ride one message.
            body: {
              type: 'pulse.ingest.source',
              sourceId: 'ny.due.one',
              sourceIds: ['ny.due.one', 'ny.due.two'],
              reason: 'cadence_due',
            },
          },
        ]),
      ),
    ).not.toThrow()
    expect(
      queueMessageType({ type: 'pulse.ingest.source', sourceId: 's', reason: 'cadence_due' }),
    ).toBe('pulse.ingest.source')
    expect(() =>
      assertQueueDispatchable(
        batch([
          {
            body: {
              type: 'pulse.ingest.source',
              sourceId: 's',
              sourceIds: [42],
              reason: 'cadence_due',
            },
          },
        ]),
      ),
    ).toThrow()
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

  it('allows rule source scan and catalog sync messages', () => {
    expect(() =>
      assertQueueDispatchable(
        batch([
          {
            body: {
              type: 'pulse.rule_source.scan',
              sourceId: 'ca.ftb_business_due_dates',
              reason: 'cadence_due',
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

  it('labels queue messages by their contract type', () => {
    expect(queueMessageType({ type: 'pulse.extract', snapshotId: 's1' })).toBe('pulse.extract')
    expect(queueMessageType({ type: 'email.flush' })).toBe('email.flush')
    expect(queueMessageType({})).toBe('unknown')
    expect(queueMessageType(null)).toBe('unknown')
  })

  it('detects pulse dead-letter queues without matching the live queue', () => {
    expect(isPulseDeadLetterQueue('due-date-hq-pulse-dlq-staging')).toBe(true)
    expect(isPulseDeadLetterQueue('due-date-hq-pulse-staging')).toBe(false)
    expect(isPulseDeadLetterQueue('due-date-hq-email-dlq-staging')).toBe(false)
  })

  it('drains pulse dead-letter batches and alerts instead of re-dispatching', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const ack = vi.fn()
    const retry = vi.fn()
    const message = {
      body: { type: 'pulse.extract', snapshotId: 's1' },
      attempts: 6,
      ack,
      retry,
    } as unknown as Message
    const dlqBatch = {
      queue: 'due-date-hq-pulse-dlq-staging',
      messages: [message],
    } as unknown as MessageBatch

    await queue(dlqBatch, {} as Env, {} as ExecutionContext)

    expect(ack).toHaveBeenCalledTimes(1)
    expect(retry).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledTimes(1)
    const payload = JSON.parse((warn.mock.calls[0]?.[0] as string) ?? '{}')
    expect(payload).toMatchObject({
      type: 'pulse.alert',
      name: 'pulse.queue.dead_letter',
      queue: 'due-date-hq-pulse-dlq-staging',
      messageType: 'pulse.extract',
      snapshotId: 's1',
    })
    warn.mockRestore()
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
