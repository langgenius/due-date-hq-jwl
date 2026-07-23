import { Hono } from 'hono'
import {
  createDb,
  makeSocialOpsRepo,
  type SocialAlertPost,
  type SocialAlertPriority,
  type SocialAlertPostStatus,
  type SocialQueuePost,
} from '@duedatehq/db'
import type { ContextVars, Env } from '../env'
import { seedBackfillFromBaselineSnapshots } from '../jobs/pulse/backfill'
import { buildXAlertPost, validateSocialCandidate } from '../jobs/social/content'
import { buildXQueuePreview } from '../jobs/social/queue-preview'
import { easternTimeParts, nextXDailySlotLocalDate } from '../jobs/social/time'
import {
  verifyXAccount,
  type XOAuthCredentials,
  type XVerifyAccountResult,
} from '../jobs/social/x-client'

// Operator-only surface for one-shot maintenance jobs. Same access model as
// the e2e seed routes: open in development, token-gated in staging, absent
// (404) everywhere else — never reachable by tenant traffic.
function hasOpsAccess(c: { env: Env; req: { header(name: string): string | undefined } }) {
  if (c.env.ENV === 'development') return true
  const token = c.env.E2E_SEED_TOKEN
  if (c.env.ENV !== 'staging' || !token) return false
  const header = c.req.header('authorization')
  return header === `Bearer ${token}` || c.req.header('x-e2e-seed-token') === token
}

// Social publishing is a production operator surface, so it intentionally does
// not share the E2E seed credential or staging-only lifecycle above. Local dev
// stays open for previewing; every non-development environment fails closed
// unless the dedicated token is configured and presented as a bearer token.
function hasSocialOpsAccess(c: { env: Env; req: { header(name: string): string | undefined } }) {
  if (c.env.ENV === 'development') return true
  const token = c.env.SOCIAL_OPS_TOKEN
  if (!token) return false
  return c.req.header('authorization') === `Bearer ${token}`
}

interface PulseBackfillRequest {
  sourceIds?: unknown
  limit?: unknown
}

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

const SOCIAL_POST_STATUS_VALUES = [
  'draft',
  'ready',
  'scheduled',
  'published',
  'unknown',
  'cancelled',
] as const satisfies readonly SocialAlertPostStatus[]
const SOCIAL_PRIORITY_VALUES = [
  'normal',
  'urgent',
] as const satisfies readonly SocialAlertPriority[]
const SOCIAL_POST_STATUSES = new Set<string>(SOCIAL_POST_STATUS_VALUES)
const DEFAULT_SOCIAL_DRAFT_SEED_COUNT = 3
const MAX_SOCIAL_DRAFT_SEED_COUNT = 14
const SOCIAL_DRAFT_SEED_CANDIDATE_LIMIT = 100

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function boundedLimit(value: string | undefined): number {
  const parsed = Number(value ?? 50)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 100 ? parsed : 50
}

function socialDraftSeedCount(value: unknown): number | null {
  if (value === undefined) return DEFAULT_SOCIAL_DRAFT_SEED_COUNT
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_SOCIAL_DRAFT_SEED_COUNT
    ? value
    : null
}

function queuePreviewDays(value: string | undefined): number | null {
  if (value === undefined) return 14
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 100 ? parsed : null
}

function isQueuePreviewPost(
  post: SocialQueuePost,
): post is SocialQueuePost & { status: 'draft' | 'ready' } {
  return post.status === 'draft' || post.status === 'ready'
}

function socialPostStatus(value: string | undefined): SocialAlertPostStatus | undefined {
  return SOCIAL_POST_STATUS_VALUES.find((status) => status === value)
}

function socialPriority(value: string | undefined): SocialAlertPriority | undefined {
  return SOCIAL_PRIORITY_VALUES.find((priority) => priority === value)
}

function xCredentials(env: Env): XOAuthCredentials | null {
  if (!env.X_API_KEY || !env.X_API_SECRET || !env.X_ACCESS_TOKEN || !env.X_ACCESS_TOKEN_SECRET) {
    return null
  }
  return {
    apiKey: env.X_API_KEY,
    apiSecret: env.X_API_SECRET,
    accessToken: env.X_ACCESS_TOKEN,
    accessTokenSecret: env.X_ACCESS_TOKEN_SECRET,
  }
}

