import { describe, expect, it, vi } from 'vitest'
import type {
  SocialAlertCandidateRow,
  SocialAlertPost,
  SocialPublishRun,
  SocialQueuePost,
} from '@duedatehq/db'
import type { Env } from '../../env'
import { runXSocialCron, runXSocialWatchdog, type XPublishQueueMessage } from './scheduler'

const NOW = new Date('2026-07-21T13:00:00.000Z')

function candidate(
  id: string,
  overrides: Partial<SocialAlertCandidateRow> = {},
): SocialAlertCandidateRow {
  return {
    pulseId: id,
    sourceId: 'irs.newsroom',
    status: 'approved',
    isSample: false,
    agency: 'Internal Revenue Service',
    jurisdiction: 'Federal',
    forms: ['Form 1040'],
    entityTypes: ['individual'],
    changeKind: 'deadline_shift',
    sourceUrl: 'https://irs.gov/example',
    summary: 'A filing deadline changed.',
    originalDueDate: new Date('2026-04-15T00:00:00.000Z'),
    newDueDate: new Date('2026-07-28T00:00:00.000Z'),
    effectiveFrom: null,
    effectiveUntil: null,
    actionDeadline: null,
    createdAt: new Date('2026-07-21T00:00:00.000Z'),
    ...overrides,
  }
}

function draftPost(id: string, pulseId = `pulse-${id}`): SocialAlertPost {
  const now = new Date('2026-07-21T13:00:00.000Z')
  return {
    id,
    channel: 'x',
    pulseId,
    refToken: `ref-token-${id.padEnd(16, 'x')}`,
    postText: `Post copy for ${id}`,
    targetUrl: `https://app.duedatehq.com/alerts?ref=${id}`,
    teaser: `Teaser for ${id}`,
    agency: 'Internal Revenue Service',
    jurisdiction: 'Federal',
    changeKind: 'deadline_shift',
    status: 'draft',
    priority: 'normal',
    readyAt: null,
    approvedBy: null,
    approvedAt: null,
    xPostId: null,
    xReplyPostId: null,
    publishedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: now,
    updatedAt: now,
  }
}

