import { describe, expect, it } from 'vitest'
import { toAuditEventPublic } from './index'

describe('audit procedure serializers', () => {
  it('serializes audit rows for the public contract', () => {
    const event = toAuditEventPublic({
      id: '33333333-3333-4333-8333-333333333333',
      firmId: 'firm_123',
      actorId: null,
      actorLabel: null,
      actorType: 'system',
      previousActorType: null,
      aiEventMetadataJson: null,
      entityType: 'migration_batch',
      entityId: 'batch_123',
      action: 'migration.imported',
      beforeJson: undefined,
      afterJson: { status: 'applied' },
      reason: null,
      ipHash: null,
      userAgentHash: 'ua_hash',
      createdAt: new Date('2026-04-28T00:00:00.000Z'),
    })

    expect(event).toEqual({
      id: '33333333-3333-4333-8333-333333333333',
      firmId: 'firm_123',
      actorId: null,
      actorLabel: null,
      actorType: 'system',
      previousActorType: null,
      aiEventMetadata: null,
      entityType: 'migration_batch',
      entityId: 'batch_123',
      action: 'migration.imported',
      beforeJson: null,
      afterJson: { status: 'applied' },
      reason: null,
      ipHash: null,
      userAgentHash: 'ua_hash',
      createdAt: '2026-04-28T00:00:00.000Z',
    })
  })

  it('parses ai-event metadata for AI-originated rows', () => {
    // η pass — F-037: ensure the disclosure metadata round-trips through
    // the serialiser. Unknown / malformed payloads should fail closed
    // (null) rather than blowing up the audit-list endpoint.
    const event = toAuditEventPublic({
      id: '33333333-3333-4333-8333-333333333334',
      firmId: 'firm_123',
      actorId: 'user_1',
      actorLabel: 'Andy',
      actorType: 'ai_assisted',
      previousActorType: null,
      aiEventMetadataJson: {
        model: 'gpt-4o-mini',
        promptVersion: 'pulse-apply-v3',
        inputTokens: 1200,
        outputTokens: 84,
        latencyMs: 1340,
        guardStatus: 'passed',
        confidence: 0.82,
      },
      entityType: 'obligation_instance',
      entityId: 'oi_1',
      action: 'pulse.apply',
      beforeJson: undefined,
      afterJson: { currentDueDate: '2026-09-15' },
      reason: null,
      ipHash: null,
      userAgentHash: null,
      createdAt: new Date('2026-04-28T00:00:00.000Z'),
    })

    expect(event.actorType).toBe('ai_assisted')
    expect(event.aiEventMetadata).toEqual({
      model: 'gpt-4o-mini',
      promptVersion: 'pulse-apply-v3',
      inputTokens: 1200,
      outputTokens: 84,
      latencyMs: 1340,
      guardStatus: 'passed',
      confidence: 0.82,
    })
  })

  it('defends against malformed ai metadata', () => {
    const event = toAuditEventPublic({
      id: '33333333-3333-4333-8333-333333333335',
      firmId: 'firm_123',
      actorId: null,
      actorLabel: null,
      actorType: 'ai',
      previousActorType: null,
      aiEventMetadataJson: { confidence: 'not-a-number' },
      entityType: 'obligation_instance',
      entityId: 'oi_2',
      action: 'pulse.extract',
      beforeJson: null,
      afterJson: null,
      reason: null,
      ipHash: null,
      userAgentHash: null,
      createdAt: new Date('2026-04-28T00:00:00.000Z'),
    })

    expect(event.aiEventMetadata).toBeNull()
  })
})
