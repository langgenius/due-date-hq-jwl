import { afterEach, describe, expect, it, vi } from 'vitest'

import { activateLocale } from '@/i18n/i18n'
import {
  cn,
  formatCents,
  formatDate,
  formatDatePretty,
  formatDateTimeWithTimezone,
  formatDateWithTimezone,
} from './utils'

describe('utils', () => {
  afterEach(() => {
    activateLocale('en')
  })

  it('merges Tailwind classes with later conflicting utilities winning', () => {
    expect(cn('px-2 text-sm', 'px-4')).toBe('text-sm px-4')
  })

  it('formats cents as US dollars under the en locale', () => {
    activateLocale('en')
    // Whole-dollar amounts strip the trailing .00 via
    // `trailingZeroDisplay: 'stripIfInteger'`.
    expect(formatCents(14230000)).toBe('$142,300')
    // Fractional cents are preserved.
    expect(formatCents(14230056)).toBe('$142,300.56')
  })

  it('uses zh-CN number grouping when the zh-CN locale is active', () => {
    activateLocale('zh-CN')
    // zh-CN currency formatting uses non-breaking space (U+00A0) between the
    // symbol and the amount, matching ICU output. Whole-dollar tail
    // stripped same as en.
    expect(formatCents(14230000)).toMatch(/142,300(?!\.00)/)
  })

  it('formats date-only values as YYYY-MM-DD', () => {
    expect(formatDate('2026-03-15')).toBe('2026-03-15')
  })

  it('formats datetimes as YYYY-MM-DD in the requested IANA timezone', () => {
    expect(formatDateWithTimezone('2026-04-29T02:14:32.883Z', 'America/Los_Angeles')).toBe(
      '2026-04-28',
    )
  })

  it('formats datetimes as YYYY-MM-DD HH:mm:ss plus timezone', () => {
    expect(formatDateTimeWithTimezone('2026-04-29T09:14:32.883Z', 'UTC')).toBe(
      '2026-04-29 09:14:32 UTC',
    )
  })

  it('formats datetimes in the requested IANA timezone', () => {
    expect(formatDateTimeWithTimezone('2026-04-29T09:14:32.883Z', 'America/Los_Angeles')).toMatch(
      /^2026-04-29 02:14:32 (PDT|GMT-7)$/,
    )
  })

  describe('formatDatePretty', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('formats a same-year ISO date without the year', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-15T00:00:00.000Z'))
      expect(formatDatePretty('2026-05-06')).toBe('May 6')
    })

    it('includes the year for prior-year and future-year dates', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-15T00:00:00.000Z'))
      expect(formatDatePretty('2025-12-31')).toBe('Dec 31, 2025')
      expect(formatDatePretty('2027-03-01')).toBe('Mar 1, 2027')
    })

    it('respects alwaysShowYear', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-15T00:00:00.000Z'))
      expect(formatDatePretty('2026-05-06', { alwaysShowYear: true })).toBe('May 6, 2026')
    })

    it('returns the input unchanged when unparseable', () => {
      expect(formatDatePretty('not-a-date')).toBe('not-a-date')
    })
  })
})
