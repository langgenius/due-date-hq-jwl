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

    expect(command).toEqual({ kind: 'queue', days: 14 })
    expect(requestFor(command)).toEqual({
      path: '/api/ops/social/queue?days=14',
      method: 'GET',
    })
  })

  it('accepts a bounded queue preview window', () => {
    const command = parseSocialXCommand(['queue', '--days', '30'])

    expect(command).toEqual({ kind: 'queue', days: 30 })
    expect(requestFor(command)).toEqual({
      path: '/api/ops/social/queue?days=30',
      method: 'GET',
    })
  })

  it('rejects invalid queue preview windows', () => {
    for (const days of ['0', '101', '1.5', 'not-a-number']) {
      expect(() => parseSocialXCommand(['queue', '--days', days])).toThrow(
        /--days must be an integer from 1 to 100/u,
      )
    }
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
