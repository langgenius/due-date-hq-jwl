import { describe, expect, it } from 'vitest'

import { exampleFederalDueDate, workingDueDate } from './offset-preview'

describe('exampleFederalDueDate', () => {
  it('uses the current year when today is before April 15', () => {
    expect(exampleFederalDueDate('2026-01-02')).toBe('2026-04-15')
  })

  it('uses the current year on April 15 itself', () => {
    expect(exampleFederalDueDate('2026-04-15')).toBe('2026-04-15')
  })

  it('rolls to the next year after April 15', () => {
    expect(exampleFederalDueDate('2026-07-31')).toBe('2027-04-15')
    expect(exampleFederalDueDate('2026-12-31')).toBe('2027-04-15')
  })
})

describe('workingDueDate', () => {
  it('subtracts the offset in calendar days', () => {
    expect(workingDueDate('2027-04-15', 14)).toBe('2027-04-01')
  })

  it('returns the due date unchanged at offset 0', () => {
    expect(workingDueDate('2027-04-15', 0)).toBe('2027-04-15')
  })

  it('crosses month and year boundaries', () => {
    expect(workingDueDate('2027-04-15', 30)).toBe('2027-03-16')
    expect(workingDueDate('2027-04-15', 365)).toBe('2026-04-15')
  })
})
