import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  buildDraftReviewComment,
  draftCommentMarker,
  selectUnmirroredDrafts,
  syncXDraftReviewIssue,
  X_DRAFT_REVIEW_ISSUE_MARKER,
  X_DRAFT_REVIEW_ISSUE_TITLE,
} from './social-x-github-review.mjs'

const ENV = {
  SOCIAL_OPS_URL: 'https://app.duedatehq.com',
  SOCIAL_OPS_TOKEN: 'social-secret-value',
  GITHUB_TOKEN: 'github-secret-value',
  GITHUB_REPOSITORY: 'langgenius/due-date-hq-jwl',
  GITHUB_API_URL: 'https://api.github.test',
}

const QUEUE = {
  fromLocalDate: '2026-07-24',
  timeZone: 'America/New_York',
  drafts: [
    {
      projectedLocalDate: null,
      reason: 'approval_required',
      post: {
        id: 'post-1',
        pulseId: 'pulse-1',
        postText:
          'Internal Revenue Service · Federal alert\n\nReview in DueDateHQ: https://example.com',
        createdAt: '2026-07-23T13:00:00.000Z',
        updatedAt: '2026-07-23T13:00:00.000Z',
        pulseCreatedAt: '2026-07-23T12:00:00.000Z',
      },
    },
  ],
}

