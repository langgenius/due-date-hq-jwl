import { REVIEW_ONLY_PULSE_SOURCE_IDS, requiresReviewOnlyPulseAlert } from '@duedatehq/core/rules'
import {
  containsPossibleEmailAddress,
  containsPossibleSensitiveIdentifier,
} from '@duedatehq/core/pii'
import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  like,
  lt,
  lte,
  ne,
  notInArray,
  or,
  sql,
  type SQL,
} from 'drizzle-orm'
import type { Db } from '../client'
import { user } from '../schema/auth'
import { pulse, type PulseChangeKind, type PulseStatus } from '../schema/pulse'
import {
  socialAlertPost,
  socialPublishRun,
  type SocialAlertPost,
  type SocialAlertPostStatus,
  type SocialAlertPriority,
  type SocialChannel,
  type SocialPublishRun,
  type SocialPublishRunStatus,
} from '../schema/social'

const DEFAULT_LIST_LIMIT = 50
const MAX_LIST_LIMIT = 100
const MAX_PROJECTION_LIST_LIMIT = 101
export const SOCIAL_URGENT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000
const SOCIAL_REF_PATTERN = /^[A-Za-z0-9_-]{16,128}$/u
const X_POST_ID_PATTERN = /^\d{1,30}$/u
const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u
const SOCIAL_EXCLUDED_CHANGE_KINDS: PulseChangeKind[] = [
  'source_status',
  'rule_source_drift',
  'threshold_advisory',
]
const SOCIAL_EXCLUDED_SOURCE_IDS = [...REVIEW_ONLY_PULSE_SOURCE_IDS]

export type SocialOpsRepoErrorCode = 'not_found' | 'conflict' | 'ineligible' | 'invalid'

export class SocialOpsRepoError extends Error {
  constructor(readonly code: SocialOpsRepoErrorCode) {
    super(code)
    this.name = 'SocialOpsRepoError'
  }
}

export interface SocialAlertCandidateRow {
  pulseId: string
  status: PulseStatus
  isSample: boolean
  sourceId: string
  agency: string
  jurisdiction: string
  forms: string[]
  entityTypes: string[]
  changeKind: PulseChangeKind
  sourceUrl: string
  summary: string
  originalDueDate: Date | null
  newDueDate: Date | null
  effectiveFrom: Date | null
  effectiveUntil: Date | null
  actionDeadline: Date | null
  createdAt: Date
}

export interface SocialPublishPayload {
  runId: string
  runStatus: SocialPublishRunStatus
  localDate: string
  postId: string
  pulseId: string
  postText: string
  targetUrl: string
}

export type SocialDraftCreateResult = 'created' | 'daily_slot_filled' | 'candidate_conflict'
export type SocialDraftBufferCreateResult =
  | { status: 'created'; post: SocialAlertPost }
  | { status: 'buffer_full' | 'candidate_conflict' }

export interface SocialQueuePost extends SocialAlertPost {
  pulseCreatedAt: Date
}

export interface SocialReviewPost {
  id: string
  status: SocialAlertPostStatus
  postText: string
  approvedAt: Date | null
  xPostId: string | null
  publishedAt: Date | null
  updatedAt: Date
}

interface CreateSocialDraftInput {
  pulseId: string
  refToken: string
  postText: string
  targetUrl: string
  teaser: string
  agency: string
  priority?: SocialAlertPriority
  now?: Date
  channel?: SocialChannel
}

const candidateSelection = {
  pulseId: pulse.id,
  status: pulse.status,
  isSample: pulse.isSample,
  sourceId: pulse.source,
  agency: pulse.source,
  jurisdiction: pulse.parsedJurisdiction,
  forms: pulse.parsedForms,
  entityTypes: pulse.parsedEntityTypes,
  changeKind: pulse.changeKind,
  sourceUrl: pulse.sourceUrl,
  summary: pulse.aiSummary,
  originalDueDate: pulse.parsedOriginalDueDate,
  newDueDate: pulse.parsedNewDueDate,
  effectiveFrom: pulse.parsedEffectiveFrom,
  effectiveUntil: pulse.parsedEffectiveUntil,
  actionDeadline: pulse.protectiveActionDeadline,
  createdAt: pulse.createdAt,
}

const socialReviewPostSelection = {
  id: socialAlertPost.id,
  status: socialAlertPost.status,
  postText: socialAlertPost.postText,
  approvedAt: socialAlertPost.approvedAt,
  xPostId: socialAlertPost.xPostId,
  publishedAt: socialAlertPost.publishedAt,
  updatedAt: socialAlertPost.updatedAt,
}

