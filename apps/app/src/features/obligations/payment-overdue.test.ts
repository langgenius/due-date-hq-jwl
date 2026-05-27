import { describe, expect, it } from 'vitest'

import { isPaymentOverdue, paymentOverdueDays } from './payment-overdue'

describe('paymentOverdueDays', () => {
  it('returns 0 when paymentDueDate is null', () => {
    expect(paymentOverdueDays(null, '2026-05-27')).toBe(0)
    expect(paymentOverdueDays(undefined, '2026-05-27')).toBe(0)
  })

  it('returns 0 when payment is not yet overdue', () => {
    expect(paymentOverdueDays('2026-06-01', '2026-05-27')).toBe(0)
    expect(paymentOverdueDays('2026-05-27', '2026-05-27')).toBe(0)
  })

  it('returns the day count when payment is overdue', () => {
    expect(paymentOverdueDays('2026-05-20', '2026-05-27')).toBe(7)
    expect(paymentOverdueDays('2026-04-15', '2026-05-27')).toBe(42)
  })

  it('falls back to Date.now() when asOfDate is null', () => {
    // Past payment date relative to real-now still flags as overdue.
    expect(paymentOverdueDays('2000-01-01', null)).toBeGreaterThan(0)
    // Future payment date is not overdue.
    expect(paymentOverdueDays('2099-12-31', null)).toBe(0)
  })

  it('returns 0 for unparseable dates', () => {
    expect(paymentOverdueDays('not-a-date', '2026-05-27')).toBe(0)
    expect(paymentOverdueDays('2026-05-20', 'not-a-date')).toBe(0)
  })
})

describe('isPaymentOverdue', () => {
  it("is false when the payment isn't overdue", () => {
    expect(isPaymentOverdue('2026-06-01', '2026-05-27')).toBe(false)
    expect(isPaymentOverdue(null, '2026-05-27')).toBe(false)
  })

  it('is true once paymentDueDate is past the as-of date', () => {
    expect(isPaymentOverdue('2026-05-20', '2026-05-27')).toBe(true)
  })
})
