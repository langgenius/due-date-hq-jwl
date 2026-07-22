import { describe, expect, it } from 'vitest'
import {
  addLocalCalendarDays,
  easternTimeParts,
  nextXDailySlotLocalDate,
  shouldRunXDailySlot,
  xDailySlotInstant,
} from './time'

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

  it('previews today before 09:00 ET and the next day from 09:00 onward', () => {
    expect(nextXDailySlotLocalDate(new Date('2026-07-21T12:59:59.000Z'))).toBe('2026-07-21')
    expect(nextXDailySlotLocalDate(new Date('2026-07-21T13:00:00.000Z'))).toBe('2026-07-22')
    expect(nextXDailySlotLocalDate(new Date('2026-12-21T13:59:59.000Z'))).toBe('2026-12-21')
    expect(nextXDailySlotLocalDate(new Date('2026-12-21T14:00:00.000Z'))).toBe('2026-12-22')
  })

  it('adds ET calendar dates across month, year, and leap-day boundaries', () => {
    expect(addLocalCalendarDays('2026-07-31', 1)).toBe('2026-08-01')
    expect(addLocalCalendarDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addLocalCalendarDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addLocalCalendarDays('2028-03-01', -1)).toBe('2028-02-29')
  })

  it('resolves 09:00 ET to the correct instant on both sides of DST changes', () => {
    expect(xDailySlotInstant('2026-03-07').toISOString()).toBe('2026-03-07T14:00:00.000Z')
    expect(xDailySlotInstant('2026-03-08').toISOString()).toBe('2026-03-08T13:00:00.000Z')
    expect(xDailySlotInstant('2026-11-01').toISOString()).toBe('2026-11-01T14:00:00.000Z')
    expect(xDailySlotInstant('2026-11-02').toISOString()).toBe('2026-11-02T14:00:00.000Z')
  })

  it('rejects invalid calendar input', () => {
    expect(() => addLocalCalendarDays('2026-02-30', 1)).toThrow('real calendar date')
    expect(() => addLocalCalendarDays('2026-01-01', 0.5)).toThrow('integer')
    expect(() => xDailySlotInstant('not-a-date')).toThrow('YYYY-MM-DD')
  })
})
