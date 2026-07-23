import process from 'node:process'
import { pathToFileURL } from 'node:url'

export const X_DRAFT_REVIEW_ISSUE_TITLE = 'X daily Alert draft review'
export const X_DRAFT_REVIEW_ISSUE_MARKER = '<!-- duedatehq-x-draft-review-issue -->'
const X_DRAFT_COMMENT_MARKER_PREFIX = 'duedatehq-x-draft:'
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
    '- Issue comments, reactions, labels, and closing this issue never approve or cancel a draft.',
    '- A newer approved Alert can move ahead of an older ready Post.',
    '- The exact tracked URL is shown inside a code block to avoid accidental GitHub clicks.',
    '- Never paste OAuth credentials, Social Ops tokens, firm data, client data, or email addresses.',
  ].join('\n')
}

export function draftCommentMarker(postId, updatedAt) {
  if (!/^[A-Za-z0-9_-]{1,200}$/u.test(postId)) {
    throw new Error('A safe social Post ID is required for the GitHub comment marker.')
  }
  const revision = requiredDate(updatedAt, 'Queue draft update time').toISOString()
  return `<!-- ${X_DRAFT_COMMENT_MARKER_PREFIX}${postId}:${revision} -->`
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
    '```bash',
    `pnpm social:x -- approve '${postId}'`,
    '```',
    '',
    '_This issue is public. Do not reply with credentials, tokens, or tenant data._',
  ].join('\n')
}

export function selectUnmirroredDrafts(drafts, comments) {
  const existingBodies = comments.map((comment) =>
    typeof comment?.body === 'string' ? comment.body : '',
  )
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

export async function syncXDraftReviewIssue({ env = process.env, fetchImpl = fetch } = {}) {
  const socialOpsUrl = requiredString(env.SOCIAL_OPS_URL, 'SOCIAL_OPS_URL')
  const socialOpsToken = requiredString(env.SOCIAL_OPS_TOKEN, 'SOCIAL_OPS_TOKEN')
  const githubToken = requiredString(env.GITHUB_TOKEN, 'GITHUB_TOKEN')
  const repository = parseRepository(requiredString(env.GITHUB_REPOSITORY, 'GITHUB_REPOSITORY'))
  const githubApiUrl = (env.GITHUB_API_URL?.trim() || DEFAULT_GITHUB_API_URL).replace(/\/+$/u, '')

  const queueUrl = new URL('/api/ops/social/queue', socialOpsUrl)
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
  if (!drafts) throw new Error('Social queue response is missing drafts.')
  for (const draft of drafts) buildDraftReviewComment(draft, queuePayload)

  const github = githubClient({
    apiUrl: githubApiUrl,
    token: githubToken,
    repository,
    fetchImpl,
  })
  const issue = await ensureReviewIssue(github)
  const comments = await github.listIssueComments(issue.number)
  const pendingDrafts = selectUnmirroredDrafts(drafts, comments)
  const createdComments = []

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
    draftBacklogTruncated: queuePayload.draftBacklogTruncated === true,
    commentsCreated: createdComments.length,
    commentUrls: createdComments.map((comment) => comment.html_url),
  }
}

async function ensureReviewIssue(github) {
  const issues = await github.listIssues()
  let issue = issues.find(
    (candidate) => !candidate.pull_request && candidate.body?.includes(X_DRAFT_REVIEW_ISSUE_MARKER),
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

function requiredObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`)
  }
  return value
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
