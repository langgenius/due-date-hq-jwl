import { describe, expect, it } from 'vitest'

import { buildTaxYearOptions, defaultTaxYear } from './CreateObligationDialog'

describe('CreateObligationDialog tax year defaults', () => {
  const filingSeasonDate = new Date('2026-05-26T00:00:00.000Z')

  it('defaults to the prior tax year because current filings usually cover last year', () => {
    expect(defaultTaxYear(filingSeasonDate)).toBe('2025')
  })

  it('keeps the prior tax year available before the current calendar year', () => {
    expect(buildTaxYearOptions(filingSeasonDate)).toEqual([
      '2025',
      '2026',
      '2027',
      '2028',
      '2029',
      '2030',
    ])
  })
})
