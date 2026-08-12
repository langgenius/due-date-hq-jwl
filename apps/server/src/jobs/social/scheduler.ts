import { createDb, makeSocialOpsRepo, SOCIAL_URGENT_WINDOW_MS } from '@duedatehq/db'
import type { Env } from '../../env'
import { dispatchOpsAlert } from '../ops-alerts'
import type { SocialAlertCandidate } from './content'
import { fillXDraftBuffer, type XDraftBufferRepo } from './draft-buffer'
import { X_AUTOMATIC_PUBLISH_INTERVAL_DAYS } from './queue-preview'
import { addLocalCalendarDays, easternTimeParts, shouldRunXDailySlot } from './time'

const SOCIAL_CANDIDATE_RECONCILE_LIMIT = 100
const X_AUTOMATIC_DRAFT_BUFFER_SIZE = 3
const BACKLOG_ALERT_MS = 7 * 24 * 60 * 60 * 1000

type SocialOpsRepo = ReturnType<typeof makeSocialOpsRepo>
type SocialSchedulerRepo = Pick<
  SocialOpsRepo,
  'cancelIneligiblePosts' | 'listOccupiedPublishDates' | 'claimDailyReadyPost' | 'markFailed'
> &
  XDraftBufferRepo
interface SocialWatchdogRepo {
  listPosts(input: {
    channel: 'x'
    status: 'ready' | 'unknown'
    limit: number
  }): Promise<Array<{ readyAt: Date | null }>>
}

export type XSocialCronResult =
  | { status: 'outside_slot' }
  | { status: 'disabled'; reason: 'missing_cutover' }
  | { status: 'cadence_pause'; localDate: string; draftsCreated: number }
  | { status: 'draft_only'; localDate: string; draftsCreated: number; runId: string }
  | { status: 'queued'; localDate: string; draftsCreated: number; runId: string }
  | { status: 'idle'; localDate: string; draftsCreated: number }

export async function runXSocialCron(
  env: Env,
  now: Date,
  dependencies: {
    repo?: SocialSchedulerRepo
    queue?: { send(message: XPublishQueueMessage): Promise<unknown> }
    randomRefToken?: () => string
  } = {},
): Promise<XSocialCronResult> {
  if (!env.X_SOCIAL_START_AT) return { status: 'disabled', reason: 'missing_cutover' }

  const since = new Date(env.X_SOCIAL_START_AT)
  if (Number.isNaN(since.getTime())) throw new Error('X_SOCIAL_START_AT must be a valid ISO date.')
  if (!shouldRunXDailySlot(now)) return { status: 'outside_slot' }

  const repo = dependencies.repo ?? makeSocialOpsRepo(createDb(env.DB))
  const { localDate } = easternTimeParts(now)
  const cadenceLookbackDays = X_AUTOMATIC_PUBLISH_INTERVAL_DAYS - 1
  const cadenceStartLocalDate = addLocalCalendarDays(localDate, -cadenceLookbackDays)
  const recentPublishDates = await repo.listOccupiedPublishDates({
    channel: 'x',
    fromLocalDate: cadenceStartLocalDate,
    limit: X_AUTOMATIC_PUBLISH_INTERVAL_DAYS,
  })
  const guardedLocalDates = new Set(
    Array.from({ length: cadenceLookbackDays }, (_, index) =>
      addLocalCalendarDays(localDate, -(index + 1)),
    ),
  )
  const cadencePaused = recentPublishDates.some((date) => guardedLocalDates.has(date))

  await repo.cancelIneligiblePosts({
    channel: 'x',
    limit: SOCIAL_CANDIDATE_RECONCILE_LIMIT,
    now,
  })
  const randomRefToken =
    dependencies.randomRefToken ?? (() => crypto.randomUUID().replaceAll('-', ''))

  if (cadencePaused) {
    const draftsCreated = await tryReplenishReviewBuffer(
      env,
      repo,
      since,
      now,
      randomRefToken,
      localDate,
    )
    return { status: 'cadence_pause', localDate, draftsCreated }
  }

  const mode = env.X_POSTING_MODE === 'live' ? 'live' : 'draft'
  const claim = await repo.claimDailyReadyPost({ channel: 'x', localDate, now, mode })
  if (!claim) {
    const draftsCreated = await tryReplenishReviewBuffer(
      env,
      repo,
      since,
      now,
      randomRefToken,
      localDate,
    )
    return { status: 'idle', localDate, draftsCreated }
  }

  if (mode === 'draft') {
    const draftsCreated = await tryReplenishReviewBuffer(
      env,
      repo,
      since,
      now,
      randomRefToken,
      localDate,
    )
    return { status: 'draft_only', localDate, draftsCreated, runId: claim.run.id }
  }

  if (!hasCompleteXCredentials(env) || !env.SOCIAL_OPS_TOKEN) {
    await repo.markFailed({
      runId: claim.run.id,
      reason: 'X live publishing configuration is incomplete.',
      now,
    })
    throw new Error('X_POSTING_MODE=live requires X OAuth credentials and SOCIAL_OPS_TOKEN.')
  }

  const draftsCreated = await tryReplenishReviewBuffer(
    env,
    repo,
    since,
    now,
    randomRefToken,
    localDate,
  )

  try {
    await (dependencies.queue ?? env.SOCIAL_QUEUE).send({
      type: 'social.x.publish',
      runId: claim.run.id,
    } satisfies XPublishQueueMessage)
  } catch (error) {
    await repo.markFailed({
      runId: claim.run.id,
      reason: error instanceof Error ? error.message : 'Unable to enqueue the X publish job.',
      now,
    })
    throw error
  }

  return { status: 'queued', localDate, draftsCreated, runId: claim.run.id }
}

