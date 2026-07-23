import { describe, expect, it } from 'vitest'
import {
  dispatchXDraftReviewSync,
  parseSocialXCommand,
  requestFor,
  runSocialXCommand,
} from './social-x'

describe('parseSocialXCommand', () => {
  it('accepts the pnpm script-argument separator', () => {
    expect(parseSocialXCommand(['--', 'candidates', '--status', 'draft', '--limit', '50'])).toEqual(
      {
        kind: 'candidates',
        status: 'draft',
        limit: 50,
      },
    )
  })

  it('uses the configured reviewer for approvals', () => {
    expect(
      parseSocialXCommand(['approve', 'post-1', '--priority', 'urgent'], {
        SOCIAL_OPS_REVIEWER: 'user-1',
      }),
    ).toEqual({ kind: 'approve', postId: 'post-1', reviewer: 'user-1', priority: 'urgent' })
  })

  it('supports one-off historical Pulse draft creation', () => {
    expect(parseSocialXCommand(['candidates', '--pulse', 'pulse-1'])).toEqual({
      kind: 'candidates',
      pulseId: 'pulse-1',
    })
  })

  it('previews the next 14 ET publishing days by default', () => {
    const command = parseSocialXCommand(['queue'])

    expect(command).toEqual({ kind: 'queue' })
    expect(requestFor(command)).toEqual({
      path: '/api/ops/social/queue',
      method: 'GET',
    })
  })

  it('keeps the queue preview fixed at 14 days', () => {
    expect(() => parseSocialXCommand(['queue', '--days', '30'])).toThrow(
      /always previews the next 14 days/u,
    )
    expect(() => parseSocialXCommand(['queue', 'extra'])).toThrow(
      /always previews the next 14 days/u,
    )
  })

  it('seeds three latest eligible drafts by default', () => {
    const command = parseSocialXCommand(['seed-drafts'])

    expect(command).toEqual({ kind: 'seed-drafts', count: 3 })
    expect(requestFor(command)).toEqual({
      path: '/api/ops/social/drafts/seed',
      method: 'POST',
      body: { count: 3 },
    })
  })

  it('accepts a bounded draft seed count', () => {
    expect(parseSocialXCommand(['seed-drafts', '--count', '14'])).toEqual({
      kind: 'seed-drafts',
      count: 14,
    })
    for (const count of ['0', '15', '1.5', 'not-a-number']) {
      expect(() => parseSocialXCommand(['seed-drafts', '--count', count])).toThrow(
        /--count must be an integer from 1 to 14/u,
      )
    }
    expect(() => parseSocialXCommand(['seed-drafts', '--count', '3', 'extra'])).toThrow(
      /accepts only an optional --count/u,
    )
  })

  it('supports a read-only OAuth account preflight', () => {
    const command = parseSocialXCommand(['verify-account'])
    expect(command).toEqual({ kind: 'verify-account' })
    expect(requestFor(command)).toEqual({ path: '/api/ops/social/x/account', method: 'GET' })
  })

  it('requires an exact post ID for immediate publishing', () => {
    const command = parseSocialXCommand(['publish-now', 'post-1'])
    expect(command).toEqual({
      kind: 'publish-now',
      postId: 'post-1',
    })
    expect(requestFor(command)).toEqual({
      path: '/api/ops/social/post-1/publish-now',
      method: 'POST',
    })
    expect(() => parseSocialXCommand(['publish-now'])).toThrow(/publish-now requires a post ID/u)
  })

  it('refuses blind reconciliation of an ambiguous send', () => {
    expect(() => parseSocialXCommand(['reconcile', 'post-1', '--outcome', 'published'])).toThrow(
      /--x-post-id/,
    )
  })

  it('does not mistake an option for a missing post ID', () => {
    expect(() => parseSocialXCommand(['cancel', '--reason', 'superseded'])).toThrow(
      /cancel requires a post ID/,
    )
  })

  it('queues an exact main-branch review workflow after a successful production approval', async () => {
    const calls: Array<{ file: string; args: string[]; env: NodeJS.ProcessEnv }> = []
    const triggered = await dispatchXDraftReviewSync(
      {
        postId: 'post-1',
        draftUpdatedAt: '2026-07-22T07:21:28.141Z',
      },
      {
        SOCIAL_OPS_URL: 'https://app.duedatehq.com',
        SOCIAL_OPS_TOKEN: 'must-not-reach-gh',
        SOCIAL_OPS_REVIEWER: 'user-1',
      },
      async (file, args, options) => {
        calls.push({ file, args, env: options.env })
      },
    )

    expect(triggered).toBe(true)
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({
      file: 'gh',
      args: [
        'workflow',
        'run',
        'x-draft-review.yml',
        '--repo',
        'langgenius/due-date-hq-jwl',
        '--ref',
        'main',
        '-f',
        'post_id=post-1',
        '-f',
        'draft_updated_at=2026-07-22T07:21:28.141Z',
      ],
    })
    expect(calls[0]?.env.SOCIAL_OPS_TOKEN).toBeUndefined()
    expect(calls[0]?.env.SOCIAL_OPS_REVIEWER).toBeUndefined()
  })

  it('does not trigger the production Issue workflow for a local approval', async () => {
    const triggered = await dispatchXDraftReviewSync(
      {
        postId: 'post-1',
        draftUpdatedAt: '2026-07-22T07:21:28.141Z',
      },
      { SOCIAL_OPS_URL: 'http://localhost:8787' },
      async () => {
        throw new Error('gh must not run')
      },
    )

    expect(triggered).toBe(false)
  })

  it('rejects an unsafe workflow Post ID before starting GitHub CLI', async () => {
    let ghCalls = 0

    await expect(
      dispatchXDraftReviewSync(
        {
          postId: 'post-1;touch-owned',
          draftUpdatedAt: '2026-07-22T07:21:28.141Z',
        },
        { SOCIAL_OPS_URL: 'https://app.duedatehq.com' },
        async () => {
          ghCalls += 1
        },
      ),
    ).rejects.toThrow(/Social Post ID is invalid/u)
    expect(ghCalls).toBe(0)
  })

  it('dispatches only after the approve endpoint returns a successful transition', async () => {
    const events: string[] = []
    const warnings: string[] = []

    await runSocialXCommand({
      args: ['approve', 'post-1'],
      env: {
        SOCIAL_OPS_URL: 'https://app.duedatehq.com',
        SOCIAL_OPS_TOKEN: 'social-token',
        SOCIAL_OPS_REVIEWER: 'user-1',
      },
      fetchImpl: async () => {
        events.push('approve')
        return Response.json({
          post: { id: 'post-1', status: 'ready' },
          transition: {
            postId: 'post-1',
            draftUpdatedAt: '2026-07-22T07:21:28.141Z',
          },
        })
      },
      log: () => events.push('output'),
      warn: (message) => warnings.push(message),
      dispatchReviewSync: async (transition) => {
        events.push(`dispatch:${transition.postId}`)
        return true
      },
    })

    expect(events).toEqual(['approve', 'output', 'dispatch:post-1'])
    expect(warnings).toEqual(['Approval succeeded; GitHub Issue status sync queued.'])
  })

  it('never dispatches after a failed approval request', async () => {
    let dispatchCount = 0

    await expect(
      runSocialXCommand({
        args: ['approve', 'post-1'],
        env: { SOCIAL_OPS_REVIEWER: 'user-1' },
        fetchImpl: async () => Response.json({ error: 'conflict' }, { status: 409 }),
        log: () => undefined,
        warn: () => undefined,
        dispatchReviewSync: async () => {
          dispatchCount += 1
          return true
        },
      }),
    ).rejects.toThrow(/Social ops request failed \(409\)/u)
    expect(dispatchCount).toBe(0)
  })

  it('reports GitHub sync failure without reclassifying a successful approval', async () => {
    const warnings: string[] = []

    await expect(
      runSocialXCommand({
        args: ['approve', 'post-1'],
        env: { SOCIAL_OPS_REVIEWER: 'user-1' },
        fetchImpl: async () =>
          Response.json({
            post: { id: 'post-1', status: 'ready' },
            transition: {
              postId: 'post-1',
              draftUpdatedAt: '2026-07-22T07:21:28.141Z',
            },
          }),
        log: () => undefined,
        warn: (message) => warnings.push(message),
        dispatchReviewSync: async () => {
          throw new Error('gh unavailable')
        },
      }),
    ).resolves.toBeUndefined()
    expect(warnings).toEqual([
      'Approval succeeded, but GitHub Issue status sync could not be queued. ' +
        'Retry: gh workflow run x-draft-review.yml --repo langgenius/due-date-hq-jwl ' +
        '--ref main -f post_id=post-1 -f draft_updated_at=2026-07-22T07:21:28.141Z',
    ])
  })
})
