import { makeSocialOpsRepo, type SocialAlertPost, type SocialAlertPriority } from '@duedatehq/db'
import { buildXAlertPost, validateSocialCandidate, type SocialAlertCandidate } from './content'

const SOCIAL_DRAFT_BUFFER_CANDIDATE_LIMIT = 100
const MAX_SOCIAL_DRAFT_BUFFER_SIZE = 14

export type XDraftBufferRepo = Pick<
  ReturnType<typeof makeSocialOpsRepo>,
  'listEligibleCandidates' | 'listDraftPostsForQueuePreview' | 'createDraftIfBufferBelow'
>

export interface FillXDraftBufferInput {
  repo: XDraftBufferRepo
  appUrl: string
  since: Date
  now: Date
  bufferSize: number
  randomRefToken?: () => string
  priorityForCandidate?: (candidate: SocialAlertCandidate) => SocialAlertPriority
}

export interface XDraftBufferFillResult {
  requested: number
  existing: number
  created: number
  total: number
  targetReached: boolean
  bufferFull: boolean
  skipped: number
  posts: SocialAlertPost[]
}

export async function fillXDraftBuffer(
  input: FillXDraftBufferInput,
): Promise<XDraftBufferFillResult> {
  if (
    !Number.isInteger(input.bufferSize) ||
    input.bufferSize < 1 ||
    input.bufferSize > MAX_SOCIAL_DRAFT_BUFFER_SIZE ||
    Number.isNaN(input.since.getTime()) ||
    Number.isNaN(input.now.getTime())
  ) {
    throw new Error('X draft buffer requires valid dates and a target from 1 to 14.')
  }

  const existingDrafts = await input.repo.listDraftPostsForQueuePreview({
    channel: 'x',
    limit: input.bufferSize,
  })
  const posts: SocialAlertPost[] = []
  const randomRefToken = input.randomRefToken ?? (() => crypto.randomUUID().replaceAll('-', ''))
  const priorityForCandidate = input.priorityForCandidate ?? (() => 'normal')
  let skipped = 0
  let bufferFull = existingDrafts.length >= input.bufferSize
  let before: { createdAt: Date; pulseId: string } | undefined

  while (!bufferFull && existingDrafts.length + posts.length < input.bufferSize) {
    // eslint-disable-next-line no-await-in-loop -- the cursor depends on the prior candidate page.
    const candidatePage = await input.repo.listEligibleCandidates({
      channel: 'x',
      since: input.since,
      now: input.now,
      limit: SOCIAL_DRAFT_BUFFER_CANDIDATE_LIMIT,
      ...(before ? { before } : {}),
    })
    const candidates = candidatePage.toSorted(
      (left, right) =>
        right.createdAt.getTime() - left.createdAt.getTime() ||
        right.pulseId.localeCompare(left.pulseId),
    )
    if (candidates.length === 0) break

    for (const candidate of candidates) {
      if (existingDrafts.length + posts.length >= input.bufferSize) break
      const validation = validateSocialCandidate(candidate)
      if (!validation.eligible) {
        skipped += 1
        continue
      }

      const refToken = randomRefToken()
      const built = buildXAlertPost(candidate, { appUrl: input.appUrl, refToken })
      // Keep creation sequential so the returned prefix matches durable D1 state.
      // eslint-disable-next-line no-await-in-loop
      const result = await input.repo.createDraftIfBufferBelow({
        channel: 'x',
        pulseId: candidate.pulseId,
        refToken,
        postText: built.text,
        targetUrl: built.targetUrl,
        teaser: built.teaser,
        agency: built.agency,
        priority: priorityForCandidate(candidate),
        since: input.since,
        bufferSize: input.bufferSize,
        now: input.now,
      })
      if (result.status === 'created') {
        posts.push(result.post)
      } else if (result.status === 'buffer_full') {
        bufferFull = true
        break
      }
    }

    if (bufferFull || candidates.length < SOCIAL_DRAFT_BUFFER_CANDIDATE_LIMIT) break
    const lastCandidate = candidates.at(-1)
    if (!lastCandidate) break
    before = { createdAt: lastCandidate.createdAt, pulseId: lastCandidate.pulseId }
  }

  const finalDrafts = await input.repo.listDraftPostsForQueuePreview({
    channel: 'x',
    limit: input.bufferSize,
  })
  const total = finalDrafts.length
  const targetReached = total >= input.bufferSize
  return {
    requested: input.bufferSize,
    existing: existingDrafts.length,
    created: posts.length,
    total,
    targetReached,
    bufferFull: bufferFull || targetReached,
    skipped,
    posts,
  }
}
