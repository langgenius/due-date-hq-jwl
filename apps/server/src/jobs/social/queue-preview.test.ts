import { describe, expect, it } from 'vitest'
import { buildXQueuePreview, type XQueuePreviewPost } from './queue-preview'

function post(
  id: string,
  overrides: Partial<XQueuePreviewPost> = {},
): XQueuePreviewPost & { postText: string } {
  return {
    id,
    status: 'ready',
    priority: 'normal',
    readyAt: new Date('2026-07-20T12:00:00.000Z'),
    createdAt: new Date('2026-07-20T11:00:00.000Z'),
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
      ['post-1', '2026-07-24'],
      ['post-2', '2026-07-25'],
      ['post-3', '2026-07-26'],
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
      ['post-1', '2026-07-25'],
      ['post-2', '2026-07-27'],
    ])
  })

  it('re-evaluates urgent and 72-hour aging priority at every projected slot', () => {
    const preview = buildXQueuePreview({
      now: new Date('2026-07-21T12:00:00.000Z'), // 08:00 ET
      days: 3,
      posts: [
        post('urgent-first', {
          priority: 'urgent',
          readyAt: new Date('2026-07-19T00:00:00.000Z'),
        }),
        post('normal-aging', {
          priority: 'normal',
          // 71 hours old at the first slot, 95 hours old at the second.
          readyAt: new Date('2026-07-18T14:00:00.000Z'),
        }),
        post('urgent-later', {
          priority: 'urgent',
          readyAt: new Date('2026-07-20T00:00:00.000Z'),
        }),
      ],
    })

    // On day two the older normal Post has aged into the same rank as urgent,
    // then wins on readyAt exactly as the production SQL claim does.
    expect(preview.ready.map((item) => item.post.id)).toEqual([
      'urgent-first',
      'normal-aging',
      'urgent-later',
    ])
  })

  it('matches the claim boundary by aging a Post at exactly 72 hours', () => {
    const now = new Date('2026-07-21T12:00:00.000Z')
    const urgent = post('urgent', {
      priority: 'urgent',
      readyAt: new Date('2026-07-19T00:00:00.000Z'),
    })
    const exactBoundary = buildXQueuePreview({
      now,
      days: 2,
      posts: [
        urgent,
        post('normal-exactly-aged', { readyAt: new Date('2026-07-18T13:00:00.000Z') }),
      ],
    })
    const oneMillisecondShort = buildXQueuePreview({
      now,
      days: 2,
      posts: [
        urgent,
        post('normal-not-yet-aged', { readyAt: new Date('2026-07-18T13:00:00.001Z') }),
      ],
    })

    expect(exactBoundary.ready.map((item) => item.post.id)).toEqual([
      'normal-exactly-aged',
      'urgent',
    ])
    expect(oneMillisecondShort.ready.map((item) => item.post.id)).toEqual([
      'urgent',
      'normal-not-yet-aged',
    ])
  })

  it('uses readyAt, createdAt, then id as deterministic tie-breakers', () => {
    const readyAt = new Date('2026-07-15T00:00:00.000Z')
    const firstCreatedAt = new Date('2026-07-14T00:00:00.000Z')
    const preview = buildXQueuePreview({
      now: new Date('2026-07-21T12:00:00.000Z'),
      days: 3,
      posts: [
        post('post-b', { readyAt, createdAt: firstCreatedAt }),
        post('post-c', { readyAt, createdAt: new Date('2026-07-14T01:00:00.000Z') }),
        post('post-a', { readyAt, createdAt: firstCreatedAt }),
      ],
    })

    expect(preview.ready.map((item) => item.post.id)).toEqual(['post-a', 'post-b', 'post-c'])
    expect(preview.ready.map((item) => item.position)).toEqual([1, 2, 3])
  })

  it('lists drafts without dates and reports ready Posts beyond the horizon', () => {
    const draft = post('draft-1', { status: 'draft', readyAt: null })
    const preview = buildXQueuePreview({
      now: new Date('2026-07-21T12:00:00.000Z'),
      days: 1,
      posts: [draft, post('ready-1'), post('ready-2')],
    })

    expect(preview.drafts).toEqual([
      { projectedLocalDate: null, reason: 'approval_required', post: draft },
    ])
    expect(preview.ready.map((item) => item.post.id)).toEqual(['ready-1'])
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
