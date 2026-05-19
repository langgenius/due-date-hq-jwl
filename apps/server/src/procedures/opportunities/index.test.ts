import { describe, expect, it } from 'vitest'
import { buildClientOpportunities, summarizeOpportunities } from './index'

describe('opportunities read model', () => {
  it('builds lightweight business cues without tax advice or lifecycle state', () => {
    const opportunities = buildClientOpportunities({
      client: {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Riverside Holdings LLC',
        entityType: 'llc',
        state: 'CA',
        assigneeName: 'Mina',
        importanceWeight: 3,
        lateFilingCountLast12mo: 2,
        estimatedTaxLiabilityCents: 120_000,
        equityOwnerCount: 2,
      },
      obligations: [
        {
          id: '21111111-1111-4111-8111-111111111111',
          clientId: '11111111-1111-4111-8111-111111111111',
          status: 'waiting_on_client',
          readiness: 'waiting',
          jurisdiction: 'CA',
        },
        {
          id: '21111111-1111-4111-8111-111111111112',
          clientId: '11111111-1111-4111-8111-111111111111',
          status: 'review',
          readiness: 'waiting',
          jurisdiction: 'NY',
        },
        {
          id: '21111111-1111-4111-8111-111111111113',
          clientId: '11111111-1111-4111-8111-111111111111',
          status: 'pending',
          readiness: 'ready',
          jurisdiction: 'CA',
        },
        {
          id: '21111111-1111-4111-8111-111111111114',
          clientId: '11111111-1111-4111-8111-111111111111',
          status: 'in_progress',
          readiness: 'ready',
          jurisdiction: 'CA',
        },
      ],
    })

    expect(opportunities.map((opportunity) => opportunity.kind)).toEqual([
      'retention_check_in',
      'scope_review',
      'advisory_conversation',
    ])
    expect(opportunities[2]?.summary).toContain('does not generate tax strategies')
    expect(opportunities[0]?.primaryAction.href).toBe(
      '/clients/11111111-1111-4111-8111-111111111111',
    )
    expect(summarizeOpportunities(opportunities)).toEqual({
      total: 3,
      advisoryConversationCount: 1,
      scopeReviewCount: 1,
      retentionCheckInCount: 1,
    })
  })
})
