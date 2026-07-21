import { createDb, makeSocialOpsRepo } from '@duedatehq/db'
import type { Env } from '../../env'
import { dispatchOpsAlert } from '../ops-alerts'
import { buildXAlertPost, validateSocialCandidate, type SocialAlertCandidate } from './content'
import { easternTimeParts, shouldRunXDailySlot } from './time'

const SOCIAL_CANDIDATE_BATCH_SIZE = 100
const URGENT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000
const BACKLOG_ALERT_MS = 7 * 24 * 60 * 60 * 1000

type SocialOpsRepo = ReturnType<typeof makeSocialOpsRepo>
type SocialSchedulerRepo = Pick<
  SocialOpsRepo,
  | 'cancelIneligiblePosts'
  | 'listEligibleCandidates'
  | 'createDraft'
  | 'claimDailyReadyPost'
  | 'markFailed'
>
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
  if (!shouldRunXDailySlot(now)) return { status: 'outside_slot' }
  if (!env.X_SOCIAL_START_AT) return { status: 'disabled', reason: 'missing_cutover' }

  const since = new Date(env.X_SOCIAL_START_AT)
  if (Number.isNaN(since.getTime())) throw new Error('X_SOCIAL_START_AT must be a valid ISO date.')
  const repo = dependencies.repo ?? makeSocialOpsRepo(createDb(env.DB))
  await repo.cancelIneligiblePosts({ channel: 'x', limit: SOCIAL_CANDIDATE_BATCH_SIZE, now })
  const randomRefToken =
    dependencies.randomRefToken ?? (() => crypto.randomUUID().replaceAll('-', ''))
  const candidates = await repo.listEligibleCandidates({
    since,
    limit: SOCIAL_CANDIDATE_BATCH_SIZE,
    channel: 'x',
  })
  let draftsCreated = 0

  for (const candidate of candidates) {
    const validation = validateSocialCandidate(candidate)
    if (!validation.eligible) {
      console.warn(
        JSON.stringify({
          type: 'social.candidate_skipped',
          pulseId: candidate.pulseId,
          reasons: validation.reasons,
        }),
      )
      continue
    }
    const refToken = randomRefToken()
    const built = buildXAlertPost(candidate, { appUrl: env.APP_URL, refToken })
    await repo.createDraft({
      channel: 'x',
      pulseId: candidate.pulseId,
      refToken,
      postText: built.text,
      targetUrl: built.targetUrl,
      teaser: built.teaser,
      agency: built.agency,
      priority: candidatePriority(candidate, now),
      now,
    })
    draftsCreated += 1
  }

  const { localDate } = easternTimeParts(now)
  const mode = env.X_POSTING_MODE === 'live' ? 'live' : 'draft'
  const claim = await repo.claimDailyReadyPost({ channel: 'x', localDate, now, mode })
  if (!claim) return { status: 'idle', localDate, draftsCreated }

  if (mode === 'draft') {
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
  return actionDate.getTime() <= now.getTime() + URGENT_WINDOW_MS ? 'urgent' : 'normal'
}

function hasCompleteXCredentials(env: Env): boolean {
  return Boolean(
    env.X_API_KEY && env.X_API_SECRET && env.X_ACCESS_TOKEN && env.X_ACCESS_TOKEN_SECRET,
  )
}
