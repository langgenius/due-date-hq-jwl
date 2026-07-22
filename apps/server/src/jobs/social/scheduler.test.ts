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
}) {
  return {
    cancelIneligiblePosts: vi.fn().mockResolvedValue(0),
    listEligibleCandidates: vi.fn().mockResolvedValue(input.candidates ?? []),
    createDraft: vi.fn().mockResolvedValue({ id: 'draft' }),
    claimDailyReadyPost: vi.fn().mockResolvedValue(input.claim ?? null),
    markFailed: vi.fn().mockResolvedValue(true),
  }
}

describe('runXSocialCron', () => {
  it('refreshes drafts but does not claim outside the 09:00 ET half-hour slot', async () => {
    const repo = schedulerRepo({ candidates: [candidate('pulse-1')] })

    await expect(
      runXSocialCron(schedulerEnv(), new Date('2026-07-21T13:30:00.000Z'), {
        repo,
      }),
    ).resolves.toEqual({ status: 'outside_slot' })
    expect(repo.listEligibleCandidates).toHaveBeenCalledOnce()
    expect(repo.createDraft).toHaveBeenCalledOnce()
    expect(repo.claimDailyReadyPost).not.toHaveBeenCalled()
  })

  it('creates every new candidate draft but claims only one daily slot', async () => {
    const candidates = Array.from({ length: 10 }, (_, index) => candidate(`pulse-${index}`))
    const repo = schedulerRepo({
      candidates,
      claim: { run: { id: 'run-1' }, post: { id: 'post-1' } },
    })

    await expect(
      runXSocialCron(schedulerEnv(), new Date('2026-07-21T13:00:00.000Z'), {
        repo,
        randomRefToken: () => 'fixed-ref-token-1',
      }),
    ).resolves.toEqual({
      status: 'draft_only',
      localDate: '2026-07-21',
      draftsCreated: 10,
      runId: 'run-1',
    })
    expect(repo.createDraft).toHaveBeenCalledTimes(10)
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
    expect(repo.createDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        pulseId: 'pulse-1',
        priority: 'urgent',
        postText: expect.stringContaining('Colorado tax agency · Colorado alert'),
      }),
    )
    expect(sent).toEqual([{ type: 'social.x.publish', runId: 'run-live' }])
  })

  it('fails the reserved day instead of silently losing an enqueue error', async () => {
    const repo = schedulerRepo({
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
