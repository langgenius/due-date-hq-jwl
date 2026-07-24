import { describe, expect, it, vi } from 'vitest'
import type { Env } from '../../env'
import { consumeXPublish, isXPublishQueueMessage, markXPublishDeadLetter } from './consumer'

const NOW = new Date('2026-07-21T13:01:00.000Z')

function liveEnv(overrides: Partial<Env> = {}): Env {
  return {
    X_POSTING_MODE: 'live',
    X_API_KEY: 'key',
    X_API_SECRET: 'secret',
    X_ACCESS_TOKEN: 'token',
    X_ACCESS_TOKEN_SECRET: 'token-secret',
    SOCIAL_OPS_TOKEN: 'social-ops-token-1234',
    ...overrides,
  } as Env
}

function publishPayload(runStatus = 'queued') {
  return {
    runId: 'run-1',
    runStatus,
    localDate: '2026-07-21',
    postId: 'post-1',
    pulseId: 'pulse-1',
    postText: 'frozen post text',
    targetUrl: 'https://app.duedatehq.com/alerts?ref=token',
  }
}

function repo(runStatus = 'queued') {
  return {
    getPublishPayload: vi.fn().mockResolvedValue(publishPayload(runStatus)),
    cancelIfPulseIneligible: vi.fn().mockResolvedValue(false),
    markSending: vi.fn().mockResolvedValue(true),
    markPublished: vi.fn().mockResolvedValue(true),
    markFailed: vi.fn().mockResolvedValue(true),
    markUnknown: vi.fn().mockResolvedValue(true),
  }
}

describe('isXPublishQueueMessage', () => {
  it('accepts only the explicit social publish contract', () => {
    expect(isXPublishQueueMessage({ type: 'social.x.publish', runId: 'run-1' })).toBe(true)
    expect(isXPublishQueueMessage({ type: 'social.x.publish', runId: '' })).toBe(false)
    expect(isXPublishQueueMessage({ type: 'social.x.publish' })).toBe(false)
    expect(isXPublishQueueMessage({ type: 'other', runId: 'run-1' })).toBe(false)
  })
})

