import { describe, expect, it } from 'vitest'
import { nextBusinessDay } from '../date-logic'
import { federalHolidaysForYear, federalHolidaysForYears } from './index'

describe('federalHolidaysForYear', () => {
  it('computes floating Monday holidays (MLK Jr. Day = 3rd Monday of January)', () => {
    // Jan 1, 2026 is a Thursday → first Monday Jan 5 → third Monday Jan 19.
    expect(federalHolidaysForYear(2026)).toContain('2026-01-19')
  })

  it('observes a Saturday fixed holiday on the preceding Friday (Jul 4, 2026 → Jul 3)', () => {
    // July 4, 2026 falls on a Saturday.
    expect(federalHolidaysForYear(2026)).toContain('2026-07-03')
    expect(federalHolidaysForYear(2026)).not.toContain('2026-07-04')
  })

  it('returns sorted, unique, well-formed ISO dates', () => {
    const out = federalHolidaysForYear(2026)
    expect(out).toEqual([...new Set(out)].toSorted())
    expect(out.every((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))).toBe(true)
    expect(out.length).toBeGreaterThanOrEqual(11)
  })
})

describe('DC Emancipation Day shifts the April 15 deadline', () => {
  it('rolls 2023 April 15 (Sat) past Emancipation Day (observed Mon Apr 17) to Apr 18', () => {
    // The canonical regression: April 15, 2023 = Saturday; Emancipation Day
    // (Apr 16, Sunday) observed Monday Apr 17; Tax Day landed on Apr 18.
    const due = new Date('2023-04-15T00:00:00.000Z')
    const rolled = nextBusinessDay(due, federalHolidaysForYear(2023))
    expect(rolled.toISOString().slice(0, 10)).toBe('2023-04-18')
  })

  it('leaves an April 15 that is a plain weekday unchanged (2024 = Monday)', () => {
    const due = new Date('2024-04-15T00:00:00.000Z')
    const rolled = nextBusinessDay(due, federalHolidaysForYear(2024))
    expect(rolled.toISOString().slice(0, 10)).toBe('2024-04-15')
  })
})

describe('federalHolidaysForYears', () => {
  it('merges multiple years into one de-duplicated, sorted list', () => {
    const merged = federalHolidaysForYears([2025, 2026])
    expect(merged).toContain('2026-01-19')
    expect(merged).toEqual([...new Set(merged)].toSorted())
    expect(merged.length).toBeGreaterThan(federalHolidaysForYear(2026).length)
  })
})
