/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Focused Drizzle chain doubles implement only the fluent methods exercised by
 * the social/pulse repositories. The assertions target repository behavior,
 * while social-schema.test.ts locks down the concrete schema configuration.
 */
import { describe, expect, it, vi } from 'vitest'
import type { SQL } from 'drizzle-orm'
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core'
import { makePulseRepo, PulseRepoError } from './pulse'
import { isValidSocialAlertRef, makeSocialOpsRepo } from './social'
import type { SocialAlertPost, SocialPublishRun } from '../schema/social'

const NOW = new Date('2026-07-21T13:00:00.000Z')
const REF = 'social_alert_ref_1234567890'

const CANDIDATE = {
  pulseId: 'pulse-1',
  status: 'approved' as const,
  isSample: false,
  sourceId: 'irs.disaster',
  agency: 'Internal Revenue Service',
  jurisdiction: 'FED',
  forms: ['federal_1040'],
  entityTypes: ['individual'],
  changeKind: 'deadline_shift' as const,
  sourceUrl: 'https://www.irs.gov/newsroom/example',
  summary: 'A filing deadline changed.',
  originalDueDate: new Date('2026-04-15T00:00:00.000Z'),
  newDueDate: new Date('2026-10-15T00:00:00.000Z'),
  effectiveFrom: null,
  effectiveUntil: null,
  actionDeadline: null,
  createdAt: new Date('2026-07-20T12:00:00.000Z'),
}

const POST: SocialAlertPost = {
  id: 'post-1',
  channel: 'x',
  pulseId: 'pulse-1',
  refToken: REF,
  postText: 'Source-backed alert copy',
  targetUrl: `https://app.duedatehq.com/alerts?ref=${REF}`,
  teaser: 'Form 1040 · Deadline shift.',
  agency: 'Internal Revenue Service',
  jurisdiction: 'FED',
  changeKind: 'deadline_shift',
  status: 'ready',
  priority: 'normal',
  readyAt: NOW,
  approvedBy: 'user-1',
  approvedAt: NOW,
  xPostId: null,
  publishedAt: null,
  cancelledAt: null,
  cancellationReason: null,
  createdAt: NOW,
  updatedAt: NOW,
}

const RUN: SocialPublishRun = {
  id: 'run-1',
  channel: 'x',
  localDate: '2026-07-21',
  postId: 'post-1',
  status: 'queued',
  attemptCount: 0,
  lastAttemptAt: null,
  leaseExpiresAt: null,
  responseHttpStatus: null,
  failureReason: null,
  xPostId: null,
  queuedAt: NOW,
  sendingAt: null,
  publishedAt: null,
  failedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
}

function selectChain(response: unknown[]) {
  const chain = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    leftJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(async () => response),
  }
  chain.from.mockReturnValue(chain)
  chain.innerJoin.mockReturnValue(chain)
  chain.leftJoin.mockReturnValue(chain)
  chain.where.mockReturnValue(chain)
  chain.orderBy.mockReturnValue(chain)
  return chain
}

interface MutationChain extends Promise<unknown[]> {
  values: ReturnType<typeof vi.fn>
  set: ReturnType<typeof vi.fn>
  where: ReturnType<typeof vi.fn>
  onConflictDoNothing: ReturnType<typeof vi.fn>
  returning: ReturnType<typeof vi.fn>
}

function mutationChain(response: unknown[], valueSink?: unknown[]) {
  const chain = Promise.resolve(response) as MutationChain
  chain.values = vi.fn((value: unknown) => {
    valueSink?.push(value)
    return chain
  })
  chain.set = vi.fn((value: unknown) => {
    valueSink?.push(value)
    return chain
  })
  chain.where = vi.fn(() => chain)
  chain.onConflictDoNothing = vi.fn(() => chain)
  chain.returning = vi.fn(async () => response)
  return chain
}

