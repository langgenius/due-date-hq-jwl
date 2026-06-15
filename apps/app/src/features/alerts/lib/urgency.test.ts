import { describe, expect, it } from 'vitest'

import {
  deadlineProximity,
  effectiveTier,
  proximityTimeTag,
  proximityToTier,
  thresholdsForKind,
} from './urgency'

const NOW = new Date('2026-06-14T12:00:00Z').getTime()

/** Build an ISO string `days` whole days from NOW (noon-aligned). */
function isoInDays(days: number): string {
  return new Date(NOW + days * 86_400_000).toISOString()
}

describe('deadlineProximity', () => {
  it('returns none for a missing deadline', () => {
    expect(deadlineProximity(null, NOW)).toEqual({ proximity: 'none', days: null })
  })

  it('returns none for an unparseable deadline', () => {
    expect(deadlineProximity('not-a-date', NOW)).toEqual({ proximity: 'none', days: null })
  })

  it('buckets a past deadline as overdue with negative days', () => {
    const result = deadlineProximity(isoInDays(-2), NOW)
    expect(result.proximity).toBe('overdue')
    expect(result.days).toBeLessThan(0)
  })

  it('buckets ≤3 days as imminent', () => {
    expect(deadlineProximity(isoInDays(3), NOW).proximity).toBe('imminent')
    expect(deadlineProximity(isoInDays(1), NOW).proximity).toBe('imminent')
  })

  it('buckets same-day (0 days) as imminent', () => {
    const result = deadlineProximity(isoInDays(0), NOW)
    expect(result.proximity).toBe('imminent')
    expect(result.days).toBe(0)
  })

  it('buckets 4–14 days as soon', () => {
    expect(deadlineProximity(isoInDays(4), NOW).proximity).toBe('soon')
    expect(deadlineProximity(isoInDays(14), NOW).proximity).toBe('soon')
  })

  it('buckets >14 days as scheduled', () => {
    expect(deadlineProximity(isoInDays(15), NOW).proximity).toBe('scheduled')
    expect(deadlineProximity(isoInDays(120), NOW).proximity).toBe('scheduled')
  })

  it('rounds up partial days so a deadline later today is 1 day, not 0', () => {
    // 12h from NOW → ceil(0.5) === 1, still imminent
    const result = deadlineProximity(new Date(NOW + 12 * 3_600_000).toISOString(), NOW)
    expect(result.days).toBe(1)
    expect(result.proximity).toBe('imminent')
  })
})

describe('proximityToTier', () => {
  it('maps overdue and imminent to urgent', () => {
    expect(proximityToTier('overdue')).toBe('urgent')
    expect(proximityToTier('imminent')).toBe('urgent')
  })

  it('maps soon to high', () => {
    expect(proximityToTier('soon')).toBe('high')
  })

  it('maps scheduled and none to normal', () => {
    expect(proximityToTier('scheduled')).toBe('normal')
    expect(proximityToTier('none')).toBe('normal')
  })
})

describe('thresholdsForKind', () => {
  it('gives protective_claim_window a 60-day soon horizon', () => {
    expect(thresholdsForKind('protective_claim_window')).toEqual({ imminentDays: 3, soonDays: 60 })
  })

  it('defaults all other kinds to 3 / 14', () => {
    expect(thresholdsForKind('deadline_shift')).toEqual({ imminentDays: 3, soonDays: 14 })
    expect(thresholdsForKind('filing_requirement')).toEqual({ imminentDays: 3, soonDays: 14 })
  })

  it('honors a per-kind threshold passed to deadlineProximity', () => {
    // 26 days out: scheduled under the default, soon under the protective window.
    expect(deadlineProximity(isoInDays(26), NOW).proximity).toBe('scheduled')
    expect(
      deadlineProximity(isoInDays(26), NOW, thresholdsForKind('protective_claim_window')).proximity,
    ).toBe('soon')
  })
})

describe('effectiveTier', () => {
  it('prefers the smart-priority level when present (Layer 2 wins)', () => {
    // Deadline is far out (would be normal), but the smart queue says urgent.
    expect(
      effectiveTier(
        { actionDeadline: isoInDays(120), changeKind: 'deadline_shift' },
        NOW,
        'urgent',
      ),
    ).toBe('urgent')
  })

  it('falls back to deadline proximity when no smart level (Layer 1)', () => {
    expect(
      effectiveTier({ actionDeadline: isoInDays(2), changeKind: 'deadline_shift' }, NOW, undefined),
    ).toBe('urgent')
    expect(
      effectiveTier(
        { actionDeadline: isoInDays(10), changeKind: 'deadline_shift' },
        NOW,
        undefined,
      ),
    ).toBe('high')
    expect(
      effectiveTier(
        { actionDeadline: isoInDays(60), changeKind: 'deadline_shift' },
        NOW,
        undefined,
      ),
    ).toBe('normal')
  })

  it('surfaces a protective claim at 26 days as high (60-day window)', () => {
    // Same deadline that reads `normal` for a deadline_shift is `high` here.
    expect(
      effectiveTier(
        { actionDeadline: isoInDays(26), changeKind: 'protective_claim_window' },
        NOW,
        undefined,
      ),
    ).toBe('high')
    expect(
      effectiveTier(
        { actionDeadline: isoInDays(26), changeKind: 'deadline_shift' },
        NOW,
        undefined,
      ),
    ).toBe('normal')
  })

  it('returns normal when there is neither a smart level nor a deadline', () => {
    expect(
      effectiveTier({ actionDeadline: null, changeKind: 'deadline_shift' }, NOW, undefined),
    ).toBe('normal')
  })
})

describe('proximityTimeTag', () => {
  it('renders Nd left for imminent/soon', () => {
    expect(proximityTimeTag(deadlineProximity(isoInDays(3), NOW))).toBe('3d left')
    expect(proximityTimeTag(deadlineProximity(isoInDays(9), NOW))).toBe('9d left')
  })

  it('renders Due today at 0 days', () => {
    expect(proximityTimeTag(deadlineProximity(isoInDays(0), NOW))).toBe('Due today')
  })

  it('renders Nd overdue for a past deadline', () => {
    expect(proximityTimeTag(deadlineProximity(isoInDays(-2), NOW))).toBe('2d overdue')
  })

  it('renders nothing for scheduled or none (silence is the signal)', () => {
    expect(proximityTimeTag(deadlineProximity(isoInDays(30), NOW))).toBeNull()
    expect(proximityTimeTag(deadlineProximity(null, NOW))).toBeNull()
  })
})
