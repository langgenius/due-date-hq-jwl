import { describe, expect, it } from 'vitest'
import { easternTimeParts, shouldRunXDailySlot } from './time'

describe('Eastern daily X slot', () => {
  it('runs at 09:00 New York time during daylight saving time', () => {
    const now = new Date('2026-07-21T13:00:00.000Z')
    expect(easternTimeParts(now)).toEqual({ localDate: '2026-07-21', hour: 9, minute: 0 })
    expect(shouldRunXDailySlot(now)).toBe(true)
    expect(shouldRunXDailySlot(new Date('2026-07-21T13:30:00.000Z'))).toBe(false)
  })

  it('runs at 09:00 New York time during standard time', () => {
    expect(shouldRunXDailySlot(new Date('2026-12-21T14:00:00.000Z'))).toBe(true)
    expect(shouldRunXDailySlot(new Date('2026-12-21T13:00:00.000Z'))).toBe(false)
  })

  it('uses the New York calendar date around UTC midnight', () => {
    expect(easternTimeParts(new Date('2026-07-22T01:00:00.000Z')).localDate).toBe('2026-07-21')
  })
})
