import { createDb, makeSocialOpsRepo } from '@duedatehq/db'
import type { Env } from '../../env'
import { dispatchOpsAlert } from '../ops-alerts'
import { buildXAlertThread } from './content'
import {
  createXPost,
  type XCreatePostOptions,
  type XCreatePostResult,
  type XOAuthCredentials,
} from './x-client'
import type { XPublishQueueMessage } from './scheduler'
import { easternTimeParts } from './time'

const PUBLISH_LEASE_MS = 5 * 60 * 1000

type SocialOpsRepo = ReturnType<typeof makeSocialOpsRepo>
type SocialPublishRepo = Pick<
  SocialOpsRepo,
  | 'getPublishPayload'
  | 'markSending'
  | 'recordMainPost'
  | 'markPublished'
  | 'markFailed'
  | 'markUnknown'
  | 'cancelIfPulseIneligible'
>

export type XPublishConsumerResult =
  | { status: 'ignored' }
  | { status: 'cancelled'; runId: string }
  | {
      status: 'published'
      runId: string
      externalPostId: string
      replyPostId: string
    }
  | { status: 'failed'; runId: string; reason: string }
  | { status: 'unknown'; runId: string; reason: string }

export function isXPublishQueueMessage(value: unknown): value is XPublishQueueMessage {
  if (!isRecord(value)) return false
  return (
    value.type === 'social.x.publish' && typeof value.runId === 'string' && Boolean(value.runId)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
export async function consumeXPublish(
  message: XPublishQueueMessage,
  env: Env,
  dependencies: {
    repo?: SocialPublishRepo
    now?: Date
    createPost?: (
      text: string,
      credentials: XOAuthCredentials,
      options?: Pick<XCreatePostOptions, 'replyToPostId'>,
    ) => Promise<XCreatePostResult>
  } = {},
): Promise<XPublishConsumerResult> {
  const repo = dependencies.repo ?? makeSocialOpsRepo(createDb(env.DB))
  const now = dependencies.now ?? new Date()
  const payload = await repo.getPublishPayload(message.runId)
  if (!payload) return { status: 'ignored' }

  if (payload.runStatus === 'sending') {
    const reason = 'A previous X create attempt did not reach a durable terminal state.'
    await markAndAlertUnknown(repo, env, { runId: payload.runId, reason, now })
    return { status: 'unknown', runId: payload.runId, reason }
  }
  if (payload.runStatus !== 'queued') return { status: 'ignored' }

  const currentLocalDate = easternTimeParts(now).localDate
  if (!payload.xPostId && payload.localDate !== currentLocalDate) {
    const reason = `X publishing slot ${payload.localDate} expired before dispatch on ${currentLocalDate}.`
    await repo.markFailed({ runId: payload.runId, reason, now })
    return { status: 'failed', runId: payload.runId, reason }
  }

  if (!payload.xPostId) {
    const cancelled = await repo.cancelIfPulseIneligible(payload.postId, now)
    if (cancelled) return { status: 'cancelled', runId: payload.runId }
  }

  const claimed = await repo.markSending({
    runId: payload.runId,
    now,
    leaseExpiresAt: new Date(now.getTime() + PUBLISH_LEASE_MS),
  })
  if (!claimed) return { status: 'ignored' }

  if (env.X_POSTING_MODE !== 'live') {
    const reason = 'X live publishing is disabled.'
    if (payload.xPostId) {
      await markAndAlertUnknown(repo, env, { runId: payload.runId, reason, now })
      return { status: 'unknown', runId: payload.runId, reason }
    }
    await repo.markFailed({ runId: payload.runId, reason, now })
    return { status: 'failed', runId: payload.runId, reason }
  }

  if (!env.SOCIAL_OPS_TOKEN) {
    const reason = 'X live publishing is missing SOCIAL_OPS_TOKEN.'
    if (payload.xPostId) {
      await markAndAlertUnknown(repo, env, { runId: payload.runId, reason, now })
      return { status: 'unknown', runId: payload.runId, reason }
    }
    await repo.markFailed({ runId: payload.runId, reason, now })
    return { status: 'failed', runId: payload.runId, reason }
  }

  const credentials = xCredentials(env)
  if (!credentials) {
    const reason = 'X live publishing is missing OAuth credentials.'
    if (payload.xPostId) {
      await markAndAlertUnknown(repo, env, { runId: payload.runId, reason, now })
      return { status: 'unknown', runId: payload.runId, reason }
    }
    await repo.markFailed({ runId: payload.runId, reason, now })
    return { status: 'failed', runId: payload.runId, reason }
  }

  let thread: ReturnType<typeof buildXAlertThread>
  try {
    thread = buildXAlertThread(payload.postText, payload.targetUrl)
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : 'The frozen X thread payload is invalid.'
    if (payload.xPostId) {
      await markAndAlertUnknown(repo, env, { runId: payload.runId, reason, now })
      return { status: 'unknown', runId: payload.runId, reason }
    }
    await repo.markFailed({ runId: payload.runId, reason, now })
    return { status: 'failed', runId: payload.runId, reason }
  }

  const createPost = dependencies.createPost ?? createXPost
  let mainPostId = payload.xPostId
  if (!mainPostId) {
    let mainResult: XCreatePostResult
    try {
      mainResult = await createPost(thread.mainText, credentials)
    } catch (error) {
      const reason =
        error instanceof Error
          ? error.message
          : 'X main Post create failed before a response was classified.'
      await markAndAlertUnknown(repo, env, { runId: payload.runId, reason, now })
      return { status: 'unknown', runId: payload.runId, reason }
    }

    if (mainResult.kind === 'definite_failure') {
      await repo.markFailed({
        runId: payload.runId,
        reason: mainResult.reason,
        httpStatus: mainResult.httpStatus,
        now,
      })
      return { status: 'failed', runId: payload.runId, reason: mainResult.reason }
    }
    if (mainResult.kind === 'unknown') {
      await markAndAlertUnknown(repo, env, {
        runId: payload.runId,
        reason: mainResult.reason,
        ...(mainResult.httpStatus === undefined ? {} : { httpStatus: mainResult.httpStatus }),
        now,
      })
      return { status: 'unknown', runId: payload.runId, reason: mainResult.reason }
    }

    mainPostId = mainResult.externalPostId
    let mainPersisted = false
    try {
      mainPersisted = await repo.recordMainPost({
        runId: payload.runId,
        externalPostId: mainPostId,
        now,
      })
    } catch (error) {
      console.error(
        JSON.stringify({
          type: 'social.x.persist_main_post_failed',
          runId: payload.runId,
          externalPostId: mainPostId,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    }
    if (!mainPersisted) {
      const reason = `X created main Post ${mainPostId}, but its reply checkpoint was not persisted.`
      await markAndAlertUnknown(repo, env, { runId: payload.runId, reason, now })
      return { status: 'unknown', runId: payload.runId, reason }
    }

    const replyClaimed = await repo.markSending({
      runId: payload.runId,
      now,
      leaseExpiresAt: new Date(now.getTime() + PUBLISH_LEASE_MS),
    })
    if (!replyClaimed) {
      const reason = `X created main Post ${mainPostId}, but its link reply attempt was not claimed.`
      await markAndAlertUnknown(repo, env, { runId: payload.runId, reason, now })
      return { status: 'unknown', runId: payload.runId, reason }
    }
  }

  let replyResult: XCreatePostResult
  try {
    replyResult = await createPost(thread.replyText, credentials, { replyToPostId: mainPostId })
  } catch (error) {
    const reason =
      error instanceof Error
        ? error.message
        : `X link reply for main Post ${mainPostId} failed before a response was classified.`
    await markAndAlertUnknown(repo, env, { runId: payload.runId, reason, now })
    return { status: 'unknown', runId: payload.runId, reason }
  }

  if (replyResult.kind === 'published') {
    try {
      const persisted = await repo.markPublished({
        runId: payload.runId,
        externalPostId: mainPostId,
        replyPostId: replyResult.externalPostId,
        now,
      })
      if (persisted) {
        return {
          status: 'published',
          runId: payload.runId,
          externalPostId: mainPostId,
          replyPostId: replyResult.externalPostId,
        }
      }
    } catch (error) {
      console.error(
        JSON.stringify({
          type: 'social.x.persist_published_failed',
          runId: payload.runId,
          externalPostId: mainPostId,
          replyPostId: replyResult.externalPostId,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    }

    const reason = `X created main Post ${mainPostId} and link reply ${replyResult.externalPostId}, but their terminal state was not persisted.`
    await markAndAlertUnknown(repo, env, { runId: payload.runId, reason, now })
    return { status: 'unknown', runId: payload.runId, reason }
  }

  const replyReason =
    replyResult.kind === 'definite_failure'
      ? `X created main Post ${mainPostId}, but its DueDateHQ link reply was rejected: ${replyResult.reason}`
      : `X created main Post ${mainPostId}, but its DueDateHQ link reply is ambiguous: ${replyResult.reason}`
  await markAndAlertUnknown(repo, env, {
    runId: payload.runId,
    reason: replyReason,
    ...(replyResult.httpStatus === undefined ? {} : { httpStatus: replyResult.httpStatus }),
    now,
  })
  return { status: 'unknown', runId: payload.runId, reason: replyReason }
}

export async function markXPublishDeadLetter(
  message: XPublishQueueMessage,
  env: Env,
  dependencies: { repo?: SocialPublishRepo; now?: Date } = {},
): Promise<boolean> {
  const repo = dependencies.repo ?? makeSocialOpsRepo(createDb(env.DB))
  const now = dependencies.now ?? new Date()
  const reason = 'Social publish queue delivery exhausted without a durable terminal state.'
  return markAndAlertUnknown(
    repo,
    env,
    { runId: message.runId, reason, now },
    'social.queue.dead_letter',
  )
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

async function markAndAlertUnknown(
  repo: SocialPublishRepo,
  env: Env,
  input: { runId: string; reason: string; httpStatus?: number; now: Date },
  alertName = 'social.x.publish_unknown',
): Promise<boolean> {
  const transitioned = await repo.markUnknown(input)
  const fields = {
    runId: input.runId,
    reason: input.reason,
    httpStatus: input.httpStatus ?? null,
  }
  console.warn(JSON.stringify({ type: 'social.alert', name: alertName, transitioned, ...fields }))
  await dispatchOpsAlert(env, alertName, { transitioned, ...fields })
  return transitioned
}
