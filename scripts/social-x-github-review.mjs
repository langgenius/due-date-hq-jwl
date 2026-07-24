import process from 'node:process'
import { pathToFileURL } from 'node:url'

export const X_DRAFT_REVIEW_ISSUE_TITLE = 'X daily Alert draft review'
export const X_DRAFT_REVIEW_ISSUE_MARKER = '<!-- duedatehq-x-draft-review-issue -->'
const X_DRAFT_COMMENT_MARKER_PREFIX = 'duedatehq-x-draft:'
const X_APPROVED_COMMENT_MARKER_PREFIX = 'duedatehq-x-approved:'
const X_PUBLISHED_COMMENT_MARKER_PREFIX = 'duedatehq-x-published:'
const GITHUB_ACTIONS_BOT_LOGIN = 'github-actions[bot]'
const GITHUB_ACTIONS_BOT_TYPE = 'Bot'
const APPROVED_POST_STATUSES = new Set(['ready', 'scheduled', 'published', 'unknown', 'cancelled'])
const DEFAULT_GITHUB_API_URL = 'https://api.github.com'
const GITHUB_API_VERSION = '2022-11-28'

export function buildReviewIssueBody() {
  return [
    X_DRAFT_REVIEW_ISSUE_MARKER,
    '# X daily Alert draft review',
    '',
    'DueDateHQ mirrors automatically generated X Alert drafts into this public, indexable issue.',
    '',
    'Each bot comment contains only the exact public X copy, safe scheduling context, and the',
    'operator approval command. A comment is a review notification, not a reserved publication slot.',
    '',
    '- The draft must still be explicitly approved before it enters the `ready` queue.',
    '- A successful CLI approval queues this workflow to mark the same comment `approved · ready`.',
    '- After D1 confirms X publication, a later probe marks that same comment `published`.',
    '- Issue comments, reactions, labels, and closing this issue never approve or cancel a draft.',
    '- A newer approved Alert can move ahead of an older ready Post.',
    '- The exact tracked URL is shown inside a code block to avoid accidental GitHub clicks.',
    '- Never paste OAuth credentials, Social Ops tokens, firm data, client data, or email addresses.',
  ].join('\n')
}

export function draftCommentMarker(postId, updatedAt) {
  requiredSafePostId(postId)
  const revision = requiredDate(updatedAt, 'Queue draft update time').toISOString()
  return `<!-- ${X_DRAFT_COMMENT_MARKER_PREFIX}${postId}:${revision} -->`
}

export function approvedCommentMarker(postId, approvedAt) {
  requiredSafePostId(postId)
  const revision = requiredDate(approvedAt, 'Social Post approval time').toISOString()
  return `<!-- ${X_APPROVED_COMMENT_MARKER_PREFIX}${postId}:${revision} -->`
}

export function publishedCommentMarker(postId, publishedAt) {
  requiredSafePostId(postId)
  const revision = requiredDate(publishedAt, 'Social Post publication time').toISOString()
  return `<!-- ${X_PUBLISHED_COMMENT_MARKER_PREFIX}${postId}:${revision} -->`
}

export function buildDraftReviewComment(draft, queue) {
  if (draft?.reason !== 'approval_required') {
    throw new Error('Queue draft must require approval.')
  }
  const post = requiredObject(draft?.post, 'Queue draft post')
  const postId = requiredString(post.id, 'Queue draft post ID')
  const postText = requiredText(post.postText, 'Queue draft post text')
  const updatedAt = requiredDate(post.updatedAt, 'Queue draft update time')
  const fromLocalDate = requiredLocalDate(queue?.fromLocalDate)
  const timeZone = requiredString(queue?.timeZone, 'Queue time zone')
  const normalizedPostText = postText.replaceAll('\r\n', '\n').replaceAll('\r', '\n')
  const fence = markdownFenceFor(normalizedPostText)

  return [
    draftCommentMarker(postId, updatedAt.toISOString()),
    '## X Alert draft · approval required',
    '',
    `- Earliest queue horizon after approval: \`${fromLocalDate} 09:00 ${timeZone}\` or later`,
    '- Publication date: not reserved; the newest approved Alert is selected at the daily slot',
    '',
    '### Exact X post copy',
    '',
    fence,
    normalizedPostText,
    fence,
    '',
    '### Approve after review',
    '',
    'Requires `SOCIAL_OPS_REVIEWER` to be set to the approving Better Auth user ID.',
    '',
    '```bash',
    `pnpm social:x -- approve '${postId}'`,
    '```',
    '',
    '_This issue is public. Do not reply with credentials, tokens, or tenant data._',
  ].join('\n')
}