function fakeDb(input: {
  selectResponses?: unknown[][]
  insertResponses?: unknown[][]
  updateResponses?: unknown[][]
  runChanges?: number[]
}) {
  const selectResponses = [...(input.selectResponses ?? [])]
  const insertResponses = [...(input.insertResponses ?? [])]
  const updateResponses = [...(input.updateResponses ?? [])]
  const runChanges = [...(input.runChanges ?? [])]
  const insertedValues: unknown[] = []
  const updatedValues: unknown[] = []
  const db = {
    select: vi.fn(() => selectChain(selectResponses.shift() ?? [])),
    insert: vi.fn(() => mutationChain(insertResponses.shift() ?? [], insertedValues)),
    update: vi.fn(() => mutationChain(updateResponses.shift() ?? [], updatedValues)),
    batch: vi.fn(async (statements: Array<PromiseLike<unknown>>) => Promise.all(statements)),
    run: vi.fn(async (_statement: SQL) => ({ meta: { changes: runChanges.shift() ?? 0 } })),
  }
  return {
    db: db as unknown as Parameters<typeof makeSocialOpsRepo>[0],
    raw: db,
    insertedValues,
    updatedValues,
  }
}

describe('makeSocialOpsRepo', () => {
  it('lists one SQL-eligible, post-cutover candidate page newest first', async () => {
    const { db, raw } = fakeDb({
      selectResponses: [
        [
          CANDIDATE,
          {
            ...CANDIDATE,
            pulseId: 'entity-scope',
            forms: [],
            entityTypes: ['partnership'],
          },
        ],
      ],
    })

    const rows = await makeSocialOpsRepo(db).listEligibleCandidates({
      since: new Date('2026-07-01T00:00:00.000Z'),
      now: NOW,
    })

    expect(rows.map((row) => row.pulseId)).toEqual(['pulse-1', 'entity-scope'])
    const chain = raw.select.mock.results[0]?.value as ReturnType<typeof selectChain>
    const order = chain.orderBy.mock.calls[0] as SQL[]
    expect(order).toHaveLength(2)
    expect(order.map((item) => new SQLiteSyncDialect().sqlToQuery(item).sql)).toEqual([
      '"pulse"."created_at" desc',
      '"pulse"."id" desc',
    ])
  })

  it('uses a newest-first keyset cursor before limiting the next candidate page', async () => {
    const cursor = {
      createdAt: new Date('2026-07-20T12:00:00.000Z'),
      pulseId: 'pulse-cursor',
    }
    const { db, raw } = fakeDb({ selectResponses: [[CANDIDATE]] })

    await makeSocialOpsRepo(db).listEligibleCandidates({
      since: new Date('2026-07-01T00:00:00.000Z'),
      now: NOW,
      before: cursor,
      limit: 100,
    })

    const chain = raw.select.mock.results[0]?.value as ReturnType<typeof selectChain>
    const condition = chain.where.mock.calls[0]?.[0] as SQL
    const query = new SQLiteSyncDialect().sqlToQuery(condition)
    expect(query.sql).toContain('"pulse"."created_at" < ?')
    expect(query.sql).toContain('"pulse"."created_at" = ?')
    expect(query.sql).toContain('"pulse"."id" < ?')
    expect(query.params).toEqual(
      expect.arrayContaining([cursor.createdAt.getTime(), cursor.pulseId]),
    )
    expect(chain.limit).toHaveBeenCalledWith(100)
  })

  it('reads ready Posts in newest-Pulse-first order for future-slot projection', async () => {
    const urgent = { ...POST, id: 'post-urgent', priority: 'urgent' as const }
    const { db, raw } = fakeDb({
      selectResponses: [
        [
          { post: urgent, pulseCreatedAt: CANDIDATE.createdAt, ...CANDIDATE },
          {
            post: POST,
            pulseCreatedAt: CANDIDATE.createdAt,
            ...CANDIDATE,
            sourceUrl: 'javascript:alert(1)',
          },
        ],
      ],
    })

    const posts = await makeSocialOpsRepo(db).listReadyPostsForProjection({
      channel: 'x',
      limit: 14,
    })

    expect(posts).toEqual([{ ...urgent, pulseCreatedAt: CANDIDATE.createdAt }])
    const chain = raw.select.mock.results[0]?.value as ReturnType<typeof selectChain>
    const condition = chain.where.mock.calls[0]?.[0] as SQL
    const query = new SQLiteSyncDialect().sqlToQuery(condition)
    expect(query.params).not.toContain('urgent')
    expect(chain.orderBy.mock.calls[0]).toHaveLength(2)
    expect(chain.limit).toHaveBeenCalledWith(14)
  })

  it('lists eligible drafts separately without assigning publication state', async () => {
    const draft = { ...POST, status: 'draft' as const, readyAt: null, approvedAt: null }
    const { db, raw } = fakeDb({
      selectResponses: [[{ post: draft, pulseCreatedAt: CANDIDATE.createdAt, ...CANDIDATE }]],
    })

    await expect(
      makeSocialOpsRepo(db).listDraftPostsForQueuePreview({ channel: 'x', limit: 20 }),
    ).resolves.toEqual([{ ...draft, pulseCreatedAt: CANDIDATE.createdAt }])
    expect(raw.insert).not.toHaveBeenCalled()
    expect(raw.update).not.toHaveBeenCalled()
  })

  it('hides a draft whose Pulse now contains possible public PII', async () => {
    const draft = { ...POST, status: 'draft' as const, readyAt: null, approvedAt: null }
    const { db } = fakeDb({
      selectResponses: [
        [
          {
            post: draft,
            pulseCreatedAt: CANDIDATE.createdAt,
            ...CANDIDATE,
            summary: 'Contact private@example.com before filing.',
          },
        ],
      ],
    })

    await expect(
      makeSocialOpsRepo(db).listDraftPostsForQueuePreview({ channel: 'x', limit: 20 }),
    ).resolves.toEqual([])
  })

  it('reads every occupied future daily slot regardless of run status', async () => {
    const { db, raw } = fakeDb({
      selectResponses: [[{ localDate: '2026-07-21' }, { localDate: '2026-07-23' }]],
    })

    await expect(
      makeSocialOpsRepo(db).listOccupiedPublishDates({
        channel: 'x',
        fromLocalDate: '2026-07-21',
        limit: 100,
      }),
    ).resolves.toEqual(['2026-07-21', '2026-07-23'])
    expect(raw.insert).not.toHaveBeenCalled()
    expect(raw.update).not.toHaveBeenCalled()
  })

  it('creates an idempotent frozen draft from an eligible Pulse', async () => {
    const draft = { ...POST, status: 'draft' as const, readyAt: null, approvedAt: null }
    const { db, insertedValues } = fakeDb({
      selectResponses: [[CANDIDATE]],
      insertResponses: [[draft]],
    })

    const result = await makeSocialOpsRepo(db).createDraft({
      pulseId: CANDIDATE.pulseId,
      refToken: REF,
      postText: draft.postText,
      targetUrl: draft.targetUrl,
      teaser: draft.teaser,
      agency: draft.agency,
      now: NOW,
    })

    expect(result).toEqual(draft)
    expect(insertedValues[0]).toMatchObject({
      pulseId: 'pulse-1',
      agency: 'Internal Revenue Service',
      jurisdiction: 'FED',
      status: 'draft',
    })
  })

  it('atomically creates one automatic draft per ET calendar day', async () => {
    const { db, raw } = fakeDb({ selectResponses: [[CANDIDATE]], runChanges: [1] })

    await expect(
      makeSocialOpsRepo(db).createDailyDraft({
        pulseId: CANDIDATE.pulseId,
        refToken: REF,
        postText: POST.postText,
        targetUrl: POST.targetUrl,
        teaser: POST.teaser,
        agency: POST.agency,
        since: new Date('2026-07-21T00:00:00.000Z'),
        dailyWindowStart: new Date('2026-07-21T04:00:00.000Z'),
        dailyWindowEnd: new Date('2026-07-22T04:00:00.000Z'),
        now: NOW,
      }),
    ).resolves.toBe('created')

    const statement = raw.run.mock.calls[0]?.[0] as SQL
    const query = new SQLiteSyncDialect().sqlToQuery(statement)
    expect(query.sql).toContain('insert into "social_alert_post"')
    expect(query.sql).toContain('not exists')
    expect(query.sql).toContain('"social_alert_post"."created_at" >= ?')
    expect(query.sql).toContain('"social_alert_post"."created_at" < ?')
    expect(query.sql).not.toContain('"social_alert_post"."status" = \'draft\'')
    expect(query.sql).toContain('on conflict do nothing')
    expect(query.params).toEqual(
      expect.arrayContaining([
        CANDIDATE.pulseId,
        REF,
        new Date('2026-07-21T00:00:00.000Z').getTime(),
        new Date('2026-07-21T04:00:00.000Z').getTime(),
        new Date('2026-07-22T04:00:00.000Z').getTime(),
        NOW.getTime(),
      ]),
    )
  })

  it('reports a filled daily slot even when older drafts remain in review', async () => {
    const { db } = fakeDb({
      selectResponses: [[CANDIDATE], [{ id: 'post-created-today' }]],
      runChanges: [0],
    })

    await expect(
      makeSocialOpsRepo(db).createDailyDraft({
        pulseId: CANDIDATE.pulseId,
        refToken: REF,
        postText: POST.postText,
        targetUrl: POST.targetUrl,
        teaser: POST.teaser,
        agency: POST.agency,
        since: new Date('2026-07-21T00:00:00.000Z'),
        dailyWindowStart: new Date('2026-07-21T04:00:00.000Z'),
        dailyWindowEnd: new Date('2026-07-22T04:00:00.000Z'),
        now: NOW,
      }),
    ).resolves.toBe('daily_slot_filled')
  })

  it('distinguishes a candidate race from an already-filled ET daily slot', async () => {
    const { db } = fakeDb({ selectResponses: [[CANDIDATE], []], runChanges: [0] })

    await expect(
      makeSocialOpsRepo(db).createDailyDraft({
        pulseId: CANDIDATE.pulseId,
        refToken: REF,
        postText: POST.postText,
        targetUrl: POST.targetUrl,
        teaser: POST.teaser,
        agency: POST.agency,
        since: new Date('2026-07-21T00:00:00.000Z'),
        dailyWindowStart: new Date('2026-07-21T04:00:00.000Z'),
        dailyWindowEnd: new Date('2026-07-22T04:00:00.000Z'),
        now: NOW,
      }),
    ).resolves.toBe('candidate_conflict')
  })

  it('atomically fills but never exceeds an operator draft-buffer target', async () => {
    const createdDraft = { ...POST, status: 'draft' as const, readyAt: null, approvedAt: null }
    const { db, raw } = fakeDb({
      selectResponses: [[CANDIDATE], [createdDraft]],
      runChanges: [1],
    })

    await expect(
      makeSocialOpsRepo(db).createDraftIfBufferBelow({
        pulseId: CANDIDATE.pulseId,
        refToken: REF,
        postText: POST.postText,
        targetUrl: POST.targetUrl,
        teaser: POST.teaser,
        agency: POST.agency,
        since: new Date('2026-07-21T00:00:00.000Z'),
        bufferSize: 3,
        now: NOW,
      }),
    ).resolves.toEqual({ status: 'created', post: createdDraft })

    const statement = raw.run.mock.calls[0]?.[0] as SQL
    const query = new SQLiteSyncDialect().sqlToQuery(statement)
    expect(query.sql).toContain('select count(*)')
    expect(query.sql).toContain('inner join "pulse"')
    expect(query.sql).toContain('"social_alert_post"."status" = \'draft\'')
    expect(query.sql.match(/"pulse"\."status" = \?/gu)).toHaveLength(2)
    expect(query.params).toContain(3)
  })

  it('reports a full operator draft buffer without creating another Post', async () => {
    const draftRows = [
      { post: { id: 'draft-1' }, ...CANDIDATE },
      { post: { id: 'draft-2' }, ...CANDIDATE },
      { post: { id: 'draft-3' }, ...CANDIDATE },
    ]
    const { db } = fakeDb({
      selectResponses: [[CANDIDATE], draftRows],
      runChanges: [0],
    })

    await expect(
      makeSocialOpsRepo(db).createDraftIfBufferBelow({
        pulseId: CANDIDATE.pulseId,
        refToken: REF,
        postText: POST.postText,
        targetUrl: POST.targetUrl,
        teaser: POST.teaser,
        agency: POST.agency,
        since: new Date('2026-07-21T00:00:00.000Z'),
        bufferSize: 3,
        now: NOW,
      }),
    ).resolves.toEqual({ status: 'buffer_full' })
  })

  it('looks up one exact post without relying on a paginated candidate list', async () => {
    const { db } = fakeDb({ selectResponses: [[POST]] })

    await expect(makeSocialOpsRepo(db).getPost(POST.id)).resolves.toEqual(POST)
  })

  it('claims only one live slot and moves the selected post to scheduled', async () => {
    const scheduled = { ...POST, status: 'scheduled' as const }
    const { db, raw } = fakeDb({
      selectResponses: [[], [{ post: POST }]],
      insertResponses: [[RUN]],
      updateResponses: [[scheduled]],
    })

    const result = await makeSocialOpsRepo(db).claimDailyReadyPost({
      channel: 'x',
      localDate: '2026-07-21',
      now: NOW,
      mode: 'live',
    })

    expect(result).toEqual({ run: RUN, post: scheduled })
    expect(raw.batch).toHaveBeenCalledTimes(1)
    expect(raw.batch.mock.calls[0]?.[0]).toHaveLength(3)
    const candidateChain = raw.select.mock.results[1]?.value as ReturnType<typeof selectChain>
    const order = candidateChain.orderBy.mock.calls[0] as SQL[]
    expect(order.map((item) => new SQLiteSyncDialect().sqlToQuery(item).sql)).toEqual([
      '"pulse"."created_at" desc',
      '"pulse"."id" desc',
    ])
    const postUpdate = raw.update.mock.results[0]?.value as MutationChain
    const postClaimCondition = postUpdate.where.mock.calls[0]?.[0] as SQL
    const postClaimQuery = new SQLiteSyncDialect().sqlToQuery(postClaimCondition)
    expect(postClaimQuery.sql).toContain('exists')
    expect(postClaimQuery.params).toEqual(expect.arrayContaining([POST.id, 'queued']))
  })

  it('claims one exact ready Post for an otherwise empty live daily slot', async () => {
    const scheduled = { ...POST, status: 'scheduled' as const }
    const { db } = fakeDb({
      selectResponses: [[], [{ post: POST, ...CANDIDATE }]],
      insertResponses: [[RUN]],
      updateResponses: [[scheduled], []],
    })

    await expect(
      makeSocialOpsRepo(db).claimExactDailyReadyPost({
        channel: 'x',
        localDate: RUN.localDate,
        postId: POST.id,
        now: NOW,
      }),
    ).resolves.toEqual({ run: RUN, post: scheduled })
  })

  it('promotes the same-day same-Post shadow run after explicit reapproval', async () => {
    const shadowRun = {
      ...RUN,
      status: 'draft_only' as const,
      queuedAt: null,
    }
    const scheduled = { ...POST, status: 'scheduled' as const }
    const { db, insertedValues, updatedValues } = fakeDb({
      selectResponses: [[shadowRun], [{ post: POST, ...CANDIDATE }]],
      updateResponses: [[RUN], [scheduled], []],
    })

    await expect(
      makeSocialOpsRepo(db).claimExactDailyReadyPost({
        channel: 'x',
        localDate: RUN.localDate,
        postId: POST.id,
        now: NOW,
      }),
    ).resolves.toEqual({ run: RUN, post: scheduled })
    expect(insertedValues).toEqual([])
    expect(updatedValues[0]).toMatchObject({ status: 'queued', queuedAt: NOW })
    expect(updatedValues[1]).toMatchObject({ status: 'scheduled' })
  })

  it('does not reuse a daily shadow slot for a different exact Post', async () => {
    const shadowRun = {
      ...RUN,
      status: 'draft_only' as const,
      postId: 'another-post',
      queuedAt: null,
    }
    const { db, raw } = fakeDb({ selectResponses: [[shadowRun]] })

    await expect(
      makeSocialOpsRepo(db).claimExactDailyReadyPost({
        channel: 'x',
        localDate: RUN.localDate,
        postId: POST.id,
        now: NOW,
      }),
    ).resolves.toBeNull()
    expect(raw.insert).not.toHaveBeenCalled()
    expect(raw.update).not.toHaveBeenCalled()
  })

  it('does not exact-claim a row that fails runtime candidate validation', async () => {
    const { db, raw } = fakeDb({
      selectResponses: [[], [{ post: POST, ...CANDIDATE, sourceUrl: 'javascript:alert(1)' }]],
    })

    await expect(
      makeSocialOpsRepo(db).claimExactDailyReadyPost({
        channel: 'x',
        localDate: RUN.localDate,
        postId: POST.id,
        now: NOW,
      }),
    ).resolves.toBeNull()
    expect(raw.insert).not.toHaveBeenCalled()
    expect(raw.update).not.toHaveBeenCalled()
  })

  it('freezes approval metadata only for a real reviewer and draft row', async () => {
    const { db, updatedValues } = fakeDb({
      selectResponses: [[{ id: 'user-1' }]],
      updateResponses: [[POST]],
    })

    const result = await makeSocialOpsRepo(db).approvePost({
      postId: POST.id,
      approvedBy: 'user-1',
      priority: 'urgent',
      now: NOW,
    })

    expect(result).toEqual(POST)
    expect(updatedValues[0]).toMatchObject({
      status: 'ready',
      priority: 'urgent',
      approvedBy: 'user-1',
      readyAt: NOW,
    })
  })

  it('refuses approval when the supplied reviewer is not a real user', async () => {
    const { db, raw } = fakeDb({ selectResponses: [[]] })

    const result = await makeSocialOpsRepo(db).approvePost({
      postId: POST.id,
      approvedBy: 'missing-user',
      now: NOW,
    })

    expect(result).toBeNull()
    expect(raw.update).not.toHaveBeenCalled()
  })

  it('cancels an unsent post without inventing a publish attempt', async () => {
    const draft = { ...POST, status: 'draft' as const }
    const { db, updatedValues } = fakeDb({ selectResponses: [[draft], []], updateResponses: [[]] })

    const result = await makeSocialOpsRepo(db).cancelPost({
      postId: POST.id,
      reason: 'superseded copy',
      now: NOW,
    })

    expect(result).toBe(true)
    expect(updatedValues[0]).toMatchObject({
      status: 'cancelled',
      cancellationReason: 'superseded copy',
      cancelledAt: NOW,
    })
  })

  it('atomically claims a queued or expired sending lease', async () => {
    const { db, updatedValues } = fakeDb({ updateResponses: [[{ id: RUN.id }]] })

    const result = await makeSocialOpsRepo(db).markSending({
      runId: RUN.id,
      now: NOW,
      leaseExpiresAt: new Date(NOW.getTime() + 300_000),
    })

    expect(result).toBe(true)
    expect(updatedValues[0]).toMatchObject({ status: 'sending', lastAttemptAt: NOW })
  })

  it('reconciles an ambiguous post to the published terminal state', async () => {
    const unknownRun = { ...RUN, status: 'unknown' as const }
    const { db, updatedValues } = fakeDb({
      selectResponses: [[{ id: RUN.id }], [unknownRun]],
      updateResponses: [[{ id: RUN.id }], []],
    })

    const result = await makeSocialOpsRepo(db).reconcilePost({
      postId: POST.id,
      outcome: 'published',
      externalPostId: 'x-post-1',
      now: NOW,
    })

    expect(result).toBe(true)
    expect(updatedValues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 'published', xPostId: 'x-post-1' }),
      ]),
    )
  })

  it('allows a definite failure to be corrected, reapproved, and claimed next day', async () => {
    const ready = { ...POST, status: 'ready' as const }
    const scheduled = { ...POST, status: 'scheduled' as const }
    const nextRun = {
      ...RUN,
      id: 'run-2',
      localDate: '2026-07-22',
      createdAt: new Date('2026-07-22T13:00:00.000Z'),
      updatedAt: new Date('2026-07-22T13:00:00.000Z'),
    }
    const { db } = fakeDb({
      selectResponses: [[RUN], [{ id: 'user-1' }], [], [{ post: ready }]],
      insertResponses: [[nextRun]],
      updateResponses: [[{ id: RUN.id }], [], [ready], [scheduled]],
    })
    const repo = makeSocialOpsRepo(db)

    await expect(
      repo.markFailed({ runId: RUN.id, reason: 'X rejected the copy', now: NOW }),
    ).resolves.toBe(true)
    await expect(
      repo.approvePost({ postId: POST.id, approvedBy: 'user-1', now: NOW }),
    ).resolves.toEqual(ready)
    await expect(
      repo.claimDailyReadyPost({
        channel: 'x',
        localDate: '2026-07-22',
        now: new Date('2026-07-22T13:00:00.000Z'),
        mode: 'live',
      }),
    ).resolves.toEqual({ run: nextRun, post: scheduled })
  })

  it('reports a lost terminal-state CAS instead of claiming reconciliation success', async () => {
    const unknownRun = { ...RUN, status: 'unknown' as const }
    const publishAttempt = fakeDb({
      selectResponses: [[unknownRun]],
      updateResponses: [[], []],
    })
    const failureAttempt = fakeDb({
      selectResponses: [[unknownRun]],
      updateResponses: [[], []],
    })

    await expect(
      makeSocialOpsRepo(publishAttempt.db).markPublished({
        runId: RUN.id,
        externalPostId: 'x-post-1',
        now: NOW,
      }),
    ).resolves.toBe(false)
    await expect(
      makeSocialOpsRepo(failureAttempt.db).markFailed({
        runId: RUN.id,
        reason: 'operator_confirmed_not_published',
        now: NOW,
      }),
    ).resolves.toBe(false)
  })

  it('sweeps revoked or otherwise ineligible draft/ready rows before claim', async () => {
    const draft = { ...POST, status: 'draft' as const }
    const { db, raw, updatedValues } = fakeDb({
      selectResponses: [[{ post: draft, ...CANDIDATE, sourceUrl: 'https://' }], [draft], []],
      updateResponses: [[]],
    })

    const count = await makeSocialOpsRepo(db).cancelIneligiblePosts({ channel: 'x', now: NOW })

    expect(count).toBe(1)
    const scan = raw.select.mock.results[0]?.value as ReturnType<typeof selectChain>
    const condition = scan.where.mock.calls[0]?.[0] as SQL
    expect(new SQLiteSyncDialect().sqlToQuery(condition).sql).not.toContain('not (')
    expect(updatedValues[0]).toMatchObject({
      status: 'cancelled',
      cancellationReason: 'pulse_no_longer_social_eligible',
    })
  })

  it('keyset-paginates the full active queue when sweeping runtime-invalid rows', async () => {
    const valid = { ...POST, id: 'post-valid', status: 'draft' as const }
    const invalid = {
      ...POST,
      id: 'post-invalid',
      status: 'draft' as const,
      createdAt: new Date(NOW.getTime() + 1),
    }
    const { db, raw } = fakeDb({
      selectResponses: [
        [{ post: valid, ...CANDIDATE }],
        [{ post: invalid, ...CANDIDATE, summary: 'Email private@example.com' }],
        [invalid],
        [],
        [],
      ],
      updateResponses: [[]],
    })

    await expect(
      makeSocialOpsRepo(db).cancelIneligiblePosts({ channel: 'x', limit: 1, now: NOW }),
    ).resolves.toBe(1)

    const secondPage = raw.select.mock.results[1]?.value as ReturnType<typeof selectChain>
    const condition = secondPage.where.mock.calls[0]?.[0] as SQL
    const query = new SQLiteSyncDialect().sqlToQuery(condition)
    expect(query.params).toEqual(expect.arrayContaining([valid.createdAt.getTime(), valid.id]))
  })

  it('does not claim a second post when the channel already has a daily slot', async () => {
    const { db, raw } = fakeDb({ selectResponses: [[{ id: 'existing-run' }]] })

    const result = await makeSocialOpsRepo(db).claimDailyReadyPost({
      channel: 'x',
      localDate: '2026-07-21',
      now: NOW,
      mode: 'live',
    })

    expect(result).toBeNull()
    expect(raw.insert).not.toHaveBeenCalled()
    expect(raw.update).not.toHaveBeenCalled()
  })

  it('terminally timestamps a rare post CAS conflict instead of leaving a queued orphan', async () => {
    const { db, raw, updatedValues } = fakeDb({
      selectResponses: [[], [{ post: POST }]],
      insertResponses: [[RUN]],
      updateResponses: [[], []],
    })

    const result = await makeSocialOpsRepo(db).claimDailyReadyPost({
      channel: 'x',
      localDate: RUN.localDate,
      now: NOW,
      mode: 'live',
    })

    expect(result).toBeNull()
    expect(raw.batch.mock.calls[0]?.[0]).toHaveLength(3)
    expect(updatedValues[1]).toMatchObject({
      status: 'failed',
      failureReason: 'post_claim_conflict',
      failedAt: NOW,
    })
  })

  it('only exposes frozen teaser fields for a valid published ref lookup', async () => {
    const teaser = {
      teaser: POST.teaser,
      agency: POST.agency,
      jurisdiction: POST.jurisdiction,
    }
    const { db, raw } = fakeDb({ selectResponses: [[teaser]] })
    const repo = makeSocialOpsRepo(db)

    await expect(repo.getPublishedTeaserByRef(REF)).resolves.toEqual(teaser)
    await expect(repo.getPublishedTeaserByRef('bad ref')).resolves.toBeNull()
    expect(raw.select).toHaveBeenCalledTimes(1)
  })
})

