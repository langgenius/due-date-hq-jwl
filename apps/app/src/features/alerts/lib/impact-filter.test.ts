import { describe, expect, it } from 'vitest'
import type { PulseAlertPublic } from '@duedatehq/contracts'
import { matchesAlertImpactFilter } from './impact-filter'

function alert(overrides: Partial<PulseAlertPublic> = {}): PulseAlertPublic {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    pulseId: '22222222-2222-4222-8222-222222222222',
    status: 'matched',
    sourceStatus: 'approved',
    origin: 'live',
    actionDeadline: null,
    title: 'California disaster relief',
    source: 'ca.ftb',
    sourceUrl: 'https://www.ftb.ca.gov/newsroom/news-releases/state-tax-relief.html',
    changeKind: 'deadline_shift',
    actionMode: 'due_date_overlay',
    firmImpact: 'matched',
    summary: 'Deadline relief applies to affected counties.',
    publishedAt: '2026-05-06T10:00:00.000Z',
    dismissedAt: null,
    appliedAt: null,
    matchedCount: 3,
    needsReviewCount: 0,
    applyReadiness: { status: 'ready', missing: [] },
    duplicateSourceSnapshotCount: 0,
    confidence: 0.92,
    isSample: false,
    jurisdiction: 'CA',
    taxAreas: [],
    forms: [],
    ...overrides,
  }
}

describe('matchesAlertImpactFilter', () => {
  it('maps active client-impacting Pulse changes into needs action', () => {
    expect(matchesAlertImpactFilter(alert(), 'needs_action')).toBe(true)
    expect(matchesAlertImpactFilter(alert({ status: 'partially_applied' }), 'needs_action')).toBe(
      true,
    )
  })

  it('keeps closed and watch-only rows out of needs action', () => {
    expect(matchesAlertImpactFilter(alert({ status: 'applied' }), 'needs_action')).toBe(false)
    expect(matchesAlertImpactFilter(alert({ status: 'dismissed' }), 'needs_action')).toBe(false)
    expect(
      matchesAlertImpactFilter(alert({ matchedCount: 0, needsReviewCount: 0 }), 'needs_action'),
    ).toBe(false)
  })

  it('separates manager-review, no-match, and closed lanes', () => {
    expect(
      matchesAlertImpactFilter(
        alert({ needsReviewCount: 2, firmImpact: 'needs_review' }),
        'needs_review',
      ),
    ).toBe(true)
    expect(
      matchesAlertImpactFilter(
        alert({ matchedCount: 0, needsReviewCount: 0, firmImpact: 'no_current_match' }),
        'no_matches',
      ),
    ).toBe(true)
    expect(matchesAlertImpactFilter(alert({ status: 'dismissed' }), 'closed')).toBe(true)
    expect(matchesAlertImpactFilter(alert({ status: 'reverted' }), 'closed')).toBe(true)
    expect(matchesAlertImpactFilter(alert({ status: 'matched' }), 'closed')).toBe(false)
  })
})