export function buildApprovedReviewComment(review, queue, previousDraftMarker) {
  const post = requiredObject(review?.post, 'Approved Social Post')
  if (!APPROVED_POST_STATUSES.has(post.status)) {
    throw new Error('Approved Social Post must have a post-approval status.')
  }
  const postId = requiredString(post.id, 'Approved Social Post ID')
  const postText = requiredText(post.postText, 'Approved Social Post text')
  const approvedAt = requiredDate(post.approvedAt, 'Social Post approval time')
  const isPublished = post.status === 'published'
  const publishedAt = isPublished
    ? requiredDate(post.publishedAt, 'Social Post publication time')
    : undefined
  const xPostId = isPublished ? requiredXPostId(post.xPostId) : undefined
  const projectedLocalDate = optionalLocalDate(review?.projectedLocalDate)
  const position = optionalPositiveInteger(review?.position, 'Queue position')
  const timeZone = requiredString(queue?.timeZone, 'Queue time zone')
  const normalizedPostText = postText.replaceAll('\r\n', '\n').replaceAll('\r', '\n')
  const fence = markdownFenceFor(normalizedPostText)
  const preservedMarker = previousDraftMarker
    ? requiredDraftMarker(previousDraftMarker, postId)
    : undefined
  const statusDetails = isPublished
    ? [
        '- Publishing status: ✅ `published` on X',
        `- X Post: [Open the published Post on X](https://x.com/i/web/status/${encodeURIComponent(
          xPostId,
        )})`,
        `- Approved at: \`${approvedAt.toISOString()}\``,
        `- Published at: \`${publishedAt.toISOString()}\``,
      ]
    : [
        approvalPublishingStatus(post.status),
        projectedLocalDate
          ? `- Current tentative slot: \`${projectedLocalDate} 09:00 ${timeZone}\``
          : '- Current tentative slot: not visible in the current 14-day projection',
        position
          ? `- Current queue position: \`${position}\`; a newer approved Alert can move ahead`
          : undefined,
        `- Approved at: \`${approvedAt.toISOString()}\``,
      ]

  return [
    preservedMarker,
    approvedCommentMarker(postId, approvedAt.toISOString()),
    publishedAt ? publishedCommentMarker(postId, publishedAt.toISOString()) : undefined,
    isPublished ? '## X Alert · published' : `## X Alert draft · approved · ${post.status}`,
    '',
    '- Review status: ✅ `approved`',
    ...statusDetails,
    '',
    '### Exact frozen X post copy',
    '',
    fence,
    normalizedPostText,
    fence,
    '',
    '_No further approval action is required. This issue is public; do not reply with credentials,',
    'tokens, reviewer details, or tenant data._',
  ]
    .filter((line) => line !== undefined)
    .join('\n')
}

export function selectUnmirroredDrafts(drafts, comments) {
  const existingBodies = comments
    .filter((comment) => isGitHubActionsBot(comment?.user))
    .map((comment) => (typeof comment?.body === 'string' ? comment.body : ''))
  const seenPostIds = new Set()

  return drafts.filter((draft) => {
    const post = requiredObject(draft?.post, 'Queue draft post')
    const postId = requiredString(post.id, 'Queue draft post ID')
    const updatedAt = requiredDate(post.updatedAt, 'Queue draft update time')
    const revisionKey = `${postId}:${updatedAt.toISOString()}`
    if (seenPostIds.has(revisionKey)) return false
    seenPostIds.add(revisionKey)
    const marker = draftCommentMarker(postId, updatedAt.toISOString())
    return !existingBodies.some((body) => body.includes(marker))
  })
}

