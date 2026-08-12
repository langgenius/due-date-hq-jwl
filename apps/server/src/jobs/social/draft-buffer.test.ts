import { describe, expect, it, vi } from 'vitest'
import type { SocialAlertCandidateRow, SocialAlertPost, SocialQueuePost } from '@duedatehq/db'
import { fillXDraftBuffer, type XDraftBufferRepo } from './draft-buffer'

const NOW = new Date('2026-07-25T13:00:00.000Z')

function candidate(
  id: string,
  createdAt: Date,
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
    sourceUrl: `https://www.irs.gov/newsroom/${id}`,
    summary: `Deadline relief for ${id}.`,
    originalDueDate: new Date('2026-04-15T00:00:00.000Z'),
    newDueDate: new Date('2026-07-28T00:00:00.000Z'),
    effectiveFrom: null,
    effectiveUntil: null,
    actionDeadline: null,
    createdAt,
    ...overrides,
  }
}

function draftPost(id: string, pulseId = `pulse-${id}`): SocialAlertPost {
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
    createdAt: NOW,
    updatedAt: NOW,
  }
}

function queuePost(id: string): SocialQueuePost {
  return Object.assign(draftPost(id), { pulseCreatedAt: NOW })
}

function draftBufferRepo(input: {
  existingDrafts?: SocialQueuePost[]
  candidates?: SocialAlertCandidateRow[]
  conflictPulseIds?: string[]
  bufferFullPulseIds?: string[]
}) {
  const drafts = [...(input.existingDrafts ?? [])]
  const candidates = input.candidates ?? []
  const conflictPulseIds = new Set(input.conflictPulseIds ?? [])
  const bufferFullPulseIds = new Set(input.bufferFullPulseIds ?? [])
  const repo = {
    listDraftPostsForQueuePreview: vi.fn(
      async (request?: Parameters<XDraftBufferRepo['listDraftPostsForQueuePreview']>[0]) =>
        drafts.slice(0, request?.limit ?? 50),
    ),
    listEligibleCandidates: vi.fn(
      async (_input: Parameters<XDraftBufferRepo['listEligibleCandidates']>[0]) => candidates,
    ),
    createDraftIfBufferBelow: vi.fn(
      async ({
        pulseId,
        bufferSize,
      }: Parameters<XDraftBufferRepo['createDraftIfBufferBelow']>[0]) => {
        if (bufferFullPulseIds.has(pulseId)) return { status: 'buffer_full' as const }
        if (conflictPulseIds.has(pulseId)) return { status: 'candidate_conflict' as const }
        if (drafts.length >= bufferSize) return { status: 'buffer_full' as const }
        const post = draftPost(`post-${pulseId}`, pulseId)
        drafts.push({ ...post, pulseCreatedAt: NOW })
        return { status: 'created' as const, post }
      },
    ),
  } satisfies XDraftBufferRepo
  return repo
}

function sequentialRefToken(): () => string {
  let index = 0
  return () => `fixed-ref-token-${String((index += 1)).padStart(2, '0')}`
}

