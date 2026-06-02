import { describe, expect, it } from 'vitest'
import {
  addExtensionMonths,
  computeExtendedFilingDeadline,
  expandDueDateLogic,
  nextBusinessDay,
} from './index'

function iso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function utc(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

describe('@duedatehq/core/date-logic', () => {
  it('expands tax-year-end rules and rolls weekends to the next business day', () => {
    const [due] = expandDueDateLogic(
      {
        kind: 'nth_day_after_tax_year_end',
        monthOffset: 3,
        day: 15,
        holidayRollover: 'next_business_day',
      },
      { taxYearEnd: '2025-12-31' },
    )

    expect(due).toMatchObject({
      period: 'tax_year',
      dueDate: '2026-03-16',
      requiresReview: false,
    })
  })

  it('expands tax-year-start payment rules', () => {
    const [due] = expandDueDateLogic(
      {
        kind: 'nth_day_after_tax_year_begin',
        monthOffset: 4,
        day: 15,
        holidayRollover: 'next_business_day',
      },
      { taxYearStart: '2026-01-01' },
    )

    expect(due?.dueDate).toBe('2026-04-15')
  })

  it('passes source-adjusted period tables through unchanged', () => {
    const dates = expandDueDateLogic({
      kind: 'period_table',
      frequency: 'quarterly',
      periods: [{ period: '2026-Q4', dueDate: '2027-02-01' }],
      holidayRollover: 'source_adjusted',
    })

    expect(dates).toEqual([
      {
        period: '2026-Q4',
        dueDate: '2027-02-01',
        sourceDefined: true,
        requiresReview: false,
        reason: null,
      },
    ])
  })

  it('returns a review-needed item for source-defined calendars', () => {
    const [due] = expandDueDateLogic({
      kind: 'source_defined_calendar',
      description: 'Use official taxable-year-end table.',
      holidayRollover: 'source_adjusted',
    })

    expect(due).toMatchObject({
      period: 'source_defined',
      dueDate: null,
      sourceDefined: true,
      requiresReview: true,
    })
  })
})

describe('extension deadline math', () => {
  it('adds whole months (federal 6-month / CA 7-month extensions)', () => {
    expect(iso(addExtensionMonths(utc('2026-04-15'), 6))).toBe('2026-10-15')
    expect(iso(addExtensionMonths(utc('2026-04-15'), 7))).toBe('2026-11-15')
  })

  it('treats a half month as 15 days (federal trust / NY fiduciary 5.5)', () => {
    expect(iso(addExtensionMonths(utc('2026-04-15'), 5.5))).toBe('2026-09-30')
  })

  it('clamps to the last day of the target month', () => {
    expect(iso(addExtensionMonths(utc('2026-01-31'), 1))).toBe('2026-02-28')
  })

  it('crosses the year boundary', () => {
    expect(iso(addExtensionMonths(utc('2026-11-15'), 6))).toBe('2027-05-15')
  })

  it('rolls weekends to the next business day', () => {
    // 2026-01-03 is a Saturday, 2026-01-04 a Sunday → both roll to Monday.
    expect(iso(nextBusinessDay(utc('2026-01-03')))).toBe('2026-01-05')
    expect(iso(nextBusinessDay(utc('2026-01-04')))).toBe('2026-01-05')
    // A weekday is returned unchanged.
    expect(iso(nextBusinessDay(utc('2026-01-05')))).toBe('2026-01-05')
  })

  it('computes the extended filing deadline with weekend rollover', () => {
    // April 15 + 6 months = Oct 15 2026 (a Thursday — no roll).
    expect(iso(computeExtendedFilingDeadline(utc('2026-04-15'), 6))).toBe('2026-10-15')
    // July 3 + 6 months = Jan 3 2027 (a Sunday) → rolls to Mon Jan 4.
    expect(iso(computeExtendedFilingDeadline(utc('2026-07-03'), 6))).toBe('2027-01-04')
  })

  it('never returns a weekend from computeExtendedFilingDeadline', () => {
    for (const start of ['2026-01-15', '2026-03-31', '2026-04-15', '2026-09-15']) {
      for (const months of [5.5, 6, 7]) {
        const day = computeExtendedFilingDeadline(utc(start), months).getUTCDay()
        expect(day).not.toBe(0)
        expect(day).not.toBe(6)
      }
    }
  })
})