export function planApprovedCommentSync(reviewRows, comments, queue, draftRevisionByPostId = {}) {
  const trustedComments = comments
    .filter((comment) => isGitHubActionsBot(comment?.user))
    .toSorted((left, right) => requiredCommentId(left) - requiredCommentId(right))
  const seenPostIds = new Set()
  const plans = []

  for (const review of reviewRows) {
    const post = requiredObject(review?.post, 'Approved Social Post')
    const postId = requiredString(post.id, 'Approved Social Post ID')
    const approvedAt = requiredDate(post.approvedAt, 'Social Post approval time')
    if (seenPostIds.has(postId)) continue
    seenPostIds.add(postId)

    const approvalMarker = approvedCommentMarker(postId, approvedAt.toISOString())
    const stateMarker =
      post.status === 'published'
        ? publishedCommentMarker(postId, post.publishedAt)
        : approvalMarker
    if (trustedComments.some((comment) => comment.body?.includes(stateMarker))) continue

    const exactDraftRevision = draftRevisionByPostId[postId]
    const matchingComments = exactDraftRevision
      ? trustedComments.filter((comment) =>
          comment.body?.includes(draftCommentMarker(postId, exactDraftRevision)),
        )
      : trustedComments.filter(
          (comment) =>
            comment.body?.includes(approvalMarker) || draftMarkerFromBody(comment.body, postId),
        )
    const existingComment = matchingComments.at(-1)
    const previousDraftMarker = existingComment
      ? draftMarkerFromBody(existingComment.body, postId)
      : undefined
    const body = buildApprovedReviewComment(review, queue, previousDraftMarker)
    if (!existingComment && review?.existingCommentRequired === true) continue

    plans.push(
      existingComment
        ? {
            kind: 'update',
            commentId: requiredCommentId(existingComment),
            body,
            htmlUrl: existingComment.html_url,
          }
        : { kind: 'create', body },
    )
  }

  return plans
}

