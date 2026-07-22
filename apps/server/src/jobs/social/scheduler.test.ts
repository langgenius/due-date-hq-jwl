import { describe, expect, it, vi } from 'vitest'
import type { Env } from '../../env'
import { runXSocialCron, runXSocialWatchdog, type XPublishQueueMessage } from './scheduler'
import type { SocialAlertCandidate } from './content'

function candidate(
  id: string,
  overrides: Partial<SocialAlertCandidate> = {},
): SocialAlertCandidate {
  return {
    pulseId: id,
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

function schedulerEnv(overrides: Partial<Env> = {}): Env {
  return {
    APP_URL: 'https://app.duedatehq.com',
    X_POSTING_MODE: 'draft',
    X_SOCIAL_START_AT: '2026-07-21T00:00:00.000Z',
    ...overrides,
  } as Env
}

function schedulerRepo(input: {
  candidates?: SocialAlertCandidate[]
  claim?: { run: { id: string }; post: { id: string } } | null
  draftResult?: 'created' | 'daily_slot_filled' | 'candidate_conflict'
}) {
  return {
    cancelIneligiblePosts: vi.fn().mockResolvedValue(0),
    listEligibleCandidates: vi.fn().mockResolvedValue(input.candidates ?? []),
    createDailyDraft: vi.fn().mockResolvedValue(input.draftResult ?? 'created'),
    claimDailyReadyPost: vi.fn().mockResolvedValue(input.claim ?? null),
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
    expect(repo.createDailyDraft).not.toHaveBeenCalled()
    expect(repo.claimDailyReadyPost).not.toHaveBeenCalled()
  })

  it('creates only one rolling draft from many candidates when the daily slot is idle', async () => {
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
      draftsCreated: 1,
    })
    expect(repo.createDailyDraft).toHaveBeenCalledOnce()
    expect(repo.createDailyDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        pulseId: 'pulse-0',
        since: new Date('2026-07-21T00:00:00.000Z'),
        dailyWindowStart: new Date('2026-07-21T04:00:00.000Z'),
        dailyWindowEnd: new Date('2026-07-22T04:00:00.000Z'),
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

  it('skips an invalid first candidate and drafts the next eligible Alert', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const repo = schedulerRepo({
      candidates: [
        candidate('invalid', { summary: 'Contact reviewer@example.com for details.' }),
        candidate('eligible'),
      ],
    })

    await expect(
      runXSocialCron(schedulerEnv(), new Date('2026-07-21T13:00:00.000Z'), { repo }),
    ).resolves.toEqual({ status: 'idle', localDate: '2026-07-21', draftsCreated: 1 })
    expect(repo.createDailyDraft).toHaveBeenCalledOnce()
    expect(repo.createDailyDraft).toHaveBeenCalledWith(
      expect.objectContaining({ pulseId: 'eligible' }),
    )
    warn.mockRestore()
  })

  it('does not create twice when this ET day already received a draft', async () => {
    const repo = schedulerRepo({
      candidates: [candidate('pulse-1')],
      draftResult: 'daily_slot_filled',
    })

    await expect(
      runXSocialCron(schedulerEnv(), new Date('2026-07-21T13:00:00.000Z'), { repo }),
    ).resolves.toEqual({ status: 'idle', localDate: '2026-07-21', draftsCreated: 0 })
    expect(repo.createDailyDraft).toHaveBeenCalledOnce()
  })

  it('continues to the next candidate after a concurrent candidate conflict', async () => {
    const repo = schedulerRepo({
      candidates: [candidate('pulse-raced'), candidate('pulse-next')],
    })
    repo.createDailyDraft
      .mockResolvedValueOnce('candidate_conflict')
      .mockResolvedValueOnce('created')

    await expect(
      runXSocialCron(schedulerEnv(), new Date('2026-07-21T13:00:00.000Z'), { repo }),
    ).resolves.toEqual({ status: 'idle', localDate: '2026-07-21', draftsCreated: 1 })
    expect(repo.createDailyDraft).toHaveBeenCalledTimes(2)
    expect(repo.createDailyDraft.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({ pulseId: 'pulse-next' }),
    )
  })

  it('pages past 100 newer invalid candidates to draft the next valid Alert', async () => {
    const invalidCandidates = Array.from({ length: 100 }, (_, index) =>
      candidate(`invalid-${String(index).padStart(3, '0')}`, {
        summary: `Contact reviewer-${index}@example.com`,
        createdAt: new Date(1_800_000_000_000 - index),
      }),
    )
    const eligible = candidate('eligible-older', {
      createdAt: new Date('2026-07-20T00:00:00.000Z'),
    })
    const repo = schedulerRepo({ candidates: [] })
    repo.listEligibleCandidates
      .mockResolvedValueOnce(invalidCandidates)
      .mockResolvedValueOnce([eligible])
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    await expect(
      runXSocialCron(schedulerEnv(), new Date('2026-07-21T13:00:00.000Z'), { repo }),
    ).resolves.toEqual({ status: 'idle', localDate: '2026-07-21', draftsCreated: 1 })

    expect(repo.listEligibleCandidates).toHaveBeenCalledTimes(2)
    expect(repo.listEligibleCandidates.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        before: {
          createdAt: invalidCandidates[99]!.createdAt,
          pulseId: invalidCandidates[99]!.pulseId,
        },
      }),
    )
    expect(repo.createDailyDraft).toHaveBeenCalledOnce()
    expect(repo.createDailyDraft).toHaveBeenCalledWith(
      expect.objectContaining({ pulseId: 'eligible-older' }),
    )
    warn.mockRestore()
  })

  it('queues one live claim and marks a near deadline urgent', async () => {
    const repo = schedulerRepo({
      candidates: [candidate('pulse-1', { agency: 'CO tax agency', jurisdiction: 'CO' })],
      claim: { run: { id: 'run-live' }, post: { id: 'post-live' } },
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
    expect(repo.createDailyDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        pulseId: 'pulse-1',
        priority: 'urgent',
        postText: expect.stringContaining('Colorado tax agency · Colorado alert'),
      }),
    )
    expect(sent).toEqual([{ type: 'social.x.publish', runId: 'run-live' }])
    expect(repo.createDailyDraft.mock.invocationCallOrder[0]).toBeLessThan(
      queue.send.mock.invocationCallOrder[0]!,
    )
  })

  it('does not classify an expired candidate date as urgent', async () => {
    const repo = schedulerRepo({
      candidates: [candidate('pulse-stale', { newDueDate: new Date('2026-07-01T00:00:00.000Z') })],
    })

    await runXSocialCron(schedulerEnv(), new Date('2026-07-21T13:00:00.000Z'), { repo })

    expect(repo.createDailyDraft).toHaveBeenCalledWith(
      expect.objectContaining({ pulseId: 'pulse-stale', priority: 'normal' }),
    )
  })

  it("still queues today's live Post when draft replenishment fails", async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const repo = schedulerRepo({
      candidates: [candidate('pulse-next')],
      claim: { run: { id: 'run-live' }, post: { id: 'post-live' } },
    })
    repo.createDailyDraft.mockRejectedValue(new Error('D1 unavailable'))
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

  it('does not add another draft after this ET day already received one', async () => {
    const repo = schedulerRepo({
      candidates: [candidate('pulse-2')],
      claim: { run: { id: 'run-shadow' }, post: { id: 'post-shadow' } },
      draftResult: 'daily_slot_filled',
    })

    await expect(
      runXSocialCron(schedulerEnv(), new Date('2026-07-21T13:00:00.000Z'), { repo }),
    ).resolves.toEqual({
      status: 'draft_only',
      localDate: '2026-07-21',
      draftsCreated: 0,
      runId: 'run-shadow',
    })
  })

  it('fails the reserved day instead of silently losing an enqueue error', async () => {
    const repo = schedulerRepo({
      candidates: [candidate('pulse-next')],
      claim: { run: { id: 'run-live' }, post: { id: 'post-live' } },
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
    expect(repo.createDailyDraft).toHaveBeenCalledOnce()
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