async function verifyConfiguredXAccount(env: Env): Promise<XVerifyAccountResult | null> {
  const credentials = xCredentials(env)
  if (!credentials) return null
  return verifyXAccount(credentials)
}

export const opsRoute = new Hono<{ Bindings: Env; Variables: ContextVars }>()
  .post('/pulse-backfill', async (c) => {
    if (!hasOpsAccess(c)) {
      return c.notFound()
    }
    const raw: unknown = await c.req.json().catch(() => undefined)
    const body: PulseBackfillRequest = isObjectLike(raw) ? raw : {}
    const sourceIds = Array.isArray(body.sourceIds)
      ? body.sourceIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
      : []
    if (sourceIds.length === 0) {
      return c.json({ error: 'sourceIds (non-empty string array) is required' }, 400)
    }
    const limit = typeof body.limit === 'number' ? body.limit : undefined
    const result = await seedBackfillFromBaselineSnapshots(c.env, {
      sourceIds,
      ...(limit !== undefined ? { limit } : {}),
    })
    return c.json(result)
  })
  .get('/social/x/account', async (c) => {
    if (!hasSocialOpsAccess(c)) return c.notFound()

    const result = await verifyConfiguredXAccount(c.env)
    if (!result) return c.json({ error: 'X OAuth 1.0a credentials are incomplete' }, 503)
    if (result.kind === 'failure') {
      return c.json(
        {
          error: 'X account verification failed',
          reason: result.reason,
          httpStatus: result.httpStatus ?? null,
        },
        502,
      )
    }
    return c.json({ account: { userId: result.userId, username: result.username } })
  })
  .get('/social/queue', async (c) => {
    if (!hasSocialOpsAccess(c)) return c.notFound()

    const days = queuePreviewDays(c.req.query('days'))
    if (days === null) return c.json({ error: 'days must be an integer from 1 to 100' }, 400)

    const now = new Date()
    const repo = makeSocialOpsRepo(createDb(c.env.DB))
    const readLimit = days + 1
    const [readyRows, draftRows, occupiedLocalDates] = await Promise.all([
      repo.listReadyPostsForProjection({
        channel: 'x',
        limit: readLimit,
      }),
      repo.listDraftPostsForQueuePreview({ channel: 'x', limit: 101 }),
      repo.listOccupiedPublishDates({
        channel: 'x',
        fromLocalDate: nextXDailySlotLocalDate(now),
        limit: days,
      }),
    ])
    const posts = [...readyRows, ...draftRows.slice(0, 100)].filter(isQueuePreviewPost)
    const preview = buildXQueuePreview({ now, days, posts, occupiedLocalDates })
    return c.json({
      ...preview,
      readyBacklogTruncated: readyRows.length > days,
      draftBacklogTruncated: draftRows.length > 100,
    })
  })
  .get('/social/candidates', async (c) => {
    if (!hasSocialOpsAccess(c)) return c.notFound()

    const rawStatus = c.req.query('status')
    if (rawStatus && !SOCIAL_POST_STATUSES.has(rawStatus)) {
      return c.json({ error: 'status is not a valid social post status' }, 400)
    }
    const status = socialPostStatus(rawStatus)
    const posts = await makeSocialOpsRepo(createDb(c.env.DB)).listPosts({
      channel: 'x',
      limit: boundedLimit(c.req.query('limit')),
      ...(status ? { status } : {}),
    })
    return c.json({ posts })
  })
  .get('/social/:postId/review-status', async (c) => {
    if (!hasSocialOpsAccess(c)) return c.notFound()

    const post = await makeSocialOpsRepo(createDb(c.env.DB)).getPost(c.req.param('postId'))
    if (!post) return c.notFound()
    // This narrow DTO is the only single-Post payload consumed by the public
    // GitHub review mirror. Keep tenant data, reviewer IDs, ref tokens, Pulse
    // metadata, source details, and X credentials out of this boundary.
    return c.json({
      post: {
        id: post.id,
        status: post.status,
        postText: post.postText,
        approvedAt: post.approvedAt?.toISOString() ?? null,
        updatedAt: post.updatedAt.toISOString(),
      },
    })
  })
  .post('/social/drafts/seed', async (c) => {
    if (!hasSocialOpsAccess(c)) return c.notFound()

    const raw: unknown = await c.req.json().catch(() => undefined)
    if (raw !== undefined && !isObjectLike(raw)) {
      return c.json({ error: 'JSON body must be an object' }, 400)
    }
    const count = socialDraftSeedCount(raw?.count)
    if (count === null) {
      return c.json({ error: 'count must be an integer from 1 to 14' }, 400)
    }

    const now = new Date()
    // This endpoint is an explicit operator-authorized backfill. Unlike the
    // daily scheduler, it may fill the review buffer from pre-cutover Alerts.
    const since = new Date(0)
    const repo = makeSocialOpsRepo(createDb(c.env.DB))
    await repo.cancelIneligiblePosts({
      channel: 'x',
      limit: SOCIAL_DRAFT_SEED_CANDIDATE_LIMIT,
      now,
    })
    const existingDrafts = await repo.listDraftPostsForQueuePreview({ channel: 'x', limit: count })
    const posts: SocialAlertPost[] = []
    let skipped = 0
    let bufferFull = existingDrafts.length >= count
    let before: { createdAt: Date; pulseId: string } | undefined

    while (!bufferFull && existingDrafts.length + posts.length < count) {
      // eslint-disable-next-line no-await-in-loop
      const candidatePage = await repo.listEligibleCandidates({
        channel: 'x',
        since,
        now,
        limit: SOCIAL_DRAFT_SEED_CANDIDATE_LIMIT,
        ...(before ? { before } : {}),
      })
      const candidates = candidatePage.toSorted(
        (left, right) =>
          right.createdAt.getTime() - left.createdAt.getTime() ||
          right.pulseId.localeCompare(left.pulseId),
      )
      if (candidates.length === 0) break

      for (const candidate of candidates) {
        if (existingDrafts.length + posts.length >= count) break
        const validation = validateSocialCandidate(candidate)
        if (!validation.eligible) {
          skipped += 1
          continue
        }

        const refToken = crypto.randomUUID().replaceAll('-', '')
        const built = buildXAlertPost(candidate, { appUrl: c.env.APP_URL, refToken })
        // Keep this bounded operator mutation sequential so a partial D1 failure
        // returns the exact prefix that was durably seeded instead of fanning out
        // up to 14 competing read-then-insert operations.
        // eslint-disable-next-line no-await-in-loop
        const result = await repo.createDraftIfBufferBelow({
          channel: 'x',
          pulseId: candidate.pulseId,
          refToken,
          postText: built.text,
          targetUrl: built.targetUrl,
          teaser: built.teaser,
          agency: built.agency,
          priority: 'normal',
          since,
          bufferSize: count,
          now,
        })
        if (result.status === 'created') {
          posts.push(result.post)
        } else if (result.status === 'buffer_full') {
          bufferFull = true
          break
        }
      }

      if (bufferFull || candidates.length < SOCIAL_DRAFT_SEED_CANDIDATE_LIMIT) break
      const lastCandidate = candidates.at(-1)
      if (!lastCandidate) break
      before = { createdAt: lastCandidate.createdAt, pulseId: lastCandidate.pulseId }
    }

    const finalDrafts = await repo.listDraftPostsForQueuePreview({ channel: 'x', limit: count })
    const total = finalDrafts.length
    const targetReached = total >= count
    const result = {
      requested: count,
      existing: existingDrafts.length,
      created: posts.length,
      total,
      targetReached,
      bufferFull: bufferFull || targetReached,
      skipped,
      posts,
    }
    return posts.length > 0 ? c.json(result, 201) : c.json(result)
  })
  .post('/social/candidates', async (c) => {
    if (!hasSocialOpsAccess(c)) return c.notFound()

    const raw: unknown = await c.req.json().catch(() => undefined)
    if (!isObjectLike(raw)) return c.json({ error: 'JSON body is required' }, 400)
    const pulseId = optionalString(raw.pulseId)
    if (!pulseId) return c.json({ error: 'pulseId is required' }, 400)
    const rawPriority = optionalString(raw.priority)
    const priority = socialPriority(rawPriority)
    if (rawPriority && !priority) {
      return c.json({ error: 'priority must be normal or urgent' }, 400)
    }

    const repo = makeSocialOpsRepo(createDb(c.env.DB))
    const candidate = await repo.getEligibleCandidate(pulseId)
    if (!candidate) return c.json({ error: 'Pulse is not eligible for social publishing' }, 422)
    const validation = validateSocialCandidate(candidate)
    if (!validation.eligible) {
      return c.json(
        { error: 'Pulse is not eligible for social publishing', reasons: validation.reasons },
        422,
      )
    }

    const now = new Date()
    const refToken = crypto.randomUUID().replaceAll('-', '')
    const built = buildXAlertPost(candidate, { appUrl: c.env.APP_URL, refToken })
    const post = await repo.createDraft({
      channel: 'x',
      pulseId,
      refToken,
      postText: built.text,
      targetUrl: built.targetUrl,
      teaser: built.teaser,
      agency: built.agency,
      priority: priority ?? 'normal',
      now,
    })
    return c.json({ post }, 201)
  })
  .post('/social/:postId/approve', async (c) => {
    if (!hasSocialOpsAccess(c)) return c.notFound()

    const raw: unknown = await c.req.json().catch(() => undefined)
    if (!isObjectLike(raw)) return c.json({ error: 'JSON body is required' }, 400)
    const approvedBy = optionalString(raw.approvedBy)
    if (!approvedBy) return c.json({ error: 'approvedBy user ID is required' }, 400)
    const rawPriority = optionalString(raw.priority)
    const priority = socialPriority(rawPriority)
    if (rawPriority && !priority) {
      return c.json({ error: 'priority must be normal or urgent' }, 400)
    }

    const repo = makeSocialOpsRepo(createDb(c.env.DB))
    const draft = await repo.getPost(c.req.param('postId'))
    if (!draft || draft.status !== 'draft') {
      return c.json({ error: 'Draft was not found or cannot be approved' }, 409)
    }
    const candidate = await repo.getEligibleCandidate(draft.pulseId)
    if (!candidate) return c.json({ error: 'Pulse is no longer eligible' }, 422)
    const validation = validateSocialCandidate(candidate)
    if (!validation.eligible) {
      return c.json({ error: 'Pulse is no longer eligible', reasons: validation.reasons }, 422)
    }
    // Rebuild at the approval boundary so ready copy is frozen from the
    // current approved Pulse and a previously rejected draft can be repaired
    // after deterministic template or validation changes.
    const built = buildXAlertPost(candidate, {
      appUrl: c.env.APP_URL,
      refToken: draft.refToken,
    })
    const post = await repo.approvePost({
      postId: c.req.param('postId'),
      approvedBy,
      postText: built.text,
      targetUrl: built.targetUrl,
      teaser: built.teaser,
      ...(priority ? { priority } : {}),
      now: new Date(),
    })
    if (!post) return c.json({ error: 'Draft was not found or cannot be approved' }, 409)
    return c.json({
      post,
      transition: {
        postId: post.id,
        draftUpdatedAt: draft.updatedAt.toISOString(),
        approvedAt: post.approvedAt?.toISOString() ?? null,
      },
    })
  })
  .post('/social/:postId/publish-now', async (c) => {
    if (!hasSocialOpsAccess(c)) return c.notFound()
    if (c.env.X_POSTING_MODE !== 'live') {
      return c.json({ error: 'X live publishing is disabled' }, 409)
    }

    const postId = c.req.param('postId')
    const repo = makeSocialOpsRepo(createDb(c.env.DB))
    const post = await repo.getPost(postId)
    if (!post || post.status !== 'ready') {
      return c.json({ error: 'Post was not found or is not ready' }, 409)
    }
    const candidate = await repo.getEligibleCandidate(post.pulseId)
    if (!candidate) return c.json({ error: 'Pulse is no longer eligible' }, 422)
    const validation = validateSocialCandidate(candidate)
    if (!validation.eligible) {
      return c.json({ error: 'Pulse is no longer eligible', reasons: validation.reasons }, 422)
    }

    // Verify the credentials and account with a signed read-only request
    // after validating the requested Post but before reserving the ET daily
    // slot. A bad credential must not consume the only publishing opportunity.
    const account = await verifyConfiguredXAccount(c.env)
    if (!account) return c.json({ error: 'X OAuth 1.0a credentials are incomplete' }, 503)
    if (account.kind === 'failure') {
      return c.json(
        {
          error: 'X account verification failed',
          reason: account.reason,
          httpStatus: account.httpStatus ?? null,
        },
        502,
      )
    }

    const now = new Date()
    const { localDate } = easternTimeParts(now)
    const claim = await repo.claimExactDailyReadyPost({
      channel: 'x',
      localDate,
      postId,
      now,
    })
    if (!claim) {
      return c.json(
        { error: 'The ET daily slot is already consumed or the Post is no longer ready' },
        409,
      )
    }

    try {
      await c.env.SOCIAL_QUEUE.send({
        type: 'social.x.publish',
        runId: claim.run.id,
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unable to enqueue the X publish job.'
      const recovered = await repo
        .markFailed({ runId: claim.run.id, reason, now })
        .catch(() => false)
      if (!recovered) {
        return c.json(
          {
            error: 'Unable to enqueue the X publish job or persist its failed state',
            runId: claim.run.id,
          },
          500,
        )
      }
      return c.json({ error: 'Unable to enqueue the X publish job' }, 503)
    }

    return c.json(
      {
        queued: true,
        runId: claim.run.id,
        postId: claim.post.id,
        localDate,
        account: { userId: account.userId, username: account.username },
      },
      202,
    )
  })
  .post('/social/:postId/cancel', async (c) => {
    if (!hasSocialOpsAccess(c)) return c.notFound()

    const raw: unknown = await c.req.json().catch(() => undefined)
    if (!isObjectLike(raw)) return c.json({ error: 'JSON body is required' }, 400)
    const reason = optionalString(raw.reason)
    if (!reason) return c.json({ error: 'reason is required' }, 400)
    const cancelled = await makeSocialOpsRepo(createDb(c.env.DB)).cancelPost({
      postId: c.req.param('postId'),
      reason,
      now: new Date(),
    })
    if (!cancelled) return c.json({ error: 'Post was not found or cannot be cancelled' }, 409)
    return c.json({ cancelled: true })
  })
  .post('/social/:postId/reconcile', async (c) => {
    if (!hasSocialOpsAccess(c)) return c.notFound()

    const raw: unknown = await c.req.json().catch(() => undefined)
    if (!isObjectLike(raw)) return c.json({ error: 'JSON body is required' }, 400)
    const outcome = optionalString(raw.outcome)
    if (outcome !== 'published' && outcome !== 'not_published') {
      return c.json({ error: 'outcome must be published or not_published' }, 400)
    }
    const externalPostId = optionalString(raw.externalPostId)
    const reason = optionalString(raw.reason)
    if (outcome === 'published' && !externalPostId) {
      return c.json({ error: 'externalPostId is required for a published outcome' }, 400)
    }
    if (outcome === 'not_published' && !reason) {
      return c.json({ error: 'reason is required for a not_published outcome' }, 400)
    }

    const reconciled = await makeSocialOpsRepo(createDb(c.env.DB)).reconcilePost({
      postId: c.req.param('postId'),
      outcome,
      ...(externalPostId ? { externalPostId } : {}),
      ...(reason ? { reason } : {}),
      now: new Date(),
    })
    if (!reconciled) return c.json({ error: 'Unknown post was not found' }, 409)
    return c.json({ reconciled: true })
  })
