import { describe, expect, it } from 'vitest'
import {
  activePracticeLimitForPlan,
  getPlanEntitlements,
  isBillingPlan,
  planAiDailyRunLimit,
  planClientLimit,
  planHasFeature,
  planSeatLimit,
} from './index'

describe('plan entitlements', () => {
  it('defines the seat and active practice limits for each plan', () => {
    expect(planSeatLimit('solo')).toBe(1)
    expect(planSeatLimit('pro')).toBe(3)
    expect(planSeatLimit('team')).toBe(10)
    expect(planSeatLimit('firm')).toBe(10)

    expect(activePracticeLimitForPlan('solo')).toBe(1)
    expect(activePracticeLimitForPlan('pro')).toBe(1)
    expect(activePracticeLimitForPlan('team')).toBe(1)
    expect(activePracticeLimitForPlan('firm')).toBeNull()
  })

  it('treats interactive AI as flat fair-use, not a tier lever', () => {
    // Interactive AI is a flat, invisible fair-use ceiling — no longer a
    // differentiator. Paid tiers share one ceiling; free gets a smaller one.
    expect(planAiDailyRunLimit('team')).toBe(planAiDailyRunLimit('pro'))
    expect(planAiDailyRunLimit('free')).toBeLessThan(planAiDailyRunLimit('pro'))
    expect(planHasFeature('team', 'productionPulse')).toBe(planHasFeature('pro', 'productionPulse'))
    expect(planHasFeature('team', 'productionMigrationAi')).toBe(
      planHasFeature('pro', 'productionMigrationAi'),
    )
  })

  it('separates team operations from practice AI', () => {
    expect(planHasFeature('pro', 'sharedDeadlineOperations')).toBe(true)
    expect(planHasFeature('pro', 'teamManagerOperations')).toBe(false)
    expect(planHasFeature('pro', 'productionMigrationAi')).toBe(true)
    // priorityPulseMatching gates the Team priority-review workflow (not match
    // quality), so it stays Team+.
    expect(planHasFeature('pro', 'priorityPulseMatching')).toBe(false)
    expect(planHasFeature('pro', 'guidedMigrationReview')).toBe(false)
    expect(planHasFeature('pro', 'auditExport')).toBe(false)
    expect(planHasFeature('team', 'teamManagerOperations')).toBe(true)
    expect(planHasFeature('team', 'priorityPulseMatching')).toBe(true)
    expect(planHasFeature('team', 'guidedMigrationReview')).toBe(true)
    expect(planHasFeature('team', 'auditExport')).toBe(true)
    expect(planHasFeature('team', 'customAi')).toBe(false)
    expect(planHasFeature('firm', 'customAi')).toBe(true)
  })

  it('meters by client count and makes Pulse universal', () => {
    expect(planClientLimit('free')).toBe(10)
    expect(planClientLimit('solo')).toBe(100)
    expect(planClientLimit('pro')).toBe(300)
    expect(planClientLimit('team')).toBe(1000)
    expect(planClientLimit('firm')).toBeNull()

    // Pulse is core — alerts + (uniform-quality) matching on every tier.
    for (const plan of ['free', 'solo', 'pro', 'team', 'firm'] as const) {
      expect(planHasFeature(plan, 'productionPulse')).toBe(true)
    }
    // priorityPulseMatching gates the Team priority-review workflow (not match
    // quality) — it stays Team+.
    expect(planHasFeature('solo', 'priorityPulseMatching')).toBe(false)
    expect(planHasFeature('pro', 'priorityPulseMatching')).toBe(false)
    expect(planHasFeature('team', 'priorityPulseMatching')).toBe(true)

    // Full alert history is the one Pulse-adjacent gate: paid only.
    expect(planHasFeature('free', 'fullAlertHistory')).toBe(false)
    expect(planHasFeature('solo', 'fullAlertHistory')).toBe(true)
    expect(planHasFeature('pro', 'fullAlertHistory')).toBe(true)

    expect(getPlanEntitlements('free').label).toBe('Free')
  })

  it('narrows plan strings', () => {
    expect(isBillingPlan('free')).toBe(true)
    expect(isBillingPlan('solo')).toBe(true)
    expect(isBillingPlan('firm')).toBe(true)
    expect(isBillingPlan('enterprise')).toBe(false)
  })

  it('returns stable plan labels', () => {
    expect(getPlanEntitlements('firm').label).toBe('Enterprise')
  })
})
