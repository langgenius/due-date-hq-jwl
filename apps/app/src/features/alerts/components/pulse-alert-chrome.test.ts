import { describe, expect, it } from 'vitest'

import { impactBadgeFromAlert } from './pulse-alert-chrome'

// 2026-06-06: the card "IMPACT" badge is now REAL client impact
// (matchedCount + needsReviewCount via alertImpactLevel), NOT inverted
// AI confidence. `impactBadgeFromAlert` only Picks the two count fields,
// so confidence cannot structurally leak back into the tier — these
// tests lock the threshold table + the unified HIGH color.
describe('impactBadgeFromAlert', () => {
  it('grades by impacted obligations (matchedCount + needsReviewCount), HIGH at 5+', () => {
    expect(impactBadgeFromAlert({ matchedCount: 0, needsReviewCount: 0 }).id).toBe('low')
    expect(impactBadgeFromAlert({ matchedCount: 1, needsReviewCount: 0 }).id).toBe('low')
    expect(impactBadgeFromAlert({ matchedCount: 2, needsReviewCount: 0 }).id).toBe('medium')
    expect(impactBadgeFromAlert({ matchedCount: 3, needsReviewCount: 1 }).id).toBe('medium')
    expect(impactBadgeFromAlert({ matchedCount: 5, needsReviewCount: 0 }).id).toBe('high')
    expect(impactBadgeFromAlert({ matchedCount: 0, needsReviewCount: 5 }).id).toBe('high')
  })

  it('paints HIGH with the unified round-58 X3j4nt amber (not AlertCard’s old red)', () => {
    expect(impactBadgeFromAlert({ matchedCount: 6, needsReviewCount: 0 })).toEqual({
      id: 'high',
      bg: '#ffe3d6',
      text: '#92400E',
    })
  })

  it('keeps MEDIUM / LOW neutral gray (every surface gates the pill to HIGH only)', () => {
    expect(impactBadgeFromAlert({ matchedCount: 3, needsReviewCount: 0 })).toEqual({
      id: 'medium',
      bg: '#f2f4f7',
      text: '#475467',
    })
    expect(impactBadgeFromAlert({ matchedCount: 0, needsReviewCount: 0 })).toEqual({
      id: 'low',
      bg: '#f2f4f7',
      text: '#475467',
    })
  })
})