describe('social ref validation and tenant materialization', () => {
  it('accepts opaque base64url/UUID-style refs and rejects malformed values', () => {
    expect(isValidSocialAlertRef(REF)).toBe(true)
    expect(isValidSocialAlertRef('e2880a7e-10ff-4fd0-a6fd-f8265781956e')).toBe(true)
    expect(isValidSocialAlertRef('too-short')).toBe(false)
    expect(isValidSocialAlertRef('has spaces and punctuation!')).toBe(false)
  })

  it('materializes a quiet zero-match row using only the scoped firm id', async () => {
    const { db, insertedValues } = fakeDb({
      selectResponses: [[{ pulseId: 'pulse-1' }], [{ alertId: 'firm-alert-1' }]],
      insertResponses: [[]],
    })

    const result = await makePulseRepo(db, 'firm-1').resolveSocialAlertRef(REF)

    expect(result).toEqual({ alertId: 'firm-alert-1' })
    expect(insertedValues[0]).toMatchObject({
      firmId: 'firm-1',
      pulseId: 'pulse-1',
      matchedCount: 0,
      needsReviewCount: 0,
      origin: 'catchup',
    })
  })

  it('resolves the same published ref to different tenant-owned alert ids', async () => {
    const first = fakeDb({
      selectResponses: [[{ pulseId: 'pulse-1' }], [{ alertId: 'firm-alert-1' }]],
      insertResponses: [[]],
    })
    const second = fakeDb({
      selectResponses: [[{ pulseId: 'pulse-1' }], [{ alertId: 'firm-alert-2' }]],
      insertResponses: [[]],
    })

    await expect(makePulseRepo(first.db, 'firm-1').resolveSocialAlertRef(REF)).resolves.toEqual({
      alertId: 'firm-alert-1',
    })
    await expect(makePulseRepo(second.db, 'firm-2').resolveSocialAlertRef(REF)).resolves.toEqual({
      alertId: 'firm-alert-2',
    })
    expect(first.insertedValues[0]).toMatchObject({ firmId: 'firm-1', pulseId: 'pulse-1' })
    expect(second.insertedValues[0]).toMatchObject({ firmId: 'firm-2', pulseId: 'pulse-1' })
  })

  it('maps malformed refs to not_found without touching D1', async () => {
    const { db, raw } = fakeDb({})

    await expect(makePulseRepo(db, 'firm-1').resolveSocialAlertRef('invalid')).rejects.toEqual(
      new PulseRepoError('not_found'),
    )
    expect(raw.select).not.toHaveBeenCalled()
  })
})
