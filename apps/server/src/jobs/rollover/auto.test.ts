import { describe, expect, it } from 'vitest'
import { AUTO_ROLLOVER_WEEKDAY, autoRolloverTarget } from './auto'

// The single weekday the auto scan is allowed to run (weekly compute throttle).
const DAY = AUTO_ROLLOVER_WEEKDAY

describe('autoRolloverTarget', () => {
  it('returns the next filing year on the scan weekday at 6am within the window', () => {
    expect(autoRolloverTarget('2026-10-05', 6, 0, DAY)).toEqual({
      sourceFilingYear: 2026,
      targetFilingYear: 2027,
    })
    expect(autoRolloverTarget('2026-09-15', 6, 29, DAY)).toEqual({
      sourceFilingYear: 2026,
      targetFilingYear: 2027,
    })
    expect(autoRolloverTarget('2026-12-31', 6, 0, DAY)).toEqual({
      sourceFilingYear: 2026,
      targetFilingYear: 2027,
    })
  })

  it('throttles to one weekday per week — skips the other six days', () => {
    for (const otherDay of ['Sun', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
      expect(autoRolloverTarget('2026-10-01', 6, 0, otherDay)).toBeNull()
    }
  })

  it('runs only in the 6:00–6:29 slot', () => {
    expect(autoRolloverTarget('2026-10-05', 5, 59, DAY)).toBeNull()
    expect(autoRolloverTarget('2026-10-05', 6, 30, DAY)).toBeNull()
    expect(autoRolloverTarget('2026-10-05', 7, 0, DAY)).toBeNull()
    expect(autoRolloverTarget('2026-10-05', 0, 0, DAY)).toBeNull()
  })

  it('does not roll forward before September (current season still active)', () => {
    expect(autoRolloverTarget('2026-01-15', 6, 0, DAY)).toBeNull()
    expect(autoRolloverTarget('2026-04-15', 6, 0, DAY)).toBeNull()
    expect(autoRolloverTarget('2026-08-31', 6, 0, DAY)).toBeNull()
    expect(autoRolloverTarget('2026-09-01', 6, 0, DAY)).toEqual({
      sourceFilingYear: 2026,
      targetFilingYear: 2027,
    })
  })
})
