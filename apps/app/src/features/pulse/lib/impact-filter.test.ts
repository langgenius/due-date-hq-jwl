import { describe, expect, it } from 'vitest'
import type { PulseAlertPublic } from '@duedatehq/contracts'
import { matchesPulseImpactFilter } from './impact-filter'

function alert(overrides: Partial<PulseAlertPublic> = {}): PulseAlertPublic {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    pulseId: '22222222-2222-4222-8222-222222222222',
    status: 'matched',
    sourceStatus: 'approved',
    title: 'California disaster relief',
    source: 'ca.ftb',
    sourceUrl: 'https://www.ftb.ca.gov/newsroom/news-releases/state-tax-relief.html',
    changeKind: 'deadline_shift',
    actionMode: 'due_date_overlay',
    summary: 'Deadline relief applies to affected counties.',
    publishedAt: '2026-05-06T10:00:00.000Z',
    matchedCount: 3,
    needsReviewCount: 0,
    applyReadiness: { status: 'ready', missing: [] },
    duplicateSourceSnapshotCount: 0,
    confidence: 0.92,
    isSample: false,
    jurisdiction: 'CA',
    ...overrides,
  }
}

describe('matchesPulseImpactFilter', () => {
  it('maps active client-impacting Pulse changes into needs action', () => {
    expect(matchesPulseImpactFilter(alert(), 'needs_action')).toBe(true)
    expect(matchesPulseImpactFilter(alert({ status: 'partially_applied' }), 'needs_action')).toBe(
      true,
    )
  })

  it('keeps closed and watch-only rows out of needs action', () => {
    expect(matchesPulseImpactFilter(alert({ status: 'applied' }), 'needs_action')).toBe(false)
    expect(matchesPulseImpactFilter(alert({ status: 'snoozed' }), 'needs_action')).toBe(false)
    expect(
      matchesPulseImpactFilter(alert({ matchedCount: 0, needsReviewCount: 0 }), 'needs_action'),
    ).toBe(false)
  })

  it('separates manager-review, no-match, and closed lanes', () => {
    expect(matchesPulseImpactFilter(alert({ needsReviewCount: 2 }), 'needs_review')).toBe(true)
    expect(
      matchesPulseImpactFilter(alert({ matchedCount: 0, needsReviewCount: 0 }), 'no_matches'),
    ).toBe(true)
    expect(matchesPulseImpactFilter(alert({ status: 'dismissed' }), 'closed')).toBe(true)
    expect(matchesPulseImpactFilter(alert({ status: 'reverted' }), 'closed')).toBe(true)
    expect(matchesPulseImpactFilter(alert({ status: 'matched' }), 'closed')).toBe(false)
  })
})
