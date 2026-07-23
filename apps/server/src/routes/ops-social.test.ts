import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const dbMocks = vi.hoisted(() => ({
  createDb: vi.fn(() => ({ kind: 'db' })),
  listPosts: vi.fn(),
  listReadyPostsForProjection: vi.fn(),
  listDraftPostsForQueuePreview: vi.fn(),
  listOccupiedPublishDates: vi.fn(),
  listEligibleCandidates: vi.fn(),
  getEligibleCandidate: vi.fn(),
  getPost: vi.fn(),
  createDraft: vi.fn(),
  createDraftIfBufferBelow: vi.fn(),
  cancelIneligiblePosts: vi.fn(),
  approvePost: vi.fn(),
  cancelPost: vi.fn(),
  reconcilePost: vi.fn(),
  claimExactDailyReadyPost: vi.fn(),
  markFailed: vi.fn(),
  makeSocialOpsRepo: vi.fn(),
}))

const xMocks = vi.hoisted(() => ({
  verifyXAccount: vi.fn(),
}))

vi.mock('@duedatehq/db', () => ({
  createDb: dbMocks.createDb,
  makeSocialOpsRepo: dbMocks.makeSocialOpsRepo,
}))

vi.mock('../jobs/pulse/backfill', () => ({
  seedBackfillFromBaselineSnapshots: vi.fn(),
}))

vi.mock('../jobs/social/x-client', () => ({
  verifyXAccount: xMocks.verifyXAccount,
}))

import { opsRoute } from './ops'

const TOKEN = 'social-ops-token-1234'
const POST_ID = 'social-post-1'

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    pulseId: 'pulse-1',
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

function env(overrides: Record<string, unknown> = {}) {
  return {
    ENV: 'production',
    SOCIAL_OPS_TOKEN: TOKEN,
    APP_URL: 'https://app.duedatehq.com',
    DB: {},
    ...overrides,
  }
}

