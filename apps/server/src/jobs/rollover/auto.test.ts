import { describe, expect, it } from 'vitest'
import { autoRolloverTarget } from './auto'

describe('autoRolloverTarget', () => {
  it('returns the next filing year at 6am firm-local within the rollover window', () => {
    expect(autoRolloverTarget('2026-10-01', 6, 0)).toEqual({
      sourceFilingYear: 2026,
      targetFilingYear: 2027,
    })
    expect(autoRolloverTarget('2026-09-15', 6, 29)).toEqual({
      sourceFilingYear: 2026,
      targetFilingYear: 2027,
    })
    expect(autoRolloverTarget('2026-12-31', 6, 0)).toEqual({
      sourceFilingYear: 2026,
      targetFilingYear: 2027,
    })
  })

  it('runs only in the 6:00–6:29 daily slot', () => {
    expect(autoRolloverTarget('2026-10-01', 5, 59)).toBeNull()
    expect(autoRolloverTarget('2026-10-01', 6, 30)).toBeNull()
    expect(autoRolloverTarget('2026-10-01', 7, 0)).toBeNull()
    expect(autoRolloverTarget('2026-10-01', 0, 0)).toBeNull()
  })

  it('does not roll forward before September (current season still active)', () => {
    expect(autoRolloverTarget('2026-01-15', 6, 0)).toBeNull()
    expect(autoRolloverTarget('2026-04-15', 6, 0)).toBeNull()
    expect(autoRolloverTarget('2026-08-31', 6, 0)).toBeNull()
    expect(autoRolloverTarget('2026-09-01', 6, 0)).toEqual({
      sourceFilingYear: 2026,
      targetFilingYear: 2027,
    })
  })
})