const ISSUE = {
  number: 42,
  title: X_DRAFT_REVIEW_ISSUE_TITLE,
  body: X_DRAFT_REVIEW_ISSUE_MARKER,
  state: 'open',
  html_url: 'https://github.test/langgenius/due-date-hq-jwl/issues/42',
}
const WORKFLOW = readFileSync(
  new URL('../.github/workflows/x-draft-review.yml', import.meta.url),
  'utf8',
)

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('X draft GitHub review mirror', () => {
  it('renders exact public copy with an idempotency marker and approval command', () => {
    const comment = buildDraftReviewComment(QUEUE.drafts[0], QUEUE)

    assert.match(comment, new RegExp(draftCommentMarker('post-1', '2026-07-23T13:00:00.000Z'), 'u'))
    assert.match(comment, /```\nInternal Revenue Service · Federal alert/u)
    assert.match(comment, /2026-07-24 09:00 America\/New_York/u)
    assert.match(comment, /pnpm social:x -- approve 'post-1'/u)
    assert.doesNotMatch(comment, /pulse-1/u)
  })

  it('contains Markdown and mentions inside a non-executable code fence', () => {
    const comment = buildDraftReviewComment(
      {
        ...QUEUE.drafts[0],
        post: {
          ...QUEUE.drafts[0].post,
          postText: '@someone\n```not a closing fence',
        },
      },
      QUEUE,
    )

    assert.match(comment, /````\n@someone\n```not a closing fence\n````/u)
  })

  it('creates the stable issue and one comment for an unseen draft', async () => {
    const calls = []
    const fetchImpl = async (input, init = {}) => {
      const url = new URL(String(input))
      const method = init.method ?? 'GET'
      calls.push({ url, method, headers: new Headers(init.headers), body: init.body })

      if (url.origin === 'https://app.duedatehq.com') return jsonResponse(QUEUE)
      if (url.pathname.endsWith('/issues') && method === 'GET') return jsonResponse([])
      if (url.pathname.endsWith('/issues') && method === 'POST') return jsonResponse(ISSUE, 201)
      if (url.pathname.endsWith('/issues/42/comments') && method === 'GET') {
        return jsonResponse([])
      }
      if (url.pathname.endsWith('/issues/42/comments') && method === 'POST') {
        return jsonResponse(
          { html_url: 'https://github.test/issuecomment-1', body: JSON.parse(init.body).body },
          201,
        )
      }
      throw new Error(`Unexpected request: ${method} ${url}`)
    }

    const result = await syncXDraftReviewIssue({ env: ENV, fetchImpl })

    assert.deepEqual(result, {
      issueNumber: 42,
      issueUrl: ISSUE.html_url,
      draftsSeen: 1,
      draftBacklogTruncated: false,
      commentsCreated: 1,
      commentUrls: ['https://github.test/issuecomment-1'],
    })
    assert.equal(calls.filter((call) => call.method === 'POST').length, 2)
    assert.equal(calls[0].headers.get('authorization'), `Bearer ${ENV.SOCIAL_OPS_TOKEN}`)
    assert.equal(calls.at(-1).headers.get('authorization'), `Bearer ${ENV.GITHUB_TOKEN}`)
    assert.ok(
      calls.every(
        (call) =>
          call.url.origin !== 'https://api.github.test' ||
          call.headers.get('authorization') === `Bearer ${ENV.GITHUB_TOKEN}`,
      ),
    )
    assert.ok(
      calls.every(
        (call) =>
          call.url.origin !== 'https://app.duedatehq.com' ||
          call.headers.get('authorization') === `Bearer ${ENV.SOCIAL_OPS_TOKEN}`,
      ),
    )
  })

  it('reopens the stable issue and does not duplicate an existing marked comment', async () => {
    const closedIssue = { ...ISSUE, state: 'closed' }
    const marker = draftCommentMarker('post-1', '2026-07-23T13:00:00.000Z')
    const calls = []
    const fetchImpl = async (input, init = {}) => {
      const url = new URL(String(input))
      const method = init.method ?? 'GET'
      calls.push({ url, method, body: init.body })

      if (url.origin === 'https://app.duedatehq.com') return jsonResponse(QUEUE)
      if (url.pathname.endsWith('/issues') && method === 'GET') {
        return jsonResponse([closedIssue])
      }
      if (url.pathname.endsWith('/issues/42') && method === 'PATCH') {
        return jsonResponse({ ...ISSUE, state: 'open' })
      }
      if (url.pathname.endsWith('/issues/42/comments') && method === 'GET') {
        return jsonResponse([{ body: `${marker}\nAlready mirrored` }])
      }
      throw new Error(`Unexpected request: ${method} ${url}`)
    }

    const result = await syncXDraftReviewIssue({ env: ENV, fetchImpl })

    assert.equal(result.commentsCreated, 0)
    assert.equal(calls.filter((call) => call.method === 'PATCH').length, 1)
    assert.equal(calls.filter((call) => call.method === 'POST').length, 0)
  })

  it('mirrors the same Post again when it returns to draft in a new revision', () => {
    const oldMarker = draftCommentMarker('post-1', '2026-07-23T12:30:00.000Z')

    assert.equal(
      selectUnmirroredDrafts(QUEUE.drafts, [{ body: `${oldMarker}\nOlder review revision` }])
        .length,
      1,
    )
  })

  it('fails closed without printing either credential', async () => {
    const fetchImpl = async () =>
      jsonResponse(
        {
          error: `${ENV.SOCIAL_OPS_TOKEN} ${ENV.GITHUB_TOKEN}`,
        },
        503,
      )

    await assert.rejects(syncXDraftReviewIssue({ env: ENV, fetchImpl }), (error) => {
      assert.equal(error.message, 'Social queue request failed (503).')
      assert.doesNotMatch(error.message, /social-secret-value|github-secret-value/u)
      return true
    })
  })

  it('validates every draft before creating or updating the public issue', async () => {
    const calls = []
    const fetchImpl = async (input, init = {}) => {
      const url = new URL(String(input))
      calls.push({ url, method: init.method ?? 'GET' })
      if (url.origin === 'https://app.duedatehq.com') {
        return jsonResponse({
          ...QUEUE,
          drafts: [
            {
              ...QUEUE.drafts[0],
              post: { ...QUEUE.drafts[0].post, postText: '' },
            },
          ],
        })
      }
      throw new Error('GitHub must not be called for an invalid queue payload')
    }

    await assert.rejects(
      syncXDraftReviewIssue({ env: ENV, fetchImpl }),
      /Queue draft post text is required/u,
    )
    assert.equal(calls.length, 1)
  })

  it('requires both short-lived GitHub auth and the Social Ops credential', async () => {
    await assert.rejects(
      syncXDraftReviewIssue({
        env: { ...ENV, GITHUB_TOKEN: '' },
        fetchImpl: async () => {
          throw new Error('fetch should not run')
        },
      }),
      /GITHUB_TOKEN is required/u,
    )
    await assert.rejects(
      syncXDraftReviewIssue({
        env: { ...ENV, SOCIAL_OPS_TOKEN: '' },
        fetchImpl: async () => {
          throw new Error('fetch should not run')
        },
      }),
      /SOCIAL_OPS_TOKEN is required/u,
    )
  })

  it('keeps the workflow on protected main-branch code with narrow repository permissions', () => {
    assert.match(WORKFLOW, /issues: write/u)
    assert.match(WORKFLOW, /environment: due-date-hq-staging/u)
    assert.match(WORKFLOW, /timezone: 'America\/New_York'/u)
    assert.match(WORKFLOW, /github\.ref == 'refs\/heads\/main'/u)
    assert.doesNotMatch(WORKFLOW, /^\s*pull_request(?:_target)?:/mu)
    assert.doesNotMatch(WORKFLOW, /pnpm social:x/u)
  })
})
