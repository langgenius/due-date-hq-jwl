import { describe, expect, it } from 'vitest'

import type { PulseAlertPublic } from '@duedatehq/contracts'

import { isAlertRevertable, isWithinRevertWindow, revertExpiresAt } from './revert-window'

function makeAlert(status: PulseAlertPublic['status']): PulseAlertPublic {
  return {
    id: 'alert-1',
    pulseId: 'pulse-1',
    status,
    sourceStatus: 'approved',
    title: 'IRS storm relief',
    source: 'irs.gov',
    sourceUrl: 'https://irs.gov',
    changeKind: 'deadline_shift',
    actionMode: 'due_date_overlay',
    firmImpact: 'no_current_match',
    summary: 'IRS extends deadlines.',
    publishedAt: new Date('2026-04-15T00:00:00Z').toISOString(),
    matchedCount: 0,
    needsReviewCount: 0,
    applyReadiness: { status: 'needs_details', missing: ['affected_clients'] },
    duplicateSourceSnapshotCount: 0,
    confidence: 0.94,
    isSample: true,
    jurisdiction: 'CA',
    taxAreas: [],
    forms: [],
  }
}

describe('revert window helpers', () => {
  it('revertExpiresAt offsets by exactly 24h', () => {
    const at = new Date('2026-04-29T10:00:00Z')
    const expires = revertExpiresAt(at.toISOString())
    expect(expires.getTime() - at.getTime()).toBe(24 * 60 * 60 * 1000)
  })

  it('isWithinRevertWindow treats now < expiresAt as inside', () => {
    const now = new Date('2026-04-29T12:00:00Z')
    const expires = new Date('2026-04-29T13:00:00Z')
    expect(isWithinRevertWindow(expires, now)).toBe(true)
    expect(isWithinRevertWindow(now, expires)).toBe(false)
  })

  it('isAlertRevertable returns true only for applied / partially_applied', () => {
    expect(isAlertRevertable(makeAlert('applied'))).toBe(true)
    expect(isAlertRevertable(makeAlert('partially_applied'))).toBe(true)
    expect(isAlertRevertable(makeAlert('matched'))).toBe(false)
    expect(isAlertRevertable(makeAlert('dismissed'))).toBe(false)
    expect(isAlertRevertable(makeAlert('reverted'))).toBe(false)
  })

  it('does not allow undo when the source has been revoked', () => {
    expect(
      isAlertRevertable({
        ...makeAlert('applied'),
        sourceStatus: 'source_revoked',
      }),
    ).toBe(false)
  })
})