function claimResult(
  runId: string,
  postId: string,
): { run: SocialPublishRun; post: SocialAlertPost } {
  const now = new Date('2026-07-21T13:00:00.000Z')
  return {
    run: {
      id: runId,
      channel: 'x',
      localDate: '2026-07-21',
      postId,
      status: 'queued',
      attemptCount: 0,
      lastAttemptAt: null,
      leaseExpiresAt: null,
      responseHttpStatus: null,
      failureReason: null,
      xPostId: null,
      xReplyPostId: null,
      queuedAt: now,
      sendingAt: null,
      publishedAt: null,
      failedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    post: draftPost(postId),
  }
}

function schedulerEnv(overrides: Partial<Env> = {}): Env {
  return {
    APP_URL: 'https://app.duedatehq.com',
    X_POSTING_MODE: 'draft',
    X_SOCIAL_START_AT: '2026-07-21T00:00:00.000Z',
    ...overrides,
  } as Env
}

function schedulerRepo(input: {
  candidates?: SocialAlertCandidateRow[]
  claim?: { run: SocialPublishRun; post: SocialAlertPost } | null
  existingDraftCount?: number
  claimReturnsToDraft?: boolean
  draftCreateError?: Error
}) {
  const drafts: SocialQueuePost[] = Array.from(
    { length: input.existingDraftCount ?? 0 },
    (_, index) =>
      Object.assign(draftPost(`existing-${index + 1}`), {
        pulseCreatedAt: new Date(`2026-07-${String(20 - index).padStart(2, '0')}T00:00:00.000Z`),
      }),
  )
  return {
    cancelIneligiblePosts: vi.fn().mockResolvedValue(0),
    listEligibleCandidates: vi.fn().mockResolvedValue(input.candidates ?? []),
    listDraftPostsForQueuePreview: vi.fn(async (request?: { limit?: number }) =>
      drafts.slice(0, request?.limit ?? 50),
    ),
    createDraftIfBufferBelow: vi.fn(
      async ({ pulseId, bufferSize }: { pulseId: string; bufferSize: number }) => {
        if (input.draftCreateError) throw input.draftCreateError
        if (drafts.length >= bufferSize) return { status: 'buffer_full' as const }
        const post = draftPost(`post-${pulseId}`, pulseId)
        drafts.push(Object.assign({}, post, { pulseCreatedAt: post.createdAt }))
        return { status: 'created' as const, post }
      },
    ),
    listOccupiedPublishDates: vi.fn().mockResolvedValue([]),
    claimDailyReadyPost: vi.fn(async ({ mode }: { mode: 'draft' | 'live' }) => {
      const claim = input.claim ?? null
      if (claim && mode === 'draft' && input.claimReturnsToDraft) {
        drafts.push(
          Object.assign({}, claim.post, { status: 'draft' as const, pulseCreatedAt: NOW }),
        )
      }
      return claim
    }),
    markFailed: vi.fn().mockResolvedValue(true),
  }
}

describe('runXSocialCron', () => {
  it('does not read or write the social outbox outside the 09:00 ET half-hour slot', async () => {
    const repo = schedulerRepo({ candidates: [candidate('pulse-1')] })

    await expect(
      runXSocialCron(schedulerEnv(), new Date('2026-07-21T13:30:00.000Z'), {
        repo,
      }),
    ).resolves.toEqual({ status: 'outside_slot' })
    expect(repo.cancelIneligiblePosts).not.toHaveBeenCalled()
    expect(repo.listEligibleCandidates).not.toHaveBeenCalled()
    expect(repo.createDraftIfBufferBelow).not.toHaveBeenCalled()
    expect(repo.claimDailyReadyPost).not.toHaveBeenCalled()
  })

  it.each(['2026-07-19', '2026-07-20'])(
    'fills the review buffer but does not claim when %s occupied one of the preceding two ET days',
    async (occupiedDate) => {
      const repo = schedulerRepo({ candidates: [candidate('pulse-1')] })
      repo.listOccupiedPublishDates.mockResolvedValue([occupiedDate])

      await expect(
        runXSocialCron(schedulerEnv(), new Date('2026-07-21T13:00:00.000Z'), { repo }),
      ).resolves.toEqual({
        status: 'cadence_pause',
        localDate: '2026-07-21',
        draftsCreated: 1,
      })
      expect(repo.listOccupiedPublishDates).toHaveBeenCalledWith({
        channel: 'x',
        fromLocalDate: '2026-07-19',
        limit: 3,
      })
      expect(repo.cancelIneligiblePosts).toHaveBeenCalledOnce()
      expect(repo.createDraftIfBufferBelow).toHaveBeenCalledOnce()
      expect(repo.claimDailyReadyPost).not.toHaveBeenCalled()
    },
  )

  it('fills the review buffer to three when an eligible slot is idle', async () => {
    const candidates = Array.from({ length: 10 }, (_, index) => candidate(`pulse-${index}`))
    const repo = schedulerRepo({ candidates })

    await expect(
      runXSocialCron(schedulerEnv(), new Date('2026-07-21T13:00:00.000Z'), {
        repo,
        randomRefToken: () => 'fixed-ref-token-1',
      }),
    ).resolves.toEqual({
      status: 'idle',
      localDate: '2026-07-21',
      draftsCreated: 3,
    })
    expect(repo.createDraftIfBufferBelow).toHaveBeenCalledTimes(3)
    expect(repo.createDraftIfBufferBelow).toHaveBeenCalledWith(
      expect.objectContaining({
        pulseId: 'pulse-9',
        since: new Date('2026-07-21T00:00:00.000Z'),
        bufferSize: 3,
      }),
    )
    expect(repo.cancelIneligiblePosts).toHaveBeenCalledWith({
      channel: 'x',
      limit: 100,
      now: new Date('2026-07-21T13:00:00.000Z'),
    })
    expect(repo.claimDailyReadyPost).toHaveBeenCalledOnce()
    expect(repo.claimDailyReadyPost).toHaveBeenCalledWith({
      channel: 'x',
      localDate: '2026-07-21',
      now: new Date('2026-07-21T13:00:00.000Z'),
      mode: 'draft',
    })
  })

  it('does not create when the valid review buffer already contains three drafts', async () => {
    const repo = schedulerRepo({
      candidates: [candidate('unused')],
      existingDraftCount: 3,
    })

    await expect(
      runXSocialCron(schedulerEnv(), new Date('2026-07-21T13:00:00.000Z'), { repo }),
    ).resolves.toEqual({ status: 'idle', localDate: '2026-07-21', draftsCreated: 0 })
    expect(repo.listEligibleCandidates).not.toHaveBeenCalled()
    expect(repo.createDraftIfBufferBelow).not.toHaveBeenCalled()
  })

  it('allows an automatic claim when the most recent occupied date is three ET days old', async () => {
    const repo = schedulerRepo({})
    repo.listOccupiedPublishDates.mockResolvedValue(['2026-07-18'])

    await expect(
      runXSocialCron(schedulerEnv(), new Date('2026-07-21T13:00:00.000Z'), { repo }),
    ).resolves.toEqual({ status: 'idle', localDate: '2026-07-21', draftsCreated: 0 })
    expect(repo.claimDailyReadyPost).toHaveBeenCalledOnce()
  })

  it('queues one live claim and marks a near deadline urgent', async () => {
    const repo = schedulerRepo({
      candidates: [
        candidate('pulse-1', {
          sourceId: 'CO tax agency',
          agency: 'CO tax agency',
          jurisdiction: 'CO',
        }),
      ],
      claim: claimResult('run-live', 'post-live'),
    })
    const sent: XPublishQueueMessage[] = []
    const queue = { send: vi.fn(async (message: XPublishQueueMessage) => void sent.push(message)) }

    await expect(
      runXSocialCron(
        schedulerEnv({
          X_POSTING_MODE: 'live',
          X_API_KEY: 'key',
          X_API_SECRET: 'secret',
          X_ACCESS_TOKEN: 'token',
          X_ACCESS_TOKEN_SECRET: 'token-secret',
          SOCIAL_OPS_TOKEN: 'social-ops-token-1234',
        }),
        new Date('2026-07-21T13:00:00.000Z'),
        {
          repo,
          queue,
          randomRefToken: () => 'fixed-ref-token-2',
        },
      ),
    ).resolves.toEqual({
      status: 'queued',
      localDate: '2026-07-21',
      draftsCreated: 1,
      runId: 'run-live',
    })
    expect(repo.createDraftIfBufferBelow).toHaveBeenCalledWith(
      expect.objectContaining({
        pulseId: 'pulse-1',
        priority: 'urgent',
        postText: expect.stringContaining('Colorado tax agency · Colorado alert'),
      }),
    )
    expect(sent).toEqual([{ type: 'social.x.publish', runId: 'run-live' }])
    expect(repo.createDraftIfBufferBelow.mock.invocationCallOrder[0]).toBeLessThan(
      queue.send.mock.invocationCallOrder[0]!,
    )
  })

  it('does not classify an expired candidate date as urgent', async () => {
    const repo = schedulerRepo({
      candidates: [candidate('pulse-stale', { newDueDate: new Date('2026-07-01T00:00:00.000Z') })],
    })

    await runXSocialCron(schedulerEnv(), new Date('2026-07-21T13:00:00.000Z'), { repo })

    expect(repo.createDraftIfBufferBelow).toHaveBeenCalledWith(
      expect.objectContaining({ pulseId: 'pulse-stale', priority: 'normal' }),
    )
  })

  it("still queues today's live Post when draft replenishment fails", async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const repo = schedulerRepo({
      candidates: [candidate('pulse-next')],
      claim: claimResult('run-live', 'post-live'),
      draftCreateError: new Error('D1 unavailable'),
    })
    const queue = { send: vi.fn().mockResolvedValue(undefined) }

    await expect(
      runXSocialCron(
        schedulerEnv({
          X_POSTING_MODE: 'live',
          X_API_KEY: 'key',
          X_API_SECRET: 'secret',
          X_ACCESS_TOKEN: 'token',
          X_ACCESS_TOKEN_SECRET: 'token-secret',
          SOCIAL_OPS_TOKEN: 'social-ops-token-1234',
        }),
        new Date('2026-07-21T13:00:00.000Z'),
        { repo, queue },
      ),
    ).resolves.toEqual({
      status: 'queued',
      localDate: '2026-07-21',
      draftsCreated: 0,
      runId: 'run-live',
    })
    expect(queue.send).toHaveBeenCalledOnce()
    expect(error).toHaveBeenCalledWith(expect.stringContaining('social.x.draft_replenish_failed'))
    error.mockRestore()
  })

  it('counts a shadowed ready Post toward the three-draft target', async () => {
    const repo = schedulerRepo({
      candidates: [candidate('pulse-2')],
      claim: claimResult('run-shadow', 'post-shadow'),
      existingDraftCount: 2,
      claimReturnsToDraft: true,
    })

    await expect(
      runXSocialCron(schedulerEnv(), new Date('2026-07-21T13:00:00.000Z'), { repo }),
    ).resolves.toEqual({
      status: 'draft_only',
      localDate: '2026-07-21',
      draftsCreated: 0,
      runId: 'run-shadow',
    })
    expect(repo.createDraftIfBufferBelow).not.toHaveBeenCalled()
  })

  it('keeps a cadence pause when draft replenishment fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const repo = schedulerRepo({
      candidates: [candidate('pulse-next')],
      draftCreateError: new Error('D1 unavailable'),
    })
    repo.listOccupiedPublishDates.mockResolvedValue(['2026-07-20'])

    await expect(
      runXSocialCron(schedulerEnv(), new Date('2026-07-21T13:00:00.000Z'), { repo }),
    ).resolves.toEqual({
      status: 'cadence_pause',
      localDate: '2026-07-21',
      draftsCreated: 0,
    })
    expect(repo.claimDailyReadyPost).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledWith(expect.stringContaining('social.x.draft_replenish_failed'))
    error.mockRestore()
  })

  it('fails the reserved day instead of silently losing an enqueue error', async () => {
    const repo = schedulerRepo({
      candidates: [candidate('pulse-next')],
      claim: claimResult('run-live', 'post-live'),
    })
    const queue = { send: vi.fn().mockRejectedValue(new Error('queue unavailable')) }
    const env = schedulerEnv({
      X_POSTING_MODE: 'live',
      X_API_KEY: 'key',
      X_API_SECRET: 'secret',
      X_ACCESS_TOKEN: 'token',
      X_ACCESS_TOKEN_SECRET: 'token-secret',
      SOCIAL_OPS_TOKEN: 'social-ops-token-1234',
    })

    await expect(
      runXSocialCron(env, new Date('2026-07-21T13:00:00.000Z'), {
        repo,
        queue,
      }),
    ).rejects.toThrow('queue unavailable')
    expect(repo.markFailed).toHaveBeenCalledWith({
      runId: 'run-live',
      reason: 'queue unavailable',
      now: new Date('2026-07-21T13:00:00.000Z'),
    })
    expect(repo.createDraftIfBufferBelow).toHaveBeenCalledOnce()
  })

  it('alerts on unknown runs and a ready backlog older than seven days', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const now = new Date('2026-07-21T13:00:00.000Z')
    const listPosts = vi.fn(async (input: { status?: string }) =>
      input.status === 'ready'
        ? [{ readyAt: new Date('2026-07-13T12:59:59.000Z') }]
        : [{ id: 'unknown-post', readyAt: null }],
    )

    await expect(runXSocialWatchdog(schedulerEnv(), now, { repo: { listPosts } })).resolves.toEqual(
      { status: 'checked', readyCount: 1, unknownCount: 1 },
    )
    expect(listPosts).toHaveBeenCalledTimes(2)
    const warningNames = warn.mock.calls.map(([line]) => JSON.parse(String(line)).name)
    expect(warningNames).toContain('social.x.backlog_stale')
    expect(warningNames).toContain('social.x.unknown_pending')
    warn.mockRestore()
  })
})
