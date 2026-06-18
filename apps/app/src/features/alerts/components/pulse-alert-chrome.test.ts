import { describe, expect, it } from 'vitest'

import { impactBadgeFromAlert } from './pulse-alert-chrome'

// 2026-06-06: the card "IMPACT" badge is now REAL client impact
// (matchedCount + needsReviewCount via alertImpactLevel), NOT inverted
// AI confidence. `impactBadgeFromAlert` only Picks the two count fields,
// so confidence cannot structurally leak back into the tier — these
// tests lock the threshold table. 2026-06-18: the helper returns the tier ID
// only; rendering moved to the shared <SeverityChip level="neutral"> (no per-
// tier colors here anymore), so these assert the threshold table.
describe('impactBadgeFromAlert', () => {
  it('grades by impacted obligations (matchedCount + needsReviewCount), HIGH at 5+', () => {
    expect(impactBadgeFromAlert({ matchedCount: 0, needsReviewCount: 0 }).id).toBe('low')
    expect(impactBadgeFromAlert({ matchedCount: 1, needsReviewCount: 0 }).id).toBe('low')
    expect(impactBadgeFromAlert({ matchedCount: 2, needsReviewCount: 0 }).id).toBe('medium')
    expect(impactBadgeFromAlert({ matchedCount: 3, needsReviewCount: 1 }).id).toBe('medium')
    expect(impactBadgeFromAlert({ matchedCount: 5, needsReviewCount: 0 }).id).toBe('high')
    expect(impactBadgeFromAlert({ matchedCount: 0, needsReviewCount: 5 }).id).toBe('high')
  })

  it('returns the tier ID only (rendering owns the color via SeverityChip)', () => {
    expect(impactBadgeFromAlert({ matchedCount: 6, needsReviewCount: 0 })).toEqual({ id: 'high' })
    expect(impactBadgeFromAlert({ matchedCount: 3, needsReviewCount: 0 })).toEqual({ id: 'medium' })
    expect(impactBadgeFromAlert({ matchedCount: 0, needsReviewCount: 0 })).toEqual({ id: 'low' })
  })
})