export async function syncXDraftReviewIssue({ env = process.env, fetchImpl = fetch } = {}) {
  const socialOpsUrl = requiredString(env.SOCIAL_OPS_URL, 'SOCIAL_OPS_URL')
  const socialOpsToken = requiredString(env.SOCIAL_OPS_TOKEN, 'SOCIAL_OPS_TOKEN')
  const githubToken = requiredString(env.GITHUB_TOKEN, 'GITHUB_TOKEN')
  const repository = parseRepository(requiredString(env.GITHUB_REPOSITORY, 'GITHUB_REPOSITORY'))
  const githubApiUrl = (env.GITHUB_API_URL?.trim() || DEFAULT_GITHUB_API_URL).replace(/\/+$/u, '')
  const targetPostId = env.SOCIAL_POST_ID?.trim()
  const targetDraftUpdatedAt = env.SOCIAL_DRAFT_UPDATED_AT?.trim()
  if (Boolean(targetPostId) !== Boolean(targetDraftUpdatedAt)) {
    throw new Error('Target Post ID and draft update time must be provided together.')
  }
  if (targetPostId) {
    requiredSafePostId(targetPostId)
    requiredDate(targetDraftUpdatedAt, 'Target draft update time')
  }

  const queueUrl = new URL('/api/ops/social/queue', socialOpsUrl)
  queueUrl.searchParams.set('includePublished', 'true')
  const queue = await requestJson(
    fetchImpl,
    queueUrl,
    {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${socialOpsToken}`,
      },
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    },
    'Social queue request',
  )
  const queuePayload = requiredObject(queue, 'Social queue response')
  const drafts = Array.isArray(queuePayload.drafts) ? queuePayload.drafts : null
  const readyRows = Array.isArray(queuePayload.ready) ? queuePayload.ready : null
  const publishedPosts =
    queuePayload.published === undefined
      ? []
      : Array.isArray(queuePayload.published)
        ? queuePayload.published
        : null
  if (!drafts) throw new Error('Social queue response is missing drafts.')
  if (!readyRows) throw new Error('Social queue response is missing ready Posts.')
  if (!publishedPosts) throw new Error('Social queue response has invalid published Posts.')
  const publishedRows = publishedPosts.map((post) => ({
    existingCommentRequired: true,
    post,
  }))
  for (const draft of drafts) buildDraftReviewComment(draft, queuePayload)
  for (const ready of readyRows) buildApprovedReviewComment(ready, queuePayload)
  for (const published of publishedRows) buildApprovedReviewComment(published, queuePayload)

  let targetedReview
  if (targetPostId) {
    const targetUrl = new URL(
      `/api/ops/social/${encodeURIComponent(targetPostId)}/review-status`,
      socialOpsUrl,
    )
    const targetedPayload = requiredObject(
      await requestJson(
        fetchImpl,
        targetUrl,
        {
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${socialOpsToken}`,
          },
          redirect: 'error',
          signal: AbortSignal.timeout(15_000),
        },
        'Social Post review status request',
      ),
      'Social Post review status response',
    )
    const targetedPost = requiredObject(
      targetedPayload.post,
      'Social Post review status response Post',
    )
    if (targetedPost.id !== targetPostId) {
      throw new Error('Social Post review status returned the wrong Post.')
    }
    const projected = readyRows.find((ready) => ready?.post?.id === targetPostId)
    targetedReview = {
      ...(projected
        ? {
            projectedLocalDate: projected.projectedLocalDate,
            position: projected.position,
          }
        : {}),
      post: targetedPost,
    }
    buildApprovedReviewComment(targetedReview, queuePayload)
  }

  const github = githubClient({
    apiUrl: githubApiUrl,
    token: githubToken,
    repository,
    fetchImpl,
  })
  const issue = await ensureReviewIssue(github)
  const comments = await github.listIssueComments(issue.number)
  const reviewRows = targetedReview
    ? [
        targetedReview,
        ...publishedRows.filter((published) => published?.post?.id !== targetPostId),
        ...readyRows.filter((ready) => ready?.post?.id !== targetPostId),
      ]
    : [...publishedRows, ...readyRows]
  const draftRevisionByPostId = targetPostId
    ? {
        [targetPostId]: requiredDate(
          targetDraftUpdatedAt,
          'Target draft update time',
        ).toISOString(),
      }
    : {}
  const approvedPlans = planApprovedCommentSync(
    reviewRows,
    comments,
    queuePayload,
    draftRevisionByPostId,
  )
  const pendingDrafts = selectUnmirroredDrafts(drafts, comments)
  const createdComments = []
  const updatedComments = []

  for (const plan of approvedPlans) {
    // Keep mutations serialized to make reruns deterministic and gentle on
    // GitHub's secondary rate limit.
    let comment
    if (plan.kind === 'update') {
      // eslint-disable-next-line no-await-in-loop
      comment = await github.updateIssueComment(plan.commentId, plan.body)
    } else {
      // eslint-disable-next-line no-await-in-loop
      comment = await github.createIssueComment(issue.number, plan.body)
    }
    if (plan.kind === 'update') updatedComments.push(comment)
    else createdComments.push(comment)
  }

  for (const draft of pendingDrafts) {
    // Serialized comments plus workflow-level concurrency keep issue notifications
    // stable and avoid GitHub secondary-rate-limit bursts.
    // eslint-disable-next-line no-await-in-loop
    const comment = await github.createIssueComment(
      issue.number,
      buildDraftReviewComment(draft, queuePayload),
    )
    createdComments.push(comment)
  }

  return {
    issueNumber: issue.number,
    issueUrl: issue.html_url,
    draftsSeen: drafts.length,
    approvedSeen: reviewRows.length,
    publishedSeen: publishedRows.length,
    draftBacklogTruncated: queuePayload.draftBacklogTruncated === true,
    commentsCreated: createdComments.length,
    commentsUpdated: updatedComments.length,
    commentUrls: createdComments.map((comment) => comment.html_url),
    updatedCommentUrls: updatedComments.map((comment) => comment.html_url),
  }
}