describe('consumeXPublish', () => {
  it('publishes once and persists the external Post ID', async () => {
    const socialRepo = repo()
    const createPost = vi.fn().mockResolvedValue({
      kind: 'published',
      externalPostId: '2012345678901234567',
      text: 'frozen post text',
    })
    const now = NOW

    await expect(
      consumeXPublish({ type: 'social.x.publish', runId: 'run-1' }, liveEnv(), {
        repo: socialRepo,
        createPost,
        now,
      }),
    ).resolves.toEqual({
      status: 'published',
      runId: 'run-1',
      externalPostId: '2012345678901234567',
    })
    expect(createPost).toHaveBeenCalledOnce()
    expect(socialRepo.markSending).toHaveBeenCalledWith({
      runId: 'run-1',
      now,
      leaseExpiresAt: new Date('2026-07-21T13:06:00.000Z'),
    })
    expect(socialRepo.markPublished).toHaveBeenCalledWith({
      runId: 'run-1',
      externalPostId: '2012345678901234567',
      now,
    })
  })

  it('CAS-marks a dead-lettered queued run unknown without calling X', async () => {
    const socialRepo = repo()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const now = new Date('2026-07-21T13:10:00.000Z')

    await expect(
      markXPublishDeadLetter({ type: 'social.x.publish', runId: 'run-1' }, liveEnv(), {
        repo: socialRepo,
        now,
      }),
    ).resolves.toBe(true)
    expect(socialRepo.markUnknown).toHaveBeenCalledWith({
      runId: 'run-1',
      reason: 'Social publish queue delivery exhausted without a durable terminal state.',
      now,
    })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('social.queue.dead_letter'))
    warn.mockRestore()
  })

  it('never calls X when draft mode receives a stale queue message', async () => {
    const socialRepo = repo()
    const createPost = vi.fn()

    await expect(
      consumeXPublish(
        { type: 'social.x.publish', runId: 'run-1' },
        liveEnv({ X_POSTING_MODE: 'draft' }),
        { repo: socialRepo, createPost, now: NOW },
      ),
    ).resolves.toEqual({
      status: 'failed',
      runId: 'run-1',
      reason: 'X live publishing is disabled.',
    })
    expect(createPost).not.toHaveBeenCalled()
    expect(socialRepo.markFailed).toHaveBeenCalledOnce()
  })

  it('never calls X when live mode lacks the operator control token', async () => {
    const socialRepo = repo()
    const createPost = vi.fn()

    await expect(
      consumeXPublish(
        { type: 'social.x.publish', runId: 'run-1' },
        liveEnv({ SOCIAL_OPS_TOKEN: undefined }),
        { repo: socialRepo, createPost, now: NOW },
      ),
    ).resolves.toEqual({
      status: 'failed',
      runId: 'run-1',
      reason: 'X live publishing is missing SOCIAL_OPS_TOKEN.',
    })
    expect(createPost).not.toHaveBeenCalled()
    expect(socialRepo.markFailed).toHaveBeenCalledOnce()
  })

  it('cancels a post whose Pulse became ineligible before sending', async () => {
    const socialRepo = repo()
    socialRepo.cancelIfPulseIneligible.mockResolvedValue(true)
    const createPost = vi.fn()

    await expect(
      consumeXPublish({ type: 'social.x.publish', runId: 'run-1' }, liveEnv(), {
        repo: socialRepo,
        createPost,
        now: NOW,
      }),
    ).resolves.toEqual({ status: 'cancelled', runId: 'run-1' })
    expect(socialRepo.markSending).not.toHaveBeenCalled()
    expect(createPost).not.toHaveBeenCalled()
  })

  it('turns a redelivered sending state into unknown without calling X again', async () => {
    const socialRepo = repo('sending')
    const createPost = vi.fn()

    await expect(
      consumeXPublish({ type: 'social.x.publish', runId: 'run-1' }, liveEnv(), {
        repo: socialRepo,
        createPost,
        now: NOW,
      }),
    ).resolves.toEqual({
      status: 'unknown',
      runId: 'run-1',
      reason: 'A previous X create attempt did not reach a durable terminal state.',
    })
    expect(socialRepo.markUnknown).toHaveBeenCalledOnce()
    expect(socialRepo.markSending).not.toHaveBeenCalled()
    expect(createPost).not.toHaveBeenCalled()
  })

  it('persists explicit HTTP rejection as failed and ambiguous transport as unknown', async () => {
    const failedRepo = repo()
    await expect(
      consumeXPublish({ type: 'social.x.publish', runId: 'run-1' }, liveEnv(), {
        repo: failedRepo,
        now: NOW,
        createPost: vi.fn().mockResolvedValue({
          kind: 'definite_failure',
          httpStatus: 429,
          reason: 'rate limited',
        }),
      }),
    ).resolves.toEqual({ status: 'failed', runId: 'run-1', reason: 'rate limited' })
    expect(failedRepo.markFailed).toHaveBeenCalledWith(
      expect.objectContaining({ httpStatus: 429, reason: 'rate limited' }),
    )

    const unknownRepo = repo()
    await expect(
      consumeXPublish({ type: 'social.x.publish', runId: 'run-1' }, liveEnv(), {
        repo: unknownRepo,
        now: NOW,
        createPost: vi.fn().mockResolvedValue({
          kind: 'unknown',
          httpStatus: 503,
          reason: 'upstream failed',
        }),
      }),
    ).resolves.toEqual({ status: 'unknown', runId: 'run-1', reason: 'upstream failed' })
    expect(unknownRepo.markUnknown).toHaveBeenCalledWith(
      expect.objectContaining({ httpStatus: 503, reason: 'upstream failed' }),
    )
  })

  it('expires a delayed prior-day slot without calling X', async () => {
    const socialRepo = repo()
    const createPost = vi.fn()
    const nextDay = new Date('2026-07-22T13:00:00.000Z')

    await expect(
      consumeXPublish({ type: 'social.x.publish', runId: 'run-1' }, liveEnv(), {
        repo: socialRepo,
        createPost,
        now: nextDay,
      }),
    ).resolves.toEqual({
      status: 'failed',
      runId: 'run-1',
      reason: 'X publishing slot 2026-07-21 expired before dispatch on 2026-07-22.',
    })
    expect(createPost).not.toHaveBeenCalled()
    expect(socialRepo.markFailed).toHaveBeenCalledWith({
      runId: 'run-1',
      reason: 'X publishing slot 2026-07-21 expired before dispatch on 2026-07-22.',
      now: nextDay,
    })
  })
})