function candidateConditions(since?: Date): SQL {
  const conditions = and(
    eq(pulse.status, 'approved'),
    eq(pulse.isSample, false),
    notInArray(pulse.source, SOCIAL_EXCLUDED_SOURCE_IDS),
    notInArray(pulse.changeKind, SOCIAL_EXCLUDED_CHANGE_KINDS),
    sql`length(trim(${pulse.source})) > 0`,
    sql`length(trim(${pulse.sourceUrl})) > 0`,
    or(like(pulse.sourceUrl, 'https://%'), like(pulse.sourceUrl, 'http://%')),
    sql`length(trim(${pulse.aiSummary})) > 0`,
    sql`length(trim(${pulse.parsedJurisdiction})) > 0`,
    or(
      sql`json_array_length(${pulse.parsedForms}) > 0`,
      sql`json_array_length(${pulse.parsedEntityTypes}) > 0`,
    ),
    or(
      sql`${pulse.parsedNewDueDate} is not null`,
      sql`${pulse.protectiveActionDeadline} is not null`,
      sql`${pulse.parsedEffectiveFrom} is not null`,
      sql`${pulse.parsedEffectiveUntil} is not null`,
    ),
    or(
      ne(pulse.changeKind, 'deadline_shift'),
      and(
        sql`${pulse.parsedOriginalDueDate} is not null`,
        sql`${pulse.parsedNewDueDate} is not null`,
      ),
    ),
    ...(since ? [gte(pulse.createdAt, since)] : []),
  )
  if (!conditions) throw new Error('Social candidate conditions must not be empty.')
  return conditions
}

function clampLimit(value: number | undefined): number {
  return Math.min(Math.max(value ?? DEFAULT_LIST_LIMIT, 1), MAX_LIST_LIMIT)
}

function clampProjectionLimit(value: number | undefined): number {
  return Math.min(Math.max(value ?? DEFAULT_LIST_LIMIT, 1), MAX_PROJECTION_LIST_LIMIT)
}

function validPublicHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname)
  } catch {
    return false
  }
}

function validateDraftInput(input: CreateSocialDraftInput): void {
  if (
    !isValidSocialAlertRef(input.refToken) ||
    !input.postText.trim() ||
    !input.teaser.trim() ||
    !input.agency.trim() ||
    !validPublicHttpUrl(input.targetUrl)
  ) {
    throw new SocialOpsRepoError('invalid')
  }
}

export function isValidSocialAlertRef(value: string): boolean {
  return SOCIAL_REF_PATTERN.test(value)
}

export function isValidXPostId(value: string): boolean {
  return X_POST_ID_PATTERN.test(value)
}

