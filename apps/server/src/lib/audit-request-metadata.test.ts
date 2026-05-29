import { describe, expect, it, vi } from 'vitest'
import type { AuditEventInput } from '@duedatehq/ports/audit'
import {
  auditRequestMetadata,
  hashAuditValue,
  requestIpFromHeaders,
  withAuditRequestMetadata,
} from './audit-request-metadata'

const secret = 'test-secret-test-secret-test-secret-123'
type AuditWriteEvent = Omit<AuditEventInput, 'firmId'>

describe('audit request metadata', () => {
  it('resolves the request IP from Cloudflare and proxy headers', () => {
    expect(requestIpFromHeaders(new Headers({ 'cf-connecting-ip': '203.0.113.10' }))).toBe(
      '203.0.113.10',
    )
    expect(
      requestIpFromHeaders(
        new Headers({
          'x-forwarded-for': '198.51.100.5, 198.51.100.99',
          'x-real-ip': '192.0.2.9',
        }),
      ),
    ).toBe('198.51.100.5')
    expect(requestIpFromHeaders(new Headers({ 'x-real-ip': '192.0.2.9' }))).toBe('192.0.2.9')
  })

  it('hashes IP and user agent values without storing raw request metadata', async () => {
    const metadata = await auditRequestMetadata(
      secret,
      new Headers({
        'x-forwarded-for': '198.51.100.5',
        'user-agent': 'DueDateHQ Test Browser',
      }),
    )

    await expect(hashAuditValue(secret, '198.51.100.5')).resolves.toBe(metadata.ipHash)
    await expect(hashAuditValue(secret, 'DueDateHQ Test Browser')).resolves.toBe(
      metadata.userAgentHash,
    )
    expect(metadata.ipHash).not.toContain('198.51.100.5')
    expect(metadata.userAgentHash).not.toContain('DueDateHQ Test Browser')
  })

  it('adds metadata to scoped audit writes unless the caller supplied it explicitly', async () => {
    const write = vi.fn(async (_event: AuditWriteEvent) => ({ id: 'audit_1' }))
    const writeBatch = vi.fn(async (_events: AuditWriteEvent[]) => ({ ids: ['audit_2'] }))
    const repo = {
      audit: {
        write,
        writeBatch,
      },
    }

    const wrapped = withAuditRequestMetadata(repo, {
      ipHash: 'request_ip_hash',
      userAgentHash: 'request_ua_hash',
    })

    await wrapped.audit.write({
      actorId: 'user_1',
      entityType: 'rule',
      entityId: 'rule_1',
      action: 'rule.accepted',
    })
    await wrapped.audit.writeBatch([
      {
        actorId: 'user_1',
        entityType: 'rule',
        entityId: 'rule_2',
        action: 'rule.accepted',
        ipHash: 'explicit_ip_hash',
      },
    ])

    expect(write).toHaveBeenCalledWith(
      expect.objectContaining({
        ipHash: 'request_ip_hash',
        userAgentHash: 'request_ua_hash',
      }),
    )
    expect(writeBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        ipHash: 'explicit_ip_hash',
        userAgentHash: 'request_ua_hash',
      }),
    ])
  })
})
