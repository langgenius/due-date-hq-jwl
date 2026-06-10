import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dispatchOpsAlert } from './ops-alerts'

const sendMock = vi.hoisted(() => vi.fn())

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock }
  },
}))

function fakeKv() {
  const store = new Map<string, string>()
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value)
    }),
  } as unknown as KVNamespace
}

const CONFIGURED = {
  OPS_ALERT_EMAIL: 'ops@example.com',
  RESEND_API_KEY: 'test-key',
  EMAIL_FROM: 'noreply@example.com',
}

describe('dispatchOpsAlert', () => {
  beforeEach(() => {
    sendMock.mockReset()
    sendMock.mockResolvedValue({ error: null })
  })

  it('is a no-op when OPS_ALERT_EMAIL is not configured', async () => {
    await dispatchOpsAlert({ ...CONFIGURED, OPS_ALERT_EMAIL: '' }, 'cron.branch_failed.x', {})
    await dispatchOpsAlert({ RESEND_API_KEY: 'k', EMAIL_FROM: 'f@e.com' }, 'x', {})
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('emails the configured recipient and dedupes repeat firings via KV', async () => {
    const env = { ...CONFIGURED, CACHE: fakeKv() }
    await dispatchOpsAlert(env, 'pulse.ingest.sources_stale', { staleCount: 3 })
    await dispatchOpsAlert(env, 'pulse.ingest.sources_stale', { staleCount: 4 })

    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@example.com',
        to: ['ops@example.com'],
        subject: '[DueDateHQ ops] pulse.ingest.sources_stale',
      }),
    )

    // A different alert name is not deduped against the first.
    await dispatchOpsAlert(env, 'cron.branch_failed.rule_source_scans', { error: 'boom' })
    expect(sendMock).toHaveBeenCalledTimes(2)
  })

  it('swallows send failures and leaves the dedupe unmarked so the next firing retries', async () => {
    const env = { ...CONFIGURED, CACHE: fakeKv() }
    sendMock.mockRejectedValueOnce(new Error('resend down'))

    await expect(dispatchOpsAlert(env, 'queue.dispatch.dropped', {})).resolves.toBeUndefined()
    await dispatchOpsAlert(env, 'queue.dispatch.dropped', {})
    expect(sendMock).toHaveBeenCalledTimes(2)
  })
})