function isValidLocalDate(value: string): boolean {
  if (!LOCAL_DATE_PATTERN.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function candidateIsRuntimeEligible(row: SocialAlertCandidateRow | undefined) {
  const publicFields = row
    ? [row.sourceId, row.jurisdiction, row.summary, ...row.forms, ...row.entityTypes]
    : []
  return Boolean(
    row &&
    row.status === 'approved' &&
    !row.isSample &&
    !requiresReviewOnlyPulseAlert(row.sourceId) &&
    !SOCIAL_EXCLUDED_CHANGE_KINDS.includes(row.changeKind) &&
    Boolean(row.sourceId.trim()) &&
    validPublicHttpUrl(row.sourceUrl) &&
    Boolean(row.summary.trim()) &&
    Boolean(row.jurisdiction.trim()) &&
    (row.forms.some((value) => value.trim()) || row.entityTypes.some((value) => value.trim())) &&
    Boolean(row.newDueDate ?? row.actionDeadline ?? row.effectiveFrom ?? row.effectiveUntil) &&
    (row.changeKind !== 'deadline_shift' || Boolean(row.originalDueDate && row.newDueDate)) &&
    !containsPossibleEmailAddress(publicFields) &&
    !containsPossibleSensitiveIdentifier(publicFields),
  )
}

export function makeSocialOpsRepo(db: Db) {
  async function getEligibleCandidate(pulseId: string): Promise<SocialAlertCandidateRow | null> {
    const [row] = await db
      .select(candidateSelection)
      .from(pulse)
      .where(and(eq(pulse.id, pulseId), candidateConditions()))
      .limit(1)
    if (!row || !candidateIsRuntimeEligible(row)) return null
    return row
  }

  async function getPost(postId: string): Promise<SocialAlertPost | null> {
    const [row] = await db
      .select()
      .from(socialAlertPost)
      .where(eq(socialAlertPost.id, postId))
      .limit(1)
    return row ?? null
  }

  async function getRun(runId: string): Promise<SocialPublishRun | null> {
    const [row] = await db
      .select()
      .from(socialPublishRun)
      .where(eq(socialPublishRun.id, runId))
      .limit(1)
    return row ?? null
  }

  async function existingUserId(actorId: string | null | undefined): Promise<string | null> {
    if (!actorId) return null
    const [row] = await db.select({ id: user.id }).from(user).where(eq(user.id, actorId)).limit(1)
    return row?.id ?? null
  }

  async function markFailed(input: {
    runId: string
    reason: string
    httpStatus?: number | null
    now?: Date
  }): Promise<boolean> {
    const run = await getRun(input.runId)
    if (!run) return false
    if (run.status === 'failed') return true
    if (!['queued', 'sending', 'unknown'].includes(run.status)) return false

    const now = input.now ?? new Date()
    const [updatedRuns] = await db.batch([
      db
        .update(socialPublishRun)
        .set({
          status: 'failed',
          responseHttpStatus: input.httpStatus ?? null,
          failureReason: input.reason,
          failedAt: now,
          leaseExpiresAt: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(socialPublishRun.id, input.runId),
            inArray(socialPublishRun.status, ['queued', 'sending', 'unknown']),
          ),
        )
        .returning({ id: socialPublishRun.id }),
      db
        .update(socialAlertPost)
        .set({
          status: 'draft',
          readyAt: null,
          approvedBy: null,
          approvedAt: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(socialAlertPost.id, run.postId),
            inArray(socialAlertPost.status, ['scheduled', 'unknown']),
            sql`exists (
              select 1 from ${socialPublishRun}
              where ${socialPublishRun.id} = ${input.runId}
                and ${socialPublishRun.status} = 'failed'
            )`,
          ),
        ),
    ])
    return updatedRuns.length > 0
  }

  async function markPublished(input: {
    runId: string
    externalPostId: string
    httpStatus?: number | null
    now?: Date
  }): Promise<boolean> {
    if (!isValidXPostId(input.externalPostId)) throw new SocialOpsRepoError('invalid')
    const run = await getRun(input.runId)
    if (!run) return false
    if (run.status === 'published') return run.xPostId === input.externalPostId
    if (run.status !== 'sending' && run.status !== 'unknown') return false

    const now = input.now ?? new Date()
    const [updatedRuns] = await db.batch([
      db
        .update(socialPublishRun)
        .set({
          status: 'published',
          xPostId: input.externalPostId,
          responseHttpStatus: input.httpStatus ?? 201,
          failureReason: null,
          publishedAt: now,
          leaseExpiresAt: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(socialPublishRun.id, input.runId),
            inArray(socialPublishRun.status, ['sending', 'unknown']),
          ),
        )
        .returning({ id: socialPublishRun.id }),
      db
        .update(socialAlertPost)
        .set({
          status: 'published',
          xPostId: input.externalPostId,
          publishedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(socialAlertPost.id, run.postId),
            inArray(socialAlertPost.status, ['scheduled', 'unknown']),
            sql`exists (
              select 1 from ${socialPublishRun}
              where ${socialPublishRun.id} = ${input.runId}
                and ${socialPublishRun.status} = 'published'
                and ${socialPublishRun.xPostId} = ${input.externalPostId}
            )`,
          ),
        ),
    ])
    return updatedRuns.length > 0
  }

  async function cancelPost(input: {
    postId: string
    reason?: string
    now?: Date
  }): Promise<boolean> {
    const post = await getPost(input.postId)
    if (!post || post.status === 'published' || post.status === 'cancelled') return false
    const [activeRun] = await db
      .select({ id: socialPublishRun.id, status: socialPublishRun.status })
      .from(socialPublishRun)
      .where(
        and(
          eq(socialPublishRun.postId, input.postId),
          inArray(socialPublishRun.status, ['queued', 'sending', 'unknown']),
        ),
      )
      .orderBy(desc(socialPublishRun.createdAt))
      .limit(1)
    if (activeRun?.status === 'sending' || activeRun?.status === 'unknown') return false

    const now = input.now ?? new Date()
    const cancelPostStatement = db
      .update(socialAlertPost)
      .set({
        status: 'cancelled',
        cancelledAt: now,
        cancellationReason: input.reason ?? null,
        updatedAt: now,
      })
      .where(
        and(
          eq(socialAlertPost.id, input.postId),
          inArray(socialAlertPost.status, ['draft', 'ready', 'scheduled', 'unknown']),
        ),
      )
    if (activeRun?.status === 'queued') {
      await db.batch([
        cancelPostStatement,
        db
          .update(socialPublishRun)
          .set({
            status: 'failed',
            failureReason: input.reason ?? 'cancelled_before_publish',
            failedAt: now,
            updatedAt: now,
          })
          .where(and(eq(socialPublishRun.id, activeRun.id), eq(socialPublishRun.status, 'queued'))),
      ])
    } else {
      await cancelPostStatement
    }
    return true
  }

  return {
    async listEligibleCandidates(input: {
      since: Date
      now: Date
      limit?: number
      channel?: SocialChannel
      before?: { createdAt: Date; pulseId: string }
    }): Promise<SocialAlertCandidateRow[]> {
      if (
        input.before &&
        (Number.isNaN(input.before.createdAt.getTime()) || !input.before.pulseId.trim())
      ) {
        throw new SocialOpsRepoError('invalid')
      }
      const channel = input.channel ?? 'x'
      const rows = await db
        .select(candidateSelection)
        .from(pulse)
        .leftJoin(
          socialAlertPost,
          and(eq(socialAlertPost.pulseId, pulse.id), eq(socialAlertPost.channel, channel)),
        )
        .where(
          and(
            candidateConditions(input.since),
            isNull(socialAlertPost.id),
            ...(input.before
              ? [
                  or(
                    lt(pulse.createdAt, input.before.createdAt),
                    and(
                      eq(pulse.createdAt, input.before.createdAt),
                      lt(pulse.id, input.before.pulseId),
                    ),
                  ),
                ]
              : []),
          ),
        )
        .orderBy(desc(pulse.createdAt), desc(pulse.id))
        .limit(clampLimit(input.limit))
      return rows
    },

    getEligibleCandidate,
    getPost,

    async createDraft(input: CreateSocialDraftInput): Promise<SocialAlertPost> {
      validateDraftInput(input)
      const candidate = await getEligibleCandidate(input.pulseId)
      if (!candidate) throw new SocialOpsRepoError('ineligible')

      const channel = input.channel ?? 'x'
      const now = input.now ?? new Date()
      const inserted = await db
        .insert(socialAlertPost)
        .values({
          id: crypto.randomUUID(),
          channel,
          pulseId: candidate.pulseId,
          refToken: input.refToken,
          postText: input.postText,
          targetUrl: input.targetUrl,
          teaser: input.teaser,
          agency: input.agency,
          jurisdiction: candidate.jurisdiction,
          changeKind: candidate.changeKind,
          priority: input.priority ?? 'normal',
          status: 'draft',
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing()
        .returning()
      if (inserted[0]) return inserted[0]

      const [existing] = await db
        .select()
        .from(socialAlertPost)
        .where(
          and(eq(socialAlertPost.channel, channel), eq(socialAlertPost.pulseId, input.pulseId)),
        )
        .limit(1)
      if (!existing) throw new SocialOpsRepoError('conflict')
      return existing
    },

    async createDailyDraft(
      input: CreateSocialDraftInput & {
        since: Date
        dailyWindowStart: Date
        dailyWindowEnd: Date
      },
    ): Promise<SocialDraftCreateResult> {
      validateDraftInput(input)
      if (
        Number.isNaN(input.since.getTime()) ||
        Number.isNaN(input.dailyWindowStart.getTime()) ||
        Number.isNaN(input.dailyWindowEnd.getTime()) ||
        input.dailyWindowStart.getTime() >= input.dailyWindowEnd.getTime()
      ) {
        throw new SocialOpsRepoError('invalid')
      }
      const candidate = await getEligibleCandidate(input.pulseId)
      if (!candidate) return 'candidate_conflict'

      const channel = input.channel ?? 'x'
      const now = input.now ?? new Date()
      const postId = crypto.randomUUID()
      const result = await db.run(sql`
        insert into ${socialAlertPost} (
          id,
          channel,
          pulse_id,
          ref_token,
          post_text,
          target_url,
          teaser,
          agency,
          jurisdiction,
          change_kind,
          status,
          priority,
          created_at,
          updated_at
        )
        select
          ${postId},
          ${channel},
          ${candidate.pulseId},
          ${input.refToken},
          ${input.postText},
          ${input.targetUrl},
          ${input.teaser},
          ${input.agency},
          ${candidate.jurisdiction},
          ${candidate.changeKind},
          'draft',
          ${input.priority ?? 'normal'},
          ${now.getTime()},
          ${now.getTime()}
        from ${pulse}
        where ${pulse.id} = ${candidate.pulseId}
          and ${candidateConditions(input.since)}
          and not exists (
            select 1
            from ${socialAlertPost}
            where ${socialAlertPost.channel} = ${channel}
              and ${socialAlertPost.createdAt} >= ${input.dailyWindowStart.getTime()}
              and ${socialAlertPost.createdAt} < ${input.dailyWindowEnd.getTime()}
          )
          and not exists (
            select 1
            from ${socialAlertPost}
            where ${socialAlertPost.channel} = ${channel}
              and ${socialAlertPost.pulseId} = ${candidate.pulseId}
          )
        on conflict do nothing
      `)
      if (result.meta.changes > 0) return 'created'

      const [existingDailyPost] = await db
        .select({ id: socialAlertPost.id })
        .from(socialAlertPost)
        .where(
          and(
            eq(socialAlertPost.channel, channel),
            gte(socialAlertPost.createdAt, input.dailyWindowStart),
            lt(socialAlertPost.createdAt, input.dailyWindowEnd),
          ),
        )
        .limit(1)
      return existingDailyPost ? 'daily_slot_filled' : 'candidate_conflict'
    },

    async createDraftIfBufferBelow(
      input: CreateSocialDraftInput & { since: Date; bufferSize: number },
    ): Promise<SocialDraftBufferCreateResult> {
      validateDraftInput(input)
      if (
        Number.isNaN(input.since.getTime()) ||
        !Number.isInteger(input.bufferSize) ||
        input.bufferSize < 1 ||
        input.bufferSize > 14
      ) {
        throw new SocialOpsRepoError('invalid')
      }
      const candidate = await getEligibleCandidate(input.pulseId)
      if (!candidate) return { status: 'candidate_conflict' }

      const channel = input.channel ?? 'x'
      const now = input.now ?? new Date()
      const postId = crypto.randomUUID()
      const result = await db.run(sql`
        insert into ${socialAlertPost} (
          id,
          channel,
          pulse_id,
          ref_token,
          post_text,
          target_url,
          teaser,
          agency,
          jurisdiction,
          change_kind,
          status,
          priority,
          created_at,
          updated_at
        )
        select
          ${postId},
          ${channel},
          ${candidate.pulseId},
          ${input.refToken},
          ${input.postText},
          ${input.targetUrl},
          ${input.teaser},
          ${input.agency},
          ${candidate.jurisdiction},
          ${candidate.changeKind},
          'draft',
          ${input.priority ?? 'normal'},
          ${now.getTime()},
          ${now.getTime()}
        from ${pulse}
        where ${pulse.id} = ${candidate.pulseId}
          and ${candidateConditions(input.since)}
          and (
            select count(*)
            from ${socialAlertPost}
            inner join ${pulse} on ${pulse.id} = ${socialAlertPost.pulseId}
            where ${socialAlertPost.channel} = ${channel}
              and ${socialAlertPost.status} = 'draft'
              and ${candidateConditions()}
          ) < ${input.bufferSize}
          and not exists (
            select 1
            from ${socialAlertPost}
            where ${socialAlertPost.channel} = ${channel}
              and ${socialAlertPost.pulseId} = ${candidate.pulseId}
          )
        on conflict do nothing
      `)
      if (result.meta.changes > 0) {
        const post = await getPost(postId)
        if (!post) throw new SocialOpsRepoError('conflict')
        return { status: 'created', post }
      }

      const currentDraftRows = await db
        .select({ post: socialAlertPost, ...candidateSelection })
        .from(socialAlertPost)
        .innerJoin(pulse, eq(socialAlertPost.pulseId, pulse.id))
        .where(
          and(
            eq(socialAlertPost.channel, channel),
            eq(socialAlertPost.status, 'draft'),
            candidateConditions(),
          ),
        )
        .limit(input.bufferSize)
      const currentDrafts = currentDraftRows.filter(candidateIsRuntimeEligible)
      return {
        status: currentDrafts.length >= input.bufferSize ? 'buffer_full' : 'candidate_conflict',
      }
    },

    async listPosts(
      input: {
        status?: SocialAlertPostStatus
        limit?: number
        channel?: SocialChannel
      } = {},
    ): Promise<SocialAlertPost[]> {
      const channel = input.channel ?? 'x'
      return db
        .select()
        .from(socialAlertPost)
        .where(
          and(
            eq(socialAlertPost.channel, channel),
            ...(input.status ? [eq(socialAlertPost.status, input.status)] : []),
          ),
        )
        .orderBy(asc(socialAlertPost.createdAt), asc(socialAlertPost.id))
        .limit(clampLimit(input.limit))
    },

    async listRecentPublishedPostsForReview(
      input: {
        channel?: SocialChannel
        limit?: number
      } = {},
    ): Promise<SocialReviewPost[]> {
      const channel = input.channel ?? 'x'
      return db
        .select(socialReviewPostSelection)
        .from(socialAlertPost)
        .where(and(eq(socialAlertPost.channel, channel), eq(socialAlertPost.status, 'published')))
        .orderBy(desc(socialAlertPost.publishedAt), desc(socialAlertPost.id))
        .limit(clampLimit(input.limit))
    },

    async listReadyPostsForProjection(input: {
      channel?: SocialChannel
      limit?: number
    }): Promise<SocialQueuePost[]> {
      const channel = input.channel ?? 'x'
      const rows = await db
        .select({ post: socialAlertPost, pulseCreatedAt: pulse.createdAt, ...candidateSelection })
        .from(socialAlertPost)
        .innerJoin(pulse, eq(socialAlertPost.pulseId, pulse.id))
        .where(
          and(
            eq(socialAlertPost.channel, channel),
            eq(socialAlertPost.status, 'ready'),
            candidateConditions(),
          ),
        )
        .orderBy(desc(pulse.createdAt), desc(pulse.id))
        .limit(clampProjectionLimit(input.limit))
      return rows
        .filter(candidateIsRuntimeEligible)
        .map((row) => Object.assign({}, row.post, { pulseCreatedAt: row.pulseCreatedAt }))
    },

    async listDraftPostsForQueuePreview(
      input: {
        channel?: SocialChannel
        limit?: number
      } = {},
    ): Promise<SocialQueuePost[]> {
      const channel = input.channel ?? 'x'
      const rows = await db
        .select({ post: socialAlertPost, pulseCreatedAt: pulse.createdAt, ...candidateSelection })
        .from(socialAlertPost)
        .innerJoin(pulse, eq(socialAlertPost.pulseId, pulse.id))
        .where(
          and(
            eq(socialAlertPost.channel, channel),
            eq(socialAlertPost.status, 'draft'),
            candidateConditions(),
          ),
        )
        .orderBy(desc(pulse.createdAt), desc(pulse.id))
        .limit(clampProjectionLimit(input.limit))
      return rows
        .filter(candidateIsRuntimeEligible)
        .map((row) => Object.assign({}, row.post, { pulseCreatedAt: row.pulseCreatedAt }))
    },

    async listOccupiedPublishDates(input: {
      channel?: SocialChannel
      fromLocalDate: string
      limit?: number
    }): Promise<string[]> {
      if (!isValidLocalDate(input.fromLocalDate)) throw new SocialOpsRepoError('invalid')
      const channel = input.channel ?? 'x'
      const rows = await db
        .select({ localDate: socialPublishRun.localDate })
        .from(socialPublishRun)
        .where(
          and(
            eq(socialPublishRun.channel, channel),
            gte(socialPublishRun.localDate, input.fromLocalDate),
          ),
        )
        .orderBy(asc(socialPublishRun.localDate))
        .limit(clampLimit(input.limit))
      return rows.map((row) => row.localDate)
    },

    async cancelIneligiblePosts(
      input: {
        channel?: SocialChannel
        limit?: number
        now?: Date
      } = {},
    ): Promise<number> {
      const channel = input.channel ?? 'x'
      let cancelled = 0
      const now = input.now ?? new Date()
      const pageSize = clampLimit(input.limit ?? MAX_LIST_LIMIT)
      let after: { createdAt: Date; postId: string } | undefined

      while (true) {
        // eslint-disable-next-line no-await-in-loop -- keyset pages keep D1 reads bounded.
        const rows = await db
          .select({ post: socialAlertPost, ...candidateSelection })
          .from(socialAlertPost)
          .innerJoin(pulse, eq(socialAlertPost.pulseId, pulse.id))
          .where(
            and(
              eq(socialAlertPost.channel, channel),
              inArray(socialAlertPost.status, ['draft', 'ready']),
              ...(after
                ? [
                    or(
                      gt(socialAlertPost.createdAt, after.createdAt),
                      and(
                        eq(socialAlertPost.createdAt, after.createdAt),
                        gt(socialAlertPost.id, after.postId),
                      ),
                    ),
                  ]
                : []),
            ),
          )
          .orderBy(asc(socialAlertPost.createdAt), asc(socialAlertPost.id))
          .limit(pageSize)

        for (const row of rows) {
          if (candidateIsRuntimeEligible(row)) continue
          // eslint-disable-next-line no-await-in-loop -- each cancellation is independently audited.
          if (
            await cancelPost({
              postId: row.post.id,
              reason: 'pulse_no_longer_social_eligible',
              now,
            })
          ) {
            cancelled += 1
          }
        }

        if (rows.length < pageSize) return cancelled
        const last = rows.at(-1)
        if (!last) return cancelled
        after = { createdAt: last.post.createdAt, postId: last.post.id }
      }
    },

    async approvePost(input: {
      postId: string
      postText?: string
      targetUrl?: string
      teaser?: string
      priority?: SocialAlertPriority
      approvedBy?: string | null
      now?: Date
    }): Promise<SocialAlertPost | null> {
      if (input.postText !== undefined && !input.postText.trim()) {
        throw new SocialOpsRepoError('invalid')
      }
      if (input.teaser !== undefined && !input.teaser.trim()) {
        throw new SocialOpsRepoError('invalid')
      }
      if (input.targetUrl !== undefined && !validPublicHttpUrl(input.targetUrl)) {
        throw new SocialOpsRepoError('invalid')
      }

      const now = input.now ?? new Date()
      const approvedBy = await existingUserId(input.approvedBy)
      if (input.approvedBy && !approvedBy) return null
      const rows = await db
        .update(socialAlertPost)
        .set({
          ...(input.postText !== undefined ? { postText: input.postText } : {}),
          ...(input.targetUrl !== undefined ? { targetUrl: input.targetUrl } : {}),
          ...(input.teaser !== undefined ? { teaser: input.teaser } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          status: 'ready',
          readyAt: now,
          approvedBy,
          approvedAt: now,
          updatedAt: now,
        })
        .where(and(eq(socialAlertPost.id, input.postId), eq(socialAlertPost.status, 'draft')))
        .returning()
      return rows[0] ?? null
    },

    cancelPost,

    async claimDailyReadyPost(input: {
      channel: SocialChannel
      localDate: string
      now: Date
      mode: 'draft' | 'live'
    }): Promise<{ run: SocialPublishRun; post: SocialAlertPost } | null> {
      if (!isValidLocalDate(input.localDate)) throw new SocialOpsRepoError('invalid')
      const [existingRun] = await db
        .select({ id: socialPublishRun.id })
        .from(socialPublishRun)
        .where(
          and(
            eq(socialPublishRun.channel, input.channel),
            eq(socialPublishRun.localDate, input.localDate),
          ),
        )
        .limit(1)
      if (existingRun) return null

      const [candidate] = await db
        .select({ post: socialAlertPost })
        .from(socialAlertPost)
        .innerJoin(pulse, eq(socialAlertPost.pulseId, pulse.id))
        .where(
          and(
            eq(socialAlertPost.channel, input.channel),
            eq(socialAlertPost.status, 'ready'),
            candidateConditions(),
          ),
        )
        .orderBy(desc(pulse.createdAt), desc(pulse.id))
        .limit(1)
      if (!candidate) return null

      const runStatus = input.mode === 'draft' ? 'draft_only' : 'queued'
      const runId = crypto.randomUUID()
      const nextPostStatus = input.mode === 'draft' ? 'draft' : 'scheduled'
      // D1 executes batch statements transactionally. The daily ledger insert
      // and ready -> scheduled/draft transition therefore either both persist
      // or neither does; a Worker crash cannot consume the daily slot without
      // leaving a queueable/visible post behind.
      const [insertedRuns, claimedPosts] = await db.batch([
        db
          .insert(socialPublishRun)
          .values({
            id: runId,
            channel: input.channel,
            localDate: input.localDate,
            postId: candidate.post.id,
            status: runStatus,
            queuedAt: input.mode === 'live' ? input.now : null,
            createdAt: input.now,
            updatedAt: input.now,
          })
          .onConflictDoNothing()
          .returning(),
        db
          .update(socialAlertPost)
          .set({
            status: nextPostStatus,
            ...(input.mode === 'draft'
              ? { readyAt: null, approvedBy: null, approvedAt: null }
              : {}),
            updatedAt: input.now,
          })
          .where(
            and(
              eq(socialAlertPost.id, candidate.post.id),
              eq(socialAlertPost.status, 'ready'),
              sql`exists (
                select 1 from ${socialPublishRun}
                where ${socialPublishRun.id} = ${runId}
                  and ${socialPublishRun.postId} = ${candidate.post.id}
                  and ${socialPublishRun.status} = ${runStatus}
              )`,
            ),
          )
          .returning(),
        db
          .update(socialPublishRun)
          .set({
            status: 'failed',
            failureReason: 'post_claim_conflict',
            failedAt: input.now,
            updatedAt: input.now,
          })
          .where(
            and(
              eq(socialPublishRun.id, runId),
              eq(socialPublishRun.status, runStatus),
              sql`not exists (
                select 1 from ${socialAlertPost}
                where ${socialAlertPost.id} = ${candidate.post.id}
                  and ${socialAlertPost.status} = ${nextPostStatus}
              )`,
            ),
          )
          .returning({ id: socialPublishRun.id }),
      ])
      const run = insertedRuns[0]
      if (!run) return null
      const post = claimedPosts[0]
      if (post) return { run, post }
      return null
    },

    async claimExactDailyReadyPost(input: {
      channel: SocialChannel
      localDate: string
      postId: string
      now: Date
    }): Promise<{ run: SocialPublishRun; post: SocialAlertPost } | null> {
      if (!isValidLocalDate(input.localDate) || !input.postId.trim()) {
        throw new SocialOpsRepoError('invalid')
      }

      const [existingRun] = await db
        .select()
        .from(socialPublishRun)
        .where(
          and(
            eq(socialPublishRun.channel, input.channel),
            eq(socialPublishRun.localDate, input.localDate),
          ),
        )
        .limit(1)

      // A shadow run deliberately returns its Post to draft and clears the
      // approval. After an operator explicitly approves that same Post again,
      // publish-now may promote that exact audit row instead of inventing a
      // second daily slot. No other existing slot may be reused.
      const canPromoteShadow =
        existingRun?.status === 'draft_only' && existingRun.postId === input.postId
      if (existingRun && !canPromoteShadow) return null

      const [candidate] = await db
        .select({ post: socialAlertPost, ...candidateSelection })
        .from(socialAlertPost)
        .innerJoin(pulse, eq(socialAlertPost.pulseId, pulse.id))
        .where(
          and(
            eq(socialAlertPost.id, input.postId),
            eq(socialAlertPost.channel, input.channel),
            eq(socialAlertPost.status, 'ready'),
            candidateConditions(),
          ),
        )
        .limit(1)
      if (!candidate || !candidateIsRuntimeEligible(candidate)) return null

      const runId = existingRun?.id ?? crypto.randomUUID()
      const runStatement = canPromoteShadow
        ? db
            .update(socialPublishRun)
            .set({
              status: 'queued',
              queuedAt: input.now,
              failureReason: null,
              failedAt: null,
              updatedAt: input.now,
            })
            .where(
              and(
                eq(socialPublishRun.id, runId),
                eq(socialPublishRun.channel, input.channel),
                eq(socialPublishRun.localDate, input.localDate),
                eq(socialPublishRun.postId, input.postId),
                eq(socialPublishRun.status, 'draft_only'),
              ),
            )
            .returning()
        : db
            .insert(socialPublishRun)
            .values({
              id: runId,
              channel: input.channel,
              localDate: input.localDate,
              postId: input.postId,
              status: 'queued',
              queuedAt: input.now,
              createdAt: input.now,
              updatedAt: input.now,
            })
            .onConflictDoNothing()
            .returning()

      // The run mutation and ready -> scheduled CAS are one D1 transaction.
      // The EXISTS gate prevents a losing concurrent daily-slot claimant from
      // moving the Post when its run insert/promotion did not succeed.
      const [claimedRuns, claimedPosts] = await db.batch([
        runStatement,
        db
          .update(socialAlertPost)
          .set({ status: 'scheduled', updatedAt: input.now })
          .where(
            and(
              eq(socialAlertPost.id, input.postId),
              eq(socialAlertPost.channel, input.channel),
              eq(socialAlertPost.status, 'ready'),
              sql`exists (
                select 1 from ${socialPublishRun}
                where ${socialPublishRun.id} = ${runId}
                  and ${socialPublishRun.channel} = ${input.channel}
                  and ${socialPublishRun.localDate} = ${input.localDate}
                  and ${socialPublishRun.postId} = ${input.postId}
                  and ${socialPublishRun.status} = 'queued'
              )`,
            ),
          )
          .returning(),
        db
          .update(socialPublishRun)
          .set({
            status: 'failed',
            failureReason: 'post_claim_conflict',
            failedAt: input.now,
            updatedAt: input.now,
          })
          .where(
            and(
              eq(socialPublishRun.id, runId),
              eq(socialPublishRun.status, 'queued'),
              sql`not exists (
                select 1 from ${socialAlertPost}
                where ${socialAlertPost.id} = ${input.postId}
                  and ${socialAlertPost.status} = 'scheduled'
              )`,
            ),
          )
          .returning({ id: socialPublishRun.id }),
      ])
      const run = claimedRuns[0]
      if (!run) return null
      const post = claimedPosts[0]
      if (post) return { run, post }
      return null
    },

    async getPublishPayload(runId: string): Promise<SocialPublishPayload | null> {
      const [row] = await db
        .select({
          runId: socialPublishRun.id,
          runStatus: socialPublishRun.status,
          localDate: socialPublishRun.localDate,
          postId: socialAlertPost.id,
          pulseId: socialAlertPost.pulseId,
          postText: socialAlertPost.postText,
          targetUrl: socialAlertPost.targetUrl,
        })
        .from(socialPublishRun)
        .innerJoin(socialAlertPost, eq(socialPublishRun.postId, socialAlertPost.id))
        .where(eq(socialPublishRun.id, runId))
        .limit(1)
      return row ?? null
    },

    async markSending(input: {
      runId: string
      leaseExpiresAt: Date
      now?: Date
    }): Promise<boolean> {
      const now = input.now ?? new Date()
      if (input.leaseExpiresAt <= now) throw new SocialOpsRepoError('invalid')
      const rows = await db
        .update(socialPublishRun)
        .set({
          status: 'sending',
          attemptCount: sql`${socialPublishRun.attemptCount} + 1`,
          lastAttemptAt: now,
          sendingAt: now,
          leaseExpiresAt: input.leaseExpiresAt,
          failureReason: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(socialPublishRun.id, input.runId),
            or(
              eq(socialPublishRun.status, 'queued'),
              and(
                eq(socialPublishRun.status, 'sending'),
                lte(socialPublishRun.leaseExpiresAt, now),
              ),
            ),
          ),
        )
        .returning({ id: socialPublishRun.id })
      return rows.length > 0
    },

    markPublished,
    markFailed,

    async markUnknown(input: {
      runId: string
      reason: string
      httpStatus?: number | null
      now?: Date
    }): Promise<boolean> {
      const run = await getRun(input.runId)
      if (!run) return false
      if (run.status === 'unknown') return true
      if (run.status !== 'queued' && run.status !== 'sending') return false
      const now = input.now ?? new Date()
      const [updatedRuns] = await db.batch([
        db
          .update(socialPublishRun)
          .set({
            status: 'unknown',
            responseHttpStatus: input.httpStatus ?? null,
            failureReason: input.reason,
            leaseExpiresAt: null,
            updatedAt: now,
          })
          .where(
            and(
              eq(socialPublishRun.id, input.runId),
              inArray(socialPublishRun.status, ['queued', 'sending']),
            ),
          )
          .returning({ id: socialPublishRun.id }),
        db
          .update(socialAlertPost)
          .set({ status: 'unknown', updatedAt: now })
          .where(
            and(
              eq(socialAlertPost.id, run.postId),
              eq(socialAlertPost.status, 'scheduled'),
              sql`exists (
                select 1 from ${socialPublishRun}
                where ${socialPublishRun.id} = ${input.runId}
                  and ${socialPublishRun.status} = 'unknown'
              )`,
            ),
          ),
      ])
      return updatedRuns.length > 0
    },

    async cancelIfPulseIneligible(postId: string, now: Date = new Date()): Promise<boolean> {
      const post = await getPost(postId)
      if (!post || post.status === 'published' || post.status === 'cancelled') return false
      const eligible = await getEligibleCandidate(post.pulseId)
      if (eligible) return false
      return cancelPost({ postId, reason: 'pulse_no_longer_social_eligible', now })
    },

    async reconcilePost(input: {
      postId: string
      outcome: 'published' | 'not_published'
      externalPostId?: string | null
      reason?: string
      now?: Date
    }): Promise<boolean> {
      const [run] = await db
        .select({ id: socialPublishRun.id })
        .from(socialPublishRun)
        .where(
          and(eq(socialPublishRun.postId, input.postId), eq(socialPublishRun.status, 'unknown')),
        )
        .orderBy(desc(socialPublishRun.createdAt))
        .limit(1)
      if (!run) return false
      if (input.outcome === 'published') {
        if (!input.externalPostId) throw new SocialOpsRepoError('invalid')
        return markPublished({
          runId: run.id,
          externalPostId: input.externalPostId,
          ...(input.now ? { now: input.now } : {}),
        })
      }
      return markFailed({
        runId: run.id,
        reason: input.reason ?? 'operator_confirmed_not_published',
        ...(input.now ? { now: input.now } : {}),
      })
    },

    async getPublishedTeaserByRef(
      refToken: string,
    ): Promise<{ teaser: string; agency: string; jurisdiction: string } | null> {
      if (!isValidSocialAlertRef(refToken)) return null
      const [row] = await db
        .select({
          teaser: socialAlertPost.teaser,
          agency: socialAlertPost.agency,
          jurisdiction: socialAlertPost.jurisdiction,
        })
        .from(socialAlertPost)
        .where(and(eq(socialAlertPost.refToken, refToken), eq(socialAlertPost.status, 'published')))
        .limit(1)
      return row ?? null
    },
  }
}

export type SocialOpsRepo = ReturnType<typeof makeSocialOpsRepo>
