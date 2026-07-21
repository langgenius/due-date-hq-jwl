import { describe, expect, it } from 'vitest'
import { parseSocialXCommand } from './social-x'

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
