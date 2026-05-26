import { describe, expect, it } from 'vitest'

import {
  buildTaxYearOptions,
  defaultTaxYear,
  defaultJurisdictionForClient,
  preferredFormNamesForSelection,
  selectedJurisdictionsForCreate,
} from './CreateObligationDialog'

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

describe('CreateObligationDialog jurisdiction selection', () => {
  it('defaults the single jurisdiction input from the client filing state', () => {
    expect(
      defaultJurisdictionForClient({
        state: 'CA',
        filingProfiles: [{ state: 'CA' }],
      }),
    ).toBe('CA')
  })

  it('adds Federal as an optional companion to the typed jurisdiction', () => {
    expect(
      selectedJurisdictionsForCreate({
        jurisdiction: 'NY',
        includeFederal: true,
      }),
    ).toEqual(['NY', 'FED'])
  })

  it('allows a different typed state without requiring it in the client profile', () => {
    const defaultJurisdiction = defaultJurisdictionForClient({
      state: 'CA',
      filingProfiles: [{ state: 'CA' }],
    })

    expect(defaultJurisdiction).toBe('CA')
    expect(
      selectedJurisdictionsForCreate({
        jurisdiction: 'TX',
        includeFederal: false,
      }),
    ).toEqual(['TX'])
  })

  it('auto-selects the matching state and Federal forms for selected jurisdictions', () => {
    expect(
      preferredFormNamesForSelection({
        categoryValue: 's_corporation_income_tax_return',
        jurisdictions: ['CA', 'FED'],
      }),
    ).toEqual(['Form 100S', 'Form 1120-S'])
  })

  it('keeps category choice independent from client entity type', () => {
    expect(
      preferredFormNamesForSelection({
        categoryValue: 'individual_income_tax_return',
        jurisdictions: ['CA', 'FED'],
      }),
    ).toEqual(['State individual income tax return', 'Form 1040'])
  })
})