describe('fillXDraftBuffer', () => {
  it('fills a partial valid draft buffer to the requested target', async () => {
    const repo = draftBufferRepo({
      existingDrafts: [{ ...draftPost('existing'), pulseCreatedAt: NOW }],
      candidates: [
        candidate('newest', new Date('2026-07-25T00:00:00.000Z')),
        candidate('older', new Date('2026-07-24T00:00:00.000Z')),
      ],
    })

    await expect(
      fillXDraftBuffer({
        repo,
        appUrl: 'https://app.duedatehq.com',
        since: new Date('2026-07-21T00:00:00.000Z'),
        now: NOW,
        bufferSize: 3,
        randomRefToken: sequentialRefToken(),
      }),
    ).resolves.toMatchObject({
      requested: 3,
      existing: 1,
      created: 2,
      total: 3,
      targetReached: true,
      posts: [{ pulseId: 'newest' }, { pulseId: 'older' }],
    })
  })

  it('returns a full buffer without reading candidates', async () => {
    const repo = draftBufferRepo({
      existingDrafts: ['one', 'two', 'three'].map(queuePost),
      candidates: [candidate('unused', NOW)],
    })

    await expect(
      fillXDraftBuffer({
        repo,
        appUrl: 'https://app.duedatehq.com',
        since: new Date('2026-07-21T00:00:00.000Z'),
        now: NOW,
        bufferSize: 3,
      }),
    ).resolves.toMatchObject({
      existing: 3,
      created: 0,
      total: 3,
      targetReached: true,
      bufferFull: true,
      posts: [],
    })
    expect(repo.listEligibleCandidates).not.toHaveBeenCalled()
  })

  it('returns the available prefix when fewer than three eligible Alerts exist', async () => {
    const repo = draftBufferRepo({
      candidates: [
        candidate('newest', new Date('2026-07-25T00:00:00.000Z')),
        candidate('older', new Date('2026-07-24T00:00:00.000Z')),
      ],
    })

    await expect(
      fillXDraftBuffer({
        repo,
        appUrl: 'https://app.duedatehq.com',
        since: new Date('2026-07-21T00:00:00.000Z'),
        now: NOW,
        bufferSize: 3,
        randomRefToken: sequentialRefToken(),
      }),
    ).resolves.toMatchObject({
      created: 2,
      total: 2,
      targetReached: false,
      bufferFull: false,
      posts: [{ pulseId: 'newest' }, { pulseId: 'older' }],
    })
  })

  it('skips invalid candidates and continues onto the next keyset page', async () => {
    const invalidCandidates = Array.from({ length: 100 }, (_, index) =>
      candidate(`invalid-${String(index).padStart(3, '0')}`, new Date(1_800_000_000_000 - index), {
        summary: `Contact reviewer-${index}@example.com`,
      }),
    )
    const eligible = candidate('eligible-older', new Date('2026-07-20T00:00:00.000Z'))
    const repo = draftBufferRepo({})
    repo.listEligibleCandidates
      .mockResolvedValueOnce(invalidCandidates)
      .mockResolvedValueOnce([eligible])
      .mockResolvedValue([])

    await expect(
      fillXDraftBuffer({
        repo,
        appUrl: 'https://app.duedatehq.com',
        since: new Date('2026-07-01T00:00:00.000Z'),
        now: NOW,
        bufferSize: 3,
        randomRefToken: sequentialRefToken(),
      }),
    ).resolves.toMatchObject({ created: 1, total: 1, skipped: 100 })
    expect(repo.listEligibleCandidates.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        before: {
          createdAt: invalidCandidates[99]!.createdAt,
          pulseId: invalidCandidates[99]!.pulseId,
        },
      }),
    )
  })

  it('continues after a candidate conflict', async () => {
    const repo = draftBufferRepo({
      candidates: [
        candidate('raced', new Date('2026-07-25T00:00:00.000Z')),
        candidate('available', new Date('2026-07-24T00:00:00.000Z')),
      ],
      conflictPulseIds: ['raced'],
    })

    await expect(
      fillXDraftBuffer({
        repo,
        appUrl: 'https://app.duedatehq.com',
        since: new Date('2026-07-21T00:00:00.000Z'),
        now: NOW,
        bufferSize: 1,
        randomRefToken: sequentialRefToken(),
      }),
    ).resolves.toMatchObject({
      created: 1,
      total: 1,
      posts: [{ pulseId: 'available' }],
    })
  })

  it('stops when a concurrent insert reports buffer_full', async () => {
    const repo = draftBufferRepo({
      candidates: [
        candidate('concurrent', new Date('2026-07-25T00:00:00.000Z')),
        candidate('must-not-run', new Date('2026-07-24T00:00:00.000Z')),
      ],
      bufferFullPulseIds: ['concurrent'],
    })

    await expect(
      fillXDraftBuffer({
        repo,
        appUrl: 'https://app.duedatehq.com',
        since: new Date('2026-07-21T00:00:00.000Z'),
        now: NOW,
        bufferSize: 3,
      }),
    ).resolves.toMatchObject({ created: 0, bufferFull: true, posts: [] })
    expect(repo.createDraftIfBufferBelow).toHaveBeenCalledOnce()
  })

  it.each([0, 15, 1.5])('rejects an invalid buffer target of %s', async (bufferSize) => {
    const repo = draftBufferRepo({})

    await expect(
      fillXDraftBuffer({
        repo,
        appUrl: 'https://app.duedatehq.com',
        since: new Date('2026-07-21T00:00:00.000Z'),
        now: NOW,
        bufferSize,
      }),
    ).rejects.toThrow('target from 1 to 14')
    expect(repo.listDraftPostsForQueuePreview).not.toHaveBeenCalled()
  })
})
