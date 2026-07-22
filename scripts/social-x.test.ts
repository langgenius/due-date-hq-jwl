import { describe, expect, it } from 'vitest'
import { parseSocialXCommand, requestFor } from './social-x'

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
})