async function ensureReviewIssue(github) {
  const issues = await github.listIssues()
  let issue = issues.find(
    (candidate) =>
      !candidate.pull_request &&
      isGitHubActionsBot(candidate.user) &&
      candidate.body?.includes(X_DRAFT_REVIEW_ISSUE_MARKER),
  )

  if (!issue) {
    return github.createIssue({
      title: X_DRAFT_REVIEW_ISSUE_TITLE,
      body: buildReviewIssueBody(),
    })
  }

  if (issue.state !== 'open' || !issue.body?.includes(X_DRAFT_REVIEW_ISSUE_MARKER)) {
    issue = await github.updateIssue(issue.number, {
      state: 'open',
      body: issue.body?.includes(X_DRAFT_REVIEW_ISSUE_MARKER)
        ? issue.body
        : [issue.body?.trim(), X_DRAFT_REVIEW_ISSUE_MARKER].filter(Boolean).join('\n\n'),
    })
  }
  return issue
}

function githubClient({ apiUrl, token, repository, fetchImpl }) {
  const repositoryPath = `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(
    repository.name,
  )}`
  const request = (path, init, label) =>
    requestJson(
      fetchImpl,
      `${apiUrl}${path}`,
      {
        ...init,
        headers: {
          accept: 'application/vnd.github+json',
          authorization: `Bearer ${token}`,
          'user-agent': 'DueDateHQ-X-Draft-Review',
          'x-github-api-version': GITHUB_API_VERSION,
          ...init?.headers,
        },
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
      },
      label,
    )

  const paginate = async (path, query, label) => {
    const rows = []
    for (let page = 1; ; page += 1) {
      const url = new URL(`${apiUrl}${path}`)
      for (const [key, value] of Object.entries({
        ...query,
        page: String(page),
        per_page: '100',
      })) {
        url.searchParams.set(key, value)
      }
      // eslint-disable-next-line no-await-in-loop
      const payload = await request(url.pathname + url.search, { method: 'GET' }, label)
      if (!Array.isArray(payload)) throw new Error(`${label} did not return a list.`)
      rows.push(...payload)
      if (payload.length < 100) return rows
    }
  }

  return {
    listIssues: () => paginate(`${repositoryPath}/issues`, { state: 'all' }, 'GitHub issue list'),
    createIssue: (body) =>
      request(
        `${repositoryPath}/issues`,
        { method: 'POST', body: JSON.stringify(body) },
        'GitHub issue creation',
      ),
    updateIssue: (issueNumber, body) =>
      request(
        `${repositoryPath}/issues/${issueNumber}`,
        { method: 'PATCH', body: JSON.stringify(body) },
        'GitHub issue update',
      ),
    listIssueComments: (issueNumber) =>
      paginate(`${repositoryPath}/issues/${issueNumber}/comments`, {}, 'GitHub issue comment list'),
    createIssueComment: (issueNumber, body) =>
      request(
        `${repositoryPath}/issues/${issueNumber}/comments`,
        { method: 'POST', body: JSON.stringify({ body }) },
        'GitHub issue comment creation',
      ),
    updateIssueComment: (commentId, body) =>
      request(
        `${repositoryPath}/issues/comments/${commentId}`,
        { method: 'PATCH', body: JSON.stringify({ body }) },
        'GitHub issue comment update',
      ),
  }
}

async function requestJson(fetchImpl, url, init, label) {
  let response
  try {
    response = await fetchImpl(url, init)
  } catch (error) {
    const cause = error instanceof Error ? error.cause : undefined
    const code =
      cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : undefined
    throw new Error(`${label} could not connect${code ? ` (${code})` : ''}.`, { cause: error })
  }

  const text = await response.text()
  let payload = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    throw new Error(`${label} returned invalid JSON (${response.status}).`)
  }
  if (!response.ok) throw new Error(`${label} failed (${response.status}).`)
  return payload
}

