import { describe, expect, it } from 'vitest'
import { buildXQueuePreview, type XQueuePreviewPost } from './queue-preview'

function post(
  id: string,
  overrides: Partial<XQueuePreviewPost> = {},
): XQueuePreviewPost & { postText: string } {
  return {
    id,
    pulseId: `pulse-${id}`,
    status: 'ready',
    priority: 'normal',
    readyAt: new Date('2026-07-20T12:00:00.000Z'),
    createdAt: new Date('2026-07-20T11:00:00.000Z'),
    pulseCreatedAt: new Date('2026-07-20T10:00:00.000Z'),
    postText: `Copy for ${id}`,
    ...overrides,
  }
}

describe('buildXQueuePreview', () => {
  it('projects one ready Post per ET calendar day without skipping weekends', () => {
    const preview = buildXQueuePreview({
      now: new Date('2026-07-24T12:00:00.000Z'), // Friday 08:00 ET
      days: 3,
      posts: [
        post('post-1', { readyAt: new Date('2026-07-20T12:00:00.000Z') }),
        post('post-2', { readyAt: new Date('2026-07-21T12:00:00.000Z') }),
        post('post-3', { readyAt: new Date('2026-07-22T12:00:00.000Z') }),
      ],
    })

    expect(preview.ready.map((item) => [item.post.id, item.projectedLocalDate])).toEqual([
      ['post-3', '2026-07-24'],
      ['post-2', '2026-07-25'],
      ['post-1', '2026-07-26'],
    ])
    expect(preview.ready.map((item) => item.projectedAt.toISOString())).toEqual([
      '2026-07-24T13:00:00.000Z',
      '2026-07-25T13:00:00.000Z',
      '2026-07-26T13:00:00.000Z',
    ])
    expect(preview).toMatchObject({
      tentative: true,
      timeZone: 'America/New_York',
      dailySlot: '09:00',
      fromLocalDate: '2026-07-24',
      throughLocalDate: '2026-07-26',
      visibleReadyBeyondWindowCount: 0,
    })
  })

  it('skips every occupied local date while keeping the requested calendar horizon', () => {
    const preview = buildXQueuePreview({
      now: new Date('2026-07-24T12:00:00.000Z'),
      days: 4,
      posts: [post('post-1'), post('post-2')],
      occupiedLocalDates: ['2026-07-24', '2026-07-26', '2026-08-10'],
    })

    expect(preview.occupiedLocalDates).toEqual(['2026-07-24', '2026-07-26'])
    expect(preview.ready.map((item) => [item.post.id, item.projectedLocalDate])).toEqual([
      ['post-2', '2026-07-25'],
      ['post-1', '2026-07-27'],
    ])
  })

  it('publishes newer Alerts before older Alerts regardless of approval age or priority', () => {
    const preview = buildXQueuePreview({
      now: new Date('2026-07-21T12:00:00.000Z'), // 08:00 ET
      days: 3,
      posts: [
        post('old-urgent', {
          priority: 'urgent',
          readyAt: new Date('2026-07-01T00:00:00.000Z'),
          pulseCreatedAt: new Date('2026-07-19T00:00:00.000Z'),
        }),
        post('new-normal', {
          readyAt: new Date('2026-07-20T12:00:00.000Z'),
          pulseCreatedAt: new Date('2026-07-21T00:00:00.000Z'),
        }),
        post('middle-normal', {
          readyAt: new Date('2026-07-20T00:00:00.000Z'),
          pulseCreatedAt: new Date('2026-07-20T00:00:00.000Z'),
        }),
      ],
    })

    expect(preview.ready.map((item) => item.post.id)).toEqual([
      'new-normal',
      'middle-normal',
      'old-urgent',
    ])
  })

  it('uses Pulse ID and Post ID as deterministic newest-first tie-breakers', () => {
    const pulseCreatedAt = new Date('2026-07-20T00:00:00.000Z')
    const preview = buildXQueuePreview({
      now: new Date('2026-07-21T12:00:00.000Z'),
      days: 3,
      posts: [
        post('post-a', { pulseId: 'pulse-a', pulseCreatedAt }),
        post('post-b', { pulseId: 'pulse-b', pulseCreatedAt }),
        post('post-c', { pulseId: 'pulse-c', pulseCreatedAt }),
      ],
    })

    expect(preview.ready.map((item) => item.post.id)).toEqual(['post-c', 'post-b', 'post-a'])
    expect(preview.ready.map((item) => item.position)).toEqual([1, 2, 3])
  })

  it('lists drafts without dates and reports ready Posts beyond the horizon', () => {
    const olderDraft = post('draft-old', {
      status: 'draft',
      readyAt: null,
      pulseCreatedAt: new Date('2026-07-19T00:00:00.000Z'),
    })
    const newerDraft = post('draft-new', {
      status: 'draft',
      readyAt: null,
      pulseCreatedAt: new Date('2026-07-21T00:00:00.000Z'),
    })
    const preview = buildXQueuePreview({
      now: new Date('2026-07-21T12:00:00.000Z'),
      days: 1,
      posts: [olderDraft, post('ready-1'), newerDraft, post('ready-2')],
    })

    expect(preview.drafts).toEqual([
      { projectedLocalDate: null, reason: 'approval_required', post: newerDraft },
      { projectedLocalDate: null, reason: 'approval_required', post: olderDraft },
    ])
    expect(preview.ready.map((item) => item.post.id)).toEqual(['ready-2'])
    expect(preview.visibleReadyBeyondWindowCount).toBe(1)
  })

  it('starts tomorrow once the current ET publishing time is due', () => {
    const preview = buildXQueuePreview({
      now: new Date('2026-07-21T13:00:00.000Z'),
      days: 1,
      posts: [post('ready-1')],
    })

    expect(preview.fromLocalDate).toBe('2026-07-22')
    expect(preview.ready[0]?.projectedLocalDate).toBe('2026-07-22')
  })

  it('rejects invalid inputs instead of returning a misleading projection', () => {
    expect(() => buildXQueuePreview({ now: new Date(), days: 0, posts: [] })).toThrow(
      'positive integer',
    )
    expect(() =>
      buildXQueuePreview({
        now: new Date('2026-07-21T12:00:00.000Z'),
        days: 1,
        posts: [post('bad-ready', { readyAt: null })],
      }),
    ).toThrow('requires a valid readyAt')
  })
})
