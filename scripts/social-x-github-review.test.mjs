import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  approvedCommentMarker,
  buildApprovedReviewComment,
  buildDraftReviewComment,
  draftCommentMarker,
  planApprovedCommentSync,
  publishedCommentMarker,
  selectUnmirroredDrafts,
  syncXDraftReviewIssue,
  X_DRAFT_REVIEW_ISSUE_MARKER,
  X_DRAFT_REVIEW_ISSUE_TITLE,
} from './social-x-github-review.mjs'

const BOT = { login: 'github-actions[bot]', type: 'Bot' }
const ENV = {
  SOCIAL_OPS_URL: 'https://app.duedatehq.com',
  SOCIAL_OPS_TOKEN: 'social-secret-value',
  GITHUB_TOKEN: 'github-secret-value',
  GITHUB_REPOSITORY: 'langgenius/due-date-hq-jwl',
  GITHUB_API_URL: 'https://api.github.test',
}

const DRAFT_POST = {
  id: 'post-1',
  pulseId: 'pulse-1',
  status: 'draft',
  postText: 'Internal Revenue Service · Federal alert\n\nReview: https://example.com',
  createdAt: '2026-07-23T13:00:00.000Z',
  updatedAt: '2026-07-23T13:00:00.000Z',
  pulseCreatedAt: '2026-07-23T12:00:00.000Z',
}
const READY_POST = {
  ...DRAFT_POST,
  status: 'ready',
  postText: 'Final frozen X copy\n\nReview: https://example.com/final',
  approvedAt: '2026-07-23T14:00:00.000Z',
  readyAt: '2026-07-23T14:00:00.000Z',
  updatedAt: '2026-07-23T14:00:00.000Z',
}
const PUBLISHED_POST = {
  ...READY_POST,
  status: 'published',
  xPostId: '2012345678901234567',
  publishedAt: '2026-07-24T13:00:03.000Z',
  updatedAt: '2026-07-24T13:00:03.000Z',
}
const DRAFT = {
  projectedLocalDate: null,
  reason: 'approval_required',
  post: DRAFT_POST,
}
const READY = {
  position: 1,
  projectedLocalDate: '2026-07-24',
  projectedAt: '2026-07-24T13:00:00.000Z',
  post: READY_POST,
}
const PUBLISHED = {
  existingCommentRequired: true,
  post: PUBLISHED_POST,
}
const QUEUE = {
  fromLocalDate: '2026-07-24',
  timeZone: 'America/New_York',
  ready: [],
  drafts: [DRAFT],
}
const ISSUE = {
  number: 42,
  title: X_DRAFT_REVIEW_ISSUE_TITLE,
  body: X_DRAFT_REVIEW_ISSUE_MARKER,
  state: 'open',
  user: BOT,
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

function botComment(body, id = 500) {
  return {
    id,
    body,
    user: BOT,
    html_url: `https://github.test/issuecomment-${id}`,
  }
}

describe('X draft GitHub review mirror', () => {
  it('renders exact public copy with an idempotency marker and reviewer prerequisite', () => {
    const comment = buildDraftReviewComment(DRAFT, QUEUE)

    assert.match(comment, new RegExp(draftCommentMarker('post-1', DRAFT_POST.updatedAt), 'u'))
    assert.match(comment, /```\nInternal Revenue Service · Federal alert/u)
    assert.match(comment, /2026-07-24 09:00 America\/New_York/u)
    assert.match(comment, /SOCIAL_OPS_REVIEWER/u)
    assert.match(comment, /pnpm social:x -- approve 'post-1'/u)
    assert.doesNotMatch(comment, /pulse-1/u)
  })

  it('contains Markdown and mentions inside a non-executable code fence', () => {
    const comment = buildDraftReviewComment(
      {
        ...DRAFT,
        post: {
          ...DRAFT_POST,
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
          { ...botComment(JSON.parse(init.body).body, 501), body: JSON.parse(init.body).body },
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
      approvedSeen: 0,
      publishedSeen: 0,
      draftBacklogTruncated: false,
      commentsCreated: 1,
      commentsUpdated: 0,
      commentUrls: ['https://github.test/issuecomment-501'],
      updatedCommentUrls: [],
    })
    assert.equal(calls.filter((call) => call.method === 'POST').length, 2)
    assert.equal(calls[0].headers.get('authorization'), `Bearer ${ENV.SOCIAL_OPS_TOKEN}`)
    assert.equal(calls.at(-1).headers.get('authorization'), `Bearer ${ENV.GITHUB_TOKEN}`)
  })

  it('reopens the bot-owned stable issue and does not duplicate a marked draft', async () => {
    const closedIssue = { ...ISSUE, state: 'closed' }
    const marker = draftCommentMarker('post-1', DRAFT_POST.updatedAt)
    const calls = []
    const fetchImpl = async (input, init = {}) => {
      const url = new URL(String(input))
      const method = init.method ?? 'GET'
      calls.push({ url, method })

      if (url.origin === 'https://app.duedatehq.com') return jsonResponse(QUEUE)
      if (url.pathname.endsWith('/issues') && method === 'GET') {
        return jsonResponse([closedIssue])
      }
      if (url.pathname.endsWith('/issues/42') && method === 'PATCH') {
        return jsonResponse({ ...ISSUE, state: 'open' })
      }
      if (url.pathname.endsWith('/issues/42/comments') && method === 'GET') {
        return jsonResponse([botComment(`${marker}\nAlready mirrored`)])
      }
      throw new Error(`Unexpected request: ${method} ${url}`)
    }

    const result = await syncXDraftReviewIssue({ env: ENV, fetchImpl })

    assert.equal(result.commentsCreated, 0)
    assert.equal(calls.filter((call) => call.method === 'PATCH').length, 1)
    assert.equal(calls.filter((call) => call.method === 'POST').length, 0)
  })

  it('does not trust a public user who copies the stable Issue marker', async () => {
    const attackerIssue = {
      ...ISSUE,
      number: 99,
      user: { login: 'attacker', type: 'User' },
    }
    const calls = []
    const fetchImpl = async (input, init = {}) => {
      const url = new URL(String(input))
      const method = init.method ?? 'GET'
      calls.push({ url, method })

      if (url.origin === 'https://app.duedatehq.com') {
        return jsonResponse({ ...QUEUE, drafts: [], ready: [] })
      }
      if (url.pathname.endsWith('/issues') && method === 'GET') {
        return jsonResponse([attackerIssue])
      }
      if (url.pathname.endsWith('/issues') && method === 'POST') {
        return jsonResponse(ISSUE, 201)
      }
      if (url.pathname.endsWith('/issues/42/comments') && method === 'GET') {
        return jsonResponse([])
      }
      throw new Error(`Unexpected request: ${method} ${url}`)
    }

    const result = await syncXDraftReviewIssue({ env: ENV, fetchImpl })

    assert.equal(result.issueNumber, 42)
    assert.equal(calls.filter((call) => call.method === 'POST').length, 1)
  })

  it('mirrors the same Post again when it returns to draft in a new revision', () => {
    const oldMarker = draftCommentMarker('post-1', '2026-07-23T12:30:00.000Z')

    assert.equal(
      selectUnmirroredDrafts([DRAFT], [botComment(`${oldMarker}\nOlder review revision`)]).length,
      1,
    )
  })

  it('updates the original bot draft comment to approved with the final frozen copy', async () => {
    const originalBody = buildDraftReviewComment(DRAFT, QUEUE)
    const approvedQueue = { ...QUEUE, drafts: [], ready: [READY] }
    const calls = []
    const fetchImpl = async (input, init = {}) => {
      const url = new URL(String(input))
      const method = init.method ?? 'GET'
      calls.push({ url, method, body: init.body })

      if (url.origin === 'https://app.duedatehq.com') return jsonResponse(approvedQueue)
      if (url.pathname.endsWith('/issues') && method === 'GET') return jsonResponse([ISSUE])
      if (url.pathname.endsWith('/issues/42/comments') && method === 'GET') {
        return jsonResponse([botComment(originalBody)])
      }
      if (url.pathname.endsWith('/issues/comments/500') && method === 'PATCH') {
        return jsonResponse({
          ...botComment(JSON.parse(init.body).body),
          body: JSON.parse(init.body).body,
        })
      }
      throw new Error(`Unexpected request: ${method} ${url}`)
    }

    const result = await syncXDraftReviewIssue({ env: ENV, fetchImpl })
    const update = calls.find(
      (call) => call.method === 'PATCH' && call.url.pathname.endsWith('/issues/comments/500'),
    )
    const body = JSON.parse(update.body).body

    assert.equal(result.commentsUpdated, 1)
    assert.equal(result.commentsCreated, 0)
    assert.match(body, /approved · ready/u)
    assert.match(body, /Final frozen X copy/u)
    assert.match(body, new RegExp(approvedCommentMarker('post-1', READY_POST.approvedAt), 'u'))
    assert.match(body, new RegExp(draftCommentMarker('post-1', DRAFT_POST.updatedAt), 'u'))
    assert.doesNotMatch(body, /approve 'post-1'|approvedBy|user-1|pulse-1/u)
  })

  it('updates the same approved comment after X publication with link and terminal time', async () => {
    const draftMarker = draftCommentMarker('post-1', DRAFT_POST.updatedAt)
    const approvedBody = buildApprovedReviewComment(READY, QUEUE, draftMarker)
    const publishedQueue = {
      ...QUEUE,
      drafts: [],
      ready: [],
      published: [PUBLISHED_POST],
    }
    const calls = []
    const fetchImpl = async (input, init = {}) => {
      const url = new URL(String(input))
      const method = init.method ?? 'GET'
      calls.push({ url, method, body: init.body })

      if (url.origin === 'https://app.duedatehq.com') return jsonResponse(publishedQueue)
      if (url.pathname.endsWith('/issues') && method === 'GET') return jsonResponse([ISSUE])
      if (url.pathname.endsWith('/issues/42/comments') && method === 'GET') {
        return jsonResponse([botComment(approvedBody)])
      }
      if (url.pathname.endsWith('/issues/comments/500') && method === 'PATCH') {
        return jsonResponse({
          ...botComment(JSON.parse(init.body).body),
          body: JSON.parse(init.body).body,
        })
      }
      throw new Error(`Unexpected request: ${method} ${url}`)
    }

    const result = await syncXDraftReviewIssue({ env: ENV, fetchImpl })
    const update = calls.find(
      (call) => call.method === 'PATCH' && call.url.pathname.endsWith('/issues/comments/500'),
    )
    const body = JSON.parse(update.body).body

    assert.equal(result.publishedSeen, 1)
    assert.equal(result.approvedSeen, 1)
    assert.equal(result.commentsUpdated, 1)
    assert.equal(result.commentsCreated, 0)
    assert.equal(calls.filter((call) => call.method === 'POST').length, 0)
    assert.equal(
      calls
        .find((call) => call.url.origin === 'https://app.duedatehq.com')
        .url.searchParams.get('includePublished'),
      'true',
    )
    assert.match(body, /## X Alert · published/u)
    assert.match(body, /Publishing status: ✅ `published` on X/u)
    assert.match(body, /Final frozen X copy/u)
    assert.match(body, new RegExp(`https://x\\.com/i/web/status/${PUBLISHED_POST.xPostId}`, 'u'))
    assert.match(body, new RegExp(PUBLISHED_POST.approvedAt, 'u'))
    assert.match(body, new RegExp(PUBLISHED_POST.publishedAt, 'u'))
    assert.match(body, new RegExp(draftMarker, 'u'))
    assert.match(body, new RegExp(approvedCommentMarker('post-1', PUBLISHED_POST.approvedAt), 'u'))
    assert.match(
      body,
      new RegExp(publishedCommentMarker('post-1', PUBLISHED_POST.publishedAt), 'u'),
    )
    assert.doesNotMatch(body, /Current tentative slot|Current queue position/u)
  })

  it('uses the targeted status endpoint and exact draft revision outside the queue horizon', async () => {
    const olderDraftAt = '2026-07-20T10:00:00.000Z'
    const targetPost = {
      ...READY_POST,
      id: 'post-old',
      approvedAt: '2026-07-23T15:00:00.000Z',
      updatedAt: '2026-07-23T15:00:00.000Z',
    }
    const exactBody = `${draftCommentMarker('post-old', olderDraftAt)}\nExact old draft`
    const newerBody = `${draftCommentMarker('post-old', '2026-07-21T10:00:00.000Z')}\nOther revision`
    const calls = []
    const fetchImpl = async (input, init = {}) => {
      const url = new URL(String(input))
      const method = init.method ?? 'GET'
      calls.push({ url, method, body: init.body, headers: new Headers(init.headers) })

      if (url.pathname === '/api/ops/social/queue') {
        return jsonResponse({ ...QUEUE, drafts: [], ready: [] })
      }
      if (url.pathname.endsWith('/post-old/review-status')) {
        return jsonResponse({ post: targetPost })
      }
      if (url.pathname.endsWith('/issues') && method === 'GET') return jsonResponse([ISSUE])
      if (url.pathname.endsWith('/issues/42/comments') && method === 'GET') {
        return jsonResponse([botComment(exactBody, 501), botComment(newerBody, 502)])
      }
      if (url.pathname.endsWith('/issues/comments/501') && method === 'PATCH') {
        return jsonResponse({ ...botComment(JSON.parse(init.body).body, 501) })
      }
      throw new Error(`Unexpected request: ${method} ${url}`)
    }

    const result = await syncXDraftReviewIssue({
      env: {
        ...ENV,
        SOCIAL_POST_ID: 'post-old',
        SOCIAL_DRAFT_UPDATED_AT: olderDraftAt,
      },
      fetchImpl,
    })

    assert.equal(result.approvedSeen, 1)
    assert.equal(result.commentsUpdated, 1)
    assert.ok(calls.some((call) => call.url.pathname.endsWith('/issues/comments/501')))
    assert.ok(
      calls
        .filter((call) => call.url.origin === 'https://app.duedatehq.com')
        .every((call) => call.headers.get('authorization') === `Bearer ${ENV.SOCIAL_OPS_TOKEN}`),
    )
  })

  it('requires targeted workflow inputs together before any network request', async () => {
    await Promise.all(
      [{ SOCIAL_POST_ID: 'post-1' }, { SOCIAL_DRAFT_UPDATED_AT: DRAFT_POST.updatedAt }].map(
        async (targetEnv) => {
          let fetchCalls = 0

          await assert.rejects(
            syncXDraftReviewIssue({
              env: { ...ENV, ...targetEnv },
              fetchImpl: async () => {
                fetchCalls += 1
                throw new Error('Network access was not expected')
              },
            }),
            /Target Post ID and draft update time must be provided together/u,
          )
          assert.equal(fetchCalls, 0)
        },
      ),
    )
  })

  it('creates an approved comment when the original draft notification is missing', () => {
    const plans = planApprovedCommentSync([READY], [], { ...QUEUE, ready: [READY], drafts: [] })

    assert.equal(plans.length, 1)
    assert.equal(plans[0].kind, 'create')
    assert.match(plans[0].body, /approved · ready/u)
  })

  it('does not repeat an approved revision and ignores forged public markers', () => {
    const approvedBody = buildApprovedReviewComment(READY, QUEUE)
    const stateMarker = approvedCommentMarker('post-1', READY_POST.approvedAt)
    const forged = {
      id: 900,
      body: `${stateMarker}\nForged`,
      user: { login: 'attacker', type: 'User' },
    }

    assert.equal(
      planApprovedCommentSync([READY], [forged, botComment(approvedBody)], QUEUE).length,
      0,
    )
    assert.equal(planApprovedCommentSync([READY], [forged], QUEUE)[0].kind, 'create')
    assert.equal(
      selectUnmirroredDrafts(
        [DRAFT],
        [{ ...forged, body: draftCommentMarker('post-1', DRAFT_POST.updatedAt) }],
      ).length,
      1,
    )
  })

  it('does not repeat a published revision and ignores forged public published markers', () => {
    const draftMarker = draftCommentMarker('post-1', DRAFT_POST.updatedAt)
    const approvedBody = buildApprovedReviewComment(READY, QUEUE, draftMarker)
    const publishedBody = buildApprovedReviewComment(PUBLISHED, QUEUE, draftMarker)
    const stateMarker = publishedCommentMarker('post-1', PUBLISHED_POST.publishedAt)
    const forged = {
      id: 900,
      body: `${stateMarker}\nForged`,
      user: { login: 'attacker', type: 'User' },
    }

    assert.equal(planApprovedCommentSync([PUBLISHED], [botComment(publishedBody)], QUEUE).length, 0)

    const plans = planApprovedCommentSync([PUBLISHED], [forged, botComment(approvedBody)], QUEUE)
    assert.equal(plans.length, 1)
    assert.equal(plans[0].kind, 'update')
    assert.equal(plans[0].commentId, 500)
    assert.match(plans[0].body, new RegExp(stateMarker, 'u'))
  })

  it('updates the original draft directly when the approval refresh was missed', () => {
    const originalDraftBody = buildDraftReviewComment(DRAFT, QUEUE)
    const plans = planApprovedCommentSync([PUBLISHED], [botComment(originalDraftBody)], QUEUE)

    assert.equal(plans.length, 1)
    assert.equal(plans[0].kind, 'update')
    assert.equal(plans[0].commentId, 500)
    assert.match(plans[0].body, /## X Alert · published/u)
    assert.match(
      plans[0].body,
      new RegExp(publishedCommentMarker('post-1', PUBLISHED_POST.publishedAt), 'u'),
    )
    assert.match(
      plans[0].body,
      new RegExp(approvedCommentMarker('post-1', PUBLISHED_POST.approvedAt), 'u'),
    )
    assert.match(plans[0].body, new RegExp(draftCommentMarker('post-1', DRAFT_POST.updatedAt), 'u'))
  })

  it('does not create a historical published comment when no bot comment exists', () => {
    assert.deepEqual(planApprovedCommentSync([PUBLISHED], [], QUEUE), [])
  })

  it('rejects invalid published metadata before any GitHub read or write', async () => {
    const invalidPosts = [
      {
        post: { ...PUBLISHED_POST, xPostId: 'not-an-x-post-id' },
        expected: /X Post ID must contain only decimal digits/u,
      },
      {
        post: { ...PUBLISHED_POST, publishedAt: '' },
        expected: /Social Post publication time is required/u,
      },
    ]

    await Promise.all(
      invalidPosts.map(async (invalid) => {
        const calls = []
        const fetchImpl = async (input, init = {}) => {
          const url = new URL(String(input))
          calls.push({ url, method: init.method ?? 'GET' })
          if (url.origin === 'https://app.duedatehq.com') {
            return jsonResponse({
              ...QUEUE,
              drafts: [],
              ready: [],
              published: [invalid.post],
            })
          }
          throw new Error('GitHub must not be called for invalid published metadata')
        }

        await assert.rejects(syncXDraftReviewIssue({ env: ENV, fetchImpl }), invalid.expected)
        assert.equal(calls.length, 1)
        assert.equal(calls[0].url.origin, 'https://app.duedatehq.com')
      }),
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

  it('validates all public copy before creating or updating the Issue', async () => {
    const calls = []
    const fetchImpl = async (input, init = {}) => {
      const url = new URL(String(input))
      calls.push({ url, method: init.method ?? 'GET' })
      if (url.origin === 'https://app.duedatehq.com') {
        return jsonResponse({
          ...QUEUE,
          drafts: [{ ...DRAFT, post: { ...DRAFT_POST, postText: '' } }],
        })
      }
      throw new Error('GitHub must not be called for invalid public copy')
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

  it('keeps the workflow main-only with targeted approval inputs and narrow permissions', () => {
    assert.match(WORKFLOW, /issues: write/u)
    assert.match(WORKFLOW, /environment: due-date-hq-staging/u)
    assert.match(WORKFLOW, /timezone: 'America\/New_York'/u)
    assert.match(WORKFLOW, /github\.ref == 'refs\/heads\/main'/u)
    assert.match(WORKFLOW, /post_id:/u)
    assert.match(WORKFLOW, /draft_updated_at:/u)
    assert.doesNotMatch(WORKFLOW, /^\s*pull_request(?:_target)?:/mu)
    assert.doesNotMatch(WORKFLOW, /pnpm social:x/u)
  })
})
