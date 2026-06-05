import { describe, expect, it } from 'vitest'
import type { PulseAlertPublic } from '@duedatehq/contracts'

import { alertImpactLevel } from './impact-level'

function alert(overrides: Partial<PulseAlertPublic> = {}): PulseAlertPublic {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    pulseId: '22222222-2222-4222-8222-222222222222',
    status: 'matched',
    sourceStatus: 'approved',
    title: 'California disaster relief',
    source: 'ca.ftb',
    sourceUrl: 'https://www.ftb.ca.gov/news.html',
    changeKind: 'deadline_shift',
    actionMode: 'due_date_overlay',
    firmImpact: 'matched',
    summary: 'Deadline relief applies to affected counties.',
    publishedAt: '2026-05-06T10:00:00.000Z',
    matchedCount: 0,
    needsReviewCount: 0,
    applyReadiness: { status: 'ready', missing: [] },
    duplicateSourceSnapshotCount: 0,
    confidence: 0.92,
    isSample: false,
    jurisdiction: 'CA',
    taxAreas: [],
    ...overrides,
  }
}

describe('alertImpactLevel', () => {
  it('grades by real client impact = matchedCount + needsReviewCount', () => {
    // low: 0–1, medium: 2–4, high: 5+
    expect(alertImpactLevel(alert({ matchedCount: 0, needsReviewCount: 0 }))).toBe('low')
    expect(alertImpactLevel(alert({ matchedCount: 1, needsReviewCount: 0 }))).toBe('low')
    expect(alertImpactLevel(alert({ matchedCount: 2, needsReviewCount: 0 }))).toBe('medium')
    expect(alertImpactLevel(alert({ matchedCount: 3, needsReviewCount: 1 }))).toBe('medium')
    expect(alertImpactLevel(alert({ matchedCount: 5, needsReviewCount: 0 }))).toBe('high')
    expect(alertImpactLevel(alert({ matchedCount: 4, needsReviewCount: 3 }))).toBe('high')
  })

  it('counts needs-review obligations toward impact, not just matched', () => {
    expect(alertImpactLevel(alert({ matchedCount: 0, needsReviewCount: 5 }))).toBe('high')
  })

  it('is independent of AI confidence (the old, misleading driver)', () => {
    // Low confidence no longer inflates impact; magnitude is all that counts.
    expect(alertImpactLevel(alert({ confidence: 0.1, matchedCount: 0, needsReviewCount: 0 }))).toBe(
      'low',
    )
    expect(
      alertImpactLevel(alert({ confidence: 0.99, matchedCount: 9, needsReviewCount: 0 })),
    ).toBe('high')
  })
})
