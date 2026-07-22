import { beforeEach, describe, expect, it, vi } from 'vitest'

const dbMocks = vi.hoisted(() => ({
  createDb: vi.fn(() => ({ kind: 'db' })),
  listPosts: vi.fn(),
  getEligibleCandidate: vi.fn(),
  getPost: vi.fn(),
  createDraft: vi.fn(),
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

function candidate() {
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
    getEligibleCandidate: dbMocks.getEligibleCandidate,
    getPost: dbMocks.getPost,
    createDraft: dbMocks.createDraft,
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
  dbMocks.getEligibleCandidate.mockResolvedValue(candidate())
  dbMocks.getPost.mockResolvedValue({
    id: POST_ID,
    pulseId: 'pulse-1',
    refToken: 'social_ref_1234567890abcdef',
    status: 'draft',
  })
})

describe('social ops routes', () => {
  it('fails closed outside development when the dedicated token is absent or wrong', async () => {
    const missing = await opsRoute.request('/social/candidates', {}, env())
    const wrong = await opsRoute.request(
      '/social/candidates',
      { headers: { authorization: 'Bearer wrong-token' } },
      env(),
    )

    expect(missing.status).toBe(404)
    expect(wrong.status).toBe(404)
    expect(dbMocks.listPosts).not.toHaveBeenCalled()
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

  it('requires an accountable reviewer before marking a draft ready', async () => {
    const missingReviewer = await opsRoute.request(
      `/social/${POST_ID}/approve`,
      authorizedInit({}),
      env(),
    )
    expect(missingReviewer.status).toBe(400)

    dbMocks.approvePost.mockResolvedValue({ id: POST_ID, status: 'ready' })
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
