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
  makeSocialOpsRepo: vi.fn(),
}))

vi.mock('@duedatehq/db', () => ({
  createDb: dbMocks.createDb,
  makeSocialOpsRepo: dbMocks.makeSocialOpsRepo,
}))

vi.mock('../jobs/pulse/backfill', () => ({
  seedBackfillFromBaselineSnapshots: vi.fn(),
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
  })
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