function parseRepository(value) {
  const match = /^([^/\s]+)\/([^/\s]+)$/u.exec(value)
  if (!match) throw new Error('GITHUB_REPOSITORY must use owner/name.')
  return { owner: match[1], name: match[2] }
}

function requiredString(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`)
  return value.trim()
}

function requiredText(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`)
  return value
}

function requiredSafePostId(value) {
  const postId = requiredString(value, 'Social Post ID')
  if (!/^[A-Za-z0-9_-]{1,200}$/u.test(postId)) {
    throw new Error('A safe social Post ID is required for the GitHub comment marker.')
  }
  return postId
}

function requiredXPostId(value) {
  const xPostId = requiredString(value, 'X Post ID')
  if (!/^\d{1,30}$/u.test(xPostId)) {
    throw new Error('X Post ID must contain only decimal digits.')
  }
  return xPostId
}

function requiredObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`)
  }
  return value
}

function requiredPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) throw new Error(`${label} must be positive.`)
  return value
}

function optionalPositiveInteger(value, label) {
  if (value === undefined || value === null) return undefined
  return requiredPositiveInteger(value, label)
}

function requiredCommentId(comment) {
  return requiredPositiveInteger(comment?.id, 'GitHub comment ID')
}

function isGitHubActionsBot(user) {
  return user?.login === GITHUB_ACTIONS_BOT_LOGIN && user?.type === GITHUB_ACTIONS_BOT_TYPE
}

function requiredDraftMarker(marker, postId) {
  if (typeof marker !== 'string' || draftMarkerFromBody(marker, postId) !== marker) {
    throw new Error('The preserved GitHub draft marker is invalid.')
  }
  return marker
}

function draftMarkerFromBody(body, postId) {
  if (typeof body !== 'string') return undefined
  requiredSafePostId(postId)
  const prefix = `<!-- ${X_DRAFT_COMMENT_MARKER_PREFIX}${postId}:`
  const marker = body.split('\n').find((line) => line.startsWith(prefix) && line.endsWith(' -->'))
  if (!marker) return undefined
  const revision = marker.slice(prefix.length, -' -->'.length)
  const parsed = requiredDate(revision, 'GitHub draft marker revision').toISOString()
  return marker === `${prefix}${parsed} -->` ? marker : undefined
}

function requiredDate(value, label) {
  const date = new Date(requiredString(value, label))
  if (Number.isNaN(date.getTime())) throw new Error(`${label} must be a valid date.`)
  return date
}

function requiredLocalDate(value) {
  const localDate = requiredString(value, 'Queue start date')
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(localDate)) {
    throw new Error('Queue start date must use YYYY-MM-DD.')
  }
  return localDate
}

function optionalLocalDate(value) {
  if (value === undefined || value === null) return undefined
  return requiredLocalDate(value)
}

function approvalPublishingStatus(status) {
  if (status === 'ready') return '- Publishing status: `ready` for the daily scheduler'
  if (status === 'scheduled') return '- Publishing status: `scheduled` for X delivery'
  if (status === 'published') return '- Publishing status: `published` on X'
  if (status === 'unknown')
    return '- Publishing status: `unknown`; operator reconciliation required'
  return '- Publishing status: `cancelled` after approval'
}

function markdownFenceFor(value) {
  const runs = value.match(/`+/gu) ?? []
  const longestRun = runs.reduce((longest, run) => Math.max(longest, run.length), 0)
  return '`'.repeat(Math.max(3, longestRun + 1))
}

async function main() {
  const result = await syncXDraftReviewIssue()
  if (result.draftBacklogTruncated) {
    console.warn('The queue draft view is truncated; only its newest visible slice was mirrored.')
  }
  console.log(JSON.stringify(result, null, 2))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
