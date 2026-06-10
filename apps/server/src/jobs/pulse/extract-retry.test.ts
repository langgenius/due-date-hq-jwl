/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Focused doubles only implement the retry sweep's repo/Queue surface.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Env } from '../../env'
import { retryFailedPulseExtractions } from './extract-retry'

const repoMocks = vi.hoisted(() => ({
  countRecentExtractionOutcomes: vi.fn(),
  listRetryableFailedSnapshots: vi.fn(),
}))

vi.mock('@duedatehq/db', () => ({
  createDb: vi.fn(() => ({})),
  makePulseOpsRepo: vi.fn(() => repoMocks),
}))

function env(queueSend = vi.fn()): Pick<Env, 'DB' | 'PULSE_QUEUE'> {
  return {
    DB: {} as D1Database,
    PULSE_QUEUE: { send: queueSend } as unknown as Queue,
  }
}

const NOW = new Date('2026-06-10T12:00:00Z')

describe('retryFailedPulseExtractions', () => {
  beforeEach(() => {
    repoMocks.countRecentExtractionOutcomes.mockReset()
    repoMocks.listRetryableFailedSnapshots.mockReset()
  })

  it('stays closed while the pipeline has no recent successful extraction', async () => {
    repoMocks.countRecentExtractionOutcomes.mockResolvedValue({
      extracted: 0,
      failed: 12,
      total: 12,
    })
    const send = vi.fn()

    await expect(retryFailedPulseExtractions(env(send), NOW)).resolves.toEqual({ queued: 0 })
    expect(repoMocks.listRetryableFailedSnapshots).not.toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()
  })

  it('stays closed while failures dominate the window', async () => {
    repoMocks.countRecentExtractionOutcomes.mockResolvedValue({
      extracted: 3,
      failed: 9,
      total: 12,
    })
    const send = vi.fn()

    await expect(retryFailedPulseExtractions(env(send), NOW)).resolves.toEqual({ queued: 0 })
    expect(send).not.toHaveBeenCalled()
  })

  it('re-enqueues retryable failed snapshots when the pipeline is healthy', async () => {
    repoMocks.countRecentExtractionOutcomes.mockResolvedValue({
      extracted: 10,
      failed: 2,
      total: 12,
    })
    repoMocks.listRetryableFailedSnapshots.mockResolvedValue([{ id: 'snap-1' }, { id: 'snap-2' }])
    const send = vi.fn().mockResolvedValue(undefined)

    await expect(retryFailedPulseExtractions(env(send), NOW)).resolves.toEqual({ queued: 2 })
    expect(repoMocks.listRetryableFailedSnapshots).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 25, now: NOW }),
    )
    expect(send).toHaveBeenCalledTimes(2)
    expect(send).toHaveBeenCalledWith({ type: 'pulse.extract', snapshotId: 'snap-1' })
    expect(send).toHaveBeenCalledWith({ type: 'pulse.extract', snapshotId: 'snap-2' })
  })

  it('is a no-op when the retry set is empty', async () => {
    repoMocks.countRecentExtractionOutcomes.mockResolvedValue({
      extracted: 5,
      failed: 0,
      total: 5,
    })
    repoMocks.listRetryableFailedSnapshots.mockResolvedValue([])
    const send = vi.fn()

    await expect(retryFailedPulseExtractions(env(send), NOW)).resolves.toEqual({ queued: 0 })
    expect(send).not.toHaveBeenCalled()
  })
})