async function tryReplenishReviewBuffer(
  env: Env,
  repo: SocialSchedulerRepo,
  since: Date,
  now: Date,
  randomRefToken: () => string,
  localDate: string,
): Promise<number> {
  try {
    const result = await fillXDraftBuffer({
      repo,
      appUrl: env.APP_URL,
      since,
      now,
      bufferSize: X_AUTOMATIC_DRAFT_BUFFER_SIZE,
      randomRefToken,
      priorityForCandidate: (candidate) => candidatePriority(candidate, now),
    })
    return result.created
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : 'Unable to replenish the X review draft.'
    const fields = { localDate, reason }
    console.error(
      JSON.stringify({ type: 'social.alert', name: 'social.x.draft_replenish_failed', ...fields }),
    )
    await dispatchOpsAlert(env, 'social.x.draft_replenish_failed', fields)
    return 0
  }
}

export async function runXSocialWatchdog(
  env: Env,
  now: Date,
  dependencies: { repo?: SocialWatchdogRepo } = {},
): Promise<
  { status: 'disabled' } | { status: 'checked'; readyCount: number; unknownCount: number }
> {
  if (!env.X_SOCIAL_START_AT) return { status: 'disabled' }
  const repo = dependencies.repo ?? makeSocialOpsRepo(createDb(env.DB))
  const { localDate } = easternTimeParts(now)
  const [readyPosts, unknownPosts] = await Promise.all([
    repo.listPosts({ channel: 'x', status: 'ready', limit: 100 }),
    repo.listPosts({ channel: 'x', status: 'unknown', limit: 100 }),
  ])
  const readyDates = readyPosts.flatMap((post) => (post.readyAt ? [post.readyAt] : []))
  const oldestReadyAt = readyDates.length
    ? new Date(Math.min(...readyDates.map((date) => date.getTime())))
    : null
  const oldestWaitMs = oldestReadyAt ? now.getTime() - oldestReadyAt.getTime() : 0
  const fields = {
    localDate,
    readyCount: readyPosts.length,
    readyCountCapped: readyPosts.length === 100,
    unknownCount: unknownPosts.length,
    unknownCountCapped: unknownPosts.length === 100,
    oldestReadyAt: oldestReadyAt?.toISOString() ?? null,
    oldestWaitDays: Math.floor(oldestWaitMs / (24 * 60 * 60 * 1000)),
  }
  console.info(JSON.stringify({ type: 'social.metric', name: 'social.x.outbox_health', ...fields }))

  if (oldestWaitMs > BACKLOG_ALERT_MS) {
    console.warn(
      JSON.stringify({ type: 'social.alert', name: 'social.x.backlog_stale', ...fields }),
    )
    await dispatchOpsAlert(env, 'social.x.backlog_stale', fields)
  }
  if (unknownPosts.length > 0) {
    console.warn(
      JSON.stringify({ type: 'social.alert', name: 'social.x.unknown_pending', ...fields }),
    )
    await dispatchOpsAlert(env, 'social.x.unknown_pending', fields)
  }

  return { status: 'checked', readyCount: readyPosts.length, unknownCount: unknownPosts.length }
}

export interface XPublishQueueMessage {
  type: 'social.x.publish'
  runId: string
}

function candidatePriority(candidate: SocialAlertCandidate, now: Date): 'normal' | 'urgent' {
  const actionDate =
    candidate.actionDeadline ??
    candidate.newDueDate ??
    candidate.effectiveUntil ??
    candidate.effectiveFrom
  if (!actionDate) return 'normal'
  const actionTime = actionDate.getTime()
  return actionTime >= now.getTime() && actionTime <= now.getTime() + SOCIAL_URGENT_WINDOW_MS
    ? 'urgent'
    : 'normal'
}

function hasCompleteXCredentials(env: Env): boolean {
  return Boolean(
    env.X_API_KEY && env.X_API_SECRET && env.X_ACCESS_TOKEN && env.X_ACCESS_TOKEN_SECRET,
  )
}