function authorizedInit(body?: unknown): RequestInit {
  return {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      authorization: `Bearer ${TOKEN}`,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  dbMocks.makeSocialOpsRepo.mockReturnValue({
    listPosts: dbMocks.listPosts,
    listReadyPostsForProjection: dbMocks.listReadyPostsForProjection,
    listDraftPostsForQueuePreview: dbMocks.listDraftPostsForQueuePreview,
    listOccupiedPublishDates: dbMocks.listOccupiedPublishDates,
    listEligibleCandidates: dbMocks.listEligibleCandidates,
    getEligibleCandidate: dbMocks.getEligibleCandidate,
    getPost: dbMocks.getPost,
    createDraft: dbMocks.createDraft,
    createDraftIfBufferBelow: dbMocks.createDraftIfBufferBelow,
    cancelIneligiblePosts: dbMocks.cancelIneligiblePosts,
    approvePost: dbMocks.approvePost,
    cancelPost: dbMocks.cancelPost,
    reconcilePost: dbMocks.reconcilePost,
    claimExactDailyReadyPost: dbMocks.claimExactDailyReadyPost,
    markFailed: dbMocks.markFailed,
  })
  xMocks.verifyXAccount.mockResolvedValue({
    kind: 'verified',
    userId: 'x-user-1',
    username: 'duedatehq',
  })
  dbMocks.markFailed.mockResolvedValue(true)
  dbMocks.cancelIneligiblePosts.mockResolvedValue(0)
  dbMocks.listReadyPostsForProjection.mockResolvedValue([])
  dbMocks.listDraftPostsForQueuePreview.mockResolvedValue([])
  dbMocks.listOccupiedPublishDates.mockResolvedValue([])
  dbMocks.listEligibleCandidates.mockResolvedValue([])
  dbMocks.getEligibleCandidate.mockResolvedValue(candidate())
  dbMocks.getPost.mockResolvedValue({
    id: POST_ID,
    pulseId: 'pulse-1',
    refToken: 'social_ref_1234567890abcdef',
    postText: 'Frozen public copy',
    status: 'draft',
    approvedAt: null,
    updatedAt: new Date('2026-07-22T07:21:28.141Z'),
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('social ops routes', () => {
  it('fails closed outside development when the dedicated token is absent or wrong', async () => {
    const missing = await opsRoute.request('/social/candidates', {}, env())
    const wrong = await opsRoute.request(
      '/social/candidates',
      { headers: { authorization: 'Bearer wrong-token' } },
      env(),
    )
    const queueWithoutToken = await opsRoute.request('/social/queue', {}, env())
    const reviewStatusWithoutToken = await opsRoute.request(
      `/social/${POST_ID}/review-status`,
      {},
      env(),
    )
    const seedWithoutToken = await opsRoute.request(
      '/social/drafts/seed',
      { method: 'POST', body: '{}' },
      env({ X_SOCIAL_START_AT: '2026-07-21T00:00:00.000Z' }),
    )

    expect(missing.status).toBe(404)
    expect(wrong.status).toBe(404)
    expect(queueWithoutToken.status).toBe(404)
    expect(reviewStatusWithoutToken.status).toBe(404)
    expect(seedWithoutToken.status).toBe(404)
    expect(dbMocks.listPosts).not.toHaveBeenCalled()
    expect(dbMocks.listReadyPostsForProjection).not.toHaveBeenCalled()
    expect(dbMocks.listEligibleCandidates).not.toHaveBeenCalled()
  })

  it('lists frozen candidates with an optional status filter', async () => {
    dbMocks.listPosts.mockResolvedValue([{ id: POST_ID, status: 'draft' }])

    const response = await opsRoute.request(
      '/social/candidates?status=draft&limit=10',
      authorizedInit(),
      env(),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      posts: [{ id: POST_ID, status: 'draft' }],
    })
    expect(dbMocks.listPosts).toHaveBeenCalledWith({ channel: 'x', status: 'draft', limit: 10 })
  })

  it('returns only the public review status allowlist for one exact Post', async () => {
    dbMocks.getPost.mockResolvedValue({
      id: POST_ID,
      pulseId: 'pulse-1',
      refToken: 'must-not-leak',
      postText: 'Frozen public copy',
      targetUrl: 'https://app.duedatehq.com/alerts?ref=must-not-leak',
      status: 'ready',
      approvedBy: 'user-1',
      approvedAt: new Date('2026-07-23T02:30:00.000Z'),
      updatedAt: new Date('2026-07-23T02:30:00.000Z'),
    })

    const response = await opsRoute.request(
      `/social/${POST_ID}/review-status`,
      authorizedInit(),
      env(),
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload).toEqual({
      post: {
        id: POST_ID,
        status: 'ready',
        postText: 'Frozen public copy',
        approvedAt: '2026-07-23T02:30:00.000Z',
        updatedAt: '2026-07-23T02:30:00.000Z',
      },
    })
    expect(JSON.stringify(payload)).not.toMatch(/pulse|refToken|targetUrl|approvedBy|user-1/u)
  })

  it('uses a 14-day queue preview when the CLI omits a horizon', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-24T12:00:00.000Z'))

    const response = await opsRoute.request('/social/queue', authorizedInit(), env())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      days: 14,
      fromLocalDate: '2026-07-24',
      throughLocalDate: '2026-08-06',
    })
    expect(dbMocks.listReadyPostsForProjection).toHaveBeenCalledWith({
      channel: 'x',
      limit: 15,
    })
    expect(dbMocks.listOccupiedPublishDates).toHaveBeenCalledWith({
      channel: 'x',
      fromLocalDate: '2026-07-24',
      limit: 14,
    })
  })

  it('previews eligible ready Posts by future ET slot and lists drafts without dates', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-24T12:00:00.000Z')) // Friday 08:00 ET
    const ready = {
      id: 'ready-1',
      pulseId: 'pulse-ready-1',
      status: 'ready',
      priority: 'normal',
      readyAt: new Date('2026-07-20T12:00:00.000Z'),
      createdAt: new Date('2026-07-20T11:00:00.000Z'),
      pulseCreatedAt: new Date('2026-07-20T10:00:00.000Z'),
      postText: 'Ready public copy',
      targetUrl: 'https://app.duedatehq.com/alerts?ref=ready',
    }
    const draft = {
      id: 'draft-1',
      pulseId: 'pulse-draft-1',
      status: 'draft',
      priority: 'normal',
      readyAt: null,
      createdAt: new Date('2026-07-21T11:00:00.000Z'),
      pulseCreatedAt: new Date('2026-07-21T10:00:00.000Z'),
      postText: 'Draft public copy',
      targetUrl: 'https://app.duedatehq.com/alerts?ref=draft',
    }
    dbMocks.listReadyPostsForProjection.mockResolvedValue([ready])
    dbMocks.listDraftPostsForQueuePreview.mockResolvedValue([draft])
    dbMocks.listOccupiedPublishDates.mockResolvedValue(['2026-07-24'])

    const response = await opsRoute.request('/social/queue?days=3', authorizedInit(), env())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      asOf: '2026-07-24T12:00:00.000Z',
      tentative: true,
      timeZone: 'America/New_York',
      dailySlot: '09:00',
      days: 3,
      readyBacklogTruncated: false,
      draftBacklogTruncated: false,
      occupiedLocalDates: ['2026-07-24'],
      ready: [
        {
          position: 1,
          projectedLocalDate: '2026-07-25',
          projectedAt: '2026-07-25T13:00:00.000Z',
          post: { id: 'ready-1', postText: 'Ready public copy' },
        },
      ],
      drafts: [
        {
          projectedLocalDate: null,
          reason: 'approval_required',
          post: { id: 'draft-1', postText: 'Draft public copy' },
        },
      ],
    })
    expect(dbMocks.listReadyPostsForProjection).toHaveBeenCalledWith({
      channel: 'x',
      limit: 4,
    })
    expect(dbMocks.listOccupiedPublishDates).toHaveBeenCalledWith({
      channel: 'x',
      fromLocalDate: '2026-07-24',
      limit: 3,
    })
    expect(dbMocks.createDraft).not.toHaveBeenCalled()
    expect(dbMocks.claimExactDailyReadyPost).not.toHaveBeenCalled()
  })

  it('rejects an invalid queue horizon before reading D1', async () => {
    const response = await opsRoute.request('/social/queue?days=101', authorizedInit(), env())

    expect(response.status).toBe(400)
    expect(dbMocks.listReadyPostsForProjection).not.toHaveBeenCalled()
    expect(dbMocks.listOccupiedPublishDates).not.toHaveBeenCalled()
  })

  it('seeds the latest three valid Pulses without applying the daily cutover', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-25T12:00:00.000Z'))
    dbMocks.listEligibleCandidates.mockResolvedValue([
      candidate({
        pulseId: 'pulse-oldest',
        createdAt: new Date('2026-07-21T00:00:00.000Z'),
      }),
      candidate({
        pulseId: 'pulse-newest-invalid',
        summary: 'Contact private@example.com',
        createdAt: new Date('2026-07-25T00:00:00.000Z'),
      }),
      candidate({
        pulseId: 'pulse-middle',
        createdAt: new Date('2026-07-22T00:00:00.000Z'),
      }),
      candidate({
        pulseId: 'pulse-newest-valid',
        createdAt: new Date('2026-07-24T00:00:00.000Z'),
      }),
    ])
    dbMocks.createDraftIfBufferBelow.mockImplementation(async (input: { pulseId: string }) => ({
      status: 'created',
      post: {
        id: `post-${input.pulseId}`,
        pulseId: input.pulseId,
        status: 'draft',
      },
    }))
    dbMocks.listDraftPostsForQueuePreview
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 'post-pulse-newest-valid' },
        { id: 'post-pulse-middle' },
        { id: 'post-pulse-oldest' },
      ])

    const response = await opsRoute.request('/social/drafts/seed', authorizedInit({}), env())

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toMatchObject({
      requested: 3,
      existing: 0,
      created: 3,
      total: 3,
      targetReached: true,
      skipped: 1,
      posts: [
        { id: 'post-pulse-newest-valid' },
        { id: 'post-pulse-middle' },
        { id: 'post-pulse-oldest' },
      ],
    })
    expect(dbMocks.listEligibleCandidates).toHaveBeenCalledWith({
      channel: 'x',
      since: new Date(0),
      now: new Date('2026-07-25T12:00:00.000Z'),
      limit: 100,
    })
    expect(dbMocks.cancelIneligiblePosts).toHaveBeenCalledWith({
      channel: 'x',
      limit: 100,
      now: new Date('2026-07-25T12:00:00.000Z'),
    })
    expect(dbMocks.createDraftIfBufferBelow.mock.calls.map(([input]) => input.pulseId)).toEqual([
      'pulse-newest-valid',
      'pulse-middle',
      'pulse-oldest',
    ])
    for (const [input] of dbMocks.createDraftIfBufferBelow.mock.calls) {
      expect(input).toMatchObject({
        channel: 'x',
        bufferSize: 3,
        priority: 'normal',
        since: new Date(0),
        postText: expect.stringContaining('Which client deadlines may be affected?'),
        targetUrl: expect.stringContaining('utm_source=x'),
      })
    }
  })

  it('stops safely when a retry finds that the target draft buffer is already full', async () => {
    dbMocks.listDraftPostsForQueuePreview.mockResolvedValue([
      { id: 'draft-1' },
      { id: 'draft-2' },
      { id: 'draft-3' },
    ])

    const response = await opsRoute.request(
      '/social/drafts/seed',
      authorizedInit({ count: 3 }),
      env({ X_SOCIAL_START_AT: '2026-07-21T00:00:00.000Z' }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      requested: 3,
      existing: 3,
      created: 0,
      total: 3,
      targetReached: true,
      posts: [],
    })
    expect(dbMocks.listEligibleCandidates).not.toHaveBeenCalled()
    expect(dbMocks.createDraftIfBufferBelow).not.toHaveBeenCalled()
    expect(dbMocks.createDraft).not.toHaveBeenCalled()
  })

  it('re-reads the eligible buffer after a concurrent request fills the target', async () => {
    dbMocks.listDraftPostsForQueuePreview
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'draft-1' }, { id: 'draft-2' }, { id: 'draft-3' }])
    dbMocks.listEligibleCandidates.mockResolvedValue([
      candidate({ pulseId: 'pulse-concurrent', createdAt: new Date('2026-07-25T00:00:00.000Z') }),
    ])
    dbMocks.createDraftIfBufferBelow.mockResolvedValue({ status: 'buffer_full' })

    const response = await opsRoute.request(
      '/social/drafts/seed',
      authorizedInit({ count: 3 }),
      env({ X_SOCIAL_START_AT: '2026-07-21T00:00:00.000Z' }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      requested: 3,
      existing: 0,
      created: 0,
      total: 3,
      targetReached: true,
      bufferFull: true,
    })
  })

  it('validates the seed count before reading D1', async () => {
    const invalidCountResponses = [
      await opsRoute.request(
        '/social/drafts/seed',
        authorizedInit({ count: 0 }),
        env({ X_SOCIAL_START_AT: '2026-07-21T00:00:00.000Z' }),
      ),
      await opsRoute.request(
        '/social/drafts/seed',
        authorizedInit({ count: 15 }),
        env({ X_SOCIAL_START_AT: '2026-07-21T00:00:00.000Z' }),
      ),
      await opsRoute.request(
        '/social/drafts/seed',
        authorizedInit({ count: 1.5 }),
        env({ X_SOCIAL_START_AT: '2026-07-21T00:00:00.000Z' }),
      ),
      await opsRoute.request(
        '/social/drafts/seed',
        authorizedInit({ count: '3' }),
        env({ X_SOCIAL_START_AT: '2026-07-21T00:00:00.000Z' }),
      ),
    ]
    for (const response of invalidCountResponses) {
      expect(response.status).toBe(400)
    }

    expect(dbMocks.listEligibleCandidates).not.toHaveBeenCalled()
  })

  it('requires an accountable reviewer before marking a draft ready', async () => {
    const missingReviewer = await opsRoute.request(
      `/social/${POST_ID}/approve`,
      authorizedInit({}),
      env(),
    )
    expect(missingReviewer.status).toBe(400)

    dbMocks.approvePost.mockResolvedValue({
      id: POST_ID,
      status: 'ready',
      approvedAt: new Date('2026-07-23T02:30:00.000Z'),
    })
    const approved = await opsRoute.request(
      `/social/${POST_ID}/approve`,
      authorizedInit({ approvedBy: 'user-1', priority: 'urgent' }),
      env(),
    )
    expect(approved.status).toBe(200)
    expect(dbMocks.approvePost).toHaveBeenCalledWith(
      expect.objectContaining({
        postId: POST_ID,
        approvedBy: 'user-1',
        priority: 'urgent',
        postText: expect.stringContaining('Internal Revenue Service · Federal alert'),
        targetUrl: expect.stringContaining('ref=social_ref_1234567890abcdef'),
      }),
    )
    await expect(approved.json()).resolves.toMatchObject({
      transition: {
        postId: POST_ID,
        draftUpdatedAt: '2026-07-22T07:21:28.141Z',
        approvedAt: '2026-07-23T02:30:00.000Z',
      },
    })
  })

  it('verifies the configured OAuth account without returning credentials', async () => {
    const response = await opsRoute.request(
      '/social/x/account',
      authorizedInit(),
      env({
        X_API_KEY: 'consumer-key',
        X_API_SECRET: 'consumer-secret',
        X_ACCESS_TOKEN: 'access-token',
        X_ACCESS_TOKEN_SECRET: 'access-secret',
      }),
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload).toEqual({
      account: { userId: 'x-user-1', username: 'duedatehq' },
    })
    expect(JSON.stringify(payload)).not.toContain('consumer-key')
  })

  it('verifies the exact ready Post and account before claiming and queuing publish-now', async () => {
    const send = vi.fn().mockResolvedValue(undefined)
    dbMocks.getPost.mockResolvedValue({ id: POST_ID, pulseId: 'pulse-1', status: 'ready' })
    dbMocks.claimExactDailyReadyPost.mockResolvedValue({
      run: { id: 'run-1' },
      post: { id: POST_ID },
    })

    const response = await opsRoute.request(
      `/social/${POST_ID}/publish-now`,
      { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` } },
      env({
        X_POSTING_MODE: 'live',
        X_API_KEY: 'consumer-key',
        X_API_SECRET: 'consumer-secret',
        X_ACCESS_TOKEN: 'access-token',
        X_ACCESS_TOKEN_SECRET: 'access-secret',
        SOCIAL_QUEUE: { send },
      }),
    )

    expect(response.status).toBe(202)
    expect(dbMocks.getPost.mock.invocationCallOrder[0]).toBeLessThan(
      xMocks.verifyXAccount.mock.invocationCallOrder[0]!,
    )
    expect(xMocks.verifyXAccount.mock.invocationCallOrder[0]).toBeLessThan(
      dbMocks.claimExactDailyReadyPost.mock.invocationCallOrder[0]!,
    )
    expect(dbMocks.claimExactDailyReadyPost).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'x', postId: POST_ID, localDate: expect.any(String) }),
    )
    expect(send).toHaveBeenCalledWith({ type: 'social.x.publish', runId: 'run-1' })
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        queued: true,
        runId: 'run-1',
        postId: POST_ID,
        account: { userId: 'x-user-1', username: 'duedatehq' },
      }),
    )
  })

  it('does not claim a slot when the OAuth account preflight fails', async () => {
    dbMocks.getPost.mockResolvedValue({ id: POST_ID, pulseId: 'pulse-1', status: 'ready' })
    xMocks.verifyXAccount.mockResolvedValue({
      kind: 'failure',
      httpStatus: 401,
      reason: 'Unauthorized',
    })

    const response = await opsRoute.request(
      `/social/${POST_ID}/publish-now`,
      { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` } },
      env({
        X_POSTING_MODE: 'live',
        X_API_KEY: 'consumer-key',
        X_API_SECRET: 'consumer-secret',
        X_ACCESS_TOKEN: 'access-token',
        X_ACCESS_TOKEN_SECRET: 'access-secret',
      }),
    )

    expect(response.status).toBe(502)
    expect(dbMocks.claimExactDailyReadyPost).not.toHaveBeenCalled()
  })

  it('refuses immediate publishing while the deployed mode is draft', async () => {
    const response = await opsRoute.request(
      `/social/${POST_ID}/publish-now`,
      { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` } },
      env({ X_POSTING_MODE: 'draft' }),
    )

    expect(response.status).toBe(409)
    expect(dbMocks.getPost).not.toHaveBeenCalled()
    expect(xMocks.verifyXAccount).not.toHaveBeenCalled()
  })

  it('returns a conflict without enqueueing when the ET daily slot is unavailable', async () => {
    const send = vi.fn()
    dbMocks.getPost.mockResolvedValue({ id: POST_ID, pulseId: 'pulse-1', status: 'ready' })
    dbMocks.claimExactDailyReadyPost.mockResolvedValue(null)

    const response = await opsRoute.request(
      `/social/${POST_ID}/publish-now`,
      { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` } },
      env({
        X_POSTING_MODE: 'live',
        X_API_KEY: 'consumer-key',
        X_API_SECRET: 'consumer-secret',
        X_ACCESS_TOKEN: 'access-token',
        X_ACCESS_TOKEN_SECRET: 'access-secret',
        SOCIAL_QUEUE: { send },
      }),
    )

    expect(response.status).toBe(409)
    expect(send).not.toHaveBeenCalled()
  })

  it('marks the claimed run failed when Queue enqueue fails', async () => {
    dbMocks.getPost.mockResolvedValue({ id: POST_ID, pulseId: 'pulse-1', status: 'ready' })
    dbMocks.claimExactDailyReadyPost.mockResolvedValue({
      run: { id: 'run-queue-failure' },
      post: { id: POST_ID },
    })
    const send = vi.fn().mockRejectedValue(new Error('queue unavailable'))

    const response = await opsRoute.request(
      `/social/${POST_ID}/publish-now`,
      { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` } },
      env({
        X_POSTING_MODE: 'live',
        X_API_KEY: 'consumer-key',
        X_API_SECRET: 'consumer-secret',
        X_ACCESS_TOKEN: 'access-token',
        X_ACCESS_TOKEN_SECRET: 'access-secret',
        SOCIAL_QUEUE: { send },
      }),
    )

    expect(response.status).toBe(503)
    expect(dbMocks.markFailed).toHaveBeenCalledWith(
      expect.objectContaining({ runId: 'run-queue-failure', reason: 'queue unavailable' }),
    )
  })

  it('returns the run ID when an enqueue failure cannot be durably recovered', async () => {
    dbMocks.getPost.mockResolvedValue({ id: POST_ID, pulseId: 'pulse-1', status: 'ready' })
    dbMocks.claimExactDailyReadyPost.mockResolvedValue({
      run: { id: 'run-recovery-failure' },
      post: { id: POST_ID },
    })
    dbMocks.markFailed.mockResolvedValue(false)

    const response = await opsRoute.request(
      `/social/${POST_ID}/publish-now`,
      { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` } },
      env({
        X_POSTING_MODE: 'live',
        X_API_KEY: 'consumer-key',
        X_API_SECRET: 'consumer-secret',
        X_ACCESS_TOKEN: 'access-token',
        X_ACCESS_TOKEN_SECRET: 'access-secret',
        SOCIAL_QUEUE: { send: vi.fn().mockRejectedValue(new Error('queue unavailable')) },
      }),
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: 'Unable to enqueue the X publish job or persist its failed state',
      runId: 'run-recovery-failure',
    })
  })

  it('returns the run ID when enqueue recovery itself throws', async () => {
    dbMocks.getPost.mockResolvedValue({ id: POST_ID, pulseId: 'pulse-1', status: 'ready' })
    dbMocks.claimExactDailyReadyPost.mockResolvedValue({
      run: { id: 'run-recovery-error' },
      post: { id: POST_ID },
    })
    dbMocks.markFailed.mockRejectedValue(new Error('D1 unavailable'))

    const response = await opsRoute.request(
      `/social/${POST_ID}/publish-now`,
      { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` } },
      env({
        X_POSTING_MODE: 'live',
        X_API_KEY: 'consumer-key',
        X_API_SECRET: 'consumer-secret',
        X_ACCESS_TOKEN: 'access-token',
        X_ACCESS_TOKEN_SECRET: 'access-secret',
        SOCIAL_QUEUE: { send: vi.fn().mockRejectedValue(new Error('queue unavailable')) },
      }),
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: 'Unable to enqueue the X publish job or persist its failed state',
      runId: 'run-recovery-error',
    })
  })

  it('requires an X Post ID when reconciling an ambiguous send as published', async () => {
    const invalid = await opsRoute.request(
      `/social/${POST_ID}/reconcile`,
      authorizedInit({ outcome: 'published' }),
      env(),
    )
    expect(invalid.status).toBe(400)

    dbMocks.reconcilePost.mockResolvedValue(true)
    const reconciled = await opsRoute.request(
      `/social/${POST_ID}/reconcile`,
      authorizedInit({ outcome: 'published', externalPostId: 'x-123' }),
      env(),
    )
    expect(reconciled.status).toBe(200)
    expect(dbMocks.reconcilePost).toHaveBeenCalledWith(
      expect.objectContaining({
        postId: POST_ID,
        outcome: 'published',
        externalPostId: 'x-123',
      }),
    )
  })
})
