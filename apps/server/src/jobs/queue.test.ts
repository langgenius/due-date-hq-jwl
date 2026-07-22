/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * The dead-letter drain test builds minimal Queue/Message/Env doubles; only the
 * fields the drain path actually reads (queue, body, attempts, ack/retry) are
 * populated, so the casts are deliberately narrowing.
 */
import { describe, expect, it, vi } from 'vitest'
import type { Env } from '../env'
import { dashboardBriefDebounceKey } from './dashboard-brief/enqueue'
import {
  assertQueueDispatchable,
  dispatchMessage,
  drainDeadLetterBatch,
  isPulseDeadLetterQueue,
  isSocialDeadLetterQueue,
  queue,
  queueMessageRunId,
  queueMessageSourceId,
  queueMessageType,
} from './queue'

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
              scope: 'me',
              reason: 'scope_view',
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

  it('allows only well-formed X publish messages', () => {
    expect(() =>
      assertQueueDispatchable(
        batch([{ body: { type: 'social.x.publish', runId: 'social-run-1' } }]),
      ),
    ).not.toThrow()
    expect(() =>
      assertQueueDispatchable(batch([{ body: { type: 'social.x.publish', runId: '' } }])),
    ).toThrow()
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

  it('extracts the social run ID for dead-letter reconciliation', () => {
    expect(queueMessageRunId({ type: 'social.x.publish', runId: 'run-1' })).toBe('run-1')
    expect(queueMessageRunId({ type: 'social.x.publish', runId: '' })).toBeNull()
    expect(queueMessageRunId({ type: 'pulse.extract', snapshotId: 'snapshot-1' })).toBeNull()
  })

  it('names the affected source(s) on a failed message for ops alerts', () => {
    // Single-source ingest message.
    expect(
      queueMessageSourceId({
        type: 'pulse.ingest.source',
        sourceId: 'fema.declarations',
        reason: 'cadence_due',
      }),
    ).toBe('fema.declarations')
    // Host-grouped shape reports the whole list.
    expect(
      queueMessageSourceId({
        type: 'pulse.ingest.source',
        sourceId: 'ny.due.one',
        sourceIds: ['ny.due.one', 'ny.due.two'],
        reason: 'cadence_due',
      }),
    ).toBe('ny.due.one,ny.due.two')
    // pulse.extract carries no source id (snapshotId is reported separately).
    expect(queueMessageSourceId({ type: 'pulse.extract', snapshotId: 's1' })).toBeNull()
    expect(queueMessageSourceId(null)).toBeNull()
  })

  it('detects pulse dead-letter queues without matching the live queue', () => {
    expect(isPulseDeadLetterQueue('due-date-hq-pulse-dlq-staging')).toBe(true)
    expect(isPulseDeadLetterQueue('due-date-hq-pulse-staging')).toBe(false)
    expect(isPulseDeadLetterQueue('due-date-hq-email-dlq-staging')).toBe(false)
  })

  it('detects social dead-letter queues without matching the live queue', () => {
    expect(isSocialDeadLetterQueue('due-date-hq-social-dlq-staging')).toBe(true)
    expect(isSocialDeadLetterQueue('due-date-hq-social-staging')).toBe(false)
    expect(isSocialDeadLetterQueue('due-date-hq-pulse-dlq-staging')).toBe(false)
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

  it('uses the fourth delivery as a final processing attempt and acks success', async () => {
    const dispatchBody = vi.fn().mockResolvedValue(undefined)
    const dispatchAlert = vi.fn()
    const ack = vi.fn()
    const retry = vi.fn()
    const message = {
      id: 'message-final-success',
      body: {
        type: 'pulse.ingest.source',
        sourceId: 'ri.tax_disaster_advisories',
        reason: 'cadence_due',
      },
      attempts: 4,
      ack,
      retry,
    } as unknown as Message

    await dispatchMessage(message, {} as Env, 'due-date-hq-pulse-staging-v2', {
      dispatchBody,
      dispatchAlert,
    })

    expect(dispatchBody).toHaveBeenCalledWith(message.body, {})
    expect(ack).toHaveBeenCalledOnce()
    expect(retry).not.toHaveBeenCalled()
    expect(dispatchAlert).not.toHaveBeenCalled()
  })

  it('includes the terminal error and message identity when the fourth attempt fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const dispatchBody = vi.fn().mockRejectedValue(new Error('D1_ERROR: database unavailable'))
    const dispatchAlert = vi.fn().mockResolvedValue(undefined)
    const ack = vi.fn()
    const retry = vi.fn()
    const message = {
      id: 'message-final-failure',
      body: {
        type: 'pulse.ingest.source',
        sourceId: 'ri.tax_disaster_advisories',
        reason: 'cadence_due',
      },
      attempts: 4,
      ack,
      retry,
    } as unknown as Message

    await dispatchMessage(message, {} as Env, 'due-date-hq-pulse-staging-v2', {
      dispatchBody,
      dispatchAlert,
    })

    const fields = {
      queue: 'due-date-hq-pulse-staging-v2',
      messageId: 'message-final-failure',
      messageType: 'pulse.ingest.source',
      attempts: 4,
      sourceId: 'ri.tax_disaster_advisories',
      error: 'D1_ERROR: database unavailable',
    }
    expect(dispatchAlert).toHaveBeenCalledWith({}, 'queue.dispatch.dropped', fields)
    expect(JSON.parse((warn.mock.calls[0]?.[0] as string) ?? '{}')).toMatchObject({
      type: 'pulse.alert',
      name: 'queue.dispatch.dropped',
      ...fields,
    })
    expect(ack).toHaveBeenCalledOnce()
    expect(retry).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('logs diagnostic fields and retries failures before the final attempt', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const dispatchBody = vi.fn().mockRejectedValue(new Error('temporary D1 error'))
    const ack = vi.fn()
    const retry = vi.fn()
    const message = {
      id: 'message-retry',
      body: { type: 'pulse.extract', snapshotId: 'snapshot-1' },
      attempts: 3,
      ack,
      retry,
    } as unknown as Message

    await dispatchMessage(message, {} as Env, 'due-date-hq-pulse-staging-v2', { dispatchBody })

    expect(JSON.parse((warn.mock.calls[0]?.[0] as string) ?? '{}')).toMatchObject({
      type: 'queue.metric',
      name: 'queue.dispatch.retry',
      queue: 'due-date-hq-pulse-staging-v2',
      messageId: 'message-retry',
      messageType: 'pulse.extract',
      attempts: 3,
      error: 'temporary D1 error',
    })
    expect(retry).toHaveBeenCalledOnce()
    expect(ack).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('marks a social dead letter unknown before acknowledging it', async () => {
    const ack = vi.fn()
    const retry = vi.fn()
    const message = {
      body: { type: 'social.x.publish', runId: 'run-1' },
      attempts: 3,
      ack,
      retry,
    } as unknown as Message
    const dlqBatch = {
      queue: 'due-date-hq-social-dlq-staging',
      messages: [message],
    } as unknown as MessageBatch
    const markXDeadLetter = vi.fn().mockResolvedValue(true)

    await drainDeadLetterBatch(dlqBatch, {} as Env, { markXDeadLetter })

    expect(markXDeadLetter).toHaveBeenCalledWith(message.body, {})
    expect(ack).toHaveBeenCalledOnce()
    expect(retry).not.toHaveBeenCalled()
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
})
