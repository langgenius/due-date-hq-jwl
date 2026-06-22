import { describe, expect, it } from 'vitest'
import type { TaxArea } from '@duedatehq/contracts'
import {
  isTaxAreaFilter,
  matchesChangeKindFilter,
  matchesChangeKindSelection,
  matchesTaxAreaFilter,
  matchesTaxAreaSelection,
  TAX_AREA_FILTER_OPTIONS,
} from './alert-filters'

describe('matchesChangeKindFilter', () => {
  it('groups protective claim windows with timing filters', () => {
    expect(matchesChangeKindFilter('protective_claim_window', 'deadlines')).toBe(true)
    expect(matchesChangeKindFilter('protective_claim_window', 'rules')).toBe(false)
  })
})

describe('matchesTaxAreaFilter', () => {
  it('keeps everything under "all", including uncategorized alerts', () => {
    expect(matchesTaxAreaFilter([], 'all')).toBe(true)
    expect(matchesTaxAreaFilter(['income_individual'], 'all')).toBe(true)
  })

  it('keeps an alert only when its taxAreas include the selected bucket', () => {
    expect(matchesTaxAreaFilter(['income_individual'], 'income_individual')).toBe(true)
    expect(matchesTaxAreaFilter(['income_business'], 'income_individual')).toBe(false)
  })

  it('matches a multi-area alert under any of its buckets', () => {
    const areas: TaxArea[] = ['income_individual', 'income_business']
    expect(matchesTaxAreaFilter(areas, 'income_individual')).toBe(true)
    expect(matchesTaxAreaFilter(areas, 'income_business')).toBe(true)
    expect(matchesTaxAreaFilter(areas, 'sales_use')).toBe(false)
  })

  it('hides uncategorized (empty) alerts under a specific bucket', () => {
    expect(matchesTaxAreaFilter([], 'franchise')).toBe(false)
  })
})

describe('matchesChangeKindSelection (multi-select)', () => {
  it('treats an empty selection as "all"', () => {
    expect(matchesChangeKindSelection('deadline_shift', [])).toBe(true)
    expect(matchesChangeKindSelection('other', [])).toBe(true)
  })

  it('keeps an alert when its kind falls under any selected group', () => {
    expect(matchesChangeKindSelection('deadline_shift', ['deadlines'])).toBe(true)
    expect(matchesChangeKindSelection('form_instruction', ['deadlines'])).toBe(false)
    // OR across groups — a source kind passes when either source or rules is on.
    expect(matchesChangeKindSelection('source_status', ['rules', 'source'])).toBe(true)
    expect(matchesChangeKindSelection('deadline_shift', ['rules', 'source'])).toBe(false)
  })
})

describe('matchesTaxAreaSelection (multi-select)', () => {
  it('treats an empty selection as "all", including uncategorized alerts', () => {
    expect(matchesTaxAreaSelection([], [])).toBe(true)
    expect(matchesTaxAreaSelection(['income_individual'], [])).toBe(true)
  })

  it('keeps an alert when its taxAreas intersect any selected bucket', () => {
    expect(matchesTaxAreaSelection(['income_individual'], ['income_individual'])).toBe(true)
    expect(matchesTaxAreaSelection(['income_business'], ['income_individual', 'sales_use'])).toBe(
      false,
    )
    expect(
      matchesTaxAreaSelection(['income_business'], ['income_individual', 'income_business']),
    ).toBe(true)
  })

  it('hides uncategorized (empty) alerts once any bucket is selected', () => {
    expect(matchesTaxAreaSelection([], ['franchise'])).toBe(false)
  })
})

describe('isTaxAreaFilter', () => {
  it('accepts every filter option', () => {
    for (const option of TAX_AREA_FILTER_OPTIONS) {
      expect(isTaxAreaFilter(option)).toBe(true)
    }
  })

  it('rejects values outside the option set', () => {
    expect(isTaxAreaFilter('nonsense')).toBe(false)
    expect(isTaxAreaFilter('income')).toBe(false)
    expect(isTaxAreaFilter('')).toBe(false)
  })
})
