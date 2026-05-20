import { describe, expect, it } from 'vitest'
import { internalDeadlineFromBaseDueDate, statutoryPenaltyDueDate } from './index'

describe('@duedatehq/core/deadlines', () => {
  it('derives an internal deadline before the statutory base date', () => {
    expect(
      internalDeadlineFromBaseDueDate(new Date('2026-04-15T00:00:00.000Z'), 14).toISOString(),
    ).toBe('2026-04-01T00:00:00.000Z')
  })

  it('keeps zero-day offset equal to the base date', () => {
    expect(
      internalDeadlineFromBaseDueDate(new Date('2026-04-15T12:30:00.000Z'), 0).toISOString(),
    ).toBe('2026-04-15T00:00:00.000Z')
  })

  it('prefers statutory payment and filing dates for penalty timing', () => {
    const currentDueDate = new Date('2026-04-01T00:00:00.000Z')
    const filingDueDate = new Date('2026-10-15T00:00:00.000Z')
    const paymentDueDate = new Date('2026-04-15T00:00:00.000Z')

    expect(statutoryPenaltyDueDate({ currentDueDate, filingDueDate })).toBe(filingDueDate)
    expect(statutoryPenaltyDueDate({ currentDueDate, filingDueDate, paymentDueDate })).toBe(
      paymentDueDate,
    )
  })
})
