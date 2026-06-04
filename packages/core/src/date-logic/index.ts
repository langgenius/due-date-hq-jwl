import type { DueDateLogic } from '../rules'

export interface ExpandDueDateInput {
  taxYearStart?: string
  taxYearEnd?: string
  holidays?: readonly string[]
}

export interface ExpandedDueDate {
  period: string
  dueDate: string | null
  sourceDefined: boolean
  requiresReview: boolean
  reason: string | null
}

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) throw new Error(`Invalid ISO date: ${value}`)
  return new Date(Date.UTC(year, month - 1, day))
}

function formatIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function dateFromParts(year: number, zeroBasedMonth: number, day: number): Date {
  return new Date(Date.UTC(year, zeroBasedMonth, day))
}

function applyNextBusinessDay(date: Date, holidays: readonly string[] = []): Date {
  const holidaySet = new Set(holidays)
  const out = new Date(date.getTime())

  while (out.getUTCDay() === 0 || out.getUTCDay() === 6 || holidaySet.has(formatIsoDate(out))) {
    out.setUTCDate(out.getUTCDate() + 1)
  }

  return out
}

function applyRollover(date: Date, logic: DueDateLogic, holidays: readonly string[] = []): Date {
  if (logic.holidayRollover === 'next_business_day') {
    return applyNextBusinessDay(date, holidays)
  }

  return date
}

/**
 * Roll a date off weekends (and optional holidays) to the next business day.
 * Exported wrapper over the internal helper so callers outside this module
 * (e.g. the extension-deadline computation) can reuse the same rollover.
 */
export function nextBusinessDay(date: Date, holidays: readonly string[] = []): Date {
  return applyNextBusinessDay(date, holidays)
}

/**
 * Add whole + half calendar months to a UTC date.
 *
 * Whole months use month arithmetic with day-of-month clamping
 * (e.g. Jan 31 + 1mo → Feb 28). The only fractional duration in the rule
 * catalog is `.5` (federal trusts / NY fiduciary carry 5.5 months); a half
 * month follows the 15-day convention, so April 15 + 5.5mo → Sept 30.
 */
export function addExtensionMonths(date: Date, months: number): Date {
  const whole = Math.trunc(months)
  const candidate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + whole, 1))
  const lastDay = new Date(
    Date.UTC(candidate.getUTCFullYear(), candidate.getUTCMonth() + 1, 0),
  ).getUTCDate()
  candidate.setUTCDate(Math.min(date.getUTCDate(), lastDay))
  const extraDays = Math.round((months - whole) * 30)
  if (extraDays !== 0) candidate.setUTCDate(candidate.getUTCDate() + extraDays)
  return candidate
}

/**
 * The statutory extended filing deadline = the original filing deadline plus
 * the rule's extension duration, rolled off weekends to the next business day.
 *
 * No federal-holiday list is plumbed at extension-decision time, so this rolls
 * weekends only (the original due date was already holiday-adjusted at
 * generation). Callers pass `holidays` when a list is available.
 */
export function computeExtendedFilingDeadline(
  originalFiling: Date,
  durationMonths: number,
  holidays: readonly string[] = [],
): Date {
  return applyNextBusinessDay(addExtensionMonths(originalFiling, durationMonths), holidays)
}

export function expandDueDateLogic(
  logic: DueDateLogic,
  input: ExpandDueDateInput = {},
): ExpandedDueDate[] {
  if (logic.kind === 'fixed_date') {
    const date = applyRollover(parseIsoDate(logic.date), logic, input.holidays)
    return [
      {
        period: 'default',
        dueDate: formatIsoDate(date),
        sourceDefined: false,
        requiresReview: false,
        reason: null,
      },
    ]
  }

  if (logic.kind === 'period_table') {
    return logic.periods.map((period) => ({
      period: period.period,
      dueDate: period.dueDate,
      sourceDefined: true,
      requiresReview: false,
      reason: null,
    }))
  }

  if (logic.kind === 'source_defined_calendar') {
    return [
      {
        period: 'source_defined',
        dueDate: null,
        sourceDefined: true,
        requiresReview: true,
        reason: logic.description,
      },
    ]
  }

  if (logic.kind === 'nth_day_after_tax_year_end') {
    if (!input.taxYearEnd) {
      return [
        {
          period: 'tax_year_end_required',
          dueDate: null,
          sourceDefined: false,
          requiresReview: true,
          reason: 'taxYearEnd is required for this due date logic.',
        },
      ]
    }

    const end = parseIsoDate(input.taxYearEnd)
    const date = dateFromParts(
      end.getUTCFullYear(),
      end.getUTCMonth() + logic.monthOffset,
      logic.day,
    )
    const dueDate = applyRollover(date, logic, input.holidays)
    return [
      {
        period: 'tax_year',
        dueDate: formatIsoDate(dueDate),
        sourceDefined: false,
        requiresReview: false,
        reason: null,
      },
    ]
  }

  if (logic.kind === 'nth_day_after_tax_year_begin') {
    if (!input.taxYearStart) {
      return [
        {
          period: 'tax_year_start_required',
          dueDate: null,
          sourceDefined: false,
          requiresReview: true,
          reason: 'taxYearStart is required for this due date logic.',
        },
      ]
    }

    const start = parseIsoDate(input.taxYearStart)
    const date = dateFromParts(
      start.getUTCFullYear(),
      start.getUTCMonth() + logic.monthOffset - 1,
      logic.day,
    )
    const dueDate = applyRollover(date, logic, input.holidays)
    return [
      {
        period: 'tax_year',
        dueDate: formatIsoDate(dueDate),
        sourceDefined: false,
        requiresReview: false,
        reason: null,
      },
    ]
  }

  return logic satisfies never
}
